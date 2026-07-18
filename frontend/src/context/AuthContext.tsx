'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = await api.get('/users/profile');
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load user profile on startup', err);
      // Clean tokens locally if API fails with unauthorized
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        emailVerified: data.emailVerified,
      });
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', data.token);
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        emailVerified: data.emailVerified,
      });
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      console.error('API logout error:', err);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
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
