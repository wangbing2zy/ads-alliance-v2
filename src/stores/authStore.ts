import { create } from 'zustand';
import * as authApi from '../api/authApi';
import { TOKEN_KEY } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | { id: null; username: '访客'; role: 'guest' } | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
  clearError: () => void;
}

const guestUser: { id: null; username: '访客'; role: 'guest' } = { id: null, username: '访客', role: 'guest' };

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: false,
  isGuest: true,
  loading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const result = await authApi.login({ username, password });
      localStorage.setItem(TOKEN_KEY, result.token);
      const loginUser: User = {
        ...result.user,
        role: result.user.role as User['role'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set({
        user: loginUser,
        token: result.token,
        isAuthenticated: true,
        isGuest: false,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
    set({
      user: guestUser,
      token: null,
      isAuthenticated: false,
      isGuest: true,
    });
  },

  init: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({
        user: guestUser,
        token: null,
        isAuthenticated: false,
        isGuest: true,
      });
      return;
    }

    try {
      const user = await authApi.getMe();
      if (user.role === 'guest') {
        // Token is invalid/expired
        localStorage.removeItem(TOKEN_KEY);
        set({
          user: guestUser,
          token: null,
          isAuthenticated: false,
          isGuest: true,
        });
      } else {
        set({
          user: user as User,
          token,
          isAuthenticated: true,
          isGuest: false,
        });
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({
        user: guestUser,
        token: null,
        isAuthenticated: false,
        isGuest: true,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
