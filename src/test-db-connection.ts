// Simple test to check database connection
import { supabase } from './integrations/supabase/client';

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection by fetching session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }
    
    console.log('Session status:', session ? 'Active' : 'None');
    
    if (session?.user) {
      console.log('User email:', session.user.email);
      
      // Try to fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (profileError) {
        console.error('Profile fetch error:', profileError);
      } else {
        console.log('User profile:', profile);
        
        if (profile?.company_id) {
          // Try to fetch company info
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profile.company_id)
            .single();
            
          if (companyError) {
            console.error('Company fetch error:', companyError);
          } else {
            console.log('Company:', company);
          }
        }
      }
    }
    
    console.log('Connection test completed successfully');
  } catch (error) {
    console.error('Connection test failed:', error);
  }
}

testConnection();