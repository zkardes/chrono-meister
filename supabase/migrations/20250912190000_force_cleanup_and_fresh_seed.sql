-- FORCE CLEANUP AND FRESH SEED MIGRATION
-- This migration aggressively cleans ALL data and creates completely fresh demo data

-- STEP 1: Disable RLS temporarily to ensure clean deletion
ALTER TABLE schedule_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- STEP 2: Force delete ALL data (ignore foreign key constraints temporarily)
SET session_replication_role = replica;

-- Delete all operational data
TRUNCATE schedule_assignments CASCADE;
TRUNCATE time_entries CASCADE;
TRUNCATE vacation_requests CASCADE;
TRUNCATE employee_groups CASCADE;

-- Update groups to remove manager references
UPDATE groups SET manager_id = NULL;

-- Delete all groups and time slots
TRUNCATE groups CASCADE;
TRUNCATE time_slots CASCADE;

-- Delete all employees except those linked to auth users
DELETE FROM employees WHERE auth_user_id IS NULL;

-- Clean user profiles that don't have auth users
DELETE FROM user_profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- Reset session replication role
SET session_replication_role = DEFAULT;

-- STEP 3: Re-enable RLS
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Ensure demo company exists and is properly configured
INSERT INTO companies (
  id, name, slug, company_code, domain, address, phone, email, timezone, settings, is_active
) VALUES (
  gen_random_uuid(),
  'Demo Corporation GmbH',
  'demo-corp',
  'DEMO2025',
  'demo.company',
  'Musterstraße 123, 12345 Berlin, Deutschland',
  '+49 30 12345678',
  'info@demo.company',
  'Europe/Berlin',
  '{"work_hours": {"default": 8, "flexible": true}, "overtime_policy": {"max_daily": 4, "auto_approve_time_off": true}}'::jsonb,
  true
) ON CONFLICT (company_code) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  domain = EXCLUDED.domain,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  timezone = EXCLUDED.timezone,
  settings = EXCLUDED.settings,
  is_active = EXCLUDED.is_active;

-- STEP 5: Create fresh employee data for demo company
INSERT INTO employees (
  id, company_id, email, first_name, last_name, employee_id, 
  department, position, hire_date, hourly_rate, is_active
)
SELECT 
  gen_random_uuid(),
  c.id,
  emp.email,
  emp.first_name,
  emp.last_name,
  emp.employee_id,
  emp.department,
  emp.position,
  emp.hire_date::date,
  emp.hourly_rate,
  true
FROM companies c
CROSS JOIN (
  VALUES 
    ('max.mustermann@demo.company', 'Max', 'Mustermann', 'EMP001', 'Kinderbetreuung', 'Erzieher', '2023-01-15', 25.50),
    ('anna.schmidt@demo.company', 'Anna', 'Schmidt', 'EMP002', 'Kinderbetreuung', 'Erzieherin', '2023-02-01', 26.00),
    ('thomas.weber@demo.company', 'Thomas', 'Weber', 'EMP003', 'Management', 'Kita-Leitung', '2022-08-01', 35.00),
    ('lisa.mueller@demo.company', 'Lisa', 'Müller', 'EMP004', 'Ausbildung', 'FSJ', '2024-09-01', 12.00),
    ('peter.klein@demo.company', 'Peter', 'Klein', 'EMP005', 'Verwaltung', 'Verwaltungsassistent', '2023-05-10', 22.00),
    ('sarah.johnson@demo.company', 'Sarah', 'Johnson', 'EMP006', 'Kinderbetreuung', 'Gruppenleitung', '2023-03-15', 28.00),
    ('michael.brown@demo.company', 'Michael', 'Brown', 'EMP007', 'Küche', 'Koch', '2023-06-01', 24.00),
    ('laura.davis@demo.company', 'Laura', 'Davis', 'EMP008', 'Kinderbetreuung', 'Erzieherin', '2023-09-01', 25.00)
) AS emp(email, first_name, last_name, employee_id, department, position, hire_date, hourly_rate)
WHERE c.company_code = 'DEMO2025';

