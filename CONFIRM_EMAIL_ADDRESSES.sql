-- ===================================================================
-- CONFIRM EMAIL ADDRESSES FOR DEMO USERS
-- Run this in Supabase Dashboard → SQL Editor
-- This marks all demo user emails as confirmed so they can login
-- ===================================================================

-- STEP 1: Mark all demo user emails as confirmed
UPDATE auth.users 
SET 
  email_confirmed_at = NOW()
WHERE (email LIKE '%@demo.company' OR email LIKE '%@democorp.com')
  AND email_confirmed_at IS NULL;

-- STEP 2: Also ensure they have proper confirmation status
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  aud = 'authenticated',
  role = 'authenticated'
WHERE (email LIKE '%@demo.company' OR email LIKE '%@democorp.com');

-- STEP 3: Link auth users to existing employees (if not already done)
UPDATE employees SET auth_user_id = (
  SELECT au.id FROM auth.users au WHERE au.email = employees.email
) WHERE email IN (
  'thomas.weber@democorp.com',
  'anna.schmidt@democorp.com',
  'max.mustermann@democorp.com',
  'sarah.johnson@democorp.com',
  'lisa.mueller@democorp.com',
  'peter.klein@democorp.com',
  'michael.brown@democorp.com',
  'laura.davis@democorp.com'
) AND auth_user_id IS NULL;

-- STEP 4: Create user profiles (if not already done)
INSERT INTO user_profiles (
  id, role, company_id, employee_id, is_active
)
SELECT 
  au.id,
  CASE WHEN au.email = 'thomas.weber@democorp.com' THEN 'admin' ELSE 'employee' END,
  e.company_id,
  e.id,
  true
FROM auth.users au
JOIN employees e ON e.email = au.email
WHERE (au.email LIKE '%@demo.company' OR au.email LIKE '%@democorp.com')
ON CONFLICT (id) DO UPDATE SET
  role = CASE WHEN EXCLUDED.id = (SELECT id FROM auth.users WHERE email = 'thomas.weber@democorp.com') THEN 'admin' ELSE 'employee' END,
  company_id = EXCLUDED.company_id,
  employee_id = EXCLUDED.employee_id,
  is_active = true;

-- STEP 5: Verification - Check email confirmation status
SELECT 
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  aud,
  role,
  'Password: Demo123!' as password_info
FROM auth.users 
WHERE (email LIKE '%@demo.company' OR email LIKE '%@democorp.com')
ORDER BY email;

-- STEP 6: Verification - Check complete user setup
SELECT 
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  up.role,
  e.employee_id,
  e.first_name || ' ' || e.last_name as full_name,
  CASE WHEN e.auth_user_id IS NOT NULL THEN 'Linked' ELSE 'NOT LINKED' END as employee_link_status
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN employees e ON e.auth_user_id = au.id
WHERE (au.email LIKE '%@demo.company' OR au.email LIKE '%@democorp.com')
ORDER BY au.email;

-- ===================================================================
-- DONE! All users should now be able to login with:
-- Email: [user]@democorp.com
-- Password: Demo123!
-- 
-- All emails are now confirmed and ready for login!
-- ===================================================================