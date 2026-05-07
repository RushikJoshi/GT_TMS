import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { resolveCurrentAppDashboardUrl, resolveGtOneBase } from "../utils/apiBase";

interface PrivateRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles }) => {
  const context = useAuth();
  const { isAuthenticated, loading, user } = context;
  const ssoLoginUrl = `${resolveGtOneBase()}/login`;
  const redirectTarget = resolveCurrentAppDashboardUrl();
  const redirectParam = encodeURIComponent(redirectTarget);

  if (context === undefined) {
    const msg = "useAuth must be used within an AuthProvider. Ensure that your component is a child of <AuthProvider> and that there are no circular dependencies or duplicate Context imports.";
    console.error(msg);
    throw new Error(msg);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        <span className="ml-4 text-surface-600">Verifying session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