-- STEP 6: Create groups for demo company
INSERT INTO groups (
  id, company_id, name, description, manager_id
)
SELECT 
  gen_random_uuid(),
  c.id,
  g.name,
  g.description,
  (SELECT e.id FROM employees e WHERE e.company_id = c.id AND e.employee_id = g.manager_emp_id)
FROM companies c
CROSS JOIN (
  VALUES 
    ('Krippengruppe', 'Betreuung für Kinder von 0-3 Jahren', 'EMP006'),
    ('Kindergartengruppe', 'Betreuung für Kinder von 3-6 Jahren', 'EMP002'),
    ('Verwaltung', 'Administrative Tätigkeiten und Leitung', 'EMP003'),
    ('Küche & Service', 'Essensversorgung und Hauswirtschaft', 'EMP007'),
    ('Ausbildung', 'Praktikanten und Auszubildende', 'EMP003')
) AS g(name, description, manager_emp_id)
WHERE c.company_code = 'DEMO2025';

-- STEP 7: Assign employees to groups
INSERT INTO employee_groups (employee_id, group_id)
SELECT DISTINCT e.id, g.id
FROM companies c
JOIN employees e ON e.company_id = c.id
JOIN groups g ON g.company_id = c.id
JOIN (
  VALUES 
    ('EMP001', 'Kindergartengruppe'),
    ('EMP002', 'Kindergartengruppe'),
    ('EMP003', 'Verwaltung'),
    ('EMP004', 'Ausbildung'),
    ('EMP005', 'Verwaltung'),
    ('EMP006', 'Krippengruppe'),
    ('EMP007', 'Küche & Service'),
    ('EMP008', 'Krippengruppe')
) AS mapping(employee_id, group_name) ON e.employee_id = mapping.employee_id AND g.name = mapping.group_name
WHERE c.company_code = 'DEMO2025';

-- STEP 8: Create time slots for demo company
INSERT INTO time_slots (
  company_id, name, start_time, end_time, color, is_active
)
SELECT 
  c.id,
  ts.name,
  ts.start_time::time,
  ts.end_time::time,
  ts.color,
  true
