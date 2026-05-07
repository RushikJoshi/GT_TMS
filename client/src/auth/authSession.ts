import { authService, setApiAuthToken } from '../services/api';

/**
 * Retrieves the currently authenticated user from the central SSO session.
 * This relies entirely on HTTP-only cookies.
 */
export async function getSSOUser() {
  try {
    const response = await authService.ssoMe();
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 401) {
      console.error('Failed to fetch SSO session:', error);
    }
    return { user: null };
  }
}

/**
 * Shared constants for authentication.
 */
export const AUTH_STORAGE_KEY = 'flowboard-auth';
export const LOGOUT_SYNC_KEY = 'gt-one-logout';

/**
 * Clears local session caches.
 */
export function clearPersistedAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem('overdue_popup_shown');
}

/**
 * Notifies other tabs of logout.
 */
export function publishLogoutSyncEvent() {
  localStorage.setItem(LOGOUT_SYNC_KEY, String(Date.now()));
}

export function applyAuthHeader(token: string | null = null) {
  setApiAuthToken(token);
}

