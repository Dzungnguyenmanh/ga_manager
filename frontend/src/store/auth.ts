import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  loginSSO: (ssoUser: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,

  login: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    set({ user, token, isAuthenticated: true });
  },

  loginSSO: (ssoUser, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    set({
      user: { ...ssoUser, sso_provider: 'sso.hmisp.com.vn' },
      token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      // Expire session cookies immediately across all relevant cookie names to prevent middleware redirect loops
      const expiredFlags = 'path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax;';
      document.cookie = `token=; ${expiredFlags}`;
      document.cookie = `session_token=; ${expiredFlags}`;
      document.cookie = `session=; ${expiredFlags}`;
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
