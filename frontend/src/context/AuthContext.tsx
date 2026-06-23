import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppUser, Role } from '../types';
import * as authService from '../services/auth';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, role: Role) => Promise<AppUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const clearSession = useCallback(() => {
    setUser(null);
  }, []);

  const initUser = async () => {
    try {
      const active = await authService.getCurrentUser();
      setUser(active);
    } catch (error) {
      console.error('Erreur lors de la récupération de la session utilisateur', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initUser();
  }, []);

  const login = async (_username: string, _role: Role): Promise<AppUser> => {
    window.location.href = '/oauth2/authorization/keycloak';
    return new Promise(() => {});
  };

  const logout = async () => {
    window.location.href = '/logout';
  };

  const refreshUser = async () => {
    try {
      const active = await authService.getCurrentUser();
      setUser(active);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement utilisateur', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé au sein d\'un AuthProvider');
  }
  return context;
};
