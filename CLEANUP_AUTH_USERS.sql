-- ===================================================================
-- CLEANUP AUTH USERS - DEMO USERS ONLY
-- Run this in Supabase Dashboard → SQL Editor
-- This removes all demo auth users and related data
-- ===================================================================

-- STEP 1: Remove user profiles for demo users
DELETE FROM user_profiles 
WHERE id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@demo.company'
);

-- STEP 2: Unlink auth users from employees
UPDATE employees 
SET auth_user_id = NULL 
WHERE email LIKE '%@demo.company';

-- STEP 3: Delete demo auth users
DELETE FROM auth.users 
WHERE email LIKE '%@demo.company';

-- STEP 4: Verification - Check cleanup results
SELECT 
  'Cleanup Complete!' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@demo.company') as remaining_auth_users,
  (SELECT COUNT(*) FROM user_profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.company')) as remaining_profiles,
  (SELECT COUNT(*) FROM employees WHERE auth_user_id IS NOT NULL AND email LIKE '%@demo.company') as linked_employees;

-- ===================================================================
-- DONE! All demo auth users have been removed.
-- Employee records remain intact, just unlinked from auth.
-- ===================================================================