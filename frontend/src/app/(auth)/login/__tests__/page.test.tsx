import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage, { sanitizeRedirect } from '../page';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParamFrom: string | null = '/routes';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: vi.fn((key: string) => (key === 'from' ? mockSearchParamFrom : null)),
  }),
}));

// Mock api
vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

function createValidJWT(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const claims = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${claims}.mock_signature_hash`;
}

describe('LoginPage (SEC-02 & Open Redirect Defense)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamFrom = '/routes';
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  });

  describe('sanitizeRedirect Unit Validation', () => {
    it('preserves valid relative paths and query parameters', () => {
      expect(sanitizeRedirect('/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirect('/routes?tab=plugins')).toBe('/routes?tab=plugins');
      expect(sanitizeRedirect('/audit-logs')).toBe('/audit-logs');
    });

    it('neutralizes protocol-relative open redirect URLs', () => {
      expect(sanitizeRedirect('//attacker.com')).toBe('/dashboard');
      expect(sanitizeRedirect('//evil.com/phishing')).toBe('/dashboard');
    });

    it('neutralizes external absolute URLs', () => {
      expect(sanitizeRedirect('https://evil.com')).toBe('/dashboard');
      expect(sanitizeRedirect('http://attacker.com/login')).toBe('/dashboard');
      expect(sanitizeRedirect('javascript:alert(1)')).toBe('/dashboard');
    });

    it('neutralizes backslash bypass attempts', () => {
      expect(sanitizeRedirect('/\\attacker.com')).toBe('/dashboard');
      expect(sanitizeRedirect('\\attacker.com')).toBe('/dashboard');
    });

    it('defaults to /dashboard when parameter is null or empty', () => {
      expect(sanitizeRedirect(null)).toBe('/dashboard');
      expect(sanitizeRedirect(undefined)).toBe('/dashboard');
      expect(sanitizeRedirect('')).toBe('/dashboard');
      expect(sanitizeRedirect('   ')).toBe('/dashboard');
    });
  });

  describe('Login Form Interaction & Genuine Auth Flow', () => {
    it('renders login form elements properly', () => {
      render(<LoginPage />);

      expect(screen.getByText('Gateway Manager')).toBeInTheDocument();
      expect(screen.getByLabelText(/Tên đăng nhập/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mật khẩu/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đăng nhập tài khoản Local/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đăng nhập qua SSO/i })).toBeInTheDocument();
    });

    it('validates minimum username and password length before calling API', async () => {
      render(<LoginPage />);

      const usernameInput = screen.getByLabelText(/Tên đăng nhập/i);
      const passwordInput = screen.getByLabelText(/Mật khẩu/i);
      const submitBtn = screen.getByRole('button', { name: /Đăng nhập tài khoản Local/i });

      // Test short username
      fireEvent.change(usernameInput, { target: { value: 'ab' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/Tên đăng nhập phải có ít nhất 3 ký tự/i)).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();

      // Test short password
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/Mật khẩu phải có ít nhất 6 ký tự/i)).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('handles successful login with authentic JWT token, populating store and navigating safely', async () => {
      const realJwt = createValidJWT({
        user_id: 42,
        username: 'admin',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 86400,
      });

      (api.post as any).mockResolvedValueOnce({
        data: {
          token: realJwt,
          user: {
            id: 42,
            username: 'admin',
            email: 'admin@kongmanager.com.vn',
            role: 'admin',
          },
        },
      });

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Tên đăng nhập/i), { target: { value: 'admin' } });
      fireEvent.change(screen.getByLabelText(/Mật khẩu/i), { target: { value: 'secretpass' } });
      fireEvent.click(screen.getByRole('button', { name: /Đăng nhập tài khoản Local/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
          username: 'admin',
          password: 'secretpass',
        });
      });

      await waitFor(() => {
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        expect(useAuthStore.getState().token).toBe(realJwt);
        expect(useAuthStore.getState().user?.username).toBe('admin');
        expect(document.cookie).toContain(`token=${encodeURIComponent(realJwt)}`);
        expect(mockPush).toHaveBeenCalledWith('/routes');
      });
    });

    it('neutralizes malicious open redirect URL during successful login', async () => {
      mockSearchParamFrom = '//attacker.com/evil-redirect';

      const realJwt = createValidJWT({
        user_id: 1,
        username: 'admin',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 86400,
      });

      (api.post as any).mockResolvedValueOnce({
        data: {
          token: realJwt,
          user: { id: 1, username: 'admin', email: 'admin@kong.vn', role: 'admin' },
        },
      });

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Tên đăng nhập/i), { target: { value: 'admin' } });
      fireEvent.change(screen.getByLabelText(/Mật khẩu/i), { target: { value: 'secretpass' } });
      fireEvent.click(screen.getByRole('button', { name: /Đăng nhập tài khoản Local/i }));

      await waitFor(() => {
        // Must redirect to /dashboard and NEVER to the external destination
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(mockPush).not.toHaveBeenCalledWith('//attacker.com/evil-redirect');
      });
    });

    it('displays error cleanly on invalid credentials (HTTP 401)', async () => {
      (api.post as any).mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'invalid credentials',
          },
        },
      });

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Tên đăng nhập/i), { target: { value: 'wrong_admin' } });
      fireEvent.change(screen.getByLabelText(/Mật khẩu/i), { target: { value: 'wrong_pass' } });
      fireEvent.click(screen.getByRole('button', { name: /Đăng nhập tài khoản Local/i }));

      expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles backend connection failure cleanly with descriptive message', async () => {
      (api.post as any).mockRejectedValueOnce({
        code: 'ERR_NETWORK',
        response: null,
      });

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Tên đăng nhập/i), { target: { value: 'admin' } });
      fireEvent.change(screen.getByLabelText(/Mật khẩu/i), { target: { value: 'secretpass' } });
      fireEvent.click(screen.getByRole('button', { name: /Đăng nhập tài khoản Local/i }));

      expect(
        await screen.findByText(/Không thể kết nối đến máy chủ xác thực/i)
      ).toBeInTheDocument();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});

