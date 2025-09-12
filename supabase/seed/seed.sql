-- Seed data for development with company multi-tenancy
-- First, ensure companies exist (these should already be created by the migration)
INSERT INTO companies (id, name, slug, company_code, email, timezone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Company Inc.', 'demo-company', 'DEMO2025', 'admin@democompany.com', 'America/New_York'),
  ('00000000-0000-0000-0000-000000000002', 'Acme Corporation', 'acme-corp', 'ACME2025', 'contact@acmecorp.com', 'America/Los_Angeles')
ON CONFLICT (id) DO UPDATE SET 
  company_code = EXCLUDED.company_code,
  email = EXCLUDED.email;

-- Insert sample employees with company assignments
INSERT INTO employees (id, email, first_name, last_name, employee_id, department, position, hire_date, hourly_rate, company_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'john.doe@company.com', 'John', 'Doe', 'EMP001', 'Engineering', 'Software Developer', '2023-01-15', 45.00, '00000000-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'jane.smith@company.com', 'Jane', 'Smith', 'EMP002', 'Engineering', 'Senior Developer', '2022-03-10', 55.00, '00000000-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'mike.johnson@company.com', 'Mike', 'Johnson', 'EMP003', 'Design', 'UI/UX Designer', '2023-06-01', 40.00, '00000000-0000-0000-0000-000000000001'),
  ('44444444-4444-4444-4444-444444444444', 'sarah.wilson@company.com', 'Sarah', 'Wilson', 'EMP004', 'Engineering', 'Team Lead', '2021-09-15', 65.00, '00000000-0000-0000-0000-000000000001'),
  ('55555555-5555-5555-5555-555555555555', 'david.brown@company.com', 'David', 'Brown', 'EMP005', 'QA', 'QA Engineer', '2023-02-20', 38.00, '00000000-0000-0000-0000-000000000001'),
  -- Employees for second company
  ('66666666-6666-6666-6666-666666666666', 'alice.johnson@acme.com', 'Alice', 'Johnson', 'EMP101', 'Marketing', 'Marketing Manager', '2023-03-01', 50.00, '00000000-0000-0000-0000-000000000002'),
  ('77777777-7777-7777-7777-777777777777', 'bob.williams@acme.com', 'Bob', 'Williams', 'EMP102', 'Sales', 'Sales Representative', '2023-04-15', 42.00, '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  department = EXCLUDED.department,
  position = EXCLUDED.position;

-- Note: User profiles are automatically created when users register through the auth system
-- The handle_new_user() trigger will create user_profiles entries when real users sign up
-- For development, you can test by actually registering users through the application

-- Note: auth_user_id will be populated when real users register and link to employees
-- This happens automatically through the registration process with company codes

-- Insert sample groups with company assignments
INSERT INTO groups (id, name, description, manager_id, company_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Frontend Team', 'Responsible for user interface development', '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Backend Team', 'Handles server-side development', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Design Team', 'Creates user experience and visual designs', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'QA Team', 'Quality assurance and testing', '55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000001'),
  -- Groups for second company
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Marketing Team', 'Marketing and promotion activities', '66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000002'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Sales Team', 'Sales and customer relations', '77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  manager_id = EXCLUDED.manager_id,
  company_id = EXCLUDED.company_id;

-- Insert employee-group relationships
INSERT INTO employee_groups (employee_id, group_id) VALUES
  -- Demo Company employees
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('55555555-5555-5555-5555-555555555555', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  -- Acme Corporation employees
  ('66666666-6666-6666-6666-666666666666', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  ('77777777-7777-7777-7777-777777777777', 'ffffffff-ffff-ffff-ffff-ffffffffffff')
ON CONFLICT (employee_id, group_id) DO NOTHING;

-- Insert sample time entries (for the current week)
INSERT INTO time_entries (employee_id, start_time, end_time, break_duration, description, project) VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-09-08 09:00:00+00', '2025-09-08 17:30:00+00', 30, 'Working on user authentication feature', 'Chrono Meister'),
  ('11111111-1111-1111-1111-111111111111', '2025-09-09 08:30:00+00', '2025-09-09 17:00:00+00', 45, 'Frontend dashboard development', 'Chrono Meister'),
  ('22222222-2222-2222-2222-222222222222', '2025-09-08 09:15:00+00', '2025-09-08 18:00:00+00', 60, 'API development and testing', 'Chrono Meister'),
  ('22222222-2222-2222-2222-222222222222', '2025-09-09 09:00:00+00', '2025-09-09 17:45:00+00', 30, 'Database optimization', 'Chrono Meister'),
  ('33333333-3333-3333-3333-333333333333', '2025-09-08 10:00:00+00', '2025-09-08 18:30:00+00', 45, 'UI mockups for time tracking', 'Chrono Meister'),
  ('55555555-5555-5555-5555-555555555555', '2025-09-08 08:45:00+00', '2025-09-08 17:15:00+00', 30, 'Testing authentication flow', 'Chrono Meister')
ON CONFLICT (id) DO NOTHING;

-- Insert sample vacation requests
INSERT INTO vacation_requests (employee_id, start_date, end_date, days_requested, request_type, reason, status) VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-09-20', '2025-09-22', 3, 'vacation', 'Family trip', 'pending'),
  ('22222222-2222-2222-2222-222222222222', '2025-10-01', '2025-10-05', 5, 'vacation', 'Annual leave', 'approved'),
  ('33333333-3333-3333-3333-333333333333', '2025-09-15', '2025-09-15', 1, 'sick', 'Medical appointment', 'approved')
ON CONFLICT (id) DO NOTHING;

-- Insert sample schedules (for this week)
INSERT INTO schedules (employee_id, date, shift_start, shift_end, break_duration) VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-09-11', '09:00', '17:30', 30),
  ('11111111-1111-1111-1111-111111111111', '2025-09-12', '09:00', '17:30', 30),
  ('11111111-1111-1111-1111-111111111111', '2025-09-13', '09:00', '17:30', 30),
  ('22222222-2222-2222-2222-222222222222', '2025-09-11', '09:00', '18:00', 60),
  ('22222222-2222-2222-2222-222222222222', '2025-09-12', '09:00', '18:00', 60),
  ('22222222-2222-2222-2222-222222222222', '2025-09-13', '09:00', '18:00', 60),
  ('33333333-3333-3333-3333-333333333333', '2025-09-11', '10:00', '18:30', 45),
  ('33333333-3333-3333-3333-333333333333', '2025-09-12', '10:00', '18:30', 45),
  ('55555555-5555-5555-5555-555555555555', '2025-09-11', '08:30', '17:00', 30),
  ('55555555-5555-5555-5555-555555555555', '2025-09-12', '08:30', '17:00', 30)
ON CONFLICT (employee_id, date) DO UPDATE SET
  shift_start = EXCLUDED.shift_start,
  shift_end = EXCLUDED.shift_end,
  break_duration = EXCLUDED.break_duration;