FROM companies c
CROSS JOIN (
  VALUES 
    ('Frühschicht', '06:00', '14:00', 'bg-blue-500/10 text-blue-700 border-blue-500/20'),
    ('Spätschicht', '14:00', '22:00', 'bg-orange-500/10 text-orange-700 border-orange-500/20'),
    ('Nachtschicht', '22:00', '06:00', 'bg-purple-500/10 text-purple-700 border-purple-500/20'),
    ('Teilzeit Vormittag', '08:00', '12:00', 'bg-green-500/10 text-green-700 border-green-500/20'),
    ('Teilzeit Nachmittag', '13:00', '17:00', 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20')
) AS ts(name, start_time, end_time, color)
WHERE c.company_code = 'DEMO2025';

-- STEP 9: Create sample schedule assignments for current week
INSERT INTO schedule_assignments (
  company_id, employee_id, time_slot_id, scheduled_date, status, created_by
)
SELECT 
  c.id,
  e.id,
  ts.id,
  assignment.scheduled_date,
  'scheduled',
  (SELECT id FROM employees WHERE company_id = c.id AND employee_id = 'EMP003')
FROM companies c
JOIN employees e ON e.company_id = c.id
JOIN time_slots ts ON ts.company_id = c.id
JOIN (
  VALUES 
    -- Monday assignments
    ('EMP001', 'Frühschicht', CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP002', 'Frühschicht', CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP006', 'Spätschicht', CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP008', 'Spätschicht', CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    
    -- Tuesday assignments
    ('EMP002', 'Frühschicht', CURRENT_DATE + (2 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP006', 'Frühschicht', CURRENT_DATE + (2 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP001', 'Spätschicht', CURRENT_DATE + (2 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP008', 'Teilzeit Nachmittag', CURRENT_DATE + (2 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    
    -- Wednesday assignments
    ('EMP001', 'Frühschicht', CURRENT_DATE + (3 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP008', 'Frühschicht', CURRENT_DATE + (3 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP002', 'Spätschicht', CURRENT_DATE + (3 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP006', 'Teilzeit Nachmittag', CURRENT_DATE + (3 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    
    -- Thursday assignments
    ('EMP006', 'Frühschicht', CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP008', 'Frühschicht', CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP001', 'Spätschicht', CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP002', 'Teilzeit Nachmittag', CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    
    -- Friday assignments
    ('EMP002', 'Frühschicht', CURRENT_DATE + (5 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP006', 'Frühschicht', CURRENT_DATE + (5 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP001', 'Teilzeit Nachmittag', CURRENT_DATE + (5 - EXTRACT(DOW FROM CURRENT_DATE))::int),
    ('EMP008', 'Teilzeit Nachmittag', CURRENT_DATE + (5 - EXTRACT(DOW FROM CURRENT_DATE))::int)
) AS assignment(employee_id, time_slot_name, scheduled_date)
  ON e.employee_id = assignment.employee_id 
  AND ts.name = assignment.time_slot_name
WHERE c.company_code = 'DEMO2025'
  AND assignment.scheduled_date >= CURRENT_DATE
  AND assignment.scheduled_date <= CURRENT_DATE + INTERVAL '7 days';

-- STEP 10: Create sample time entries for past week
INSERT INTO time_entries (
  employee_id, start_time, end_time, break_duration, description, project, is_approved
)
SELECT 
  e.id,
  entry.start_time,
  entry.end_time,
  entry.break_duration,
  entry.description,
  entry.project,
  true
FROM companies c
JOIN employees e ON e.company_id = c.id
JOIN (
  VALUES 
    -- Max Mustermann entries
    ('EMP001', CURRENT_DATE - 7 + TIME '08:00', CURRENT_DATE - 7 + TIME '16:30', 30, 'Kindergartengruppe betreut', 'Kinderbetreuung'),
    ('EMP001', CURRENT_DATE - 6 + TIME '08:00', CURRENT_DATE - 6 + TIME '16:00', 30, 'Ausflug zum Spielplatz', 'Kinderbetreuung'),
    ('EMP001', CURRENT_DATE - 5 + TIME '14:00', CURRENT_DATE - 5 + TIME '22:00', 30, 'Spätschicht Kindergarten', 'Kinderbetreuung'),
    
    -- Anna Schmidt entries
    ('EMP002', CURRENT_DATE - 7 + TIME '06:00', CURRENT_DATE - 7 + TIME '14:30', 30, 'Frühschicht Kindergarten', 'Kinderbetreuung'),
    ('EMP002', CURRENT_DATE - 6 + TIME '06:00', CURRENT_DATE - 6 + TIME '14:00', 30, 'Morgenkreis und Aktivitäten', 'Kinderbetreuung'),
    ('EMP002', CURRENT_DATE - 5 + TIME '06:00', CURRENT_DATE - 5 + TIME '14:15', 30, 'Gruppenleitung', 'Kinderbetreuung'),
    
    -- Thomas Weber entries (Management)
    ('EMP003', CURRENT_DATE - 7 + TIME '07:30', CURRENT_DATE - 7 + TIME '16:00', 60, 'Verwaltungsaufgaben und Meetings', 'Management'),
    ('EMP003', CURRENT_DATE - 6 + TIME '07:30', CURRENT_DATE - 6 + TIME '17:00', 60, 'Personalplanung und Budget', 'Management'),
    ('EMP003', CURRENT_DATE - 5 + TIME '08:00', CURRENT_DATE - 5 + TIME '16:30', 60, 'Behördentermine', 'Management'),
    
    -- Lisa Müller entries (FSJ)
    ('EMP004', CURRENT_DATE - 7 + TIME '08:30', CURRENT_DATE - 7 + TIME '12:30', 0, 'FSJ Vormittagsbetreuung', 'Ausbildung'),
    ('EMP004', CURRENT_DATE - 6 + TIME '13:00', CURRENT_DATE - 6 + TIME '17:00', 0, 'FSJ Nachmittagsbetreuung', 'Ausbildung'),
    ('EMP004', CURRENT_DATE - 5 + TIME '08:30', CURRENT_DATE - 5 + TIME '12:30', 0, 'Lernprojekt mit Kindern', 'Ausbildung'),
    
    -- Sarah Johnson entries
    ('EMP006', CURRENT_DATE - 7 + TIME '06:00', CURRENT_DATE - 7 + TIME '14:00', 30, 'Krippengruppe Leitung', 'Kinderbetreuung'),
    ('EMP006', CURRENT_DATE - 6 + TIME '14:00', CURRENT_DATE - 6 + TIME '22:00', 30, 'Spätschicht Krippe', 'Kinderbetreuung'),
    ('EMP006', CURRENT_DATE - 5 + TIME '06:00', CURRENT_DATE - 5 + TIME '14:30', 30, 'Elterngespräche', 'Kinderbetreuung')
) AS entry(employee_id, start_time, end_time, break_duration, description, project)
  ON e.employee_id = entry.employee_id
WHERE c.company_code = 'DEMO2025';

-- STEP 11: Create sample vacation requests
INSERT INTO vacation_requests (
  employee_id, start_date, end_date, days_requested, request_type, reason, status, approved_by, approved_at
)
SELECT 
  e.id,
  request.start_date,
  request.end_date,
  request.days_requested,
  request.request_type,
  request.reason,
  request.status,
  (SELECT id FROM employees WHERE company_id = c.id AND employee_id = 'EMP003'),
  CASE WHEN request.status = 'approved' THEN NOW() - INTERVAL '1 day' ELSE NULL END
FROM companies c
JOIN employees e ON e.company_id = c.id
JOIN (
  VALUES 
    ('EMP001', CURRENT_DATE + 14, CURRENT_DATE + 18, 5, 'vacation', 'Familienurlaub', 'approved'),
    ('EMP002', CURRENT_DATE + 21, CURRENT_DATE + 25, 5, 'vacation', 'Erholung', 'pending'),
    ('EMP004', CURRENT_DATE + 7, CURRENT_DATE + 7, 1, 'sick', 'Arzttermin', 'approved'),
    ('EMP006', CURRENT_DATE + 30, CURRENT_DATE + 44, 10, 'vacation', 'Sommerurlaub', 'pending'),
    ('EMP008', CURRENT_DATE - 3, CURRENT_DATE - 1, 3, 'sick', 'Erkältung', 'approved')
) AS request(employee_id, start_date, end_date, days_requested, request_type, reason, status)
  ON e.employee_id = request.employee_id
WHERE c.company_code = 'DEMO2025';

-- STEP 12: Verify cleanup was successful and display summary
SELECT 
  'Data Cleanup and Seeding Complete!' as status,
  (SELECT COUNT(*) FROM companies WHERE company_code = 'DEMO2025') as companies,
  (SELECT COUNT(*) FROM employees WHERE company_id IN (SELECT id FROM companies WHERE company_code = 'DEMO2025')) as employees,
  (SELECT COUNT(*) FROM groups WHERE company_id IN (SELECT id FROM companies WHERE company_code = 'DEMO2025')) as groups,
  (SELECT COUNT(*) FROM time_slots WHERE company_id IN (SELECT id FROM companies WHERE company_code = 'DEMO2025')) as time_slots,
  (SELECT COUNT(*) FROM schedule_assignments WHERE company_id IN (SELECT id FROM companies WHERE company_code = 'DEMO2025')) as schedule_assignments,
  (SELECT COUNT(*) FROM time_entries WHERE employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT id FROM companies WHERE company_code = 'DEMO2025'))) as time_entries,
  (SELECT COUNT(*) FROM vacation_requests WHERE employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT id FROM companies WHERE company_code = 'DEMO2025'))) as vacation_requests;