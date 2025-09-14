import { supabase } from '@/integrations/supabase/client';
import { safariStorageAdapter } from './safari-storage-adapter';

export const debugAuth = {
  async testConnection() {
    console.log('🔍 Testing Supabase connection...');
    
    try {
      // Test basic connection
      const { data, error } = await supabase.from('companies').select('count').limit(1);
      if (error) {
        console.error('❌ Connection test failed:', error);
        return false;
      }
      console.log('✅ Connection test passed');
      return true;
    } catch (err) {
      console.error('❌ Connection test error:', err);
      return false;
    }
  },

  async checkSession() {
    console.log('🔍 Checking current session...');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session check failed:', error);
        return null;
      }
      
      if (session) {
        console.log('✅ Active session found:', {
          user: session.user?.email,
          expires_at: session.expires_at,
          access_token: session.access_token ? 'Present' : 'Missing'
        });
      } else {
        console.log('ℹ️ No active session');
      }
      
      return session;
    } catch (err) {
      console.error('❌ Session check error:', err);
      return null;
    }
  },

  async checkUser() {
    console.log('🔍 Checking current user...');
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ User check failed:', error);
        return null;
      }
      
      if (user) {
        console.log('✅ User found:', {
          id: user.id,
          email: user.email,
          last_sign_in: user.last_sign_in_at
        });
      } else {
        console.log('ℹ️ No user found');
      }
      
      return user;
    } catch (err) {
      console.error('❌ User check error:', err);
      return null;
    }
  },

  async checkStorage() {
    console.log('🔍 Checking localStorage...');
    
    try {
      // Check Safari storage adapter info
      const storageInfo = safariStorageAdapter.getStorageInfo();
      console.log('🦁 Safari storage adapter info:', storageInfo);
      
      const keys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth')
      );
      
      console.log('📦 Auth-related localStorage keys:', keys);
      
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            console.log(`🔑 ${key}:`, {
              hasAccessToken: !!parsed.access_token,
              hasRefreshToken: !!parsed.refresh_token,
              expiresAt: parsed.expires_at
            });
          } catch {
            console.log(`🔑 ${key}: Non-JSON value`);
          }
        }
      });
    } catch (err) {
      console.error('❌ Storage check error:', err);
    }
  },

  async fullDebug() {
    console.log('🚀 Starting full authentication debug...');
    console.log('='.repeat(50));
    
    await this.testConnection();
    console.log('');
    
    await this.checkSession();
    console.log('');
    
    await this.checkUser();
    console.log('');
    
    await this.checkStorage();
    console.log('');
    
    console.log('✨ Debug complete');
    console.log('='.repeat(50));
  }
};

// Make it available globally for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}