-- ===================================================================
-- FIX EXISTING AUTH USERS - SIMPLE APPROACH
-- Run this in Supabase Dashboard → SQL Editor
-- This fixes the existing auth users that were already created
-- ===================================================================

-- STEP 1: Link auth users to existing employees
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
) AND auth_user_id IS NULL;

-- STEP 2: Create user profiles (the trigger should handle this, but let's ensure)
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

-- STEP 3: Verification
SELECT 
  'Auth Users Fixed Successfully!' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@demo.company') as auth_users_count,
  (SELECT COUNT(*) FROM employees WHERE auth_user_id IS NOT NULL AND email LIKE '%@demo.company') as linked_employees_count,
  (SELECT COUNT(*) FROM user_profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.company')) as user_profiles_count;

-- STEP 4: Show user details
SELECT 
  au.email,
  up.role,
  e.employee_id,
  e.first_name || ' ' || e.last_name as full_name,
  'Password: Demo123!' as password_info,
  CASE WHEN e.auth_user_id IS NOT NULL THEN 'Linked' ELSE 'NOT LINKED' END as employee_link_status
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