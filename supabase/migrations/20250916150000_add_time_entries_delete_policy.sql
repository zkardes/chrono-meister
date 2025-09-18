-- Add DELETE policy for time_entries table
-- This policy allows users to delete their own time entries
CREATE POLICY "Users can delete their own time entries" 
ON time_entries 
FOR DELETE 
USING (
  employee_id = (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  )
);

-- Add comment to describe the policy
COMMENT ON POLICY "Users can delete their own time entries" ON time_entries 
IS 'Allows authenticated users to delete their own time entries based on employee_id matching the employee record linked to their auth user';