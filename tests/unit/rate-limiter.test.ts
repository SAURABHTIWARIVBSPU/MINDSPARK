import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRateLimiter } from '@/lib/security/rate-limiter';

describe('InMemoryRateLimiter (Brute-Force Guard)', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter();
  });

  it('allows requests within limit', () => {
    const ip = '192.168.1.1';
    const limit = 3;
    const windowSeconds = 10;

    const r1 = limiter.check(ip, limit, windowSeconds);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check(ip, limit, windowSeconds);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check(ip, limit, windowSeconds);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks request when limit is exceeded and provides retryAfterSeconds', () => {
    const ip = '192.168.1.2';
    const limit = 2;
    const windowSeconds = 5;

    limiter.check(ip, limit, windowSeconds);
    limiter.check(ip, limit, windowSeconds);

    // Third request exceeds limit
    const blocked = limiter.check(ip, limit, windowSeconds);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(5);
  });

  it('isolates rate limits per client IP address', () => {
    const ip1 = '10.0.0.1';
    const ip2 = '10.0.0.2';
    const limit = 1;
    const windowSeconds = 10;

    // IP1 exhausts limit
    const r1 = limiter.check(ip1, limit, windowSeconds);
    expect(r1.allowed).toBe(true);

    const r1Blocked = limiter.check(ip1, limit, windowSeconds);
    expect(r1Blocked.allowed).toBe(false);

    // IP2 is unaffected
    const r2 = limiter.check(ip2, limit, windowSeconds);
    expect(r2.allowed).toBe(true);
  });

  it('resets limit once window expires', async () => {
    const ip = '192.168.1.3';
    const limit = 1;
    const windowSeconds = 1; // 1 second window

    const r1 = limiter.check(ip, limit, windowSeconds);
    expect(r1.allowed).toBe(true);

    const blocked = limiter.check(ip, limit, windowSeconds);
    expect(blocked.allowed).toBe(false);

    // Wait for 1.1s for window to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const rAfter = limiter.check(ip, limit, windowSeconds);
    expect(rAfter.allowed).toBe(true);
    expect(rAfter.remaining).toBe(0);
  });
});
