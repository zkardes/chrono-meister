import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuth, AuthUser } from '@/hooks/use-auth';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { debugAuth } from '@/lib/debug-auth';
import { safariStorageAdapter, type StorageInfo } from '@/lib/safari-storage-adapter';

type Company = Tables<'companies'>;

interface AuthContextType extends AuthUser {
  company: Company | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  recoverSession: () => Promise<any>;
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

  // Session recovery function with better error handling
  const recoverSession = async () => {
    console.log('🔄 Attempting session recovery...');
    
    try {
      // Check Safari storage info for diagnostics
      const storageInfo = safariStorageAdapter.getStorageInfo();
      if (storageInfo.isSafari) {
        console.log('🦁 Safari session recovery - storage info:', storageInfo);
        
        if (storageInfo.isPrivateMode) {
          console.warn('⚠️ Safari private mode detected - session persistence limited');
        }
        
        if (!storageInfo.isLocalStorageAvailable) {
          console.warn('⚠️ Safari localStorage restricted - using memory fallback');
        }
      }
      
      // First check if we already have a valid session
      const { data: { session: currentSession }, error: currentError } = await supabase.auth.getSession();
      
      if (!currentError && currentSession) {
        // Check if current session is still valid (not expired)
        if (currentSession.expires_at) {
          const expiresAt = new Date(currentSession.expires_at * 1000);
          const now = new Date();
          const timeUntilExpiry = expiresAt.getTime() - now.getTime();
          
          // If session has more than 1 minute left, don't refresh
          if (timeUntilExpiry > 60000) {
            console.log('✅ Current session is still valid, no refresh needed');
            return currentSession;
          }
        }
      }
      
      // Only refresh if the current session is expired or invalid
      console.log('🔄 Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh failed:', error);
        
        // Safari-specific error handling
        if (storageInfo.isSafari && error.message.includes('storage')) {
          console.warn('🦁 Safari storage issue detected during session refresh');
        }
        
        return null;
      } else {
        console.log('✅ Session refreshed successfully');
        return data.session;
      }
    } catch (error) {
      console.error('❌ Session recovery error:', error);
      
      // Additional Safari diagnostics on error
      const storageInfo = safariStorageAdapter.getStorageInfo();
      if (storageInfo.isSafari) {
        console.warn('🦁 Safari session recovery failed - storage info:', storageInfo);
      }
      
      return null;
    }
  };

  // Enhanced session monitor with automatic recovery
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;
    
    // Less aggressive checking - 1 minute intervals
    const checkInterval = 60000; // 1 minute for both dev and prod
    
    sessionCheckInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && isAuthenticated) {
          console.warn('⚠️ Session lost but auth state shows authenticated - attempting recovery');
          const recoveredSession = await recoverSession();
          
          if (!recoveredSession) {
            console.warn('⚠️ Session recovery failed - user may need to re-login');
            // Don't force page refresh as it can interfere with session persistence
            // Let the user manually refresh if needed
          }
        }
        
        // Check if session is expiring soon (within 5 minutes)
        if (session && session.expires_at) {
          const expiresAt = new Date(session.expires_at * 1000);
          const now = new Date();
          const timeUntilExpiry = expiresAt.getTime() - now.getTime();
          const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
          
          if (timeUntilExpiry <= fiveMinutes && timeUntilExpiry > 0) {
            console.log('⏰ Session expiring soon, refreshing...');
            await recoverSession();
          }
        }
      } catch (error) {
        console.error('❌ Session monitoring error:', error);
      }
    }, checkInterval);
    
    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
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