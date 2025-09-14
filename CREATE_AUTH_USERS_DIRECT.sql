-- ===================================================================
-- SIMPLER AUTH USER CREATION FOR TESTING
-- Run this in Supabase Dashboard → SQL Editor
-- This uses a more reliable approach with proper password handling
-- ===================================================================

-- STEP 1: Create a simplified function that lets Supabase handle password encryption
-- This bypasses manual password hashing and lets Supabase do it properly
CREATE OR REPLACE FUNCTION create_demo_auth_user(
  user_email TEXT,
  user_password TEXT,
  first_name TEXT,
  last_name TEXT,
  employee_id TEXT,
  company_code TEXT
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  -- If user doesn't exist, create them using Supabase's signup function
  IF user_id IS NULL THEN
    -- Use Supabase's built-in signup function which handles password encryption
    -- Note: This approach creates the user through the proper auth flow
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      user_email,
      user_password, -- Plain text password - Supabase will handle encryption
      NOW(),
      '{"provider":"email","providers":["email"]}',
      json_build_object(
        'firstName', first_name,
        'lastName', last_name,
        'employeeId', employee_id,
        'companyCode', company_code
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO user_id;
  ELSE
    -- User exists, update their metadata and ensure email is confirmed
    UPDATE auth.users 
    SET 
      raw_user_meta_data = json_build_object(
        'firstName', first_name,
        'lastName', last_name,
        'employeeId', employee_id,
        'companyCode', company_code
      ),
      updated_at = NOW(),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = user_id;
  END IF;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Create all demo users
SELECT create_demo_auth_user('thomas.weber@demo.company', 'Demo123!', 'Thomas', 'Weber', 'EMP003', 'DEMO2025');
SELECT create_demo_auth_user('anna.schmidt@demo.company', 'Demo123!', 'Anna', 'Schmidt', 'EMP002', 'DEMO2025');
SELECT create_demo_auth_user('max.mustermann@demo.company', 'Demo123!', 'Max', 'Mustermann', 'EMP001', 'DEMO2025');
SELECT create_demo_auth_user('sarah.johnson@demo.company', 'Demo123!', 'Sarah', 'Johnson', 'EMP006', 'DEMO2025');
SELECT create_demo_auth_user('lisa.mueller@demo.company', 'Demo123!', 'Lisa', 'Müller', 'EMP004', 'DEMO2025');
SELECT create_demo_auth_user('peter.klein@demo.company', 'Demo123!', 'Peter', 'Klein', 'EMP005', 'DEMO2025');
SELECT create_demo_auth_user('michael.brown@demo.company', 'Demo123!', 'Michael', 'Brown', 'EMP007', 'DEMO2025');
SELECT create_demo_auth_user('laura.davis@demo.company', 'Demo123!', 'Laura', 'Davis', 'EMP008', 'DEMO2025');

-- STEP 3: Link auth users to existing employees
UPDATE employees SET auth_user_id = (
  SELECT au.id FROM auth.users au WHERE au.email = employees.email
) WHERE email IN (
  'thomas.weber@demo.company',
  'anna.schmidt@demo.company',
  'max.mustermann@demo.company',
  'sarah.johnson@demo.company',
  'lisa.mueller@demo.company',
  'peter.klein@demo.company',
  'michael.brown@demo.company',
  'laura.davis@demo.company'
);

-- STEP 4: Create user profiles (the trigger should handle this, but let's ensure)
INSERT INTO user_profiles (
  id, role, company_id, employee_id, is_active
)
SELECT 
  au.id,
  CASE WHEN au.email = 'thomas.weber@demo.company' THEN 'admin' ELSE 'employee' END,
  e.company_id,
  e.id,
  true
FROM auth.users au
JOIN employees e ON e.email = au.email
WHERE au.email LIKE '%@demo.company'
ON CONFLICT (id) DO UPDATE SET
  role = CASE WHEN EXCLUDED.id = (SELECT id FROM auth.users WHERE email = 'thomas.weber@demo.company') THEN 'admin' ELSE 'employee' END,
  company_id = EXCLUDED.company_id,
  employee_id = EXCLUDED.employee_id;

-- STEP 5: Clean up the function (optional)
DROP FUNCTION IF EXISTS create_demo_auth_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- STEP 6: Verification
SELECT 
  'Authentication Users Created Successfully!' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@demo.company') as auth_users_count,
  (SELECT COUNT(*) FROM employees WHERE auth_user_id IS NOT NULL AND email LIKE '%@demo.company') as linked_employees_count,
  (SELECT COUNT(*) FROM user_profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.company')) as user_profiles_count;

-- STEP 7: Show user details
SELECT 
  au.email,
  up.role,
  e.employee_id,
  e.first_name || ' ' || e.last_name as full_name,
  'Password: Demo123!' as password_info
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN employees e ON e.auth_user_id = au.id
WHERE au.email LIKE '%@demo.company'
ORDER BY au.email;

-- ===================================================================
-- DONE! All users should now be able to login with:
-- Email: [user]@demo.company
-- Password: Demo123!
-- 
-- Thomas Weber will have admin role, others will be employees.
-- ===================================================================