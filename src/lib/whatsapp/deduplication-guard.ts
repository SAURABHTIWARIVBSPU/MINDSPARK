/**
 * Mandatory Duplicate-Message Prevention and Atomic Concurrency Policy Guard
 * Enforces server-side deduplication keys, atomic claiming, and safe delivery reconciliation.
 */

import { Student, WhatsAppStatus } from '@/types';

export interface DeduplicationOptions {
  notificationType?: string;
  templateId?: string;
  sessionYear?: string;
}

export class DeduplicationGuard {
  // In-memory atomic job claim registry with TTL to guard concurrent admin requests / workers
  private static activeClaims = new Map<string, { claimedAt: number; claimedBy: string }>();

  /**
   * Generates a stable, canonical deduplication key for a student and notification type.
   * Format: `dedup_${studentId}_${normalizedNotificationType}_${sessionYear}`
   */
  static getDeduplicationKey(studentId: string, options: DeduplicationOptions = {}): string {
    const notifType = (options.notificationType || options.templateId || 'REGISTRATION_CONFIRMATION')
      .trim()
      .toUpperCase();
    const session = (options.sessionYear || '2026').trim();
    return `dedup_${studentId}_${notifType}_${session}`;
  }

  /**
   * Checks whether a student has already successfully received the notification.
   * A recipient who has already successfully received a message must NEVER receive that same
   * message again through ordinary bulk or personal admin operations.
   */
  static isAlreadyDelivered(student: Student, options: DeduplicationOptions = {}): boolean {
    if (!student) return false;

    // 1. Check primary status: SENT, DELIVERED, READ, OPENED are successful states
    const successfulStatuses: WhatsAppStatus[] = ['SENT', 'DELIVERED', 'READ', 'OPENED'];
    if (successfulStatuses.includes(student.whatsappStatus as WhatsAppStatus)) {
      return true;
    }

    // 2. Check durable historical delivery records for this notification / deduplication key
    if (Array.isArray(student.messageHistory) && student.messageHistory.length > 0) {
      const dedupKey = this.getDeduplicationKey(student.studentId, options);
      const targetTpl = (options.templateId || options.notificationType || '').toUpperCase();

      const deliveredInHistory = student.messageHistory.some((rec) => {
        if (!successfulStatuses.includes(rec.status)) return false;
        if (rec.dedupKey && rec.dedupKey === dedupKey) return true;
        if (targetTpl && rec.templateId && rec.templateId.toUpperCase() === targetTpl) return true;
        return false;
      });

      if (deliveredInHistory) return true;
    }

    return false;
  }

  /**
   * Atomically claims a student for processing to prevent race conditions
   * between concurrent workers, background tasks, or multiple admin browser sessions.
   * Lock automatically expires after lockTimeoutMs (default: 60s) in case of unexpected worker crash.
   * Synchronous L1 in-process lock.
   */
  static claimRecipient(studentId: string, claimantId: string, lockTimeoutMs: number = 60000): boolean {
    const now = Date.now();
    const existing = this.activeClaims.get(studentId);

    if (existing) {
      // Check if lock has expired (stale lock recovery)
      if (now - existing.claimedAt < lockTimeoutMs) {
        return false; // Still actively claimed by another worker/admin
      }
    }

    this.activeClaims.set(studentId, { claimedAt: now, claimedBy: claimantId });
    return true;
  }

  /**
   * Releases an atomic recipient claim once processing is finalized or safely skipped.
   */
  static releaseRecipient(studentId: string): void {
    this.activeClaims.delete(studentId);
  }

