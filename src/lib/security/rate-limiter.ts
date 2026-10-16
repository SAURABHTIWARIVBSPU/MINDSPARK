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

/**
 * Extracts client IP from Next.js request headers
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
