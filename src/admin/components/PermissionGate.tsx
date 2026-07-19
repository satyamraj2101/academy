import { useAdminAuth } from '../hooks/useAdminAuth';

export function PermissionGate({ permission, children, fallback = null }: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission } = useAdminAuth();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}

export function RoleGate({ roles, children, fallback = null }: {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { admin } = useAdminAuth();
  return roles.includes(admin?.role || '') ? <>{children}</> : <>{fallback}</>;
}
