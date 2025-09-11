import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthUser } from '@/hooks/use-auth';

interface AuthContextType extends AuthUser {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authState = useAuth();

  const isAuthenticated = !!authState.user;
  const isAdmin = authState.profile?.role === 'admin';
  const isManager = authState.profile?.role === 'manager' || isAdmin;

  const value: AuthContextType = {
    ...authState,
    isAuthenticated,
    isAdmin,
    isManager,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};