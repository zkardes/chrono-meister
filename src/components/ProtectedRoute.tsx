import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
  managerOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false, managerOnly = false }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, isAdmin, isManager } = useAuthContext();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin-only routes
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check manager-only routes
  if (managerOnly && !isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;