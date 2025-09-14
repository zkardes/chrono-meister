-- ===================================================================
-- Migration: Add Vacation Entitlements System
-- File: 20250912200000_add_vacation_entitlements.sql
-- Purpose: Create configurable vacation entitlements per employee
-- ===================================================================

-- Create vacation_entitlements table
CREATE TABLE IF NOT EXISTS vacation_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  total_days INTEGER NOT NULL DEFAULT 30,
  carried_over_days INTEGER DEFAULT 0,
  bonus_days INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES employees(id),
  
  -- Ensure one entitlement record per employee per year
  UNIQUE(employee_id, year)
);

-- Add indexes for better performance
CREATE INDEX idx_vacation_entitlements_employee_year ON vacation_entitlements(employee_id, year);
CREATE INDEX idx_vacation_entitlements_year ON vacation_entitlements(year);

-- Add Row Level Security (RLS) policies
ALTER TABLE vacation_entitlements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view entitlements for employees in their company
CREATE POLICY "Users can view vacation entitlements in their company" ON vacation_entitlements 
FOR SELECT USING (
  employee_id IN (
    SELECT e.id FROM employees e 
    JOIN user_profiles up ON up.employee_id = e.id 
    WHERE up.id = auth.uid() 
    AND e.company_id = (
      SELECT emp.company_id FROM employees emp 
      JOIN user_profiles up2 ON up2.employee_id = emp.id 
      WHERE up2.id = auth.uid()
    )
  )
);

-- Policy: Admins can insert vacation entitlements
CREATE POLICY "Admins can insert vacation entitlements" ON vacation_entitlements 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e 
    JOIN user_profiles up ON up.employee_id = e.id 
    WHERE up.id = auth.uid() 
    AND (e.position LIKE '%Admin%' OR e.position LIKE '%Manager%' OR e.position LIKE '%Leitung%')
  )
);

-- Policy: Admins can update vacation entitlements
CREATE POLICY "Admins can update vacation entitlements" ON vacation_entitlements 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employees e 
    JOIN user_profiles up ON up.employee_id = e.id 
    WHERE up.id = auth.uid() 
    AND (e.position LIKE '%Admin%' OR e.position LIKE '%Manager%' OR e.position LIKE '%Leitung%')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_vacation_entitlements_updated_at 
BEFORE UPDATE ON vacation_entitlements 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default vacation entitlements for existing employees
-- Based on position hierarchy
INSERT INTO vacation_entitlements (employee_id, year, total_days, created_by)
SELECT 
  e.id,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  CASE 
    WHEN LOWER(e.position) LIKE '%admin%' OR LOWER(e.position) LIKE '%leitung%' THEN 35
    WHEN LOWER(e.position) LIKE '%manager%' OR LOWER(e.position) LIKE '%führung%' THEN 32
    WHEN LOWER(e.position) LIKE '%fsj%' OR LOWER(e.position) LIKE '%azubi%' OR LOWER(e.position) LIKE '%praktikant%' THEN 24
    ELSE 30 -- Standard employee
  END,
  -- Set created_by to the first admin/manager found in the same company
  (SELECT admin.id FROM employees admin 
   WHERE admin.company_id = e.company_id 
   AND (LOWER(admin.position) LIKE '%admin%' OR LOWER(admin.position) LIKE '%manager%' OR LOWER(admin.position) LIKE '%leitung%')
   LIMIT 1)
FROM employees e
WHERE e.is_active = true
ON CONFLICT (employee_id, year) DO NOTHING;

-- Add comment to the table
COMMENT ON TABLE vacation_entitlements IS 'Stores annual vacation entitlements for each employee with configurable days and carryover options';
COMMENT ON COLUMN vacation_entitlements.total_days IS 'Total vacation days allocated for the year';
COMMENT ON COLUMN vacation_entitlements.carried_over_days IS 'Days carried over from previous year';
COMMENT ON COLUMN vacation_entitlements.bonus_days IS 'Additional bonus vacation days awarded';
COMMENT ON COLUMN vacation_entitlements.year IS 'Calendar year for these entitlements';

-- Add vacation balance view for easier querying
CREATE OR REPLACE VIEW vacation_balances AS
SELECT 
  ve.employee_id,
  ve.year,
  e.first_name,
  e.last_name,
  e.employee_id as emp_code,
  ve.total_days,
  ve.carried_over_days,
  ve.bonus_days,
  (ve.total_days + ve.carried_over_days + ve.bonus_days) as available_days,
  COALESCE(vr_used.used_days, 0) as used_days,
  COALESCE(vr_pending.pending_days, 0) as pending_days,
  (ve.total_days + ve.carried_over_days + ve.bonus_days) - COALESCE(vr_used.used_days, 0) as remaining_days,
  (ve.total_days + ve.carried_over_days + ve.bonus_days) - COALESCE(vr_used.used_days, 0) - COALESCE(vr_pending.pending_days, 0) as available_for_request
FROM vacation_entitlements ve
JOIN employees e ON e.id = ve.employee_id
LEFT JOIN (
  SELECT 
    employee_id,
    EXTRACT(YEAR FROM start_date)::INTEGER as request_year,
    SUM(days_requested) as used_days
  FROM vacation_requests 
  WHERE status = 'approved' 
  GROUP BY employee_id, EXTRACT(YEAR FROM start_date)::INTEGER
) vr_used ON vr_used.employee_id = ve.employee_id AND vr_used.request_year = ve.year
LEFT JOIN (
  SELECT 
    employee_id,
    EXTRACT(YEAR FROM start_date)::INTEGER as request_year,
    SUM(days_requested) as pending_days
  FROM vacation_requests 
  WHERE status = 'pending' 
  GROUP BY employee_id, EXTRACT(YEAR FROM start_date)::INTEGER
) vr_pending ON vr_pending.employee_id = ve.employee_id AND vr_pending.request_year = ve.year
WHERE e.is_active = true;

-- Grant access to the view
GRANT SELECT ON vacation_balances TO authenticated;

-- Add RLS to the view (inherits from underlying tables)
ALTER VIEW vacation_balances SET (security_invoker = true);