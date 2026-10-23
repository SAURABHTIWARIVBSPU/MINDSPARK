import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { WhatsAppCloudApiAdapter } from '@/lib/whatsapp/cloud-api';
import { ICPaaSAdapter } from '@/lib/whatsapp/icpaas.adapter';
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
      provider = 'browser_queue_sync',
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

    // Action 1: Mark as Sent / Opened (from Browser Queue or Operator action)
    if (provider === 'browser_queue_sync' || provider === 'mark_sent') {
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
      const updatedCount = await db.batchUpdateStudentWhatsAppStatus(studentIds, 'NOT_SENT');

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

    // Action 3: Official Meta WhatsApp Cloud API Automated Bulk Send
    if (provider === 'cloud_api') {
      assertPermission(user, 'messages.send');

      const adapter = new WhatsAppCloudApiAdapter(
        settings.whatsappCloudToken,
        settings.whatsappPhoneNumberId
      );

      if (!adapter.isConfigured()) {
        return NextResponse.json(
          {
            success: false,
            error:
              'WhatsApp Cloud API is not configured. Please add WHATSAPP_CLOUD_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment or Settings.',
          },
          { status: 400 }
        );
      }

      const allActive = await db.getAllActiveStudents();
      const studentMap = new Map(allActive.map((s) => [s.studentId, s]));

      const defaultRawTemplate = (customMessage && customMessage.trim()) ? customMessage : activeTemplateDef.defaultText;
      const studentTemplateMap = new Map<
        string,
        { id: string; title: string; version: number; message: string; groupLink: string }
      >();

      const batchItems = [];
      for (const id of studentIds) {
        const student = studentMap.get(id);
        if (student) {
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

          batchItems.push({
            studentId: student.studentId,
            phone: student.phone,
            message: studentMessage,
          });
        }
      }

      const batchResult = await adapter.sendBatch(batchItems, Math.max(50, Number(delayMs) || 100));

      // Build per-student metadata including exact message ID / wamid
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

      for (const res of batchResult.results || []) {
        const tInfo = studentTemplateMap.get(res.studentId);
        perStudentMeta[res.studentId] = {
          messageId: res.messageId,
          error: res.error,
          templateId: tInfo?.id || templateType,
          templateName: tInfo?.title || activeTemplateDef.title,
          templateVersion: tInfo?.version || 1,
          messageContent: tInfo?.message || '',
          groupLink: tInfo?.groupLink || '',
          campaignId,
          campaignName: effectiveCampaignName,
        };
      }

      // Persist success statuses
      if (batchResult.succeeded.length > 0) {
        await db.batchUpdateStudentWhatsAppStatus(batchResult.succeeded, 'SENT', {
          templateId: templateType,
          templateName: activeTemplateDef.title,
          templateVersion: activeTemplateDef.version || 1,
          provider: 'WhatsApp Cloud API',
          campaignId,
          campaignName: effectiveCampaignName,
          perStudentMetadata: perStudentMeta,
        });
      }

      // Persist failure statuses
      if (batchResult.failed.length > 0) {
        const failedIds = batchResult.failed.map((f) => f.studentId);
        await db.batchUpdateStudentWhatsAppStatus(failedIds, 'FAILED', {
          templateId: templateType,
          templateName: activeTemplateDef.title,
          templateVersion: activeTemplateDef.version || 1,
          provider: 'WhatsApp Cloud API',
          campaignId,
          campaignName: effectiveCampaignName,
          perStudentMetadata: perStudentMeta,
        });
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
          totalCandidates: batchResult.total,
          succeededCount: batchResult.succeeded.length,
          failedCount: batchResult.failed.length,
          pendingCount: 0,
          provider: 'WhatsApp Cloud API',
          status: batchResult.failed.length === 0 ? 'COMPLETED' : (batchResult.succeeded.length > 0 ? 'PARTIAL' : 'FAILED'),
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
        const succeededSet = new Set(batchResult.succeeded);
        const failedMap = new Map(batchResult.failed.map((f) => [f.studentId, f.error]));

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
            provider: 'WhatsApp Cloud API',
            details: isSucceeded
              ? `Delivered via official Meta Cloud API (ID: ${perStudentMeta[student.studentId]?.messageId || 'wamid'}) [Group: ${tInfo?.groupLink || 'N/A'}]`
              : (failedMap.get(item.studentId) || 'Cloud API send error'),
          };
        });

        await logWhatsAppDispatchRealTime(logEntries);
      } catch (logErr) {
        console.error('Failed to write real-time Cloud API dispatch log to Excel:', logErr);
      }

      await db.addAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'WHATSAPP_CLOUD_API_BULK_SEND',
        targetType: 'WHATSAPP',
        targetId: campaignId,
        details: {
          total: batchResult.total,
          succeeded: batchResult.succeeded.length,
          failed: batchResult.failed.length,
          competitionGroup,
          classGroup,
          templateId: templateType,
        },
      });

      return NextResponse.json({
        success: true,
        campaignId,
        total: batchResult.total,
        succeededCount: batchResult.succeeded.length,
        failedCount: batchResult.failed.length,
        failedDetails: batchResult.failed,
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

      for (const id of studentIds) {
        const student = studentMap.get(id);
        if (student) {
          // STRICT DUPLICATE PREVENTION:
          // Unless forceResend is explicitly requested, NEVER resend to students who already received a message!
          const isAlreadySent =
            student.whatsappStatus === 'SENT' ||
            student.whatsappStatus === 'DELIVERED' ||
            student.whatsappStatus === 'READ' ||
            student.whatsappStatus === 'OPENED';

          if (!body.forceResend && !body.allowDuplicates && isAlreadySent) {
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
      const failedDetails: Array<{ studentId: string; error: string }> = [];
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

      for (const item of batchItems) {
        const sendResult = await adapter.sendMessage(item.phone, item.message, {
          templateName: item.templateName,
          language: item.language,
          bodyParams: item.templateParams,
        });

        const tInfo = studentTemplateMap.get(item.studentId);
        const nowIso = new Date().toISOString();

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
          };

          // IMMEDIATE DB UPDATE: Never lose status if function times out!
          try {
            await db.updateStudent(item.studentId, {
              whatsappStatus: 'SENT',
              whatsappSentAt: nowIso,
              lastTemplateName: tInfo?.title || activeTemplateDef.title,
              lastTemplateVersion: tInfo?.version || 1,
              lastMessageContent: tInfo?.message || '',
              lastGroupLink: tInfo?.groupLink || '',
            });
          } catch (dbErr) {
            console.error('Failed to update student status in DB:', dbErr);
          }
        } else {
          failedDetails.push({ studentId: item.studentId, error: sendResult.error || 'Dispatch Failed' });
          perStudentMeta[item.studentId] = {
            error: sendResult.error,
            templateId: tInfo?.id || templateType,
            templateName: tInfo?.title || activeTemplateDef.title,
            templateVersion: tInfo?.version || 1,
            messageContent: tInfo?.message || '',
            groupLink: tInfo?.groupLink || '',
            campaignId,
            campaignName: effectiveCampaignName,
          };

          try {
            await db.updateStudent(item.studentId, {
              whatsappStatus: 'FAILED',
              updatedAt: nowIso,
            });
          } catch {}
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
