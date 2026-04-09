// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Authentication Context Provider
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from './api-client';
import type { AuthPayload } from '../../../packages/shared/src/types';

interface AuthContextType {
  user: AuthPayload | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchCompany: (companyId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('gonxt_token');
        if (token) {
          // Validate token with backend
          const response = await authApi.me();
          if (response.success) {
            setUser(response.data);
          } else {
            localStorage.removeItem('gonxt_token');
          }
        }
      } catch (error) {
        // Token might be expired or invalid - remove it
        localStorage.removeItem('gonxt_token');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      if (response.success) {
        localStorage.setItem('gonxt_token', response.data.access_token);
        setUser(response.data.user);
      }
    } catch (error) {
      localStorage.removeItem('gonxt_token');
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to invalidate session
      await authApi.logout();
    } catch (error) {
      // Ignore errors during logout, session might already be invalid
      console.warn('Logout error (ignoring):', error);
    } finally {
      // Clear local storage regardless of backend call success
      localStorage.removeItem('gonxt_token');
      setUser(null);
    }
  };

  const switchCompany = async (companyId: number) => {
    try {
      const response = await authApi.switchCompany(companyId);
      if (response.success && user) {
        const updatedUser = { ...user, active_company_id: companyId };
        setUser(updatedUser);
        
        // Update session in localStorage
        const token = localStorage.getItem('gonxt_token');
        if (token) {
          const session = localStorage.getItem(`session:${token}`);
          if (session) {
            const sessionData = JSON.parse(session);
            sessionData.active_company_id = companyId;
            localStorage.setItem(`session:${token}`, JSON.stringify(sessionData));
          }
        }
      }
    } catch (error) {
      console.error('Failed to switch company:', error);
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    switchCompany,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}