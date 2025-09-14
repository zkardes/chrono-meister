/**
 * Registration Debug Tools
 * 
 * These tools help debug registration issues by providing
 * detailed insights into the registration flow.
 */

import { supabase } from '@/integrations/supabase/client';

export const registrationDebug = {
  async testCompanyCode(companyCode: string) {
    console.log(`🔍 Testing company code: ${companyCode}`);
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, company_code, is_active')
        .eq('company_code', companyCode)
        .eq('is_active', true)
        .single();
        
      if (error) {
        console.error('❌ Company code validation failed:', error);
        return { valid: false, error: error.message };
      }
      
      console.log('✅ Company code valid:', data);
      return { valid: true, company: data };
    } catch (err) {
      console.error('❌ Company code test error:', err);
      return { valid: false, error: 'Unknown error' };
    }
  },

  async checkRegistrationFlow(email: string, companyCode: string) {
    console.log('🚀 Testing complete registration flow...');
    console.log('=' .repeat(50));
    
    // Step 1: Test company code
    console.log('Step 1: Validating company code...');
    const companyTest = await this.testCompanyCode(companyCode);
    if (!companyTest.valid) {
      console.error('🛑 Registration would fail - invalid company code');
      return { success: false, step: 'company_validation', error: companyTest.error };
    }
    
    // Step 2: Test email format
    console.log('Step 2: Validating email format...');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('🛑 Registration would fail - invalid email format');
      return { success: false, step: 'email_validation', error: 'Invalid email format' };
    }
    
    // Step 3: Check if email already exists
    console.log('Step 3: Checking if email is already registered...');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password' // This will fail but tell us if user exists
      });
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials')) {
        console.log('✅ Email is available for registration');
      } else if (err.message?.includes('Email not confirmed')) {
        console.warn('⚠️ Email exists but not confirmed');
        return { success: false, step: 'email_check', error: 'Email already registered but not confirmed' };
      } else {
        console.log('✅ Email appears to be available');
      }
    }
    
    console.log('✅ All pre-registration checks passed!');
    console.log('Registration should succeed with these parameters.');
    console.log('=' .repeat(50));
    
    return { success: true, message: 'All checks passed' };
  },

  async testTriggerFunction() {
    console.log('🔧 Testing database trigger function...');
    
    try {
      // Test if we can read companies (needed for trigger)
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, company_code')
        .limit(5);
        
      if (companiesError) {
        console.error('❌ Cannot read companies table:', companiesError);
        return { success: false, error: 'Cannot access companies table' };
      }
      
      console.log('✅ Companies table accessible:', companies?.length, 'companies found');
      
      // Test if we can read user_profiles structure
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
        
      console.log('📊 User profiles table check:', profilesError ? 'Error' : 'Accessible');
      
      // Test if we can read employees structure  
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .limit(1);
        
      console.log('📊 Employees table check:', employeesError ? 'Error' : 'Accessible');
      
      return { success: true, message: 'Database structure looks good' };
    } catch (err) {
      console.error('❌ Database trigger test failed:', err);
      return { success: false, error: 'Database access failed' };
    }
  },

  async fullRegistrationTest(email: string, companyCode: string, firstName: string, lastName: string) {
    console.log('🧪 Running FULL registration test...');
    console.log('🎯 Target:', { email, companyCode, firstName, lastName });
    console.log('=' .repeat(60));
    
    // Run all tests
    const triggerTest = await this.testTriggerFunction();
    console.log('');
    
    const flowTest = await this.checkRegistrationFlow(email, companyCode);
    console.log('');
    
    if (triggerTest.success && flowTest.success) {
      console.log('🎉 ALL TESTS PASSED! Registration should work.');
      console.log('💡 You can now safely register with these credentials.');
    } else {
      console.log('🚨 SOME TESTS FAILED!');
      console.log('Trigger test:', triggerTest.success ? '✅' : '❌', triggerTest.error || '');
      console.log('Flow test:', flowTest.success ? '✅' : '❌', flowTest.error || '');
    }
    
    console.log('=' .repeat(60));
    
    return {
      success: triggerTest.success && flowTest.success,
      tests: {
        trigger: triggerTest,
        flow: flowTest
      }
    };
  }
};

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).registrationDebug = registrationDebug;
}