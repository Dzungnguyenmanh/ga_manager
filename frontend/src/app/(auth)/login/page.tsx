'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginSSO } = useAuthStore();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      // Simulate/Trigger login
      login(
        { id: 1, username: username, email: `${username}@kongmanager.local` },
        'jwt-token-local-demo-123'
      );
      router.push('/dashboard');
    } catch (err: any) {
      setError('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = () => {
    // Luồng tích hợp SSO với sso.hmisp.com.vn
    // Trong môi trường production: window.location.href = "https://sso.hmisp.com.vn/oauth2/authorize?client_id=...&redirect_uri=..."
    loginSSO(
      { id: 99, username: 'sso.user', email: 'user@hmisp.com.vn' },
      'sso-hmisp-token-xyz789'
    );
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/75 p-4">
      <Card className="w-full max-w-md shadow-lg border-gray-200">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-2xl shadow-md mb-2">
            K
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Kong Manager</CardTitle>
          <CardDescription>Đăng nhập vào hệ thống quản trị Kong Gateway</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Cơ chế 1: Local Login Form */}
          <form onSubmit={handleLocalLogin} className="space-y-4">
            <Input
              label="Tên đăng nhập"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <KeyRound className="h-4 w-4 mr-2" />
              Đăng nhập tài khoản Local
            </Button>
          </form>

          {/* Phân cách */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-xs text-gray-400 uppercase font-medium">Hoặc</span>
            <div className="border-t border-gray-200 w-full" />
          </div>

          {/* Cơ chế 2: SSO HMISP Login */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSSOLogin}
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
