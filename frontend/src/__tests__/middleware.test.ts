import { describe, it, expect } from 'vitest';
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

function createJWT(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const claims = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${claims}.mock_signature`;
}

describe('Next.js Route Guard Middleware (SEC-03)', () => {
  const validToken = createJWT({
    user_id: 1,
    username: 'admin',
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const expiredToken = createJWT({
    user_id: 1,
    username: 'admin',
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) - 3600,
  });

  it('redirects unauthenticated users from /dashboard to /login?from=/dashboard', () => {
    const request = new NextRequest('http://localhost:3000/dashboard');
    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?from=%2Fdashboard');
  });

  it('redirects unauthenticated users from management routes preserving path and query params', () => {
    const routes = [
      '/services',
      '/routes',
      '/upstreams',
      '/consumers',
      '/plugins',
      '/certificates',
      '/declarative',
      '/topology',
      '/audit-logs',
      '/settings/clusters',
    ];

    for (const route of routes) {
      const request = new NextRequest(`http://localhost:3000${route}?tab=general`);
      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login?from=');
      expect(response.headers.get('location')).toContain(encodeURIComponent(route));
    }
  });

  it('allows access to protected routes when valid unexpired JWT token cookie is present', () => {
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: `token=${validToken}`,
      },
    });
    const response = middleware(request);

    expect(response.status).toBe(200);
  });

  it('rejects expired JWT token and redirects to login with cookie clearance', () => {
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: `token=${expiredToken}`,
      },
    });
    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?from=%2Fdashboard');
    expect(response.headers.get('set-cookie')).toContain('token=;');
  });

  it('rejects malformed JWT token and redirects to login', () => {
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: 'token=invalid.jwt.token',
      },
    });
    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?from=%2Fdashboard');
  });

  it('allows access to protected routes when session_token cookie is present', () => {
    const request = new NextRequest('http://localhost:3000/routes', {
      headers: {
        cookie: 'session_token=test-session-key',
      },
    });
    const response = middleware(request);

    expect(response.status).toBe(200);
  });

  it('allows access to protected routes when Authorization Bearer header is present', () => {
    const request = new NextRequest('http://localhost:3000/services', {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });
    const response = middleware(request);

    expect(response.status).toBe(200);
  });

  it('allows unauthenticated access to /login', () => {
    const request = new NextRequest('http://localhost:3000/login');
    const response = middleware(request);

    expect(response.status).toBe(200);
  });

  it('redirects authenticated user visiting /login to /dashboard', () => {
    const request = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: `token=${validToken}`,
      },
    });
    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('does not redirect expired user visiting /login and clears lingering cookie', () => {
    const request = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: `token=${expiredToken}`,
      },
    });
    const response = middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('token=;');
  });

  it('allows public access to /_next and /favicon.ico', () => {
    const nextAssetReq = new NextRequest('http://localhost:3000/_next/static/css/app.css');
    expect(middleware(nextAssetReq).status).toBe(200);

    const faviconReq = new NextRequest('http://localhost:3000/favicon.ico');
    expect(middleware(faviconReq).status).toBe(200);
  });
});
