import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '../app/types';
import { useAuthStore } from '../context/authStore';
import { useAuthContext } from '../context/AuthContext';
import { mapGtOneRole } from '../utils/roleMapping';
import { authDebug } from '../utils/authDebug';
import { APP_CONFIG } from '../utils/appConfig';

const CURRENT_APP = APP_CONFIG.SSO_APP;
const SSO_LOGIN_URL = APP_CONFIG.SSO_LOGIN_URL;

type ProtectedRouteProps = {
  children: React.ReactNode;
  roles?: Role[];
  requireTenant?: boolean;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles, requireTenant = false }) => {
  const location = useLocation();
  const { isBootstrapped, isRecoveringContext, hasTriedContextRecovery, authErrorCode, authErrorMessage, recoverMissingContext } = useAuthContext();
  const { isAuthenticated, user } = useAuthStore();
  const recoveryRequestedRef = useRef(false);

  const isMissingTenantContext = Boolean(
    requireTenant && user && (
      CURRENT_APP === 'hrms'
        ? (!(user as any).tenantId && !user.companyId)
        : (!user.companyId || !user.workspaceId)
    )
  );

  useEffect(() => {
    if (!isBootstrapped) return;
    if (isAuthenticated && user) {
      return;
    }
    // No longer redirecting to SSO here, handled by Navigate in render
  }, [isBootstrapped, isAuthenticated, user]);

  useEffect(() => {
    if (!isBootstrapped || !isAuthenticated || !user || !requireTenant) return;
    if (!isMissingTenantContext) {
      recoveryRequestedRef.current = false;
      return;
    }
    if (isRecoveringContext) return;
    if (authErrorCode === 'rate_limited') return;
    if (recoveryRequestedRef.current) return;

    recoveryRequestedRef.current = true;
    authDebug('warn', 'tenant_missing', {
      app: CURRENT_APP,
      path: location.pathname,
      companyId: user.companyId || null,
      workspaceId: user.workspaceId || null,
      tenantId: (user as any).tenantId || user.companyId || null,
      companyCode: (user as any).companyCode || null,
    });
    void recoverMissingContext();
  }, [
    isBootstrapped,
    isAuthenticated,
    user,
    requireTenant,
    isMissingTenantContext,
    isRecoveringContext,
    authErrorCode,
    location.pathname,
    recoverMissingContext,
  ]);

  if (!isBootstrapped) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isMissingTenantContext) {
    if (authErrorCode === 'rate_limited') {
      return (
        <div className="p-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
          {authErrorMessage || 'Server busy, retry after a few seconds.'}
        </div>
      );
    }

    if (isRecoveringContext || !hasTriedContextRecovery) {
      return (
        <div className="p-6 text-sm text-surface-500">
          Recovering your workspace context...
        </div>
      );
    }

    return <Navigate to="/unauthorized" replace />;
  }

  if (roles?.length) {
    const mappedUserRole = mapGtOneRole(user.role);
    const mappedAllowedRoles = roles.map((role) => mapGtOneRole(role));
    if (!mappedAllowedRoles.includes(mappedUserRole)) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
