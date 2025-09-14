-- Fix RLS policies to prevent infinite recursion
-- This migration resolves circular dependencies in user_profiles policies

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Company admins can view profiles in their company" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create simple, non-recursive policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles 
  FOR UPDATE USING (id = auth.uid());

-- Allow service role to manage user profiles during registration
CREATE POLICY "Service role can manage user profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Simplify company policies to avoid recursion
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Company admins can update their company" ON companies;

-- Create non-recursive company policies
CREATE POLICY "Authenticated users can view companies" ON companies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage companies" ON companies
  FOR ALL USING (auth.role() = 'service_role');

-- Update helper functions to be more efficient and avoid recursion
CREATE OR REPLACE FUNCTION get_current_user_company()
RETURNS UUID AS $$
DECLARE
  company_id UUID;
BEGIN
  -- Direct lookup without subqueries to avoid recursion
  SELECT up.company_id INTO company_id
  FROM user_profiles up 
  WHERE up.id = auth.uid();
  
  RETURN company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a more efficient function for checking user company membership
CREATE OR REPLACE FUNCTION user_belongs_to_company(check_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_company_id UUID;
BEGIN
  SELECT company_id INTO user_company_id
  FROM user_profiles 
  WHERE id = auth.uid();
  
  RETURN user_company_id = check_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplify employee policies to reduce complexity
DROP POLICY IF EXISTS "Users can view employees from their company" ON employees;
DROP POLICY IF EXISTS "Company admins can manage employees in their company" ON employees;

CREATE POLICY "Users can view employees from their company" ON employees 
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (company_id = get_current_user_company() OR company_id IS NULL)
  );

CREATE POLICY "Authenticated users can manage employees" ON employees
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow anon role to read companies for registration validation
CREATE POLICY "Anonymous users can read companies for registration" ON companies
  FOR SELECT USING (auth.role() = 'anon' AND is_active = true);

-- Grant necessary permissions
GRANT SELECT ON companies TO anon;
GRANT SELECT ON companies TO authenticated;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON employees TO service_role;
GRANT ALL ON companies TO service_role;