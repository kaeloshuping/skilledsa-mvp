// src/components/common/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getLogger } from '../../utils/logger';

const log = getLogger('ProtectedRoute');

interface ProtectedRouteProps {
  requireVerification?: boolean;
  allowedRoles?: string[];
  redirectTo?: string; // custom redirect for unauthenticated
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireVerification = false,
  allowedRoles,
  redirectTo = '/login',
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    log.warn('Unauthenticated access, redirecting to', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  if (requireVerification && user?.verification_status !== 'verified') {
    log.warn('User not verified, redirecting to verification upload');
    return <Navigate to="/verify" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    log.warn('User role not allowed', { role: user.role, allowed: allowedRoles });
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};