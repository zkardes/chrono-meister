-- Fix user registration trigger to handle company code and employee creation
-- This migration resolves the registration flow issues

-- Update the user registration trigger to handle company assignment and employee creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_company_id UUID;
  user_email TEXT;
  company_code_input TEXT;
  first_name_input TEXT;
  last_name_input TEXT;
  employee_id_input TEXT;
  new_employee_id UUID;
BEGIN
  -- Get user email from NEW record (it's available in the trigger)
  user_email := NEW.email;
  
  -- Extract metadata from user_metadata if available
  company_code_input := COALESCE(NEW.raw_user_meta_data->>'companyCode', '');
  first_name_input := COALESCE(NEW.raw_user_meta_data->>'firstName', '');
  last_name_input := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
  employee_id_input := COALESCE(NEW.raw_user_meta_data->>'employeeId', '');
  
  -- Find company by company code if provided
  IF company_code_input != '' THEN
    SELECT id INTO user_company_id 
    FROM companies 
    WHERE company_code = company_code_input 
      AND is_active = true
    LIMIT 1;
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
    ELSE
      -- Link existing employee to this user
      UPDATE employees 
      SET auth_user_id = NEW.id,
          email = user_email,
          first_name = COALESCE(first_name_input, first_name),
          last_name = COALESCE(last_name_input, last_name)
      WHERE id = new_employee_id;
    END IF;
  END IF;
  
  -- Create user profile
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add INSERT policy for employees table to allow trigger to create records
CREATE POLICY "System can create employee records" ON employees
  FOR INSERT WITH CHECK (auth_user_id IS NOT NULL);

-- Add INSERT policy for user_profiles to allow trigger to create records  
CREATE POLICY "System can create user profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- Grant necessary permissions for the trigger function
GRANT INSERT ON employees TO service_role;
GRANT INSERT ON user_profiles TO service_role;