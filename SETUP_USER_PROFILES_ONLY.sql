-- ===================================================================
-- CREATE AUTH USERS - PROPER SUPABASE APPROACH
-- Run this in Supabase Dashboard → SQL Editor
-- This uses a more reliable approach that works with Supabase's auth system
-- ===================================================================

-- STEP 1: Create users using a simplified approach that bypasses direct auth table manipulation
-- We'll create the employee links and profiles manually after

-- First, let's create a helper function that just creates user profiles and links
CREATE OR REPLACE FUNCTION setup_demo_user_profile(
  user_email TEXT,
  employee_id_param TEXT
)
RETURNS VOID
SECURITY DEFINER
AS $$
DECLARE
  auth_user_id UUID;
  emp_record RECORD;
BEGIN
  -- Find the auth user by email
  SELECT id INTO auth_user_id FROM auth.users WHERE email = user_email;
  
  IF auth_user_id IS NOT NULL THEN
    -- Find the employee record
    SELECT * INTO emp_record FROM employees WHERE employee_id = employee_id_param;
    
    IF emp_record.id IS NOT NULL THEN
      -- Link employee to auth user
      UPDATE employees 
      SET auth_user_id = auth_user_id 
      WHERE id = emp_record.id;
      
      -- Create user profile
      INSERT INTO user_profiles (
        id, role, company_id, employee_id, is_active
      ) VALUES (
        auth_user_id,
        CASE WHEN user_email = 'thomas.weber@demo.company' THEN 'admin' ELSE 'employee' END,
        emp_record.company_id,
        emp_record.id,
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        role = CASE WHEN EXCLUDED.id = (SELECT id FROM auth.users WHERE email = 'thomas.weber@demo.company') THEN 'admin' ELSE 'employee' END,
        company_id = EXCLUDED.company_id,
        employee_id = EXCLUDED.employee_id,
        is_active = true;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Setup profiles for existing users (if any exist)
SELECT setup_demo_user_profile('thomas.weber@demo.company', 'EMP003');
SELECT setup_demo_user_profile('anna.schmidt@demo.company', 'EMP002');
SELECT setup_demo_user_profile('max.mustermann@demo.company', 'EMP001');
SELECT setup_demo_user_profile('sarah.johnson@demo.company', 'EMP006');
SELECT setup_demo_user_profile('lisa.mueller@demo.company', 'EMP004');
SELECT setup_demo_user_profile('peter.klein@demo.company', 'EMP005');
SELECT setup_demo_user_profile('michael.brown@demo.company', 'EMP007');
SELECT setup_demo_user_profile('laura.davis@demo.company', 'EMP008');

-- STEP 3: Clean up the helper function
DROP FUNCTION IF EXISTS setup_demo_user_profile(TEXT, TEXT);

-- STEP 4: Show current status
SELECT 
  'Status Check' as info,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@demo.company') as auth_users_count,
  (SELECT COUNT(*) FROM employees WHERE auth_user_id IS NOT NULL AND email LIKE '%@demo.company') as linked_employees_count,
  (SELECT COUNT(*) FROM user_profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.company')) as user_profiles_count;

-- STEP 5: Show detailed user information
SELECT 
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  up.role,
  e.employee_id,
  e.first_name || ' ' || e.last_name as full_name,
  CASE WHEN e.auth_user_id IS NOT NULL THEN 'Linked' ELSE 'NOT LINKED' END as employee_link_status,
  'Use Supabase Auth UI or API to create users with password Demo123!' as note
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN employees e ON e.auth_user_id = au.id
WHERE au.email LIKE '%@demo.company'
ORDER BY au.email;

-- ===================================================================
-- IMPORTANT NOTES:
-- 1. This script only sets up profiles for EXISTING auth users
-- 2. To create the actual auth users, you have two options:
--    
--    OPTION A (Recommended): Use the application's registration form
--    - Go to your app's /register page
--    - Register each user with company code DEMO2025
--    - Use emails like thomas.weber@demo.company
--    - Use password: Demo123!
--    
--    OPTION B: Use Supabase Auth API in browser console:
--    supabase.auth.signUp({
--      email: 'thomas.weber@demo.company',
--      password: 'Demo123!'
--    })
--    
-- 3. After creating users through either method, run this script again
--    to ensure proper linking and profiles are set up
-- ===================================================================