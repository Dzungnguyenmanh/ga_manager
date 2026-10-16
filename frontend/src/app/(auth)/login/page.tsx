'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, KeyRound, Loader2, AlertCircle } from 'lucide-react';

/**
 * Sanitizes the redirect destination to guarantee navigation remains within internal relative paths.
 * Prevents Open Redirect vulnerabilities (CWE-601) via protocol-relative URLs (//attacker.com),
 * backslash tricks (/\attacker.com, \\attacker.com), or external schemes (https://evil.com).
 */
export function sanitizeRedirect(target: string | null | undefined): string {
  if (!target) return '/dashboard';
  const trimmed = target.trim();

  // Must begin with a single '/' and not '//' or '/\' or '\'
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.startsWith('\\')
  ) {
    try {
      const parsed = new URL(trimmed, 'http://localhost');
      if (parsed.origin === 'http://localhost' && parsed.pathname.startsWith('/')) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return '/dashboard';
    }
  }

  return '/dashboard';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams?.get('from');
  const redirectTarget = sanitizeRedirect(rawFrom);

  const { login } = useAuthStore();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Vui lòng nhập tên đăng nhập');
      return;
    }

    if (trimmedUsername.length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự');
      return;
    }

    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    try {
      setIsLoading(true);

      const res = await api.post('/api/auth/login', {
        username: trimmedUsername,
        password,
      });

      const token = res.data?.token || res.data?.access_token;
      if (!token) {
        throw new Error('Máy chủ không trả về token xác thực hợp lệ');
      }

      const user = res.data?.user || {
        id: res.data?.id || 1,
        username: trimmedUsername,
        email: res.data?.email || `${trimmedUsername}@kongmanager.com.vn`,
        role: res.data?.role || 'admin',
      };

      // Set session cookie for Next.js middleware and SSR
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax${isHttps ? '; Secure' : ''}`;

      // Update Zustand client state and localStorage
      login(user, token);

      router.push(redirectTarget);
    } catch (err: any) {
      if (err.response?.data?.message || err.response?.data?.error) {
        setError(err.response.data.message || err.response.data.error);
      } else if (err.response?.status === 401) {
        setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra lại dịch vụ backend.');
      } else {
        setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = () => {
    const ssoBaseUrl = process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.hmisp.com.vn';
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '';
    const authUrl = `${ssoBaseUrl}/oauth2/authorize?client_id=kong-manager&response_type=code&scope=openid+profile+email&redirect_uri=${encodeURIComponent(redirectUri)}`;
    if (typeof window !== 'undefined') {
      window.location.href = authUrl;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/75 p-4">
      <Card className="w-full max-w-md shadow-lg border-gray-200">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-2xl shadow-md mb-2">
            G
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Gateway Manager</CardTitle>
          <CardDescription>Đăng nhập vào hệ thống quản trị API Gateway</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form đăng nhập tài khoản cục bộ */}
          <form onSubmit={handleLocalLogin} className="space-y-4">
            <Input
              label="Tên đăng nhập"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Đăng nhập tài khoản Local
                </>
              )}
            </Button>

            <div className="text-center text-xs text-gray-500 bg-gray-50 py-2 px-3 rounded-md border border-gray-100">
              Tài khoản quản trị mặc định: <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono">admin</code> / <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono">admin123</code>
            </div>
          </form>

          {/* Phân cách */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-xs text-gray-400 uppercase font-medium">Hoặc</span>
            <div className="border-t border-gray-200 w-full" />
          </div>

          {/* SSO Login */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSSOLogin}
            disabled={isLoading}
            className="w-full border-purple-300 text-purple-800 hover:bg-purple-50 hover:text-purple-900"
          >
            <Shield className="h-4 w-4 mr-2 text-purple-600" />
            Đăng nhập qua SSO (sso.hmisp.com.vn)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50/75 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Đang tải trang đăng nhập...</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
