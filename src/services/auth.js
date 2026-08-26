import { getActiveTenantId } from '../config/tenants';
import { API_BASE_URL } from './api';

const AUTH_API_BASE_URL = `${API_BASE_URL}/auth`;

export const authClient = {
  /**
   * Sign in with email & password.
   * On success, backend sets HttpOnly session cookie.
   */
  signInEmail: async (email, password) => {
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      const response = await fetch(`${AUTH_API_BASE_URL}/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant': getActiveTenantId(),
        },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          error: data?.message || data?.error || 'Email atau password salah, atau akun tidak aktif.',
        };
      }

      return {
        ok: true,
        user: data.user,
        session: data.session,
      };
    } catch (err) {
      console.error('Auth signInEmail error:', err);
      return { ok: false, error: 'Gagal terhubung ke server autentikasi.' };
    }
  },

  /**
   * Sign out active session.
   * Backend revokes session token and clears session cookie.
   */
  signOut: async () => {
    try {
      await fetch(`${AUTH_API_BASE_URL}/sign-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant': getActiveTenantId(),
        },
        credentials: 'include',
      });
      return { ok: true };
    } catch (err) {
      console.warn('Auth signOut warning:', err);
      return { ok: true };
    }
  },

  /**
   * Fetch active server session using HttpOnly cookie.
   */
  getSession: async () => {
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/get-session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant': getActiveTenantId(),
        },
        credentials: 'include',
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data && data.user) {
        return {
          user: data.user,
          session: data.session,
        };
      }
      return null;
    } catch (err) {
      console.warn('Auth getSession warning:', err);
      return null;
    }
  },
};
