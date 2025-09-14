-- ===================================================================
-- CLEANUP AUTH USERS - REALISTIC EMAIL DOMAINS
-- Run this in Supabase Dashboard → SQL Editor
-- This removes all demo auth users and updates employee emails to realistic domains
-- ===================================================================

-- STEP 1: Remove user profiles for demo users (both old and new domains)
DELETE FROM user_profiles 
WHERE id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@demo.company' OR email LIKE '%@democorp.com'
);

-- STEP 2: Unlink auth users from employees (both old and new domains)
UPDATE employees 
SET auth_user_id = NULL 
WHERE email LIKE '%@demo.company' OR email LIKE '%@democorp.com';

-- STEP 3: Delete demo auth users (both old and new domains)
DELETE FROM auth.users 
WHERE email LIKE '%@demo.company' OR email LIKE '%@democorp.com';

-- STEP 4: Update employee emails to realistic domains
UPDATE employees SET email = 'thomas.weber@democorp.com' WHERE employee_id = 'EMP003';
UPDATE employees SET email = 'anna.schmidt@democorp.com' WHERE employee_id = 'EMP002';
UPDATE employees SET email = 'max.mustermann@democorp.com' WHERE employee_id = 'EMP001';
UPDATE employees SET email = 'sarah.johnson@democorp.com' WHERE employee_id = 'EMP006';
UPDATE employees SET email = 'lisa.mueller@democorp.com' WHERE employee_id = 'EMP004';
UPDATE employees SET email = 'peter.klein@democorp.com' WHERE employee_id = 'EMP005';
UPDATE employees SET email = 'michael.brown@democorp.com' WHERE employee_id = 'EMP007';
UPDATE employees SET email = 'laura.davis@democorp.com' WHERE employee_id = 'EMP008';

-- STEP 5: Verification - Check cleanup results
SELECT 
  'Cleanup Complete!' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@demo.company' OR email LIKE '%@democorp.com') as remaining_auth_users,
  (SELECT COUNT(*) FROM user_profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.company' OR email LIKE '%@democorp.com')) as remaining_profiles,
  (SELECT COUNT(*) FROM employees WHERE auth_user_id IS NOT NULL AND (email LIKE '%@demo.company' OR email LIKE '%@democorp.com')) as linked_employees;

-- STEP 6: Show updated employee emails
SELECT 
  employee_id,
  first_name || ' ' || last_name as full_name,
  email as new_email
FROM employees 
WHERE employee_id IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'EMP006', 'EMP007', 'EMP008')
ORDER BY employee_id;

-- ===================================================================
-- DONE! All demo auth users have been removed and employee emails updated.
-- Now you can register using realistic email addresses:
-- 
-- thomas.weber@democorp.com (Admin)
-- anna.schmidt@democorp.com
-- max.mustermann@democorp.com
-- sarah.johnson@democorp.com
-- lisa.mueller@democorp.com
-- peter.klein@democorp.com
-- michael.brown@democorp.com
-- laura.davis@democorp.com
-- 
-- All with password: Demo123!
-- Company Code: DEMO2025
-- ===================================================================