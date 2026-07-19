import React, { createContext, useContext, useEffect, useState } from 'react';
import { academyAPI } from './api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  partnerStatus: string;
  creditBalance: number;
  referralCode: string;
  avatarUrl?: string;
  bio?: string;
}

interface AcademyContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

export function AcademyProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await academyAPI.auth.me();
      if (res && res.success) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await academyAPI.auth.logout();
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AcademyContext.Provider value={{ user, loading, refreshUser: fetchUser, logout }}>
      {children}
    </AcademyContext.Provider>
  );
}

export function useAcademy() {
  const context = useContext(AcademyContext);
  if (context === undefined) {
    throw new Error('useAcademy must be used within an AcademyProvider');
  }
  return context;
}
