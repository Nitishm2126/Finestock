'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser, LoginPayload, RegisterPayload } from '@/types';
import * as authService from '@/services/auth.service';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;

    const initAuth = async () => {
      const storedToken = authService.tokenStorage.get();
      if (!storedToken) {
        if (!isCancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await authService.getMe();
        if (!isCancelled) {
          if (res.success && res.user) {
            setToken(storedToken);
            setUser(res.user);
          } else {
            setUser(null);
            setToken(null);
          }
        }
      } catch {
        if (!isCancelled) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void initAuth();

    return () => {
      isCancelled = true;
    };
  }, []);

  const refreshProfile = async () => {
    try {
      const storedToken = authService.tokenStorage.get();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        return;
      }
      const res = await authService.getMe();
      if (res.success && res.user) {
        setToken(storedToken);
        setUser(res.user);
      }
    } catch {
      setUser(null);
      setToken(null);
    }
  };

  const handleLogin = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const res = await authService.login(payload);
      if (res.success && res.access_token) {
        setToken(res.access_token);
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const res = await authService.register(payload);
      if (res.success && res.access_token) {
        setToken(res.access_token);
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user && token),
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
