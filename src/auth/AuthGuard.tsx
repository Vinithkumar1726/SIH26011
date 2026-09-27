/**
 * SIH26011 - Auth Guard
 * Route protection wrapper
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'surveyor' | 'reviewer' | 'viewer')[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#0B0E14',
        color: '#F4F1E8',
        fontFamily: "'IBM Plex Sans', sans-serif"
      }}>
        Loading authentication...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}