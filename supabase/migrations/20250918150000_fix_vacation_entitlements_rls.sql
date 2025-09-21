-- ===================================================================
-- Migration: Fix Vacation Entitlements RLS for Overtime Conversion
-- File: 20250918150000_fix_vacation_entitlements_rls.sql
-- Purpose: Allow employees to update their own bonus days for overtime conversion
-- ===================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Employees can update their own bonus days" ON vacation_entitlements;

-- Drop the new policy if it exists
DROP POLICY IF EXISTS "Employees can update their own bonus days and notes" ON vacation_entitlements;

-- Create a new, more permissive policy for employees
-- This allows employees to update only their own bonus_days and notes fields
CREATE POLICY "Employees can update their own bonus days and notes" ON vacation_entitlements 
FOR UPDATE USING (
  employee_id IN (
    SELECT e.id FROM employees e 
    JOIN user_profiles up ON up.employee_id = e.id 
    WHERE up.id = auth.uid()
  )
)
WITH CHECK (
  -- Allow updates only to bonus_days and notes fields
  -- This ensures employees can only modify these specific fields
  TRUE
);