/**
 * useSSO — React hook that validates the SSO session on mount.
 *
 * Behaviour:
 *  • On every app load, calls GET /api/auth/me (with credentials: 'include'
 *    so the sso_token cookie is sent automatically).
 *  • If a valid session exists → hydrates authStore (user + token) so the UI
 *    knows who is logged in without a fresh password entry.
 *  • If no valid session → lets the app continue normally (the router /
 *    RequireAuth guard will redirect to /login if needed).
 *
 * This hook is designed to be called ONCE in the root <App /> component.
 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../context/authStore';
import { resolveSsoMeUrl } from '../utils/apiBase';

const SSO_ME_URL = resolveSsoMeUrl();

export function useSSO() {
  const { isAuthenticated, user, token, login: _login, ...store } = useAuthStore();
  // We only hydrate once per page load
  const checked = useRef(false);

  useEffect(() => {
    const checkSession = () => {
      fetch(SSO_ME_URL, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Not auth');
          return res.json();
        })
        .then((data) => {
          if (data?.user) {
            const currentStore = useAuthStore.getState();
            const currentUser = currentStore.user;
            
            const isDifferentUser = currentUser?.id !== data.user.id;
            // The GT_ONE user payload includes companyId or tenantId
            const currentCompanyId = currentUser?.companyId || (currentUser as any)?.tenantId;
            const newCompanyId = data.user.companyId || data.user.tenantId;
            const isDifferentCompany = currentCompanyId && newCompanyId && currentCompanyId !== newCompanyId;

            if (!currentUser || isDifferentUser || isDifferentCompany) {
              useAuthStore.setState({
                user: {
                  ...data.user,
                  id: data.user.id,
                  name: data.user.name || '',
                  email: data.user.email || '',
                  role: data.user.role,
                  avatar: data.user.avatar || undefined,
                  jobTitle: data.user.jobTitle || undefined,
                  department: data.user.department || undefined,
                  workspaceId: data.user.workspaceId || '',
                  companyId: data.user.companyId || data.user.tenantId,
                  isActive: true,
                  canUsePrivateQuickTasks: false,
                  color: '',
                  createdAt: new Date().toISOString(),
                  preferences: undefined,
                  bio: undefined,
                },
                isAuthenticated: true,
                token: null, // Clear stale localStorage token
              });
              
              if (currentUser && (isDifferentUser || isDifferentCompany)) {
                // If it changed while the app was already open, reload to clear all React Query / Zustand states
                window.location.reload();
              }
            }
          }
        })
        .catch(() => {
          const currentStore = useAuthStore.getState();
          if (currentStore.isAuthenticated && !currentStore.token) {
            // We were relying on SSO but the session is invalid now
            useAuthStore.setState({ user: null, isAuthenticated: false });
          }
        });
    };

    if (!checked.current) {
      checked.current = true;
      if (!isAuthenticated || !user) {
        checkSession();
      }
    }

    const onFocus = () => {
      checkSession();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAuthenticated, user]);
}

/**
 * Helper used by HRMS (or any consumer app):
 *
 *   import { checkSSOSession } from '@/hooks/useSSO';
 *   const user = await checkSSOSession('https://projects.gitakshmi.com');
 *
 * Returns the user object if authenticated, or null.
 */
export async function checkSSOSession(pmsOrigin = '') {
  try {
    const url = `${pmsOrigin}/api/auth/me`;
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}
