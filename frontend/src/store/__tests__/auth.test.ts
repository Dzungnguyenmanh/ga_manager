import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
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

  it('logs out and clears authentication state', () => {
    useAuthStore.getState().login({ id: 1, username: 'user', email: 'u@k.local' }, 'token123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
