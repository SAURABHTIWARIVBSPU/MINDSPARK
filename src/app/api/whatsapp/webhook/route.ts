import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { normalizePhone } from '@/lib/excel/normalizer';
import { Student, WhatsAppStatus } from '@/types';
import { logWhatsAppDispatchRealTime } from '@/lib/whatsapp/excel-logger';
import { DeduplicationGuard } from '@/lib/whatsapp/deduplication-guard';

function verifyWebhookAuthentication(req: NextRequest, rawBody: string): { verified: boolean; reason?: string } {
  const appSecret = (process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '').trim();
  const verifyToken = (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.ICPAAS_WEBHOOK_TOKEN || '').trim();

  // If no secret or token is configured in the environment, log a security warning and allow for development
  if (!appSecret && !verifyToken) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('CRITICAL SECURITY WARNING: Webhook secrets (WHATSAPP_APP_SECRET / WHATSAPP_WEBHOOK_VERIFY_TOKEN) are not configured.');
    }
    return { verified: true };
  }

  const hubSig = req.headers.get('x-hub-signature-256');
  const isMetaPayload = Boolean(
    hubSig ||
    rawBody.includes('"whatsapp_business_account"') ||
    (rawBody.includes('"entry"') && rawBody.includes('"changes"'))
  );

  // 1. Meta WhatsApp Cloud API request: MUST verify HMAC-SHA256 signature
  if (isMetaPayload) {
    if (!appSecret) {
      return { verified: false, reason: 'WHATSAPP_APP_SECRET not configured for Meta webhook signature verification' };
    }
    if (!hubSig) {
      return { verified: false, reason: 'Missing X-Hub-Signature-256 header on Meta webhook payload' };
    }
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(hubSig.trim().toLowerCase());
    const expBuf = Buffer.from(expected.toLowerCase());
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { verified: true };
    }
    return { verified: false, reason: 'Invalid X-Hub-Signature-256 HMAC digest' };
  }

  // 2. ICPaaS / Gateway callback: MUST verify provider token / bearer header
  const tokenHeader =
    req.headers.get('x-webhook-token') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.headers.get('x-icpaas-signature');
  const tokenParam = new URL(req.url).searchParams.get('token');
  const incomingToken = (tokenHeader || tokenParam || '').trim();

  if (verifyToken) {
    if (incomingToken && incomingToken === verifyToken) {
      return { verified: true };
    }
    return { verified: false, reason: 'Missing or invalid authentication token for ICPaaS webhook' };
  }

  return { verified: false, reason: 'Webhook authentication failed' };
}

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
    const rawBody = await req.text();
    const authResult = verifyWebhookAuthentication(req, rawBody);
    if (!authResult.verified) {
      return NextResponse.json(
        { error: `Unauthorized: ${authResult.reason || 'Invalid webhook authentication'}` },
        { status: 401 }
      );
    }

    const body = rawBody ? JSON.parse(rawBody) : {};
    const db = getDb();
    const allStudents = await db.getAllActiveStudents();

    interface NormalizedReceipt {
      phone: string;
      status: string;
      messageId?: string;
      error?: string;
      bizOpaqueData?: string;
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
              bizOpaqueData: st.biz_opaque_callback_data,
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
          bizOpaqueData: item.biz_opaque_callback_data || item.bizOpaqueData || item.tracking_id,
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

      let matchedStudent: Student | null = null;

      // 0. Match via biz_opaque_callback_data (echoed directly by Meta!)
      // Must be cross-validated against student phone to reject tampered correlation data
      if (r.bizOpaqueData) {
        try {
          const parsed = typeof r.bizOpaqueData === 'string' ? JSON.parse(r.bizOpaqueData) : r.bizOpaqueData;
          if (parsed && typeof parsed === 'object' && parsed.sId && typeof parsed.sId === 'string') {
            const candidate = allStudents.find((s) => s.studentId === parsed.sId);
            if (candidate) {
              const candidatePhone = normalizePhone(candidate.phone);
              // Reject if cleanPhone is provided and does not match candidate's phone
              if (!cleanPhone || candidatePhone === cleanPhone) {
                matchedStudent = candidate;
              } else {
                console.warn(
                  `Rejected tampered/mismatched biz_opaque_callback_data: student ${parsed.sId} phone (${candidatePhone}) does not match webhook phone (${cleanPhone}).`
                );
              }
            }
          }
        } catch {}
      }

      // 1. Precise Provider Message ID (wamid) matching via durable PostgreSQL audit_logs
      if (!matchedStudent && r.messageId) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          const { data: wamidRecord } = await supabase
            .from('audit_logs')
            .select('target_id')
            .eq('event_id', `wamid_${r.messageId}`)
            .maybeSingle();

          if (wamidRecord?.target_id) {
            matchedStudent = allStudents.find((s) => s.studentId === wamidRecord.target_id) || null;
          }
        } catch {}

        if (!matchedStudent) {
          matchedStudent = allStudents.find((s) => s.messageHistory?.some((h) => h.messageId === r.messageId)) || null;
        }
      }

      // 2. Strict Phone Matching: Guard against sibling/family phone ambiguity
      if (!matchedStudent && cleanPhone) {
        const matchingStudents = allStudents.filter((s) => normalizePhone(s.phone) === cleanPhone);
        if (matchingStudents.length === 1) {
          // Unambiguous phone match (single candidate registered with this number)
          matchedStudent = matchingStudents[0];
        } else if (matchingStudents.length > 1) {
          // Ambiguous shared phone number across family members / siblings!
          // Dropping phone-only fallback to prevent cross-contaminating sibling records!
          console.warn(
            `Ambiguous webhook callback: ${matchingStudents.length} candidates share phone ${cleanPhone} without message ID. Dropping receipt to prevent record corruption.`
          );
          continue;
        }
      }

      if (matchedStudent) {
        // Robust Attempt-Specific Freshness Check:
        // A delayed failure callback for an earlier attempt must NOT overwrite a newer active attempt.
        // We evaluate attempts across full history, not just the last array index.
        if (r.messageId && Array.isArray(matchedStudent.messageHistory) && matchedStudent.messageHistory.length > 1) {
          const matchingIndex = matchedStudent.messageHistory.findIndex((h) => h.messageId === r.messageId);
          if (matchingIndex !== -1) {
            const hasNewerAttempt = matchedStudent.messageHistory.some((_, idx) => idx > matchingIndex);
            if (hasNewerAttempt && targetStatus === 'FAILED') {
              console.log(
                `Discarding stale failure for superseded attempt ${r.messageId}; candidate ${matchedStudent.studentId} has newer attempts.`
              );
              continue;
            }
          }
        }

        // Formal Webhook State Machine Transition Matrix per Meta Cloud API / ICPaaS semantics
        const isValidWebhookTransition = (curr: string, incoming: string): boolean => {
          if (curr === incoming) return false; // Idempotent no-op

          // Once confirmed DELIVERED, READ, or OPENED, late webhooks cannot downgrade
          if (['DELIVERED', 'READ', 'OPENED'].includes(curr)) {
            if (incoming === 'READ' && curr === 'DELIVERED') return true;
            if (incoming === 'OPENED' && (curr === 'DELIVERED' || curr === 'READ')) return true;
            return false; // Discard out-of-order SENT, FAILED, or UNCERTAIN
          }

          if (curr === 'SENT') {
            // SENT can advance forward to confirmed delivery (DELIVERED, READ, OPENED) OR definitive carrier delivery failure (FAILED)
            return ['DELIVERED', 'READ', 'OPENED', 'FAILED'].includes(incoming);
          }

          if (curr === 'UNCERTAIN') {
            // UNCERTAIN timeout state reconciles to confirmed delivery or definitive failure
            return ['SENT', 'DELIVERED', 'READ', 'OPENED', 'FAILED'].includes(incoming);
          }

          if (curr === 'FAILED') {
            // Only authoritative delivery evidence (DELIVERED, READ, OPENED) can reconcile a failure.
            // A late or duplicate 'SENT' webhook must NOT be allowed to flip FAILED!
            return ['DELIVERED', 'READ', 'OPENED'].includes(incoming);
          }

          if (curr === 'QUEUED' || curr === 'NOT_SENT') {
            return ['SENT', 'DELIVERED', 'READ', 'OPENED', 'FAILED', 'UNCERTAIN'].includes(incoming);
          }

          return false;
        };

        const currentStatus = matchedStudent.whatsappStatus || 'NOT_SENT';
        if (!isValidWebhookTransition(currentStatus, targetStatus)) {
          continue; // Discard invalid or out-of-order transition
        }

        const updates: any = {
          whatsappStatus: targetStatus,
          updatedAt: new Date().toISOString(),
        };

        if (targetStatus === 'FAILED' && r.error) {
          updates.whatsappError = r.error;
        }

        await db.updateStudent(matchedStudent.studentId, updates);
        updatedCount++;

        // Durably record audit log for webhook-driven status update
        try {
          await db.addAuditLog({
            actorUid: 'webhook_system',
            actorEmail: 'webhook@gateway.mindspark',
            action: 'WHATSAPP_STATUS_WEBHOOK_UPDATED',
            targetType: 'STUDENT',
            targetId: matchedStudent.studentId,
            details: {
              previousStatus: currentStatus,
              newStatus: targetStatus,
              messageId: r.messageId || 'N/A',
              providerRawStatus: r.status,
              error: updates.whatsappError || null,
              matchedBy: r.bizOpaqueData ? 'biz_opaque_callback_data' : (r.messageId ? 'provider_message_id' : 'phone'),
            },
          });
        } catch {}

        // Clean up any in-flight / uncertain claim lock once authoritative webhook delivery arrives
        try {
          await DeduplicationGuard.releaseRecipientDurable(matchedStudent.studentId, {
            templateId: 'admit_card_new',
            sessionYear: '2026',
          });
        } catch {}

        // Durably record or update provider message ID association in audit_logs
        if (r.messageId) {
          try {
            let attemptId = `att_dlr_${Date.now()}`;
            if (r.bizOpaqueData) {
              const parsed = typeof r.bizOpaqueData === 'string' ? JSON.parse(r.bizOpaqueData) : r.bizOpaqueData;
              if (parsed?.attId) attemptId = parsed.attId;
            }
            await DeduplicationGuard.recordDurableDispatchSubmission({
              studentId: matchedStudent.studentId,
              registrationNumber: matchedStudent.registrationNumber,
              phone: matchedStudent.phone,
              logicalNotificationId: `admit_card_new_2026_${matchedStudent.studentId}`,
              providerMessageId: r.messageId,
              attemptId,
              initiatedAt: matchedStudent.updatedAt || new Date().toISOString(),
              providerAcceptedAt: new Date().toISOString(),
              status: targetStatus,
              provider: 'Webhook DLR Callback',
              error: updates.whatsappError,
            });
          } catch {}
        }

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
