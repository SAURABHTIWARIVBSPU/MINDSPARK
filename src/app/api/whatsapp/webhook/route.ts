import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizePhone } from '@/lib/excel/normalizer';
import { WhatsAppStatus } from '@/types';
import { logWhatsAppDispatchRealTime } from '@/lib/whatsapp/excel-logger';

// 1. GET: Verification for Meta / ICPaaS Webhook configuration
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    process.env.ICPAAS_WEBHOOK_TOKEN ||
    'mindspark_webhook_verify_2026';

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge || '', { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden: Invalid verify token' }, { status: 403 });
}

// 2. POST: Ingest incoming delivery receipts (SENT, DELIVERED, READ, FAILED)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const allStudents = await db.getAllActiveStudents();
    const phoneMap = new Map(allStudents.map((s) => [normalizePhone(s.phone), s]));

    const entries = body.entry || [];
    let updatedCount = 0;

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const statuses = change.value?.statuses || [];
        for (const st of statuses) {
          const rawRecipient = String(st.recipient_id || '');
          const cleanPhone = normalizePhone(rawRecipient);
          const metaStatus = (st.status || '').toLowerCase();
          const messageId = st.id;
          const errors = st.errors;

          let targetStatus: WhatsAppStatus = 'SENT';
          if (metaStatus === 'delivered') targetStatus = 'DELIVERED';
          else if (metaStatus === 'read') targetStatus = 'READ';
          else if (metaStatus === 'failed') targetStatus = 'FAILED';
          else if (metaStatus === 'sent') targetStatus = 'SENT';

          const matchedStudent = phoneMap.get(cleanPhone);
          if (matchedStudent) {
            const updates: any = {
              whatsappStatus: targetStatus,
              updatedAt: new Date().toISOString(),
            };

            if (targetStatus === 'FAILED' && errors && errors.length > 0) {
              const errDesc = errors[0].title || errors[0].message || `Error ${errors[0].code}`;
              updates.whatsappError = errDesc;
            }

            await db.updateStudent(matchedStudent.studentId, updates);
            updatedCount++;

            // Real-time Excel log sync
            try {
              await logWhatsAppDispatchRealTime([
                {
                  timestamp: new Date().toISOString(),
                  studentId: matchedStudent.studentId,
                  registrationNumber: matchedStudent.registrationNumber,
                  studentName: matchedStudent.name,
                  phone: matchedStudent.phone,
                  className: matchedStudent.className,
                  competitionName: matchedStudent.competitionName,
                  schoolOrCollege: matchedStudent.schoolOrCollege,
                  status: targetStatus,
                  provider: 'Webhook DLR Callback',
                  details: `Real-time receipt: ${metaStatus.toUpperCase()} (Message ID: ${messageId || 'N/A'})${
                    updates.whatsappError ? ` [Error: ${updates.whatsappError}]` : ''
                  }`,
                },
              ]);
            } catch {}
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
