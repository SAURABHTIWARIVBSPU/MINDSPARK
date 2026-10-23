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
    const body = await req.json().catch(() => ({}));
    const db = getDb();
    const allStudents = await db.getAllActiveStudents();
    const phoneMap = new Map(allStudents.map((s) => [normalizePhone(s.phone), s]));

    interface NormalizedReceipt {
      phone: string;
      status: string;
      messageId?: string;
      error?: string;
    }

    const receipts: NormalizedReceipt[] = [];

    // Format A: Standard Meta WhatsApp Cloud API (body.entry[].changes[].value.statuses[])
    if (Array.isArray(body?.entry)) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          for (const st of change.value?.statuses || []) {
            receipts.push({
              phone: String(st.recipient_id || ''),
              status: String(st.status || ''),
              messageId: st.id,
              error: st.errors?.[0]?.message || st.errors?.[0]?.title,
            });
          }
        }
      }
    }

    // Format B: Direct JSON or Array payload from ICPaaS / Omni / Gateway DLR Webhooks
    const candidateList = Array.isArray(body)
      ? body
      : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.statuses)
      ? body.statuses
      : Array.isArray(body?.results)
      ? body.results
      : [body];

    for (const item of candidateList) {
      if (!item || typeof item !== 'object') continue;
      const rawPhone = item.recipient_id || item.recipient || item.phone || item.mobile || item.destination || item.to;
      const rawStatus = item.status || item.delivery_status || item.dlr_status || item.event;
      if (rawPhone && rawStatus) {
        receipts.push({
          phone: String(rawPhone),
          status: String(rawStatus),
          messageId: item.message_id || item.id || item.msgId || item.wamid,
          error: item.error || item.reason || item.description,
        });
      }
    }

    let updatedCount = 0;

    for (const r of receipts) {
      const cleanPhone = normalizePhone(r.phone);
      const sLower = (r.status || '').toLowerCase().trim();

      let targetStatus: WhatsAppStatus = 'SENT';
      if (sLower.includes('deliver')) targetStatus = 'DELIVERED';
      else if (sLower.includes('read') || sLower.includes('view')) targetStatus = 'READ';
      else if (sLower.includes('fail') || sLower.includes('undeliv') || sLower.includes('reject')) targetStatus = 'FAILED';
      else if (sLower.includes('sent') || sLower.includes('accept') || sLower.includes('submit')) targetStatus = 'SENT';

      const matchedStudent = phoneMap.get(cleanPhone);
      if (matchedStudent) {
        const updates: any = {
          whatsappStatus: targetStatus,
          updatedAt: new Date().toISOString(),
        };

        if (targetStatus === 'FAILED' && r.error) {
          updates.whatsappError = r.error;
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
              details: `Real-time receipt: ${targetStatus} (Raw: ${r.status}) [Message ID: ${r.messageId || 'N/A'}]${
                updates.whatsappError ? ` [Error: ${updates.whatsappError}]` : ''
              }`,
            },
          ]);
        } catch {}
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
