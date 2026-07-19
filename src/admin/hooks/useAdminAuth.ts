import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';

export interface AdminUser {
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'viewer';
  permissions: string[];
}

interface AdminAuthValue {
  admin: AdminUser | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  setDevAdmin: (user: AdminUser) => void;
  clearDevAdmin: () => void;
}

// Default (no-op) value for consumers rendered outside <AdminAuthProvider> —
// e.g. <ProtectedRoute> is shared by both academy and admin routes and calls
// this hook unconditionally regardless of which mode it's in.
const inertDefault: AdminAuthValue = {
  admin: null,
  loading: false,
  hasPermission: () => false,
  setDevAdmin: () => {},
  clearDevAdmin: () => {},
};

const AdminAuthContext = createContext<AdminAuthValue>(inertDefault);

function useAdminAuthState(): AdminAuthValue {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In dev: read from localStorage dev override
    if (import.meta.env.DEV) {
      const devOverride = localStorage.getItem('spotclm_admin_dev');
      if (devOverride) {
        try {
          const parsed = JSON.parse(devOverride);
          setAdmin(parsed);
          setLoading(false);
          return;
        } catch { /* ignore */ }
      }
    }

    // In production: fetch the current admin from the backend.
    // Cloudflare Access injects the JWT which the backend validates.
    // We cannot read CF_Authorization directly because it is HttpOnly.
    fetch('/api/admin/me', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include' // Ensure CF Access cookie is sent
    })
      .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then((data: any) => {
        if (data && data.admin) {
          setAdmin(data.admin);
        } else {
          setAdmin(null);
        }
      })
      .catch(err => {
        console.error("Auth check failed:", err);
        setAdmin(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!admin) return false;
    if (admin.role === 'superadmin') return true;
    return admin.permissions.includes(permission);
  };

  // Dev-only: set a mock admin user in localStorage for testing
  const setDevAdmin = (user: AdminUser) => {
    if (import.meta.env.DEV) {
      localStorage.setItem('spotclm_admin_dev', JSON.stringify(user));
      setAdmin(user);
    }
  };

  const clearDevAdmin = () => {
    if (import.meta.env.DEV) {
      localStorage.removeItem('spotclm_admin_dev');
      setAdmin(null);
    }
  };

  return { admin, loading, hasPermission, setDevAdmin, clearDevAdmin };
}

// One /api/admin/me fetch shared by every consumer, instead of each
// useAdminAuth() call firing its own request.
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const value = useAdminAuthState();
  return createElement(AdminAuthContext.Provider, { value }, children);
}

export function useAdminAuth(): AdminAuthValue {
  return useContext(AdminAuthContext);
}
