import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Bcrypt Password Security Module', () => {
  it('hashes password with bcrypt salt rounds', async () => {
    const rawPass = 'SecretStaffPass123!';
    const hash = await hashPassword(rawPass);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    expect(hash.length).toBeGreaterThan(40);
  });

  it('successfully verifies correct password against hash', async () => {
    const rawPass = 'Admin@MindSpark2026!';
    const hash = await hashPassword(rawPass);

    const isValid = await verifyPassword(rawPass, hash);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect password against hash', async () => {
    const rawPass = 'Admin@MindSpark2026!';
    const hash = await hashPassword(rawPass);

    const isWrongValid = await verifyPassword('WrongPassword123', hash);
    expect(isWrongValid).toBe(false);
  });

  it('handles empty or missing parameters gracefully', async () => {
    expect(await verifyPassword('', '')).toBe(false);
    expect(await verifyPassword('something', '')).toBe(false);
  });
});
