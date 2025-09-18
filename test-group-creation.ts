import { supabase } from './src/integrations/supabase/client';
import { handleDatabaseError } from './src/lib/database-retry';

// Test group creation
async function testGroupCreation() {
  console.log('Testing group creation...');
  
  try {
    // First, let's check if we can get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('No active session');
      return;
    }
    
    console.log('Session user:', session.user?.email);
    
    // Try to get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user?.id)
      .single();
      
    if (profileError) {
      console.error('Profile error:', profileError);
      return;
    }
    
    console.log('User profile:', profile);
    
    if (!profile.company_id) {
      console.log('No company assigned to user');
      return;
    }
    
    // Try to create a test group
    const testGroup = {
      name: 'Test Group ' + Date.now(),
      description: 'Test group for debugging',
      company_id: profile.company_id,
    };
    
    console.log('Creating test group:', testGroup);
    
    const { data, error } = await supabase
      .from('groups')
      .insert(testGroup)
      .select('*')
      .single();
      
    if (error) {
      console.error('Group creation error:', error);
      const errorMessage = handleDatabaseError(error, 'create group');
      console.error('Handled error message:', errorMessage);
    } else {
      console.log('Group created successfully:', data);
      
      // Clean up - delete the test group
      if (data?.id) {
        await supabase
          .from('groups')
          .delete()
          .eq('id', data.id);
        console.log('Test group cleaned up');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testGroupCreation();