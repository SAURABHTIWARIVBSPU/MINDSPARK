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
