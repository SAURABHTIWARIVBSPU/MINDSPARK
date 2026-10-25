import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private lastCleanup = Date.now();

  /**
   * Check if a request from the given key (e.g. IP) is within the rate limit.
   * @param key Identifier for the client (e.g. IP address)
   * @param limit Maximum number of requests allowed in the time window
   * @param windowSeconds Time window duration in seconds
   */
  check(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    this.cleanupIfNecessary(now);

    const windowMs = windowSeconds * 1000;
    const existing = this.records.get(key);

    if (!existing || now >= existing.resetAt) {
      // New window
      const resetAt = now + windowMs;
      this.records.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        retryAfterSeconds: 0,
        resetAt,
      };
    }

    if (existing.count >= limit) {
      // Limit exceeded
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSeconds,
        resetAt: existing.resetAt,
      };
    }

    // Within limit
    existing.count += 1;
    const remaining = limit - existing.count;
    return {
      allowed: true,
      limit,
      remaining,
      retryAfterSeconds: 0,
      resetAt: existing.resetAt,
    };
  }

  /**
   * Periodically remove expired keys to prevent memory leak
   */
  private cleanupIfNecessary(now: number): void {
    if (now - this.lastCleanup > 60000) {
      this.lastCleanup = now;
      for (const [k, rec] of this.records.entries()) {
        if (now >= rec.resetAt) {
          this.records.delete(k);
        }
      }
    }
  }

  /**
   * Clear all records (useful for testing)
   */
  reset(): void {
    this.records.clear();
  }
}

// Global singletons for public endpoints
export const searchRateLimiter = new InMemoryRateLimiter();
export const downloadRateLimiter = new InMemoryRateLimiter();
export const loginRateLimiter = new InMemoryRateLimiter();

interface FailedAttemptRecord {
  attempts: number;
  lockedUntil: number;
}

export class FailedDobAttemptGuard {
  private records = new Map<string, FailedAttemptRecord>();

  isLocked(key: string): { locked: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const rec = this.records.get(key);
    if (!rec) return { locked: false, retryAfterSeconds: 0 };
    if (now >= rec.lockedUntil) {
      if (rec.lockedUntil > 0) {
        this.records.delete(key);
      }
      return { locked: false, retryAfterSeconds: 0 };
    }
    const retryAfterSeconds = Math.ceil((rec.lockedUntil - now) / 1000);
    return { locked: true, retryAfterSeconds };
  }

  recordFailure(
    key: string,
    maxAttempts: number = 5,
    lockDurationSeconds: number = 900
  ): { locked: boolean; remainingAttempts: number; retryAfterSeconds: number } {
    const now = Date.now();
    const rec = this.records.get(key) || { attempts: 0, lockedUntil: 0 };

    if (rec.lockedUntil > 0 && now >= rec.lockedUntil) {
      rec.attempts = 0;
      rec.lockedUntil = 0;
    }

    rec.attempts += 1;
    if (rec.attempts >= maxAttempts) {
      rec.lockedUntil = now + lockDurationSeconds * 1000;
      this.records.set(key, rec);
      return {
        locked: true,
        remainingAttempts: 0,
        retryAfterSeconds: lockDurationSeconds,
      };
    }

    this.records.set(key, rec);
    return {
      locked: false,
      remainingAttempts: maxAttempts - rec.attempts,
      retryAfterSeconds: 0,
    };
  }

  recordSuccess(key: string): void {
    this.records.delete(key);
  }

  reset(): void {
    this.records.clear();
  }
}

export const failedDobGuard = new FailedDobAttemptGuard();

export function getClientIp(req: NextRequest): string {
  // 1. Vercel edge verified IP header (tamper-proof behind Vercel infrastructure)
  const vercelIp = req.headers.get('x-vercel-ip') || req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0].trim();
  }

  // 2. Cloudflare verified connecting IP (tamper-proof behind Cloudflare)
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  // 3. Reverse proxy trusted real IP
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // 4. Standard X-Forwarded-For fallback
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return '127.0.0.1';
}
