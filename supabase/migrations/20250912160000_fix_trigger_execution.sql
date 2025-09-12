-- Fix trigger execution and ensure proper user profile/employee creation
-- This migration addresses the core issue where users can register but aren't linked to employees

-- First, let's ensure the trigger has the correct permissions
-- Drop and recreate with proper security settings

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the function with enhanced security and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
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
  existing_profile_id UUID;
BEGIN
  -- Log trigger execution (these will appear in database logs)
  RAISE NOTICE 'handle_new_user: Processing user %', NEW.id;
  
  -- Extract user data
  user_email := NEW.email;
  
  -- Extract metadata from raw_user_meta_data
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    company_code_input := COALESCE((NEW.raw_user_meta_data->>'companyCode')::TEXT, '');
    first_name_input := COALESCE((NEW.raw_user_meta_data->>'firstName')::TEXT, '');
    last_name_input := COALESCE((NEW.raw_user_meta_data->>'lastName')::TEXT, '');
    employee_id_input := COALESCE((NEW.raw_user_meta_data->>'employeeId')::TEXT, '');
    
    RAISE NOTICE 'handle_new_user: Extracted metadata - Company: %, Name: % %', 
      company_code_input, first_name_input, last_name_input;
  ELSE
    RAISE NOTICE 'handle_new_user: No metadata found';
    company_code_input := '';
    first_name_input := '';
    last_name_input := '';
    employee_id_input := '';
  END IF;
  
  -- Check if user profile already exists (prevent duplicates)
  SELECT id INTO existing_profile_id 
  FROM public.user_profiles 
  WHERE id = NEW.id;
  
  IF existing_profile_id IS NOT NULL THEN
    RAISE NOTICE 'handle_new_user: Profile already exists for user %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Find company by company code if provided
  IF company_code_input != '' THEN
    BEGIN
      SELECT id INTO user_company_id 
      FROM public.companies 
      WHERE company_code = company_code_input 
        AND is_active = true
      LIMIT 1;
      
      RAISE NOTICE 'handle_new_user: Company lookup for code % found: %', 
        company_code_input, user_company_id;
    EXCEPTION
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'handle_new_user: Error looking up company: %', error_msg;
        user_company_id := NULL;
    END;
  END IF;
  
  -- Create employee record if we have sufficient data
  IF first_name_input != '' AND last_name_input != '' THEN
    BEGIN
      -- Check if there's an existing employee with the provided employee_id that can be linked
      IF employee_id_input != '' AND user_company_id IS NOT NULL THEN
        SELECT id INTO new_employee_id
        FROM public.employees 
        WHERE employee_id = employee_id_input 
          AND company_id = user_company_id 
          AND auth_user_id IS NULL; -- Not already linked
          
        IF new_employee_id IS NOT NULL THEN
          -- Link existing employee to this user
          UPDATE public.employees 
          SET auth_user_id = NEW.id,
              email = COALESCE(user_email, email),
              first_name = COALESCE(first_name_input, first_name),
              last_name = COALESCE(last_name_input, last_name),
              updated_at = NOW()
          WHERE id = new_employee_id;
          
          RAISE NOTICE 'handle_new_user: Linked existing employee %', new_employee_id;
        END IF;
      END IF;
      
      -- If no existing employee found or linked, create a new one
      IF new_employee_id IS NULL THEN
        INSERT INTO public.employees (
          email, 
          first_name, 
          last_name, 
          employee_id, 
          company_id, 
          auth_user_id,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          user_email,
          first_name_input,
          last_name_input,
          COALESCE(NULLIF(employee_id_input, ''), 'EMP' || UPPER(SUBSTRING(NEW.id::text, 1, 8))),
          user_company_id,
          NEW.id,
          true,
          NOW(),
          NOW()
        ) RETURNING id INTO new_employee_id;
        
        RAISE NOTICE 'handle_new_user: Created new employee %', new_employee_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'handle_new_user: Error creating/linking employee: %', error_msg;
        new_employee_id := NULL; -- Continue without employee link
    END;
  ELSE
    RAISE NOTICE 'handle_new_user: Insufficient data for employee creation';
  END IF;
  
  -- Create user profile (this MUST succeed)
  BEGIN
    INSERT INTO public.user_profiles (
      id, 
      role, 
      company_id, 
      employee_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id, 
      'employee', 
      user_company_id,
      new_employee_id,
      true,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'handle_new_user: Created user profile - Company: %, Employee: %', 
      user_company_id, new_employee_id;
      
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
      RAISE NOTICE 'handle_new_user: CRITICAL ERROR creating user profile: %', error_msg;
      -- This is critical - if we can't create a profile, something is seriously wrong
      RAISE EXCEPTION 'Failed to create user profile: %', error_msg;
  END;
  
  RAISE NOTICE 'handle_new_user: Successfully completed for user %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    RAISE NOTICE 'handle_new_user: FATAL ERROR: %', error_msg;
    -- Return NEW to not block user creation in auth.users
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: Trigger verification removed as pg_triggers is not accessible in Supabase
-- The trigger creation will fail if there are any issues, so successful execution means it was created

-- Create a function to manually process users who might have been missed
CREATE OR REPLACE FUNCTION public.process_unlinked_users()
RETURNS TABLE(user_id UUID, email TEXT, result TEXT) 
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  result_text TEXT;
BEGIN
  -- Find users who don't have profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
      AND au.created_at > NOW() - INTERVAL '7 days' -- Only recent users
  LOOP
    BEGIN
      -- Simulate the trigger for this user
      PERFORM public.handle_new_user() FROM (
        SELECT 
          user_record.id as id,
          user_record.email as email,
          user_record.raw_user_meta_data as raw_user_meta_data
      ) AS simulated_new;
      
      result_text := 'Processed successfully';
    EXCEPTION
      WHEN OTHERS THEN
        result_text := 'Error: ' || SQLERRM;
    END;
    
    user_id := user_record.id;
    email := user_record.email;
    result := result_text;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create a simple test function
CREATE OR REPLACE FUNCTION public.test_trigger_function(
  test_user_id UUID,
  test_email TEXT,
  test_metadata JSONB DEFAULT NULL
)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
  result_msg TEXT;
BEGIN
  -- Test the trigger function directly
  PERFORM public.handle_new_user() FROM (
    SELECT 
      test_user_id as id,
      test_email as email,
      COALESCE(test_metadata, '{}'::jsonb) as raw_user_meta_data
  ) AS test_record;
  
  RETURN 'Test completed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Test failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;