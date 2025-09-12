import { createClient } from '@supabase/supabase-js';

// Supabase configuration for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function testTriggerFunction() {
  console.log('🧪 Testing trigger function...');
  
  try {
    // Test the trigger function with sample data
    const testUserId = '12345678-1234-1234-1234-123456789abc';
    const testEmail = 'test@demo.company';
    const testMetadata = {
      firstName: 'John',
      lastName: 'Doe', 
      companyCode: 'DEMO2025',
      employeeId: 'EMP001'
    };
    
    const { data, error } = await supabaseAdmin.rpc('test_trigger_function', {
      test_user_id: testUserId,
      test_email: testEmail,
      test_metadata: testMetadata
    });
    
    if (error) {
      console.error('❌ Test function error:', error);
      return false;
    }
    
    console.log('✅ Test result:', data);
    
    // Check if test records were created
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .single();
      
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('auth_user_id', testUserId)
      .single();
    
    console.log('📊 Created records:');
    console.log('Profile:', profile ? '✅ Created' : '❌ Missing');
    console.log('Employee:', employee ? '✅ Created' : '❌ Missing');
    
    // Clean up test records
    if (profile) {
      await supabaseAdmin.from('user_profiles').delete().eq('id', testUserId);
    }
    if (employee) {
      await supabaseAdmin.from('employees').delete().eq('auth_user_id', testUserId);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

export async function processUnlinkedUsers() {
  console.log('🔄 Processing unlinked users...');
  
  try {
    const { data, error } = await supabaseAdmin.rpc('process_unlinked_users');
    
    if (error) {
      console.error('❌ Process unlinked users error:', error);
      return false;
    }
    
    console.log('📋 Processing results:');
    data?.forEach((result: any) => {
      console.log(`${result.email}: ${result.result}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Processing failed:', error);
    return false;
  }
}

export async function verifyUserRegistration(email: string) {
  console.log('🔍 Verifying user registration for:', email);
  
  try {
    // Find user in auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth users query error:', authError);
      return false;
    }
    
    const user = authUsers.users.find((u: any) => u.email === email);
    if (!user) {
      console.log('❌ User not found in auth.users');
      return false;
    }
    
    console.log('✅ User found in auth.users:', user.id);
    console.log('📋 User metadata:', user.user_metadata);
    
    // Check user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        *,
        company:companies(*),
        employee:employees(*)
      `)
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      console.log('❌ User profile not found:', profileError.message);
      
      // Try to manually process this user
      console.log('🔧 Attempting to manually process user...');
      const { data: processResult, error: processError } = await supabaseAdmin.rpc('test_trigger_function', {
        test_user_id: user.id,
        test_email: user.email,
        test_metadata: user.user_metadata || {}
      });
      
      if (processError) {
        console.error('❌ Manual processing failed:', processError);
        return false;
      }
      
      console.log('✅ Manual processing result:', processResult);
      return true;
    }
    
    console.log('✅ User profile found:');
    console.log('  - Role:', profile.role);
    console.log('  - Company:', profile.company?.name || 'None');
    console.log('  - Employee:', profile.employee ? `${profile.employee.first_name} ${profile.employee.last_name}` : 'None');
    
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

export async function checkCompanyCode(companyCode: string) {
  console.log('🏢 Checking company code:', companyCode);
  
  try {
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('company_code', companyCode)
      .eq('is_active', true)
      .single();
      
    if (error) {
      console.log('❌ Company not found:', error.message);
      return false;
    }
    
    console.log('✅ Company found:', company.name);
    return true;
  } catch (error) {
    console.error('❌ Company check failed:', error);
    return false;
  }
}

// Debug function to check trigger status
export async function checkTriggerStatus() {
  console.log('🔧 Checking trigger status...');
  
  try {
    // Fallback: try to call the function directly to see if it exists
    const { data, error } = await supabaseAdmin.rpc('test_trigger_function', {
      test_user_id: '00000000-0000-0000-0000-000000000000',
      test_email: 'test@example.com',
      test_metadata: {}
    });
      
    if (error) {
      if (error.code === '42883') {
        console.log('❌ Trigger function not available - function does not exist');
        return false;
      } else {
        console.error('❌ Error calling trigger function:', error);
        return false;
      }
    }
    
    console.log('✅ Trigger function exists and is working');
    console.log('Test result:', data);
    return true;
  } catch (error) {
    console.error('❌ Trigger check failed:', error);
    return false;
  }
}

// Main debug function
export async function debugRegistrationSystem() {
  console.log('🚀 Running complete registration system debug...\n');
  
  const results = {
    triggerStatus: await checkTriggerStatus(),
    triggerTest: await testTriggerFunction(),
    companyCodeCheck: await checkCompanyCode('DEMO2025'),
    unlinkedUsersProcessed: await processUnlinkedUsers()
  };
  
  console.log('\n📊 Debug Summary:');
  console.log('Trigger Status:', results.triggerStatus ? '✅' : '❌');
  console.log('Trigger Test:', results.triggerTest ? '✅' : '❌');
  console.log('Company Code Check:', results.companyCodeCheck ? '✅' : '❌');
  console.log('Unlinked Users Processed:', results.unlinkedUsersProcessed ? '✅' : '❌');
  
  return results;
}

// Export for use in Node.js environment
if (typeof window === 'undefined') {
  // Node.js environment
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'debug':
      debugRegistrationSystem();
      break;
    case 'test':
      testTriggerFunction();
      break;
    case 'process':
      processUnlinkedUsers();
      break;
    case 'verify':
      const email = args[1];
      if (email) {
        verifyUserRegistration(email);
      } else {
        console.log('Usage: node registration-test.js verify <email>');
      }
      break;
    default:
      console.log('Available commands: debug, test, process, verify <email>');
  }
}