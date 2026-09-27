/**
 * SIH26011 - Auth Context
 * Real JWT authentication with token storage
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/endpoints';
import type { UserInfo, LoginRequest } from '../api/types';

interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'surveyor' | 'reviewer' | 'viewer';
  displayName: string;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      if (authApi.isAuthenticated()) {
        try {
          const result = await authApi.getMe();
          if (result.success && result.data) {
            setUser({
              id: result.data.id,
              username: result.data.username,
              role: result.data.role,
              displayName: result.data.display_name,
              isActive: result.data.is_active,
            });
          } else {
            authApi.logout();
          }
        } catch {
          authApi.logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const result = await authApi.login(credentials);
    if (result.success && result.data) {
      setUser({
        id: result.data.user.id,
        username: result.data.user.username,
        role: result.data.user.role,
        displayName: result.data.user.display_name,
        isActive: true,
      });
    } else {
      throw new Error(result.error || 'Login failed');
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}