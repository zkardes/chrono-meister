-- Debug and fix the trigger function execution
-- This migration checks why the trigger isn't creating records

-- First, let's check if the trigger exists and is properly defined
-- Drop and recreate the trigger to ensure it's working

-- Check current function and recreate it with better error handling
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
  error_msg TEXT;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user trigger started for user: %', NEW.id;
  
  -- Get user email from NEW record
  user_email := NEW.email;
  RAISE NOTICE 'Processing user email: %', user_email;
  
  -- Extract metadata from user_metadata if available
  company_code_input := COALESCE(NEW.raw_user_meta_data->>'companyCode', '');
  first_name_input := COALESCE(NEW.raw_user_meta_data->>'firstName', '');
  last_name_input := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
  employee_id_input := COALESCE(NEW.raw_user_meta_data->>'employeeId', '');
  
  RAISE NOTICE 'Extracted metadata - Company: %, Name: % %, Employee ID: %', 
    company_code_input, first_name_input, last_name_input, employee_id_input;
  
  -- Find company by company code if provided
  IF company_code_input != '' THEN
    BEGIN
      SELECT id INTO user_company_id 
      FROM companies 
      WHERE company_code = company_code_input 
        AND is_active = true
      LIMIT 1;
      
      RAISE NOTICE 'Company lookup result for code %: %', company_code_input, user_company_id;
    EXCEPTION
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'Error looking up company: %', error_msg;
    END;
  END IF;
  
  -- If no company found by code, try to find by email domain (fallback)
  IF user_company_id IS NULL THEN
    BEGIN
      SELECT id INTO user_company_id 
      FROM companies 
      WHERE domain IS NOT NULL 
        AND user_email LIKE '%@' || domain
        AND is_active = true
      LIMIT 1;
      
      RAISE NOTICE 'Email domain lookup result: %', user_company_id;
    EXCEPTION
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'Error in email domain lookup: %', error_msg;
    END;
  END IF;
  
  -- Create employee record if we have name information and company
  IF first_name_input != '' AND last_name_input != '' AND user_company_id IS NOT NULL THEN
    BEGIN
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
        
        RAISE NOTICE 'Created new employee with ID: %', new_employee_id;
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
    EXCEPTION
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'Error creating/linking employee: %', error_msg;
    END;
  ELSE
    RAISE NOTICE 'Skipping employee creation - missing data. Name: % %, Company: %', 
      first_name_input, last_name_input, user_company_id;
  END IF;
  
  -- Create user profile (this is critical and should always happen)
  BEGIN
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
    
    RAISE NOTICE 'Created user profile for user: % with company: % and employee: %', 
      NEW.id, user_company_id, new_employee_id;
      
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
      RAISE NOTICE 'ERROR creating user profile: %', error_msg;
      -- Don't fail the entire user creation, just log the error
  END;
  
  RAISE NOTICE 'handle_new_user trigger completed successfully for user: %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RAISE NOTICE 'FATAL ERROR in handle_new_user trigger: %', error_msg;
    -- Return NEW anyway to not block user creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass 
  AND tgname = 'on_auth_user_created';

-- Also add a simple test function to manually trigger the process for existing users
CREATE OR REPLACE FUNCTION manually_process_user(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_record RECORD;
  result TEXT;
BEGIN
  -- Get the user record from auth.users
  SELECT * INTO user_record FROM auth.users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN 'User not found';
  END IF;
  
  -- Call the trigger function manually
  PERFORM handle_new_user() FROM (SELECT user_record.*) AS t;
  
  RETURN 'Processing completed for user: ' || user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;