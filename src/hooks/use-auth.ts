import { useState, useEffect } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type UserProfile = Tables<'user_profiles'>;
export type Employee = Tables<'employees'>;
export type Company = Tables<'companies'>;

export interface AuthUser {
  user: User | null;
  profile: UserProfile | null;
  employee: Employee | null;
  company: Company | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthUser>({
    user: null,
    profile: null,
    employee: null,
    company: null,
    loading: true,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserData(session.user);
        } else {
          setAuthState({
            user: null,
            profile: null,
            employee: null,
            company: null,
            loading: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (user: User) => {
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Get employee data if profile exists and has employee_id
      let employee = null;
      if (profile?.employee_id) {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .eq('id', profile.employee_id)
          .single();
        employee = employeeData;
      }

      // Get company data if profile exists and has company_id
      let company = null;
      if (profile?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();
        company = companyData;
      }

      setAuthState({
        user,
        profile,
        employee,
        company,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  return authState;
};

export const useAuthActions = () => {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData?: {
    firstName?: string;
    lastName?: string;
    employeeId?: string;
    companyCode?: string;
  }) => {
    setLoading(true);
    try {
      // First, validate company code if provided
      if (userData?.companyCode) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('company_code', userData.companyCode)
          .eq('is_active', true)
          .single();
          
        if (companyError || !company) {
          return { 
            success: false, 
            error: { message: 'Invalid company code. Please check with your administrator.' } as AuthError 
          };
        }
      }

      // Sign up the user - the database trigger will automatically create
      // the employee record and user_profile with company assignment
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const linkEmployeeToUser = async (employeeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Update user profile with employee_id
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ employee_id: employeeId })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update employee with auth_user_id
      const { error: employeeError } = await supabase
        .from('employees')
        .update({ auth_user_id: user.id })
        .eq('id', employeeId);

      if (employeeError) throw employeeError;

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  };

  return {
    signIn,
    signUp,
    signOut,
    linkEmployeeToUser,
    loading,
  };
};