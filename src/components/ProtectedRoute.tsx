import { Navigate, useLocation } from 'react-router-dom';
import { useAcademy } from '../academy/context';
import { useAdminAuth } from '../admin/hooks/useAdminAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  permission?: string;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  requireAdmin = false,
  permission,
  redirectTo
}: ProtectedRouteProps) {
  const { user, loading: academyLoading } = useAcademy();
  const { admin, loading: adminLoading, hasPermission } = useAdminAuth();
  const location = useLocation();

  if (requireAdmin) {
    if (adminLoading) return <LoadingSpinner />;
    if (!admin) return <Navigate to={redirectTo || "/admin"} state={{ from: location }} replace />;
    if (permission && !hasPermission(permission)) {
      return <Navigate to="/admin" replace />;
    }
    return <>{children}</>;
  }

  if (requireAuth) {
    if (academyLoading) return <LoadingSpinner />;
    if (!user) return <Navigate to={redirectTo || "/login"} state={{ from: location }} replace />;
    return <>{children}</>;
  }

  return <>{children}</>;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
      <div className="text-slate-400 text-sm font-medium animate-pulse">Loading...</div>
    </div>
  );
}
