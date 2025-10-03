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
  initialLoadComplete: boolean; // New flag to track initial load
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthUser>({
    user: null,
    profile: null,
    employee: null,
    company: null,
    loading: true,
    initialLoadComplete: false, // Track if we've completed at least one load cycle
  });

  useEffect(() => {
    let mounted = true;
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          if (mounted) {
            setAuthState(prev => ({ ...prev, loading: false, initialLoadComplete: true }));
          }
          return;
        }
        
        if (session?.user && mounted) {
          console.log('✅ Session found, loading user data...');
          await loadUserData(session.user, true); // Pass true for initial load
        } else {
          console.log('ℹ️ No session found');
          if (mounted) {
            setAuthState(prev => ({ ...prev, loading: false, initialLoadComplete: true }));
          }
        }
      } catch (error) {
        console.error('❌ Initial session error:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, loading: false, initialLoadComplete: true }));
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, {
          email: session?.user?.email || 'No user',
          hasSession: !!session,
          sessionId: session?.access_token?.substring(0, 10) + '...' || 'No token'
        });
        
        if (!mounted) {
          console.log('⚠️ Component unmounted, ignoring auth change');
          return;
        }
        
        if (session?.user) {
          console.log('📊 Loading user data after auth change...');
          await loadUserData(session.user);
        } else {
          console.log('🧽 Clearing auth state - no session');
          setAuthState({
            user: null,
            profile: null,
            employee: null,
            company: null,
            loading: false,
            initialLoadComplete: false,
          });
        }

      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async (user: User, isInitialLoad = false) => {
    try {
      console.log('📊 Loading user data for:', user.email, 'Initial load:', isInitialLoad);
      
      // For initial loads, try to get cached data first for faster rendering
      if (isInitialLoad) {
        // Try to get cached data from localStorage for immediate rendering
        const cachedProfile = localStorage.getItem(`user_profile_${user.id}`);
        const cachedEmployee = localStorage.getItem(`user_employee_${user.id}`);
        const cachedCompany = localStorage.getItem(`user_company_${user.id}`);
        
        if (cachedProfile) {
          try {
            const profile = JSON.parse(cachedProfile);
            setAuthState(prev => ({
              ...prev,
              user,
              profile,
              employee: cachedEmployee ? JSON.parse(cachedEmployee) : null,
              company: cachedCompany ? JSON.parse(cachedCompany) : null,
              loading: false, // Set loading to false for immediate render
            }));
          } catch (e) {
            console.warn('Failed to parse cached user data');
          }
        }
      }
      
      // Get user profile with retry logic
      let profile = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !profile) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError && profileError.code === 'PGRST116') {
          // No profile found, wait a bit and retry (might be creating)
          console.log(`⏳ Profile not found, retry ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        } else if (profileError) {
          console.error('❌ Profile error:', profileError);
          break;
        } else {
          profile = profileData;
          console.log('✅ Profile loaded');
          
          // Cache profile data for faster loads
          try {
            localStorage.setItem(`user_profile_${user.id}`, JSON.stringify(profile));
          } catch (e) {
            console.warn('Failed to cache profile data');
          }
        }
      }

      // Get employee data if profile exists and has employee_id
      let employee = null;
      if (profile?.employee_id) {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', profile.employee_id)
          .single();
          
        if (employeeError) {
          console.error('❌ Employee error:', employeeError);
        } else {
          employee = employeeData;
          console.log('✅ Employee loaded');
          
          // Cache employee data
          try {
            localStorage.setItem(`user_employee_${user.id}`, JSON.stringify(employee));
          } catch (e) {
            console.warn('Failed to cache employee data');
          }
        }
      }

      // Get company data if profile exists and has company_id
      let company = null;
      if (profile?.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();
          
        if (companyError) {
          console.error('❌ Company error:', companyError);
        } else {
          company = companyData;
          console.log('✅ Company loaded');
          
          // Cache company data
          try {
            localStorage.setItem(`user_company_${user.id}`, JSON.stringify(company));
          } catch (e) {
            console.warn('Failed to cache company data');
          }
        }
      }

      setAuthState({
        user,
        profile,
        employee,
        company,
        loading: false,
        initialLoadComplete: true, // Mark that we've completed a full load
      });
      
      console.log('✨ User data loading complete');
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false,
        initialLoadComplete: true, // Even on error, mark as complete
      }));
    }
  };

  return authState;
};

// Helper function to attempt employee linking during registration
const attemptEmployeeLinking = async (userId: string, userData: {
  firstName: string;
  lastName: string;
  email: string;
}) => {
  try {
    console.log('🔍 Searching for employee record to link...');
    
    // Get the user's company from their profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', userId)
      .single();
      
    if (!profile?.company_id) {
      console.log('⚠️ No company found for user, skipping employee linking');
      return;
    }
    
    // Try to find employee by exact match first
    let { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('email', userData.email.toLowerCase())
      .eq('first_name', userData.firstName)
      .eq('last_name', userData.lastName)
      .eq('is_active', true)
      .is('auth_user_id', null) // Not already linked
      .single();

    // If no exact match, try email only
    if (!employee && !error) {
      const { data: emailMatch, error: emailError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('email', userData.email.toLowerCase())
        .eq('is_active', true)
        .is('auth_user_id', null) // Not already linked
        .single();

      if (!emailError && emailMatch) {
        employee = emailMatch;
        console.log('🔗 Found employee by email match (name may differ)');
      }
    }

    if (employee) {
      console.log('✅ Found matching employee, linking accounts...');
      
      // Update user profile with employee_id
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ employee_id: employee.id })
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Failed to update profile with employee_id:', profileError);
        return;
      }

      // Update employee with auth_user_id
      const { error: employeeError } = await supabase
        .from('employees')
        .update({ auth_user_id: userId })
        .eq('id', employee.id);

      if (employeeError) {
        console.error('❌ Failed to update employee with auth_user_id:', employeeError);
        return;
      }
      
      console.log('✨ Employee linking successful!');
    } else {
      console.log('📍 No matching employee record found for automatic linking');
    }
  } catch (error) {
    console.error('❌ Error during employee linking:', error);
  }
};

export const useAuthActions = () => {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('🔑 Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }
      
      if (!data.session) {
        console.error('❌ No session returned from sign in');
        throw new Error('No session created');
      }
      
      console.log('✅ Sign in successful:', {
        user: data.user?.email,
        sessionExists: !!data.session
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Sign in failed:', error);
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
      console.log('🚀 Starting registration process for:', email);
      console.log('📋 User data:', userData);
      
      // First, validate company code if provided
      if (userData?.companyCode) {
        console.log('🔍 Validating company code:', userData.companyCode);
        
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, name, company_code')
          .eq('company_code', userData.companyCode)
          .eq('is_active', true)
          .single();
          
        if (companyError || !company) {
          console.error('❌ Company validation failed:', companyError);
          return { 
            success: false, 
            error: { message: 'Invalid company code. Please check with your administrator.' } as AuthError 
          };
        }
        
        console.log('✅ Company validation successful:', company.name);
      }

      console.log('📤 Sending registration request to Supabase...');
      
      // Sign up the user - the database trigger will automatically create
      // the employee record and user_profile with company assignment
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      
      if (error) {
        console.error('❌ Supabase auth.signUp error:', error);
        throw error;
      }
      
      console.log('✅ Registration successful:', {
        user: data.user?.email,
        confirmed: data.user?.email_confirmed_at ? 'Yes' : 'No',
        sessionExists: !!data.session
      });
      
      // If user is automatically confirmed (in development), log additional info
      if (data.session) {
        console.log('🎯 User automatically confirmed, checking profile creation...');
        
        // Give the trigger a moment to execute
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile was created successfully
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user?.id)
          .single();
          
        if (profileError) {
          console.warn('⚠️ Profile not found immediately after registration:', profileError.message);
        } else {
          console.log('✅ User profile created successfully:', {
            hasCompany: !!profile.company_id,
            hasEmployee: !!profile.employee_id,
            role: profile.role
          });
          
          // If no employee was linked by the trigger, try to find and link manually
          if (!profile.employee_id && userData?.firstName && userData?.lastName) {
            console.log('🔗 Attempting manual employee linking...');
            await attemptEmployeeLinking(data.user!.id, {
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: data.user!.email!
            });
          }
        }
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      return { success: false, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      console.log('🚪 Starting sign out process...');
      
      // Clear the auth state first
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }
      
      console.log('✅ Sign out successful');
      
      // Give a moment for the auth state change to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true };
    } catch (error) {
      console.error('❌ Sign out failed:', error);
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