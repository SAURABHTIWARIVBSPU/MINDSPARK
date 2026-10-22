import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { loginRateLimiter, getClientIp } from '@/lib/security/rate-limiter';

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  const isFormPost =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  // Enforce brute-force login protection: 5 attempts per minute per IP
  const clientIp = getClientIp(req);
  const rateCheck = loginRateLimiter.check(clientIp, 5, 60);
  if (!rateCheck.allowed) {
    const errorMsg = `Too many failed login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`;
    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url),
        { status: 302 }
      );
    }
    return NextResponse.json(
      { error: errorMsg },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateCheck.retryAfterSeconds),
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  let email = '';
  let password = '';

  try {
    if (isFormPost) {
      const formData = await req.formData();
      email = ((formData.get('email') as string) || '').trim();
      password = (formData.get('password') as string) || '';
    } else {
      const body = await req.json().catch(() => ({}));
      email = ((body.email as string) || '').trim();
      password = (body.password as string) || '';
    }

    if (!email) {
      const errorMsg = 'Email address is required';
      if (isFormPost) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url),
          { status: 302 }
        );
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const db = getDb();
    const user = await db.getUserByEmail(email);

    if (!user) {
      const errorMsg = 'Invalid email or password';
      if (isFormPost) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url),
          { status: 302 }
        );
      }
      return NextResponse.json({ error: errorMsg }, { status: 401 });
    }

    if (!user.active) {
      const errorMsg = 'This account has been deactivated by the administrator';
      if (isFormPost) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url),
          { status: 302 }
        );
      }
      return NextResponse.json({ error: errorMsg }, { status: 403 });
    }

    // Verify bcrypt password hash if account has a password
    if (user.passwordHash) {
      if (!password) {
        const errorMsg = 'Password is required';
        if (isFormPost) {
          return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url),
            { status: 302 }
          );
        }
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        const errorMsg = 'Invalid email or password';
        if (isFormPost) {
          return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url),
            { status: 302 }
          );
        }
        return NextResponse.json({ error: errorMsg }, { status: 401 });
      }
    }

    const sessionToken = await createSession(user);

    await db.addAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'USER_LOGIN',
      targetType: 'USER',
      targetId: user.uid,
    });

    // Never return the passwordHash in the response
    const { passwordHash, ...safeUser } = user;

    if (isFormPost) {
      // Native browser form submit -> redirect to /dashboard with Set-Cookie header
      const res = NextResponse.redirect(new URL('/dashboard', req.url), { status: 302 });
      res.cookies.set('ms_auth_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
      return res;
    }

    const res = NextResponse.json({ success: true, user: safeUser });
    res.cookies.set('ms_auth_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (err: any) {
    const errorMsg = err.message || 'Internal authentication error';
    if (isFormPost) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url),
        { status: 302 }
      );
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
