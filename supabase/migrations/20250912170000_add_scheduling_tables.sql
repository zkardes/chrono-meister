-- Add scheduling tables for time slots and schedule assignments
-- This migration adds company-specific time slots and employee schedule assignments

-- Create time_slots table for company-specific shift definitions
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color VARCHAR(100) DEFAULT 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Create schedule_assignments table for employee-shift assignments
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, requested, approved, rejected
  notes TEXT,
  created_by UUID REFERENCES employees(id),
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, time_slot_id, scheduled_date)
);

-- Add indexes for better performance
CREATE INDEX idx_time_slots_company_id ON time_slots(company_id);
CREATE INDEX idx_time_slots_active ON time_slots(company_id, is_active);
CREATE INDEX idx_schedule_assignments_company_id ON schedule_assignments(company_id);
CREATE INDEX idx_schedule_assignments_employee_id ON schedule_assignments(employee_id);
CREATE INDEX idx_schedule_assignments_date ON schedule_assignments(scheduled_date);
CREATE INDEX idx_schedule_assignments_time_slot ON schedule_assignments(time_slot_id);
CREATE INDEX idx_schedule_assignments_date_slot ON schedule_assignments(scheduled_date, time_slot_id);

-- Enable Row Level Security (RLS)
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_slots
CREATE POLICY "Users can view time slots from their company" ON time_slots
  FOR SELECT USING (
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage time slots in their company" ON time_slots
  FOR ALL USING (
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for schedule_assignments
CREATE POLICY "Users can view schedule assignments from their company" ON schedule_assignments
  FOR SELECT USING (
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert their own schedule requests" ON schedule_assignments
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT e.id FROM employees e 
      WHERE e.auth_user_id = auth.uid()
    ) AND
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Employees can update their own schedule requests" ON schedule_assignments
  FOR UPDATE USING (
    employee_id IN (
      SELECT e.id FROM employees e 
      WHERE e.auth_user_id = auth.uid()
    ) AND
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage schedule assignments in their company" ON schedule_assignments
  FOR ALL USING (
    company_id IN (
      SELECT up.company_id FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_time_slots_updated_at 
  BEFORE UPDATE ON time_slots 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_assignments_updated_at 
  BEFORE UPDATE ON schedule_assignments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default time slots for existing companies
INSERT INTO time_slots (company_id, name, start_time, end_time, color)
SELECT 
  c.id,
  'Frühschicht',
  '06:00:00',
  '14:00:00',
  'bg-blue-500/10 text-blue-700 border-blue-500/20'
FROM companies c
WHERE c.is_active = true
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO time_slots (company_id, name, start_time, end_time, color)
SELECT 
  c.id,
  'Spätschicht',
  '14:00:00',
  '22:00:00',
  'bg-orange-500/10 text-orange-700 border-orange-500/20'
FROM companies c
WHERE c.is_active = true
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO time_slots (company_id, name, start_time, end_time, color)
SELECT 
  c.id,
  'Nachtschicht',
  '22:00:00',
  '06:00:00',
  'bg-purple-500/10 text-purple-700 border-purple-500/20'
FROM companies c
WHERE c.is_active = true
ON CONFLICT (company_id, name) DO NOTHING;

-- Add some sample schedule assignments for demo purposes
-- This will be added for the current week for demo company
INSERT INTO schedule_assignments (company_id, employee_id, time_slot_id, scheduled_date, status)
SELECT 
  e.company_id,
  e.id,
  ts.id,
  CURRENT_DATE + (CASE 
    WHEN EXTRACT(DOW FROM CURRENT_DATE) = 1 THEN 0  -- Monday
    WHEN EXTRACT(DOW FROM CURRENT_DATE) = 2 THEN -1 -- Tuesday -> go to Monday
    WHEN EXTRACT(DOW FROM CURRENT_DATE) = 3 THEN -2 -- Wednesday -> go to Monday
    WHEN EXTRACT(DOW FROM CURRENT_DATE) = 4 THEN -3 -- Thursday -> go to Monday
    WHEN EXTRACT(DOW FROM CURRENT_DATE) = 5 THEN -4 -- Friday -> go to Monday
    WHEN EXTRACT(DOW FROM CURRENT_DATE) = 6 THEN -5 -- Saturday -> go to Monday
    WHEN EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN 1  -- Sunday -> go to Monday
  END),
  'scheduled'
FROM employees e
JOIN companies c ON e.company_id = c.id
JOIN time_slots ts ON ts.company_id = c.id
WHERE c.company_code = 'DEMO2025' 
  AND e.is_active = true
  AND ts.name = 'Frühschicht'
LIMIT 2
ON CONFLICT (employee_id, time_slot_id, scheduled_date) DO NOTHING;