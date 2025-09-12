import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuth, AuthUser } from '@/hooks/use-auth';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { debugAuth } from '@/lib/debug-auth';

type Company = Tables<'companies'>;

interface AuthContextType extends AuthUser {
  company: Company | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  recoverSession: () => Promise<void>;
  debug: typeof debugAuth;
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

  // Session recovery function
  const recoverSession = async () => {
    console.log('🔄 Attempting session recovery...');
    
    try {
      // Force refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh failed:', error);
        // Try to get the current session as fallback
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log('✅ Fallback session found');
        } else {
          console.log('ℹ️ No session to recover');
        }
      } else {
        console.log('✅ Session refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Session recovery error:', error);
    }
  };

  // Periodic session check for development debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && isAuthenticated) {
          console.warn('⚠️ Session lost but auth state shows authenticated');
        }
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const value: AuthContextType = {
    ...authState,
    company: authState.company,
    isAuthenticated,
    isAdmin,
    isManager,
    recoverSession,
    debug: debugAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};