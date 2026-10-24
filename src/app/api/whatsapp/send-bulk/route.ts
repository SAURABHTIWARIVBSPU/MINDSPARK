import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { ICPaaSAdapter } from '@/lib/whatsapp/icpaas.adapter';
import { DeduplicationGuard } from '@/lib/whatsapp/deduplication-guard';
import {
  renderMessageTemplate,
  WHATSAPP_TEMPLATES,
  WhatsAppTemplateId,
  getCategoryGroupLink,
  getAllAvailableTemplates,
  resolveStudentWhatsAppGroup,
} from '@/lib/whatsapp/message-builder';
import { WhatsAppStatus, WhatsAppCampaign } from '@/types';
import { logWhatsAppDispatchRealTime, DispatchLogEntry } from '@/lib/whatsapp/excel-logger';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      studentIds = [],
      provider = 'icpaas',
      templateType = 'REGISTRATION_CONFIRMATION',
      customMessage = '',
      status = 'SENT',
      delayMs = 100,
      templateName,
      templateLanguage,
      variableMapping,
      campaignName,
      competitionGroup = 'ALL',
      classGroup = 'ALL',
      usePreviousTemplateForResend = true,
    } = body;

    // Reject deprecated providers (Only ICPaaS approved)
    if (provider === 'cloud_api' || provider === 'browser_queue_sync') {
      return NextResponse.json(
        {
          success: false,
          error: `Provider "${provider}" is deprecated and disabled. All messages must be dispatched through the ICPS-recommended ICPaaS Gateway.`,
        },
        { status: 400 }
      );
    }

    if (provider !== 'icpaas' && provider !== 'mark_sent' && provider !== 'reset_unsent') {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported messaging provider "${provider}". Only the ICPS-recommended ICPaaS Gateway is supported.`,
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'No candidate IDs provided for bulk action' }, { status: 400 });
    }

    const db = getDb();
    const origin = req.nextUrl.origin;
    const settings = await db.getSettings();
    const allTemplates = getAllAvailableTemplates(settings);
    const activeTemplateDef = allTemplates.find((t) => t.id === templateType) || WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION;

    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const effectiveCampaignName =
      campaignName?.trim() ||
      `${competitionGroup}${classGroup !== 'ALL' ? ' (' + classGroup + ')' : ''} Campaign (${new Date().toLocaleDateString('en-IN')})`;

    // Action 1: Mark as Sent / Opened (Operator reconciliation action)
    if (provider === 'mark_sent') {
      assertPermission(user, 'messages.prepare');
      const targetStatus: WhatsAppStatus = status === 'OPENED' ? 'OPENED' : 'SENT';

      const allActive = await db.getAllActiveStudents();
      const studentMap = new Map(allActive.map((s) => [s.studentId, s]));

      const perStudentMeta: Record<
        string,
        {
          messageId?: string;
          error?: string;
          templateId?: string;
          templateName?: string;
          templateVersion?: number;
          messageContent?: string;
          groupLink?: string;
          campaignId?: string;
          campaignName?: string;
        }
      > = {};

      for (const id of studentIds) {
        const student = studentMap.get(id);
        if (student) {
          let msgContent = '';
          let grpLink = '';
          let tId = templateType;
          let tTitle = activeTemplateDef.title;
          let tVer = activeTemplateDef.version || 1;

          // Safe Message Resend: Default to previously saved template version and exact message content
          if (usePreviousTemplateForResend && student.lastMessageContent) {
            msgContent = student.lastMessageContent;
            grpLink = student.lastGroupLink || getCategoryGroupLink(student.competitionName, settings, student.className);
            tId = student.lastTemplateId || templateType;
            tTitle = student.lastTemplateName || activeTemplateDef.title;
            tVer = Number(student.lastTemplateVersion || 1);
          } else {
            const rawTemplate = (customMessage && customMessage.trim()) ? customMessage : activeTemplateDef.defaultText;
            msgContent = renderMessageTemplate(rawTemplate, student, settings, origin);
            grpLink = getCategoryGroupLink(student.competitionName, settings, student.className);
          }

          perStudentMeta[student.studentId] = {
            messageId: `wa_web_${Date.now()}_${student.registrationNumber}`,
            templateId: tId,
            templateName: tTitle,
            templateVersion: tVer,
            messageContent: msgContent,
            groupLink: grpLink,
            campaignId,
            campaignName: effectiveCampaignName,
          };
        }
      }

      const updatedCount = await db.batchUpdateStudentWhatsAppStatus(studentIds, targetStatus, {
        templateId: templateType,
        templateName: activeTemplateDef.title,
        templateVersion: activeTemplateDef.version || 1,
        provider: 'Browser Queue / wa.me',
        messageId: `wa_web_${Date.now()}`,
        campaignId,
        campaignName: effectiveCampaignName,
        perStudentMetadata: perStudentMeta,
      });

      // Real-time synchronization to local Excel log & Master Spreadsheet
      try {
        const nowIso = new Date().toISOString();
        const logEntries: DispatchLogEntry[] = studentIds
          .map((id) => studentMap.get(id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
          .map((student) => ({
            timestamp: nowIso,
            studentId: student.studentId,
            registrationNumber: student.registrationNumber,
            studentName: student.name,
            phone: student.phone,
            className: student.className,
            competitionName: student.competitionName,
            schoolOrCollege: student.schoolOrCollege,
            status: targetStatus,
            provider: 'Browser Queue / wa.me',
            details: `Candidate marked as ${targetStatus} (Template: ${activeTemplateDef.title}) [Group: ${perStudentMeta[student.studentId]?.groupLink || 'Default'}]`,
          }));
        await logWhatsAppDispatchRealTime(logEntries);
      } catch (logErr) {
        console.error('Failed to write real-time dispatch log to Excel:', logErr);
      }

      // Record campaign history
      try {
        const campaignRecord: WhatsAppCampaign = {
          campaignId,
          name: effectiveCampaignName,
          competitionGroup: competitionGroup || 'ALL',
          classGroup: classGroup || 'ALL',
          templateId: templateType,
          templateName: activeTemplateDef.title,
          templateVersion: activeTemplateDef.version || 1,
          dispatchedAt: new Date().toISOString(),
          dispatchedBy: user.email || user.displayName || 'Admin',
          totalCandidates: studentIds.length,
          succeededCount: updatedCount,
          failedCount: 0,
          pendingCount: 0,
          provider: 'Browser Queue / wa.me',
          status: 'COMPLETED',
        };
        const currentCampaigns = Array.isArray(settings.whatsappCampaigns) ? [...settings.whatsappCampaigns] : [];
        currentCampaigns.unshift(campaignRecord);
        await db.updateSettings({ whatsappCampaigns: currentCampaigns.slice(0, 50) });
      } catch (campErr) {
        console.error('Failed to record campaign history:', campErr);
      }

      await db.addAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'WHATSAPP_BULK_DISPATCH_RECORDED',
        targetType: 'WHATSAPP',
        targetId: campaignId,
        details: {
          count: updatedCount,
          status: targetStatus,
          provider: 'browser_wa_me_queue',
          templateId: templateType,
          competitionGroup,
          classGroup,
        },
      });

      return NextResponse.json({
        success: true,
        updatedCount,
        status: targetStatus,
        campaignId,
        message: `Successfully processed ${updatedCount} candidates in ${targetStatus}`,
      });
    }

    // Action 2: Reset status to NOT_SENT for re-sending
    if (provider === 'reset_unsent') {
      assertPermission(user, 'messages.prepare');
      const updatedCount = await db.batchUpdateStudentWhatsAppStatus(studentIds, 'NOT_SENT', { preserveSuccessful: true });

      await db.addAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'WHATSAPP_BULK_RESET',
        targetType: 'WHATSAPP',
        targetId: `bulk_${Date.now()}`,
        details: { count: updatedCount },
      });

      return NextResponse.json({
        success: true,
        updatedCount,
        status: 'NOT_SENT',
        message: `Reset ${updatedCount} candidates back to unsent queue`,
      });
    }



    // Action 4: ICPaaS (icpaas.in) Official Gateway Bulk Send
    if (provider === 'icpaas') {
      assertPermission(user, 'messages.send');

      const adapter = new ICPaaSAdapter();
      if (!adapter.isConfigured()) {
        return NextResponse.json(
          {
            success: false,
            error:
              'ICPaaS Gateway is not configured. Please set ICPAAS_API_KEY in .env.local or Vercel Environment Variables.',
          },
          { status: 400 }
        );
      }

      const allActive = await db.getAllActiveStudents();
      const studentMap = new Map(allActive.map((s) => [s.studentId, s]));

      const defaultRawTemplate = (customMessage && customMessage.trim()) ? customMessage : activeTemplateDef.defaultText;
      const targetTemplateName = templateName || settings.whatsappTemplateName || process.env.ICPAAS_TEMPLATE_NAME || 'admit_card_new';
      const targetLanguage = templateLanguage || 'en';
      const studentTemplateMap = new Map<
        string,
        { id: string; title: string; version: number; message: string; groupLink: string }
      >();

      const batchItems = [];
      const skippedAlreadySent: string[] = [];

      // If individual personal send, verify candidate eligibility first and block duplicate
      if (studentIds.length === 1) {
        const targetStudent = studentMap.get(studentIds[0]);
        if (targetStudent && DeduplicationGuard.isAlreadyDelivered(targetStudent, { templateId: templateType })) {
          return NextResponse.json(
            {
              success: false,
              error: `Deduplication Policy Enforced: Candidate "${targetStudent.name}" has already received their Admit Card notification (Status: ${targetStudent.whatsappStatus}). Duplicate messages cannot be sent.`,
              skippedCount: 1,
              succeededCount: 0,
              failedCount: 0,
            },
            { status: 409 }
          );
        }
      }

      for (const id of studentIds) {
        const student = studentMap.get(id);
        if (student) {
          // MANDATORY SERVER-SIDE DUPLICATE PREVENTION:
          // A recipient who has already successfully received a message must never receive that same message again.
          const dedupKey = DeduplicationGuard.getDeduplicationKey(student.studentId, {
            notificationType: templateType,
            sessionYear: settings.regNoYear || '2026',
          });

          if (DeduplicationGuard.isAlreadyDelivered(student, { templateId: templateType })) {
            skippedAlreadySent.push(student.studentId);
            continue;
          }

          let studentMessage = '';
          let studentGrpLink = '';
          let studentTId = templateType;
          let studentTTitle = activeTemplateDef.title;
          let studentTVersion = activeTemplateDef.version || 1;

          // Safe Resending: if enabled and student has prior message content, preserve it identically
          if (usePreviousTemplateForResend && student.lastMessageContent) {
            studentMessage = student.lastMessageContent;
            studentGrpLink = student.lastGroupLink || getCategoryGroupLink(student.competitionName, settings, student.className);
            studentTId = student.lastTemplateId || templateType;
            studentTTitle = student.lastTemplateName || activeTemplateDef.title;
            studentTVersion = Number(student.lastTemplateVersion || 1);
          } else {
            studentMessage = renderMessageTemplate(defaultRawTemplate, student, settings, origin);
            studentGrpLink = getCategoryGroupLink(student.competitionName, settings, student.className);
          }

          studentTemplateMap.set(student.studentId, {
            id: studentTId,
            title: studentTTitle,
            version: studentTVersion,
            message: studentMessage,
            groupLink: studentGrpLink,
          });

          // Build template parameter body variables for official ICPaaS / Meta approved templates
          let bodyParams: string[] = [];
          if (Array.isArray(variableMapping) && variableMapping.length > 0) {
            bodyParams = variableMapping.map((field: string) => {
              switch (field) {
                case 'competitionTitle':
                  return settings.competitionTitle || 'Mind Spark Competition- 2026';
                case 'participantName':
                  return student.name ? `Participant ${student.name}` : 'Participant';
                case 'enrollmentNotice':
                  return `Your form has been successfully enrolled for Mind Spark Competition 2026 This is your Registration Number: ${student.registrationNumber}`;
                case 'admitCardInstructions':
                  return 'After 26th October, we will provide a link on your WhatsApp to download your admit card. You can enter your Registration Number and Date of Birth to download your admit card.';
                case 'groupLinkNotice':
                  return `Join whatspp group for more update ${studentGrpLink}`;
                case 'name': return student.name;
                case 'registrationNumber': return student.registrationNumber;
                case 'className': return student.className;
                case 'competitionName': return student.competitionName;
                case 'schoolOrCollege': return student.schoolOrCollege;
                case 'fatherName': return student.fatherName;
                case 'examDate': return settings.examDate || '01 Nov 2026';
                case 'reportingTime': return settings.reportingTime || '09:00 AM';
                case 'venue': return settings.venue || 'MSITM DEGREE COLLEGE GONDA';
                case 'admitCardDate': return '25 October 2026';
                case 'admitCardUrl': return `${origin}/admit-cards?regNo=${student.registrationNumber}`;
                case 'whatsappGroupLink':
                case 'groupLink':
                  return studentGrpLink;
                case 'dateOfBirth':
                case 'dob':
                  return student.dateOfBirth || '';
                default: return field;
              }
            });
          } else if (targetTemplateName === 'admit_card_new') {
            bodyParams = [
              settings.competitionTitle || 'Mind Spark Competition- 2026',
              student.name ? `Participant ${student.name}` : 'Participant',
              `Your form has been successfully enrolled for Mind Spark Competition 2026 This is your Registration Number: ${student.registrationNumber}`,
              'After 26th October, we will provide a link on your WhatsApp to download your admit card. You can enter your Registration Number and Date of Birth to download your admit card.',
              `Join whatspp group for more update ${studentGrpLink}`,
            ];
          } else {
            bodyParams = [
              student.name,
              student.registrationNumber,
              student.className || student.competitionName,
              '25 October 2026',
              studentGrpLink,
            ];
          }

          batchItems.push({
            studentId: student.studentId,
            phone: student.phone,
            message: studentMessage,
            templateName: targetTemplateName,
            language: targetLanguage,
            templateParams: bodyParams,
            dedupKey,
          });
        }
      }

      // If all candidates in this batch were already sent, return immediately without touching gateway
      if (batchItems.length === 0 && skippedAlreadySent.length > 0) {
        return NextResponse.json({
          success: true,
          total: studentIds.length,
          succeededCount: 0,
          failedCount: 0,
          skippedCount: skippedAlreadySent.length,
          message: `All ${skippedAlreadySent.length} candidate(s) were already messaged. Zero duplicates dispatched.`,
        });
      }

      // Sequential dispatch with IMMEDIATE per-student DB updates (Never lost on timeout!)
      const succeededIds: string[] = [];
      const failedDetails: Array<{ studentId: string; error: string; isUncertain?: boolean }> = [];
      const perStudentMeta: Record<
        string,
        {
          messageId?: string;
          error?: string;
          templateId?: string;
          templateName?: string;
          templateVersion?: number;
          messageContent?: string;
          groupLink?: string;
          campaignId?: string;
          campaignName?: string;
          isUncertain?: boolean;
          dedupKey?: string;
        }
      > = {};

      for (const item of batchItems) {
        // Atomic Job Claim to prevent race conditions across serverless instances, concurrent workers, or admin sessions
        const claimResult = await DeduplicationGuard.claimRecipientDurable(item.studentId, user.uid || 'admin', {
          notificationType: templateType,
          templateId: templateType,
          sessionYear: settings.regNoYear || '2026',
        });
        if (!claimResult.claimed) {
          if (claimResult.isUncertain) {
            // CRASH-AFTER-PROVIDER-ACCEPTANCE RECONCILIATION:
            // The previous worker was in the middle of dispatch when the process terminated.
            // Do NOT blindly resend to avoid duplicate messages. Transition to UNCERTAIN and await webhook receipt.
            try {
              await db.updateStudent(item.studentId, {
                whatsappStatus: 'UNCERTAIN',
                updatedAt: new Date().toISOString(),
              });
            } catch {}
            failedDetails.push({
              studentId: item.studentId,
              error: `Uncertain Crash Recovery: Candidate was in-flight when previous process crashed. Awaiting webhook delivery receipt to prevent duplicate sending.`,
              isUncertain: true,
            });
          } else {
            failedDetails.push({
              studentId: item.studentId,
              error: `Conflict: Candidate is actively being processed (${claimResult.reason || 'cross-instance lock'})`,
            });
          }
          continue;
        }

        try {
          // Re-verify against authoritative database right before dispatch
          const studentLive = await db.getStudentById(item.studentId);
          if (!studentLive || DeduplicationGuard.isAlreadyDelivered(studentLive, { templateId: templateType })) {
            skippedAlreadySent.push(item.studentId);
            continue;
          }

          // Fencing Check & Dispatch Commenced Mark:
          // If this worker was stalled and superseded by another worker, abort dispatch!
          const fenceResult = await DeduplicationGuard.markDispatchCommencedDurable(
            item.studentId,
            user.uid || 'admin',
            claimResult.fencingToken || '',
            {
              notificationType: templateType,
              templateId: templateType,
              sessionYear: settings.regNoYear || '2026',
            }
          );

          if (!fenceResult.success) {
            failedDetails.push({
              studentId: item.studentId,
              error: `Fencing violation: Claim was superseded before dispatch commenced. Aborted stale worker dispatch.`,
            });
            continue;
          }

          const attemptId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const initiatedAt = new Date().toISOString();

          const sendResult = await adapter.sendMessage(item.phone, item.message, {
            templateName: item.templateName,
            language: item.language,
            bodyParams: item.templateParams,
          });

          const providerAcceptedAt = new Date().toISOString();

          // Durably record individual provider submission in PostgreSQL audit_logs
          await DeduplicationGuard.recordDurableDispatchSubmission({
            studentId: item.studentId,
            registrationNumber: studentLive.registrationNumber,
            phone: item.phone,
            logicalNotificationId: item.dedupKey,
            providerMessageId: sendResult.messageId || attemptId,
            attemptId,
            initiatedAt,
            providerAcceptedAt,
            status: sendResult.success ? 'SENT' : (sendResult.isUncertain ? 'UNCERTAIN' : 'FAILED'),
            provider: 'ICPaaS Gateway (v23.0)',
            templateId: templateType,
            error: sendResult.error,
            actorUid: user.uid,
            actorEmail: user.email,
          });

          const tInfo = studentTemplateMap.get(item.studentId);
          const nowIso = providerAcceptedAt;

          if (sendResult.success) {
            succeededIds.push(item.studentId);
            perStudentMeta[item.studentId] = {
              messageId: sendResult.messageId,
              templateId: tInfo?.id || templateType,
              templateName: tInfo?.title || activeTemplateDef.title,
              templateVersion: tInfo?.version || 1,
              messageContent: tInfo?.message || '',
              groupLink: tInfo?.groupLink || '',
              campaignId,
              campaignName: effectiveCampaignName,
              dedupKey: item.dedupKey,
            };

            // IMMEDIATE DB UPDATE: Never lose status if function times out!
            try {
              const currentHistory = Array.isArray(studentLive.messageHistory) ? [...studentLive.messageHistory] : [];
              currentHistory.push({
                templateId: tInfo?.id || templateType,
                templateName: tInfo?.title || activeTemplateDef.title,
                templateVersion: tInfo?.version || 1,
                messageContent: tInfo?.message || '',
                groupLink: tInfo?.groupLink || '',
                campaignId,
                campaignName: effectiveCampaignName,
                sentAt: nowIso,
                status: 'SENT',
                messageId: sendResult.messageId,
                provider: 'ICPaaS Gateway (v23.0)',
                dedupKey: item.dedupKey,
                retryCount: currentHistory.length + 1,
              });

              await db.updateStudent(item.studentId, {
                whatsappStatus: 'SENT',
                whatsappSentAt: nowIso,
                lastTemplateName: tInfo?.title || activeTemplateDef.title,
                lastTemplateVersion: tInfo?.version || 1,
                lastMessageContent: tInfo?.message || '',
                lastGroupLink: tInfo?.groupLink || '',
                messageHistory: currentHistory,
              });
            } catch (dbErr) {
              console.error('Failed to update student status in DB:', dbErr);
            }
          } else {
            // UNCERTAIN vs DEFINITIVE FAILURE:
            // A timeout or unknown provider response must be treated as an uncertain delivery, not automatically as confirmed failure.
            const statusToRecord: WhatsAppStatus = sendResult.isUncertain ? 'UNCERTAIN' : 'FAILED';
            failedDetails.push({
              studentId: item.studentId,
              error: sendResult.error || 'Dispatch Failed',
              isUncertain: sendResult.isUncertain,
            });

            perStudentMeta[item.studentId] = {
              error: sendResult.error,
              templateId: tInfo?.id || templateType,
              templateName: tInfo?.title || activeTemplateDef.title,
              templateVersion: tInfo?.version || 1,
              messageContent: tInfo?.message || '',
              groupLink: tInfo?.groupLink || '',
              campaignId,
              campaignName: effectiveCampaignName,
              isUncertain: sendResult.isUncertain,
              dedupKey: item.dedupKey,
            };

            try {
              const currentHistory = Array.isArray(studentLive.messageHistory) ? [...studentLive.messageHistory] : [];
              currentHistory.push({
                templateId: tInfo?.id || templateType,
                templateName: tInfo?.title || activeTemplateDef.title,
                templateVersion: tInfo?.version || 1,
                messageContent: tInfo?.message || '',
                groupLink: tInfo?.groupLink || '',
                campaignId,
                campaignName: effectiveCampaignName,
                sentAt: nowIso,
                status: statusToRecord,
                error: sendResult.error,
                provider: 'ICPaaS Gateway (v23.0)',
                dedupKey: item.dedupKey,
                isUncertain: sendResult.isUncertain,
                retryCount: currentHistory.length + 1,
              });

              await db.updateStudent(item.studentId, {
                whatsappStatus: statusToRecord,
                updatedAt: nowIso,
                messageHistory: currentHistory,
              });
            } catch {}
          }
        } finally {
          await DeduplicationGuard.releaseRecipientDurable(item.studentId, {
            notificationType: templateType,
            templateId: templateType,
            sessionYear: settings.regNoYear || '2026',
          });
        }

        if (batchItems.length > 1) {
          await new Promise((r) => setTimeout(r, Math.max(30, Number(delayMs) || 60)));
        }
      }

      // Record campaign history
      try {
        const campaignRecord: WhatsAppCampaign = {
          campaignId,
          name: effectiveCampaignName,
          competitionGroup: competitionGroup || 'ALL',
          classGroup: classGroup || 'ALL',
          templateId: templateType,
          templateName: activeTemplateDef.title,
          templateVersion: activeTemplateDef.version || 1,
          dispatchedAt: new Date().toISOString(),
          dispatchedBy: user.email || user.displayName || 'Admin',
          totalCandidates: batchItems.length,
          succeededCount: succeededIds.length,
          failedCount: failedDetails.length,
          pendingCount: 0,
          provider: 'ICPaaS Gateway (v23.0)',
          status: failedDetails.length === 0 ? 'COMPLETED' : (succeededIds.length > 0 ? 'PARTIAL' : 'FAILED'),
        };
        const currentCampaigns = Array.isArray(settings.whatsappCampaigns) ? [...settings.whatsappCampaigns] : [];
        currentCampaigns.unshift(campaignRecord);
        await db.updateSettings({ whatsappCampaigns: currentCampaigns.slice(0, 50) });
      } catch (campErr) {
        console.error('Failed to record campaign history:', campErr);
      }

      // Real-time synchronization to local Excel log & Master Spreadsheet
      try {
        const nowIso = new Date().toISOString();
        const succeededSet = new Set(succeededIds);
        const failedMap = new Map(failedDetails.map((f) => [f.studentId, f.error]));

        const logEntries: DispatchLogEntry[] = batchItems.map((item) => {
          const student = studentMap.get(item.studentId)!;
          const isSucceeded = succeededSet.has(item.studentId);
          const tInfo = studentTemplateMap.get(item.studentId);
          return {
            timestamp: nowIso,
            studentId: student.studentId,
            registrationNumber: student.registrationNumber,
            studentName: student.name,
            phone: student.phone,
            className: student.className,
            competitionName: student.competitionName,
            schoolOrCollege: student.schoolOrCollege,
            status: isSucceeded ? 'SENT' : 'FAILED',
            provider: 'ICPaaS Gateway (v23.0)',
            details: isSucceeded
              ? `Admit card notification dispatched via ICPaaS (Meta ID: ${perStudentMeta[student.studentId]?.messageId || 'wamid'}) [Group: ${tInfo?.groupLink || 'N/A'}]`
              : (failedMap.get(item.studentId) || 'ICPaaS gateway error'),
          };
        });

        await logWhatsAppDispatchRealTime(logEntries);
      } catch (logErr) {
        console.error('Failed to write real-time ICPaaS dispatch log to Excel:', logErr);
      }

      await db.addAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'WHATSAPP_ICPAAS_BULK_SEND',
        targetType: 'WHATSAPP',
        targetId: campaignId,
        details: {
          total: batchItems.length,
          succeeded: succeededIds.length,
          failed: failedDetails.length,
          skippedDuplicates: skippedAlreadySent.length,
          provider: 'icpaas.in',
          competitionGroup,
          classGroup,
          templateId: templateType,
        },
      });

      return NextResponse.json({
        success: true,
        campaignId,
        total: batchItems.length,
        succeededCount: succeededIds.length,
        failedCount: failedDetails.length,
        skippedCount: skippedAlreadySent.length,
        failedDetails,
      });
    }

    return NextResponse.json({ error: `Unknown provider mode: '${provider}'` }, { status: 400 });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Bulk dispatch execution failed' }, { status });
  }
}
