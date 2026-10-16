import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginHandler } from '@/app/api/auth/login/route';

describe('Staff Authentication & Bcrypt Verification API', () => {
  it('authenticates staff member with correct bcrypt password', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@mindspark.edu.in',
        password: 'Admin@MindSpark2026!',
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('superadmin@mindspark.edu.in');
    expect(data.user.role).toBe('SUPER_ADMIN');
    // Ensure passwordHash is never leaked
    expect(data.user.passwordHash).toBeUndefined();
  });

  it('rejects authentication with incorrect password', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@mindspark.edu.in',
        password: 'IncorrectPassword!',
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('Invalid email or password');
  });

  it('rejects authentication if email does not exist', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@mindspark.edu.in',
        password: 'SomePassword123!',
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);
  });
});
