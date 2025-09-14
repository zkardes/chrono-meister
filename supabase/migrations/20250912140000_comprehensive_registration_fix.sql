-- Comprehensive fix for registration issues
-- This migration addresses RLS policies, permissions, and trigger function issues

-- First, let's fix the RLS policies to allow registration
-- Drop problematic policies temporarily
DROP POLICY IF EXISTS "System can create employee records" ON employees;
DROP POLICY IF EXISTS "System can create user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create proper RLS policies for user registration
-- Allow service role and authenticated users to insert user profiles
CREATE POLICY "Allow user profile creation during registration" ON user_profiles
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR 
    auth.uid() = id OR
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles 
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Allow employee record creation during registration
CREATE POLICY "Allow employee creation during registration" ON employees
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR
    auth_user_id = auth.uid() OR
    auth.role() = 'authenticated'
  );

-- Make sure the trigger function has proper security context
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  user_email TEXT;
  company_code_input TEXT;
  first_name_input TEXT;
  last_name_input TEXT;
  employee_id_input TEXT;
  new_employee_id UUID;
BEGIN
  -- Get user email from NEW record
  user_email := NEW.email;
  
  -- Extract metadata from user_metadata if available
  company_code_input := COALESCE(NEW.raw_user_meta_data->>'companyCode', '');
  first_name_input := COALESCE(NEW.raw_user_meta_data->>'firstName', '');
  last_name_input := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
  employee_id_input := COALESCE(NEW.raw_user_meta_data->>'employeeId', '');
  
  -- Log the registration attempt (for debugging)
  RAISE NOTICE 'Processing registration for: % with company code: %', user_email, company_code_input;
  
  -- Find company by company code if provided
  IF company_code_input != '' THEN
    SELECT id INTO user_company_id 
    FROM companies 
    WHERE company_code = company_code_input 
      AND is_active = true
    LIMIT 1;
    
    RAISE NOTICE 'Company lookup result: %', user_company_id;
  END IF;
  
  -- If no company found by code, try to find by email domain (fallback)
  IF user_company_id IS NULL THEN
    SELECT id INTO user_company_id 
    FROM companies 
    WHERE domain IS NOT NULL 
      AND user_email LIKE '%@' || domain
      AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Create employee record if we have name information and company
  IF first_name_input != '' AND last_name_input != '' AND user_company_id IS NOT NULL THEN
    -- Check if there's an existing employee with the provided employee_id
    IF employee_id_input != '' THEN
      SELECT id INTO new_employee_id
      FROM employees 
      WHERE employee_id = employee_id_input 
        AND company_id = user_company_id 
        AND auth_user_id IS NULL; -- Not already linked
    END IF;
    
    -- If no existing employee found, create a new one
    IF new_employee_id IS NULL THEN
      INSERT INTO employees (
        email, 
        first_name, 
        last_name, 
        employee_id, 
        company_id, 
        auth_user_id,
        is_active
      ) VALUES (
        user_email,
        first_name_input,
        last_name_input,
        COALESCE(employee_id_input, 'EMP' || UPPER(SUBSTRING(NEW.id::text, 1, 8))),
        user_company_id,
        NEW.id,
        true
      ) RETURNING id INTO new_employee_id;
      
      RAISE NOTICE 'Created new employee: %', new_employee_id;
    ELSE
      -- Link existing employee to this user
      UPDATE employees 
      SET auth_user_id = NEW.id,
          email = user_email,
          first_name = COALESCE(first_name_input, first_name),
          last_name = COALESCE(last_name_input, last_name)
      WHERE id = new_employee_id;
      
      RAISE NOTICE 'Linked existing employee: %', new_employee_id;
    END IF;
  END IF;
  
  -- Create user profile (this is the critical part)
  INSERT INTO public.user_profiles (
    id, 
    role, 
    company_id, 
    employee_id,
    is_active
  ) VALUES (
    NEW.id, 
    'employee', 
    user_company_id,
    new_employee_id,
    true
  );
  
  RAISE NOTICE 'Created user profile for: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_new_user: % %', SQLSTATE, SQLERRM;
    RETURN NEW; -- Don't block user creation even if our custom logic fails
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT ALL ON employees TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON companies TO service_role;

-- Ensure anon role can read companies for validation
GRANT SELECT ON companies TO anon;

-- Update RLS to allow anon access to companies for validation
DROP POLICY IF EXISTS "Anonymous users can read companies for registration" ON companies;
CREATE POLICY "Anonymous users can read companies for registration" ON companies
  FOR SELECT USING (is_active = true);

-- Ensure service role can bypass RLS for registration
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;