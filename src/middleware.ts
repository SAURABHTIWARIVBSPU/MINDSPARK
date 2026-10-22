import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

export function middleware(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('ms_auth_session');
    if (!sessionCookie?.value) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('from', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Validate token structure (base64url_payload.signature)
    const parts = sessionCookie.value.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('from', request.nextUrl.pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('ms_auth_session');
      return response;
    }

    // Inspect session payload claims & expiration
    try {
      const rawJson = decodeBase64Url(parts[0]);
      const session = JSON.parse(rawJson);
      if (!session.uid || !session.expiresAt || Date.now() > session.expiresAt) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.searchParams.set('from', request.nextUrl.pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('ms_auth_session');
        return response;
      }
    } catch {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('from', request.nextUrl.pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('ms_auth_session');
      return response;
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware execution error:', error);
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/students/:path*',
    '/excel-import/:path*',
    '/admit-cards/:path*',
    '/whatsapp/:path*',
    '/audit-logs/:path*',
    '/settings/:path*',
  ],
};
