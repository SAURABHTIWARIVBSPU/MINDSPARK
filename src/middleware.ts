import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static resources and public API endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/' // Public student portal home page
  ) {
    return NextResponse.next();
  }

  // 2. Protected College / Staff Admin routes
  const adminRoutes = [
    '/dashboard',
    '/students',
    '/excel-import',
    '/admit-cards',
    '/whatsapp',
    '/audit-logs',
    '/settings',
  ];

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (isAdminRoute) {
    const sessionCookie = request.cookies.get('ms_auth_session');
    if (!sessionCookie) {
      // Redirect staff to login if accessing college management without session
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
