import { describe, it, expect, beforeEach } from 'vitest';
import { loginRateLimiter } from '@/lib/security/rate-limiter';

describe('Login Rate Limiter (Brute-Force Guard)', () => {
  beforeEach(() => {
    loginRateLimiter.reset();
  });

  it('allows standard login attempts up to threshold', () => {
    const ip = '192.168.1.100';
    for (let i = 0; i < 5; i++) {
      const res = loginRateLimiter.check(ip, 5, 60);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4 - i);
    }
  });

  it('blocks rapid 6th attempt with retry-after header time', () => {
    const ip = '192.168.1.101';
    for (let i = 0; i < 5; i++) {
      loginRateLimiter.check(ip, 5, 60);
    }

    const blocked = loginRateLimiter.check(ip, 5, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});
