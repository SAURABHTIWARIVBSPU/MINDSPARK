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
    const { studentId, status = 'OPENED' } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const validStatuses: WhatsAppStatus[] = ['NOT_SENT', 'OPENED', 'SENT', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status: '${status}'` }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const updates: any = {
      whatsappStatus: status,
      updatedBy: user!.uid,
    };

    if (status === 'SENT' || status === 'OPENED') {
      updates.whatsappSentAt = now;
    }

    const updatedStudent = await db.updateStudent(studentId, updates);

    return NextResponse.json({
      success: true,
      studentId,
      status: updatedStudent.whatsappStatus,
      sentAt: updatedStudent.whatsappSentAt,
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to update WhatsApp status' }, { status });
  }
}
