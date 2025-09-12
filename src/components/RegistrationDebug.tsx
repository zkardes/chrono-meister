import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';

const RegistrationDebug = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string>('');
  const [testEmail, setTestEmail] = useState('test@demo.company');
  const [companyCode, setCompanyCode] = useState('DEMO2025');

  const addResult = (message: string) => {
    setResults(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + message);
  };

  const checkTriggerExists = async () => {
    setLoading(true);
    addResult('🔧 Checking if trigger function exists...');
    
    try {
      // Simply try to call the test function to see if it exists
      const { data, error } = await supabase.rpc('test_trigger_function' as any, {
        test_user_id: '00000000-0000-0000-0000-000000000000',
        test_email: 'test@example.com',
        test_metadata: { firstName: 'Test', lastName: 'User', companyCode: 'DEMO2025' }
      });
      
      if (error) {
        if (error.code === '42883') {
          addResult('❌ Trigger function does not exist');
          addResult('💡 You need to apply the latest migration: 20250912160000_fix_trigger_execution.sql');
        } else {
          addResult('❌ Trigger function error: ' + error.message);
        }
      } else {
        addResult('✅ Trigger function is available and working');
        addResult('   Result: ' + data);
      }
    } catch (error) {
      addResult('❌ Error checking trigger: ' + (error as Error).message);
    }
    setLoading(false);
  };

  const checkCompanyCode = async () => {
    setLoading(true);
    addResult(`🏢 Checking company code: ${companyCode}`);
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, company_code')
        .eq('company_code', companyCode)
        .eq('is_active', true)
        .single();
        
      if (error) {
        addResult('❌ Company not found: ' + error.message);
      } else {
        addResult(`✅ Company found: ${data.name} (ID: ${data.id})`);
      }
    } catch (error) {
      addResult('❌ Error checking company: ' + (error as Error).message);
    }
    setLoading(false);
  };

  const checkUnlinkedUsers = async () => {
    setLoading(true);
    addResult('🔍 Looking for unlinked users...');
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addResult('❌ No authenticated user');
        setLoading(false);
        return;
      }
      
      addResult(`📋 Current user: ${user.email} (ID: ${user.id})`);
      
      // Check if current user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          company:companies(name, company_code),
          employee:employees(first_name, last_name, employee_id)
        `)
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        addResult('❌ User profile not found: ' + profileError.message);
        addResult('💡 This user needs to be processed by the trigger');
      } else {
        addResult('✅ User profile exists:');
        addResult(`  - Role: ${profile.role}`);
        addResult(`  - Company: ${profile.company?.name || 'None'} (${profile.company?.company_code || 'N/A'})`);
        addResult(`  - Employee: ${profile.employee ? `${profile.employee.first_name} ${profile.employee.last_name} (${profile.employee.employee_id})` : 'None'}`);
      }
    } catch (error) {
      addResult('❌ Error checking user: ' + (error as Error).message);
    }
    setLoading(false);
  };

  const processUnlinkedUsers = async () => {
    setLoading(true);
    addResult('🔄 Attempting to process unlinked users...');
    
    try {
      const { data, error } = await supabase.rpc('process_unlinked_users' as any);
      
      if (error) {
        addResult('❌ Process function error: ' + error.message);
        addResult('💡 The function may not exist - you may need to apply the latest migration');
      } else {
        addResult('✅ Process function executed successfully');
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((result: any) => {
            addResult(`  - ${result.email}: ${result.result}`);
          });
        } else {
          addResult('  - No unlinked users found');
        }
      }
    } catch (error) {
      addResult('❌ Error processing users: ' + (error as Error).message);
    }
    setLoading(false);
  };

  const testRegistration = async () => {
    setLoading(true);
    addResult(`🧪 Testing registration system with email: ${testEmail}`);
    
    try {
      // Note: We can't check existing users from client-side
      // Instead, we'll focus on testing the current user's setup
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        addResult('ℹ️ Current user is authenticated, checking their setup...');
        
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*, company:companies(name), employee:employees(first_name, last_name)')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          addResult('❌ No profile found for current user - trigger may have failed');
          addResult('💡 Try using "Process Unlinked" to fix this user');
        } else {
          addResult('✅ Current user setup is correct:');
          addResult(`  - Company: ${profile.company?.name || 'None'}`);
          addResult(`  - Employee: ${profile.employee ? `${profile.employee.first_name} ${profile.employee.last_name}` : 'None'}`);
        }
      } else {
        addResult('⚠️ No authenticated user found');
        addResult('💡 Register a new user, then login and run this test');
      }
      
    } catch (error) {
      addResult('❌ Error testing registration: ' + (error as Error).message);
    }
    setLoading(false);
  };

  const clearResults = () => {
    setResults('');
  };

  const runFullDiagnostic = async () => {
    clearResults();
    addResult('🚀 Running full registration system diagnostic...\n');
    
    await checkTriggerExists();
    await checkCompanyCode();
    await checkUnlinkedUsers();
    
    addResult('\n📊 Diagnostic complete. Review the results above.');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Registration System Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="testEmail">Test Email</Label>
            <Input
              id="testEmail"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@demo.company"
            />
          </div>
          <div>
            <Label htmlFor="companyCode">Company Code</Label>
            <Input
              id="companyCode"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
              placeholder="DEMO2025"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={runFullDiagnostic} disabled={loading} variant="default">
            Run Full Diagnostic
          </Button>
          <Button onClick={checkTriggerExists} disabled={loading} variant="outline">
            Check Trigger
          </Button>
          <Button onClick={checkCompanyCode} disabled={loading} variant="outline">
            Check Company
          </Button>
          <Button onClick={checkUnlinkedUsers} disabled={loading} variant="outline">
            Check Current User
          </Button>
          <Button onClick={processUnlinkedUsers} disabled={loading} variant="outline">
            Process Unlinked
          </Button>
          <Button onClick={testRegistration} disabled={loading} variant="outline">
            Test Registration
          </Button>
          <Button onClick={clearResults} variant="ghost">
            Clear Results
          </Button>
        </div>
        
        <div>
          <Label htmlFor="results">Debug Results</Label>
          <Textarea
            id="results"
            value={results}
            readOnly
            rows={20}
            className="font-mono text-sm"
            placeholder="Debug results will appear here..."
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <h4 className="font-semibold mb-2">Instructions:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Run "Full Diagnostic" to check the overall system status</li>
            <li>If the trigger function doesn't exist, apply the latest migration</li>
            <li>If users are unlinked, use "Process Unlinked" to fix them</li>
            <li>Test registration by creating a new user on the registration page, then check here</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegistrationDebug;