import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    if (typeof window !== 'undefined') {
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
      document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
    }
  });

  it('logs in local user correctly', () => {
    const user = { id: 1, username: 'admin', email: 'admin@kong.local' };
    const token = 'mock-jwt-token';

    useAuthStore.getState().login(user, token);

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.username).toBe('admin');
    expect(useAuthStore.getState().token).toBe(token);
  });

  it('logs in SSO user correctly with sso.hmisp.com.vn provider tag', () => {
    const ssoUser = { id: 2, username: 'sso.officer', email: 'officer@hmisp.com.vn' };
    const token = 'sso-token-xyz';

    useAuthStore.getState().loginSSO(ssoUser, token);

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.sso_provider).toBe('sso.hmisp.com.vn');
    expect(useAuthStore.getState().token).toBe(token);
  });

  it('logs out, clears authentication state, and expires session cookies', () => {
    document.cookie = 'token=active-session-token; path=/;';
    useAuthStore.getState().login({ id: 1, username: 'user', email: 'u@k.local' }, 'token123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(document.cookie).not.toContain('token=active-session-token');
  });
});