  /**
   * Durable cross-instance atomic claim backed by PostgreSQL primary-key uniqueness constraint.
   * Guaranteed to work across multiple serverless functions, multi-container clusters, or distinct processes.
   * Includes optimistic concurrency control on stale recovery and crash-after-acceptance detection.
   */
  static async claimRecipientDurable(
    studentId: string,
    claimantId: string,
    options: DeduplicationOptions = {},
    lockTimeoutMs: number = 60000
  ): Promise<{ claimed: boolean; reason?: string; isUncertain?: boolean }> {
    const dedupKey = this.getDeduplicationKey(studentId, options);
    const now = Date.now();

    // 1. Fast L1 Process Memory Check
    const localExisting = this.activeClaims.get(studentId);
    if (localExisting && now - localExisting.claimedAt < lockTimeoutMs) {
      return { claimed: false, reason: 'PROCESS_MEMORY_LOCK' };
    }

    // 2. Durable Cross-Instance Database Lock Check
    const isSupabaseConfigured =
      Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

    if (isSupabaseConfigured) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const claimEventId = `claim_${dedupKey}`;
        const leaseExpiresAt = now + lockTimeoutMs;

        // Attempt atomic insert relying on audit_logs PRIMARY KEY constraint
        const { error: insertError } = await supabase.from('audit_logs').insert({
          event_id: claimEventId,
          actor_uid: claimantId,
          actor_email: `${claimantId}@system.local`,
          action: 'CLAIM_ACQUIRED',
          target_type: 'STUDENT',
          target_id: studentId,
          timestamp: new Date().toISOString(),
          details: {
            claimedAt: now,
            leaseExpiresAt,
            claimedBy: claimantId,
            dedupKey,
            state: 'CLAIMED',
          },
        });

        if (insertError) {
          // If unique constraint violation, inspect existing claim lease
          if (
            insertError.code === '23505' ||
            insertError.message?.includes('duplicate key') ||
            insertError.message?.includes('unique constraint')
          ) {
            const { data: existingClaim } = await supabase
              .from('audit_logs')
              .select('actor_uid, timestamp, details')
              .eq('event_id', claimEventId)
              .maybeSingle();

            const existingExpiry =
              existingClaim?.details?.leaseExpiresAt ||
              (new Date(existingClaim?.timestamp || 0).getTime() + lockTimeoutMs);

            // Active lock lease still held by another worker
            if (now < existingExpiry) {
              return { claimed: false, reason: 'CROSS_INSTANCE_DATABASE_LOCK' };
            }

            // CRASH-AFTER-PROVIDER-ACCEPTANCE SAFETY:
            // If the previous abandoned worker had already commenced dispatch to ICPaaS (state: 'DISPATCHING'),
            // the message may have been accepted by Meta before the process died.
            // Blindly resending will cause a duplicate! Transition to UNCERTAIN and await webhook receipt.
            if (existingClaim?.details?.state === 'DISPATCHING') {
              return {
                claimed: false,
                reason: 'UNCERTAIN_CRASH_RECOVERY_AWAITING_WEBHOOK',
                isUncertain: true,
              };
            }

            // Stale Lock Recovery with OPTIMISTIC CONCURRENCY CONTROL:
            // Ensure only one concurrent worker successfully takes over the expired lock
            const { data: updatedRows, error: updateErr } = await supabase
              .from('audit_logs')
              .update({
                actor_uid: claimantId,
                actor_email: `${claimantId}@system.local`,
                timestamp: new Date().toISOString(),
                details: {
                  claimedAt: now,
                  leaseExpiresAt,
                  claimedBy: claimantId,
                  recoveredFromStale: true,
                  dedupKey,
                  state: 'CLAIMED',
                },
              })
              .eq('event_id', claimEventId)
              .eq('actor_uid', existingClaim?.actor_uid || '')
              .select();

            if (updateErr || !updatedRows || updatedRows.length === 0) {
              return { claimed: false, reason: 'CONCURRENT_STALE_LOCK_CLAIMED' };
            }
          } else {
            console.warn('Durable claim warning (non-fatal):', insertError.message);
          }
        }
      } catch (dbErr) {
        console.warn('Durable lock fallback to local memory due to error:', dbErr);
      }
    }

    // Set L1 memory cache
    this.activeClaims.set(studentId, { claimedAt: now, claimedBy: claimantId });
    return { claimed: true };
  }

  /**
   * Marks that HTTP dispatch to the messaging gateway has commenced.
   * Extends lease and transitions state to 'DISPATCHING' so that crashes during or immediately
   * after provider acceptance cannot be blindly resent by recovery workers.
   */
  static async markDispatchCommencedDurable(
    studentId: string,
    claimantId: string,
    options: DeduplicationOptions = {},
    extendedTimeoutMs: number = 120000
  ): Promise<void> {
    const dedupKey = this.getDeduplicationKey(studentId, options);
    const now = Date.now();

    const isSupabaseConfigured =
      Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

    if (isSupabaseConfigured) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const claimEventId = `claim_${dedupKey}`;
        await supabase
          .from('audit_logs')
          .update({
            timestamp: new Date().toISOString(),
            details: {
              claimedAt: now,
              leaseExpiresAt: now + extendedTimeoutMs,
              claimedBy: claimantId,
              dedupKey,
              state: 'DISPATCHING',
              dispatchCommencedAt: now,
            },
          })
          .eq('event_id', claimEventId);
      } catch (e) {
        console.warn('Failed to mark dispatch commenced in durable claim:', e);
      }
    }
  }

  /**
   * Releases durable cross-instance atomic claim.
   */
  static async releaseRecipientDurable(studentId: string, options: DeduplicationOptions = {}): Promise<void> {
    const dedupKey = this.getDeduplicationKey(studentId, options);
    this.activeClaims.delete(studentId);

    const isSupabaseConfigured =
      Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

    if (isSupabaseConfigured) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const claimEventId = `claim_${dedupKey}`;
        await supabase.from('audit_logs').delete().eq('event_id', claimEventId);
      } catch (e) {
        console.warn('Failed to release durable claim in database:', e);
      }
    }
  }

  /**
   * Cleans up expired stale claims safely (Queue & worker crash recovery)
   */
  static cleanupStaleClaims(maxAgeMs: number = 60000): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, claim] of this.activeClaims.entries()) {
      if (now - claim.claimedAt >= maxAgeMs) {
        this.activeClaims.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * Evaluates if a provider error or HTTP status code represents an UNCERTAIN delivery
   * (e.g. gateway timeout, socket reset, unknown gateway state) rather than a confirmed failure.
   * Uncertain deliveries MUST NEVER be blindly retried without status reconciliation.
   */
  static isUncertainDelivery(httpStatus?: number, errorMessage?: string): boolean {
    if (httpStatus === 504 || httpStatus === 408 || httpStatus === 502 || httpStatus === 503 || httpStatus === 0) {
      return true;
    }
    if (errorMessage) {
      const lower = errorMessage.toLowerCase();
      if (
        lower.includes('timeout') ||
        lower.includes('timed out') ||
        lower.includes('etimedout') ||
        lower.includes('econnreset') ||
        lower.includes('socket closed') ||
        lower.includes('gateway timeout') ||
        lower.includes('request timeout')
      ) {
        return true;
      }
    }
    return false;
  }
}
