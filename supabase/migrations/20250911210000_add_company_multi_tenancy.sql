-- Add companies table for multi-tenancy
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
  domain VARCHAR(255), -- Optional: company email domain for auto-assignment
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  timezone VARCHAR(100) DEFAULT 'UTC',
  settings JSONB DEFAULT '{}', -- Company-specific settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add company_id to existing tables
ALTER TABLE employees ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE groups ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE user_profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes for company_id foreign keys
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_groups_company_id ON groups(company_id);
CREATE INDEX idx_user_profiles_company_id ON user_profiles(company_id);

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Update existing RLS policies to include company isolation

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Users can view all groups" ON groups;
DROP POLICY IF EXISTS "Users can view group memberships" ON employee_groups;
DROP POLICY IF EXISTS "Users can view all time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert time entries for their employee record" ON time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can view all vacation requests" ON vacation_requests;
DROP POLICY IF EXISTS "Users can insert vacation requests for their employee record" ON vacation_requests;
DROP POLICY IF EXISTS "Users can view all schedules" ON schedules;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Company policies
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (
    id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Company admins can update their company" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Employee policies with company isolation
CREATE POLICY "Users can view employees from their company" ON employees 
  FOR SELECT USING (
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage employees in their company" ON employees
  FOR ALL USING (
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')
    )
  );

-- Groups policies with company isolation
CREATE POLICY "Users can view groups from their company" ON groups 
  FOR SELECT USING (
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage groups in their company" ON groups
  FOR ALL USING (
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')
    )
  );

-- Employee groups policies with company isolation
CREATE POLICY "Users can view employee groups from their company" ON employee_groups 
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_profiles up ON e.company_id = up.company_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage employee groups in their company" ON employee_groups
  FOR ALL USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_profiles up ON e.company_id = up.company_id
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')
    )
  );

-- Time entries policies with company isolation
CREATE POLICY "Users can view time entries from their company" ON time_entries 
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_profiles up ON e.company_id = up.company_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert time entries for employees in their company" ON time_entries 
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

-- Vacation requests policies with company isolation
CREATE POLICY "Users can view vacation requests from their company" ON vacation_requests 
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_profiles up ON e.company_id = up.company_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vacation requests for employees in their company" ON vacation_requests 
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT e.id FROM employees e 
      WHERE e.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage vacation requests in their company" ON vacation_requests
  FOR UPDATE USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_profiles up ON e.company_id = up.company_id
      WHERE up.id = auth.uid() AND (
        e.auth_user_id = auth.uid() OR -- Own requests
        up.role IN ('admin', 'manager') -- Or admin/manager
      )
    )
  );

-- Schedules policies with company isolation
CREATE POLICY "Users can view schedules from their company" ON schedules 
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_profiles up ON e.company_id = up.company_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage schedules in their company" ON schedules
  FOR ALL USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_profiles up ON e.company_id = up.company_id
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')
    )
  );

-- User profiles policies with company isolation
CREATE POLICY "Users can view their own profile" ON user_profiles 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles 
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Company admins can view profiles in their company" ON user_profiles
  FOR SELECT USING (
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Create helper function to get current user's company
CREATE OR REPLACE FUNCTION get_current_user_company()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT up.company_id 
    FROM user_profiles up 
    WHERE up.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the user registration trigger to handle company assignment
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_company_id UUID;
  user_email TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  
  -- Try to find company by email domain
  SELECT id INTO user_company_id 
  FROM companies 
  WHERE domain IS NOT NULL 
    AND user_email LIKE '%@' || domain
    AND is_active = true
  LIMIT 1;
  
  -- If no company found by domain, create a default entry without company
  -- The company will need to be assigned later by an admin or during onboarding
  INSERT INTO public.user_profiles (id, role, company_id)
  VALUES (NEW.id, 'employee', user_company_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for updated_at on companies
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add sample company data
INSERT INTO companies (id, name, slug, domain, email, timezone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Company Inc.', 'demo-company', 'company.com', 'admin@company.com', 'America/New_York'),
  ('00000000-0000-0000-0000-000000000002', 'Acme Corporation', 'acme-corp', 'acme.com', 'contact@acme.com', 'America/Los_Angeles');

-- Update existing seed data to include company assignments
-- Note: This assumes you haven't run the previous seed data yet
-- If you have, you'll need to update the existing records manually