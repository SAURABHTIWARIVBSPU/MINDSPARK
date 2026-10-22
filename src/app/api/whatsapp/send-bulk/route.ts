import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { WhatsAppCloudApiAdapter } from '@/lib/whatsapp/cloud-api';
import { ICPaaSAdapter } from '@/lib/whatsapp/icpaas.adapter';
import { renderMessageTemplate, WHATSAPP_TEMPLATES, WhatsAppTemplateId } from '@/lib/whatsapp/message-builder';
import { WhatsAppStatus } from '@/types';
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
    } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'No candidate IDs provided for bulk action' }, { status: 400 });
    }

    const db = getDb();
    const origin = req.nextUrl.origin;

    // Action 1: Mark as Sent / Opened (from Browser Queue or Operator action)
    if (provider === 'browser_queue_sync' || provider === 'mark_sent') {
      assertPermission(user, 'messages.prepare');
      const targetStatus: WhatsAppStatus = status === 'OPENED' ? 'OPENED' : 'SENT';
      const updatedCount = await db.batchUpdateStudentWhatsAppStatus(studentIds, targetStatus);

      // Real-time synchronization to local Excel log & Master Spreadsheet
      try {
        const allActive = await db.getAllActiveStudents();
        const studentMap = new Map(allActive.map((s) => [s.studentId, s]));
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
            details: `Candidate marked as ${targetStatus}`,
          }));
        await logWhatsAppDispatchRealTime(logEntries);
      } catch (logErr) {
        console.error('Failed to write real-time dispatch log to Excel:', logErr);
      }

      await db.addAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'WHATSAPP_BULK_DISPATCH_RECORDED',
        targetType: 'WHATSAPP',
        targetId: `bulk_${Date.now()}`,
        details: {
          count: updatedCount,
          status: targetStatus,
          provider: 'browser_wa_me_queue',
        },
      });

      return NextResponse.json({
        success: true,
        updatedCount,
        status: targetStatus,
        message: `Successfully updated ${updatedCount} candidates to ${targetStatus}`,
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

      const settings = await db.getSettings();
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

      // Fetch student details for all requested IDs
      const allActive = await db.getAllActiveStudents();
      const studentMap = new Map(allActive.map((s) => [s.studentId, s]));

      const templateDef = WHATSAPP_TEMPLATES[templateType as WhatsAppTemplateId] || WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION;
      const rawTemplate = (customMessage && customMessage.trim()) ? customMessage : templateDef.defaultText;

      const batchItems = [];
      for (const id of studentIds) {
        const student = studentMap.get(id);
        if (student) {
          const messageText = renderMessageTemplate(rawTemplate, student, settings, origin);
          batchItems.push({
            studentId: student.studentId,
            phone: student.phone,
            message: messageText,
          });
        }
      }

      const batchResult = await adapter.sendBatch(batchItems, Math.max(50, Number(delayMs) || 100));

      // Persist success statuses
      if (batchResult.succeeded.length > 0) {
        await db.batchUpdateStudentWhatsAppStatus(batchResult.succeeded, 'SENT');
      }

      // Persist failure statuses
      if (batchResult.failed.length > 0) {
        const failedIds = batchResult.failed.map((f) => f.studentId);
        await db.batchUpdateStudentWhatsAppStatus(failedIds, 'FAILED');
      }

      // Real-time synchronization to local Excel log & Master Spreadsheet
      try {
        const nowIso = new Date().toISOString();
        const succeededSet = new Set(batchResult.succeeded);
        const failedMap = new Map(batchResult.failed.map((f) => [f.studentId, f.error]));

        const logEntries: DispatchLogEntry[] = batchItems.map((item) => {
          const student = studentMap.get(item.studentId)!;
          const isSucceeded = succeededSet.has(item.studentId);
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
              ? 'Delivered via official Meta Cloud API'
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
        targetId: `cloud_job_${Date.now()}`,
        details: {
          total: batchResult.total,
          succeeded: batchResult.succeeded.length,
          failed: batchResult.failed.length,
        },
      });

      return NextResponse.json({
        success: true,
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

      const settings = await db.getSettings();
      const allActive = await db.getAllActiveStudents();
      const studentMap = new Map(allActive.map((s) => [s.studentId, s]));

      const templateDef = WHATSAPP_TEMPLATES[templateType as WhatsAppTemplateId] || WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION;
      const rawTemplate = (customMessage && customMessage.trim()) ? customMessage : templateDef.defaultText;

      const batchItems = [];
      for (const id of studentIds) {
        const student = studentMap.get(id);
        if (student) {
          const messageText = renderMessageTemplate(rawTemplate, student, settings, origin);
          batchItems.push({
            studentId: student.studentId,
            phone: student.phone,
            message: messageText,
          });
        }
      }

      const batchResult = await adapter.sendBatch(batchItems, Math.max(50, Number(delayMs) || 100));

      if (batchResult.succeeded.length > 0) {
        await db.batchUpdateStudentWhatsAppStatus(batchResult.succeeded, 'SENT');
      }

      if (batchResult.failed.length > 0) {
        const failedIds = batchResult.failed.map((f) => f.studentId);
        await db.batchUpdateStudentWhatsAppStatus(failedIds, 'FAILED');
      }

      // Real-time synchronization to local Excel log & Master Spreadsheet
      try {
        const nowIso = new Date().toISOString();
        const succeededSet = new Set(batchResult.succeeded);
        const failedMap = new Map(batchResult.failed.map((f) => [f.studentId, f.error]));

        const logEntries: DispatchLogEntry[] = batchItems.map((item) => {
          const student = studentMap.get(item.studentId)!;
          const isSucceeded = succeededSet.has(item.studentId);
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
            provider: 'ICPaaS Gateway (100 Bulk)',
            details: isSucceeded
              ? 'Admit card notification dispatched via ICPaaS gateway'
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
        targetId: `icpaas_job_${Date.now()}`,
        details: {
          total: batchResult.total,
          succeeded: batchResult.succeeded.length,
          failed: batchResult.failed.length,
          provider: 'icpaas.in',
        },
      });

      return NextResponse.json({
        success: true,
        total: batchResult.total,
        succeededCount: batchResult.succeeded.length,
        failedCount: batchResult.failed.length,
        failedDetails: batchResult.failed,
      });
    }

    return NextResponse.json({ error: `Unknown provider mode: '${provider}'` }, { status: 400 });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Bulk dispatch execution failed' }, { status });
  }
}
