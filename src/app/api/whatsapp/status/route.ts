import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { WhatsAppStatus } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'messages.prepare');

    const body = await req.json();
    const { studentId, status = 'OPENED', reason, reconcileUncertain } = body;

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

    const now = new Date().toISOString();

    // Durable Auditable Reconciliation for UNCERTAIN Notifications
    if (existingStudent.whatsappStatus === 'UNCERTAIN' || reconcileUncertain) {
      if (!reason || reason.trim().length < 5) {
        return NextResponse.json(
          { error: 'An auditable reason (minimum 5 characters) is required to reconcile an UNCERTAIN notification.' },
          { status: 400 }
        );
      }

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
          resolvedByUid: user!.uid,
          resolvedByEmail: user!.email,
          timestamp: now,
        },
      });
    }

    const updates: any = {
      whatsappStatus: status,
      updatedBy: user!.uid,
      updatedAt: now,
    };

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
