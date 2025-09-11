-- Add auth_user_id to employees table to link with Supabase auth
ALTER TABLE employees ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);

-- Create unique index on auth_user_id to ensure one-to-one relationship
CREATE UNIQUE INDEX idx_employees_auth_user_id ON employees(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Create user_profiles table for additional user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  role VARCHAR(50) DEFAULT 'employee', -- employee, admin, manager
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing employees policies to work with auth
DROP POLICY IF EXISTS "Users can view all employees" ON employees;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert their own vacation requests" ON vacation_requests;

-- Create new auth-based policies
CREATE POLICY "Authenticated users can view employees" ON employees 
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert time entries for their employee record" ON time_entries 
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT e.id FROM employees e 
      WHERE e.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own time entries" ON time_entries 
  FOR UPDATE USING (
    employee_id IN (
      SELECT e.id FROM employees e 
      WHERE e.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vacation requests for their employee record" ON vacation_requests 
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT e.id FROM employees e 
      WHERE e.auth_user_id = auth.uid()
    )
  );

-- Create helper function to get current user's employee record
CREATE OR REPLACE FUNCTION get_current_employee()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT e.id 
    FROM employees e 
    WHERE e.auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at on user_profiles
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_user_profiles_employee_id ON user_profiles(employee_id);