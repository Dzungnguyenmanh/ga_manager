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

export const DEFAULT_SSO_CONFIG = {
  ssoUrl: process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.hmisp.com.vn',
  tenantId: process.env.NEXT_PUBLIC_SSO_TENANT_ID || 'TNSHMISP000000',
  realm: process.env.NEXT_PUBLIC_SSO_REALM || 'hmisp',
  clientId: process.env.NEXT_PUBLIC_SSO_CLIENT_ID || 'hiam-client-Id',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams?.get('from');
  const redirectTarget = sanitizeRedirect(rawFrom);

  const { login, loginSSO } = useAuthStore();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSSOLoading, setIsSSOLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [ssoStatus, setSsoStatus] = React.useState('');

  // Direct SSO login & MFA state
  const [showDirectSSO, setShowDirectSSO] = React.useState(false);
  const [ssoUsername, setSsoUsername] = React.useState('');
  const [ssoPassword, setSsoPassword] = React.useState('');
  const [requiresMFA, setRequiresMFA] = React.useState(false);
  const [mfaToken, setMfaToken] = React.useState('');
  const [mfaCode, setMfaCode] = React.useState('');

  const completeSessionLogin = React.useCallback(
    (user: any, token: string, isSSO = false, targetPath?: string) => {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax${isHttps ? '; Secure' : ''}`;

      if (isSSO) {
        loginSSO(user, token);
      } else {
        login(user, token);
      }

      router.push(targetPath || redirectTarget);
    },
    [login, loginSSO, redirectTarget, router]
  );

  // Handle OAuth2 callback (?code=...&state=...) from sso.hmisp.com.vn
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const code = searchParams?.get('code');
    const state = searchParams?.get('state');
    const oauthError = searchParams?.get('error');
    const oauthErrorDesc = searchParams?.get('error_description');

    if (!code && !oauthError) return;

    if (oauthError) {
      setError(`Xác thực SSO thất bại: ${oauthErrorDesc || oauthError}`);
      return;
    }

    const savedState = sessionStorage.getItem('hiam_oauth_state');
    if (savedState && state && savedState !== state) {
      setError('Phiên xác thực SSO không hợp lệ (State mismatch). Vui lòng thử lại.');
      sessionStorage.removeItem('hiam_oauth_state');
      return;
    }

    const savedRedirectUri =
      sessionStorage.getItem('hiam_oauth_redirect_uri') || `${window.location.origin}/login`;
    const savedFrom = sanitizeRedirect(sessionStorage.getItem('hiam_oauth_from') || rawFrom);

    let cancelled = false;
    const exchangeCode = async () => {
      try {
        setIsSSOLoading(true);
        setError('');
        setSsoStatus('Đang xác thực mã ủy quyền SSO với sso.hmisp.com.vn...');

        const res = await api.post('/api/auth/sso/callback', {
          code,
          redirect_uri: savedRedirectUri,
          state: state || '',
          client_id: DEFAULT_SSO_CONFIG.clientId,
          tenant_id: DEFAULT_SSO_CONFIG.tenantId,
          realm: DEFAULT_SSO_CONFIG.realm,
        });

        if (cancelled) return;

        const token = res.data?.token || res.data?.access_token;
        if (!token) {
          throw new Error('Không nhận được token phiên làm việc từ hệ thống SSO');
        }

        const user = res.data?.user || {
          id: 1,
          username: 'sso_user',
          email: 'sso@hmisp.com.vn',
          role: 'admin',
          sso_provider: 'sso.hmisp.com.vn',
        };

        if (res.data?.sso_access_token) {
          localStorage.setItem('hiam_access_token', res.data.sso_access_token);
        }
        if (res.data?.sso_refresh_token) {
          localStorage.setItem('hiam_refresh_token', res.data.sso_refresh_token);
        }

        sessionStorage.removeItem('hiam_oauth_state');
        sessionStorage.removeItem('hiam_oauth_redirect_uri');
        sessionStorage.removeItem('hiam_oauth_from');

        completeSessionLogin(user, token, true, savedFrom);
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Không thể đổi mã xác thực SSO. Vui lòng thử lại.';
        setError(`Đăng nhập SSO thất bại: ${msg}`);
      } finally {
        if (!cancelled) {
          setIsSSOLoading(false);
          setSsoStatus('');
        }
      }
    };

    exchangeCode();
    return () => {
      cancelled = true;
    };
  }, [searchParams, rawFrom, completeSessionLogin]);

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

      completeSessionLogin(user, token, false);
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
    setError('');
    const ssoBaseUrl = DEFAULT_SSO_CONFIG.ssoUrl.replace(/\/+$/, '');
    const clientId = DEFAULT_SSO_CONFIG.clientId;
    const tenantId = DEFAULT_SSO_CONFIG.tenantId;
    const realm = DEFAULT_SSO_CONFIG.realm;

    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';
    const state =
      typeof window !== 'undefined' && window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hiam_oauth_state', state);
      sessionStorage.setItem('hiam_oauth_redirect_uri', redirectUri);
      sessionStorage.setItem('hiam_oauth_from', redirectTarget);

      const params = new URLSearchParams({
        client_id: clientId,
        tenant_id: tenantId,
        realm: realm,
        response_type: 'code',
        scope: 'openid profile email',
        redirect_uri: redirectUri,
        state: state,
      });

      window.location.href = `${ssoBaseUrl}/api/v1/oauth2/authorize?${params.toString()}`;
    }
  };

  const handleDirectSSOLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!requiresMFA) {
      if (!ssoUsername.trim() || !ssoPassword) {
        setError('Vui lòng nhập tài khoản và mật khẩu SSO (H-IAM)');
        return;
      }
    } else {
      if (!mfaCode.trim()) {
        setError('Vui lòng nhập mã xác thực OTP 6 chữ số');
        return;
      }
    }

    try {
      setIsSSOLoading(true);
      const payload = requiresMFA
        ? {
            tenant_id: DEFAULT_SSO_CONFIG.tenantId,
            realm: DEFAULT_SSO_CONFIG.realm,
            client_id: DEFAULT_SSO_CONFIG.clientId,
            mfa_token: mfaToken,
            mfa_code: mfaCode.trim(),
          }
        : {
            username: ssoUsername.trim(),
            password: ssoPassword,
            tenant_id: DEFAULT_SSO_CONFIG.tenantId,
            realm: DEFAULT_SSO_CONFIG.realm,
            client_id: DEFAULT_SSO_CONFIG.clientId,
          };

      const res = await api.post('/api/auth/sso/login', payload);

      if (res.data?.requires_mfa) {
        setRequiresMFA(true);
        setMfaToken(res.data.mfa_token || '');
        return;
      }

      const token = res.data?.token || res.data?.access_token;
      if (!token) {
        throw new Error('Không nhận được token xác thực từ SSO');
      }

      const user = res.data?.user || {
        id: 1,
        username: ssoUsername.trim(),
        email: `${ssoUsername.trim()}@hmisp.com.vn`,
        role: 'admin',
        sso_provider: 'sso.hmisp.com.vn',
      };

      if (res.data?.sso_access_token) {
        localStorage.setItem('hiam_access_token', res.data.sso_access_token);
      }
      if (res.data?.sso_refresh_token) {
        localStorage.setItem('hiam_refresh_token', res.data.sso_refresh_token);
      }

      completeSessionLogin(user, token, true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Xác thực SSO thất bại. Vui lòng kiểm tra thông tin tài khoản H-IAM.';
      setError(msg);
    } finally {
      setIsSSOLoading(false);
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

          {ssoStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
              <span>{ssoStatus}</span>
            </div>
          )}

          {/* Form đăng nhập tài khoản cục bộ */}
          <form onSubmit={handleLocalLogin} className="space-y-4">
            <Input
              label="Tên đăng nhập"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading || isSSOLoading}
              required
            />
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || isSSOLoading}
              required
            />

            <Button type="submit" className="w-full" disabled={isLoading || isSSOLoading}>
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

          {/* SSO Login Section */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSSOLogin}
              disabled={isLoading || isSSOLoading}
              className="w-full border-purple-300 text-purple-800 hover:bg-purple-50 hover:text-purple-900"
            >
              {isSSOLoading && !showDirectSSO ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-purple-600" />
              ) : (
                <Shield className="h-4 w-4 mr-2 text-purple-600" />
              )}
              Đăng nhập qua SSO (sso.hmisp.com.vn)
            </Button>

            <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
              <span>
                Realm: <strong className="text-gray-700">{DEFAULT_SSO_CONFIG.realm}</strong> · Tenant:{' '}
                <strong className="text-gray-700">{DEFAULT_SSO_CONFIG.tenantId}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowDirectSSO((prev) => !prev);
                  setRequiresMFA(false);
                  setError('');
                }}
                className="text-purple-700 hover:underline font-medium"
              >
                {showDirectSSO ? 'Ẩn đăng nhập trực tiếp' : 'Nhập TK H-IAM trực tiếp'}
              </button>
            </div>

            {showDirectSSO && (
              <form
                onSubmit={handleDirectSSOLogin}
                className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-lg space-y-3"
              >
                <div className="text-xs font-medium text-purple-900 flex items-center justify-between">
                  <span>Xác thực H-IAM ({DEFAULT_SSO_CONFIG.clientId})</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono">
                    {DEFAULT_SSO_CONFIG.realm}
                  </span>
                </div>

                {!requiresMFA ? (
                  <>
                    <Input
                      label="Tài khoản H-IAM"
                      placeholder="user1 hoặc adhmi"
                      value={ssoUsername}
                      onChange={(e) => setSsoUsername(e.target.value)}
                      disabled={isSSOLoading}
                      required
                    />
                    <Input
                      label="Mật khẩu H-IAM"
                      type="password"
                      placeholder="••••••••"
                      value={ssoPassword}
                      onChange={(e) => setSsoPassword(e.target.value)}
                      disabled={isSSOLoading}
                      required
                    />
                  </>
                ) : (
                  <Input
                    label="Mã OTP 2FA (Google Authenticator)"
                    placeholder="Nhập 6 chữ số OTP"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    disabled={isSSOLoading}
                    required
                  />
                )}

                <Button
                  type="submit"
                  disabled={isSSOLoading}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white"
                >
                  {isSSOLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang xác thực H-IAM...
                    </>
                  ) : requiresMFA ? (
                    'Xác nhận mã OTP'
                  ) : (
                    'Đăng nhập H-IAM SSO'
                  )}
                </Button>
              </form>
            )}
          </div>
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

