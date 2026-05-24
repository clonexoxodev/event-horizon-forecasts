import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking your session...</div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    // Redirect to login page
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (!hasRole(requiredRole)) {
    // Redirect to specified page (default: home)
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated and has required role
  return <>{children}</>;
};
