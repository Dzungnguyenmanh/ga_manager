import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/routes',
  '/services',
  '/upstreams',
  '/consumers',
  '/plugins',
  '/certificates',
  '/declarative',
  '/topology',
  '/audit-logs',
  '/settings',
];

interface JWTPayload {
  exp?: number;
  iat?: number;
  user_id?: number | string;
  username?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Validates authentication token structure and expiration claim (exp).
 * Supports standard RFC 7519 JWT format (header.payload.signature) as well as
 * non-JWT session tokens.
 */
export function isTokenValid(tokenStr: string | undefined | null): boolean {
  if (!tokenStr || typeof tokenStr !== 'string') {
    return false;
  }

  const trimmed = tokenStr.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const parts = trimmed.split('.');

  // If token is in JWT format (3 dot-separated base64url segments), validate payload and expiration
  if (parts.length === 3) {
    try {
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      const jsonStr = atob(base64);
      const payload: JWTPayload = JSON.parse(jsonStr);

      if (!payload || typeof payload !== 'object') {
        return false;
      }

      // Check expiration timestamp if present (in seconds)
      if (typeof payload.exp === 'number') {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (nowInSeconds >= payload.exp) {
          return false; // Token has expired
        }
      }

      return true;
    } catch {
      // Malformed base64 or invalid JSON in JWT payload
      return false;
    }
  }

  // Fallback for non-JWT session tokens (e.g. session token or development token)
  return trimmed.length > 0;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Extract auth token from cookies or authorization header
  const rawToken =
    request.cookies.get('token')?.value ||
    request.cookies.get('session_token')?.value ||
    request.cookies.get('session')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim();

  const isAuthenticated = isTokenValid(rawToken);

  // If already authenticated and accessing login, redirect to dashboard
  if (pathname.startsWith('/login')) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If an invalid or expired cookie is present, proactively purge it on login page
    const response = NextResponse.next();
    if (rawToken && !isAuthenticated) {
      response.cookies.set('token', '', { path: '/', maxAge: 0, expires: new Date(0) });
      response.cookies.set('session_token', '', { path: '/', maxAge: 0, expires: new Date(0) });
      response.cookies.set('session', '', { path: '/', maxAge: 0, expires: new Date(0) });
    }
    return response;
  }

  // Public paths allowed without authentication
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check if current route is a protected management route
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', `${pathname}${search}`);
      const redirectResponse = NextResponse.redirect(loginUrl);

      // Clean up invalid or expired cookie on redirect to prevent loop
      if (rawToken) {
        redirectResponse.cookies.set('token', '', { path: '/', maxAge: 0, expires: new Date(0) });
        redirectResponse.cookies.set('session_token', '', { path: '/', maxAge: 0, expires: new Date(0) });
        redirectResponse.cookies.set('session', '', { path: '/', maxAge: 0, expires: new Date(0) });
      }

      return redirectResponse;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
