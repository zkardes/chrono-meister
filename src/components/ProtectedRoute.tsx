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
  const { isAuthenticated, loading, isAdmin, isManager, isInitialLoad } = useAuthContext();
  const location = useLocation();

  // Show loading spinner while checking authentication
  // But allow rendering if we have cached data (isInitialLoad = true but we have a user)
  if (loading && !isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If we're in initial load but have a user, show content immediately
  // This allows for optimistic rendering with cached data
  if (isInitialLoad && isAuthenticated) {
    // Render content optimistically while loading fresh data in background
    console.log('Rendering optimistically with cached data');
  }
  // If we've completed initial load and don't have auth, redirect to login
  else if (!isInitialLoad && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to login if not authenticated and not in initial load
  if (!isAuthenticated && !isInitialLoad) {
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