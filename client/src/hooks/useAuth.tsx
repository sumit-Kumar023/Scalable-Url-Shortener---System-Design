import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { meRequest, loginRequest, registerRequest, logoutRequest } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    meRequest()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { user: loggedInUser, token } = await loginRequest(email, password);
    localStorage.setItem('token', token);
    setUser(loggedInUser);
  }

  async function register(name: string, email: string, password: string) {
    await registerRequest(name, email, password);
    await login(email, password);
  }

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
