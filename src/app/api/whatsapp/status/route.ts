import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { WhatsAppStatus } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'messages.prepare');

    const db = getDb();
    const students = await db.getAllActiveStudents();

    const uncertainStudents = students.filter((s) => s.whatsappStatus === 'UNCERTAIN');
    const now = Date.now();

    const agingBuckets = {
      under5Min: 0,
      between5And30Min: 0,
      over30MinStale: 0,
    };

    const staleCandidates: Array<{
      studentId: string;
      name: string;
      registrationNumber: string;
      phone: string;
      ageMinutes: number;
      updatedAt?: string;
    }> = [];

    for (const s of uncertainStudents) {
      const updatedAt = s.updatedAt ? new Date(s.updatedAt).getTime() : now;
      const ageMs = now - updatedAt;
      if (ageMs < 5 * 60 * 1000) {
        agingBuckets.under5Min++;
      } else if (ageMs < 30 * 60 * 1000) {
        agingBuckets.between5And30Min++;
      } else {
        agingBuckets.over30MinStale++;
        staleCandidates.push({
          studentId: s.studentId,
          name: s.name,
          registrationNumber: s.registrationNumber,
          phone: s.phone,
          ageMinutes: Math.round(ageMs / 60000),
          updatedAt: s.updatedAt,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalUncertain: uncertainStudents.length,
      agingBuckets,
      staleCandidates,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to fetch status metrics' }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'messages.prepare');

    const body = await req.json();
    const { studentId, status = 'OPENED', reason, evidenceRef, affectedAttemptId, reconcileUncertain } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const validStatuses: WhatsAppStatus[] = ['NOT_SENT', 'OPENED', 'SENT', 'FAILED', 'DELIVERED', 'UNCERTAIN'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status: '${status}'` }, { status: 400 });
    }

    const db = getDb();
    const existingStudent = await db.getStudentById(studentId);
    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // DUPLICATE PREVENTION INVARIANTS:
    // 1. Administrative resolution CANNOT reset a confirmed delivered candidate to NOT_SENT
    if (status === 'NOT_SENT' && ['DELIVERED', 'READ', 'OPENED', 'SENT'].includes(existingStudent.whatsappStatus || '')) {
      return NextResponse.json(
        {
          error: `Duplicate Prevention Policy: Cannot reset a confirmed sent/delivered candidate (Current Status: ${existingStudent.whatsappStatus}) to NOT_SENT.`,
        },
        { status: 409 }
      );
    }

    // 2. Safe Resolution Policy: Administrators CANNOT reset an UNCERTAIN notification directly to NOT_SENT
    // merely by entering a justification, as that risks duplicate bulk dispatch.
    // Must require authoritative provider reconciliation: resolve to DELIVERED (if confirmed received)
    // or FAILED (if confirmed rejected/undelivered by provider, authorizing safe controlled retry).
    if (existingStudent.whatsappStatus === 'UNCERTAIN' && status === 'NOT_SENT') {
      return NextResponse.json(
        {
          error:
            'Safe Resolution Policy: Cannot reset an UNCERTAIN notification to NOT_SENT. Authoritative provider reconciliation is required. Resolve to DELIVERED (if confirmed received) or FAILED (if confirmed undelivered/rejected by provider).',
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Durable Auditable Reconciliation for UNCERTAIN Notifications
    if (existingStudent.whatsappStatus === 'UNCERTAIN' || reconcileUncertain) {
      // Reconciling uncertain dispatch state requires elevated messages.send authority
      assertPermission(user, 'messages.send');

      if (!reason || reason.trim().length < 10) {
        return NextResponse.json(
          { error: 'An auditable reason (minimum 10 characters) is required to reconcile an UNCERTAIN notification.' },
          { status: 400 }
        );
      }

      if (!evidenceRef || evidenceRef.trim().length < 3) {
        return NextResponse.json(
          { error: 'An authoritative evidence reference (e.g., provider message ID, support ticket, or call log) is required.' },
          { status: 400 }
        );
      }

      const targetAttempt = affectedAttemptId || existingStudent.messageHistory?.[existingStudent.messageHistory.length - 1]?.messageId || 'UNKNOWN_ATTEMPT';

      await db.addAuditLog({
        actorUid: user!.uid,
        actorEmail: user!.email,
        action: 'WHATSAPP_UNCERTAIN_RECONCILED',
        targetType: 'STUDENT',
        targetId: studentId,
        details: {
          previousStatus: existingStudent.whatsappStatus,
          resolvedStatus: status,
          reason: reason.trim(),
          evidenceRef: evidenceRef.trim(),
          affectedAttemptId: targetAttempt,
          resolvedByUid: user!.uid,
          resolvedByEmail: user!.email,
          timestamp: now,
        },
      });

      // Clean up durable claim lock on safe reconciliation
      try {
        const { DeduplicationGuard } = await import('@/lib/whatsapp/deduplication-guard');
        await DeduplicationGuard.releaseRecipientDurable(studentId, {
          templateId: 'admit_card_new',
          sessionYear: '2026',
        });
      } catch {}
    }

    const updates: any = {
      whatsappStatus: status,
      updatedBy: user!.uid,
      updatedAt: now,
    };

    if (existingStudent.whatsappStatus === 'UNCERTAIN' || reconcileUncertain) {
      const history = Array.isArray(existingStudent.messageHistory) ? [...existingStudent.messageHistory] : [];
      if (history.length > 0) {
        const targetAttempt = affectedAttemptId || history[history.length - 1]?.messageId || 'UNKNOWN_ATTEMPT';
        const attemptIdx = history.findIndex((h) => h.messageId === targetAttempt);
        const idxToUpdate = attemptIdx !== -1 ? attemptIdx : history.length - 1;
        history[idxToUpdate] = {
          ...history[idxToUpdate],
          status,
          reconciledAt: now,
          reconciledBy: user!.email || user!.uid,
          reconciliationReason: reason?.trim(),
          evidenceRef: evidenceRef?.trim(),
        };
        updates.messageHistory = history;
      }
    }

    if (status === 'SENT' || status === 'OPENED' || status === 'DELIVERED') {
      updates.whatsappSentAt = now;
    }

    const updatedStudent = await db.updateStudent(studentId, updates);

    return NextResponse.json({
      success: true,
      studentId,
      status: updatedStudent.whatsappStatus,
      sentAt: updatedStudent.whatsappSentAt,
      reconciled: existingStudent.whatsappStatus === 'UNCERTAIN' || Boolean(reconcileUncertain),
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to update WhatsApp status' }, { status });
  }
}
