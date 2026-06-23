import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DelayedFlippeLoader } from '@/components/FlippeBrand';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'user' | 'admin' | 'super_admin';
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole = 'user',
  redirectTo = '/'
}: ProtectedRouteProps) => {
  const { user, hasRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F4]">
        <DelayedFlippeLoader active label="Checking your session" />
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    // Redirect to login page
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check if user has required role
  if (!hasRole(requiredRole)) {
    // Redirect to specified page (default: home)
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated and has required role
  return <>{children}</>;
};
