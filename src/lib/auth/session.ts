import { cookies } from 'next/headers';
import crypto from 'crypto';
import { User, Role } from '@/types';
import { getDb } from '@/lib/db';

const COOKIE_NAME = 'ms_auth_session';
const SECRET = process.env.SESSION_SECRET || 'mind-spark-default-secret-change-in-production';

export interface SessionPayload {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  expiresAt: number;
}

function signPayload(payload: string): string {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  return `${payload}.${hmac.digest('hex')}`;
}

function verifyPayload(signed: string): string | null {
  const parts = signed.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const expectedSig = hmac.digest('hex');
  const sigBuf = Buffer.from(sig);
  const expectedSigBuf = Buffer.from(expectedSig);
  if (sigBuf.length === expectedSigBuf.length && crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
    return payload;
  }
  return null;
}

export async function createSession(user: User): Promise<string> {
  const session: SessionPayload = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const serialized = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signed = signPayload(serialized);

  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  } catch (err) {
    // In unit test runner outside of Next.js server context, cookieStore is not available
  }

  return signed;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie?.value) return null;

    const payloadStr = verifyPayload(cookie.value);
    if (!payloadStr) return null;

    const raw = Buffer.from(payloadStr, 'base64url').toString('utf-8');
    const session: SessionPayload = JSON.parse(raw);

    if (Date.now() > session.expiresAt) {
      return null;
    }

    const db = getDb();
    const user = await db.getUserById(session.uid);
    if (!user || !user.active) return null;

    return user;
  } catch (err) {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
