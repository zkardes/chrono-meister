-- Seed data for development
-- Insert sample employees
INSERT INTO employees (id, email, first_name, last_name, employee_id, department, position, hire_date, hourly_rate) VALUES
  ('11111111-1111-1111-1111-111111111111', 'john.doe@company.com', 'John', 'Doe', 'EMP001', 'Engineering', 'Software Developer', '2023-01-15', 45.00),
  ('22222222-2222-2222-2222-222222222222', 'jane.smith@company.com', 'Jane', 'Smith', 'EMP002', 'Engineering', 'Senior Developer', '2022-03-10', 55.00),
  ('33333333-3333-3333-3333-333333333333', 'mike.johnson@company.com', 'Mike', 'Johnson', 'EMP003', 'Design', 'UI/UX Designer', '2023-06-01', 40.00),
  ('44444444-4444-4444-4444-444444444444', 'sarah.wilson@company.com', 'Sarah', 'Wilson', 'EMP004', 'Engineering', 'Team Lead', '2021-09-15', 65.00),
  ('55555555-5555-5555-5555-555555555555', 'david.brown@company.com', 'David', 'Brown', 'EMP005', 'QA', 'QA Engineer', '2023-02-20', 38.00);

-- Insert sample user profiles (these would normally be created by the auth trigger)
-- Note: In a real scenario, these users would sign up through the registration form
-- and the user_profiles would be automatically created by the trigger
INSERT INTO user_profiles (id, employee_id, role) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-111111111111', '11111111-1111-1111-1111-111111111111', 'employee'),
  ('aaaaaaaa-bbbb-cccc-dddd-222222222222', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('aaaaaaaa-bbbb-cccc-dddd-333333333333', '33333333-3333-3333-3333-333333333333', 'employee'),
  ('aaaaaaaa-bbbb-cccc-dddd-444444444444', '44444444-4444-4444-4444-444444444444', 'manager');

-- Update employees with auth_user_id to show the linking
UPDATE employees SET auth_user_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE employees SET auth_user_id = 'aaaaaaaa-bbbb-cccc-dddd-222222222222' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE employees SET auth_user_id = 'aaaaaaaa-bbbb-cccc-dddd-333333333333' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE employees SET auth_user_id = 'aaaaaaaa-bbbb-cccc-dddd-444444444444' WHERE id = '44444444-4444-4444-4444-444444444444';

-- Insert sample groups
INSERT INTO groups (id, name, description, manager_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Frontend Team', 'Responsible for user interface development', '44444444-4444-4444-4444-444444444444'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Backend Team', 'Handles server-side development', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Design Team', 'Creates user experience and visual designs', '33333333-3333-3333-3333-333333333333'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'QA Team', 'Quality assurance and testing', '55555555-5555-5555-5555-555555555555');

-- Insert employee-group relationships
INSERT INTO employee_groups (employee_id, group_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('55555555-5555-5555-5555-555555555555', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- Insert sample time entries (for the current week)
INSERT INTO time_entries (employee_id, start_time, end_time, break_duration, description, project) VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-09-08 09:00:00+00', '2025-09-08 17:30:00+00', 30, 'Working on user authentication feature', 'Chrono Meister'),
  ('11111111-1111-1111-1111-111111111111', '2025-09-09 08:30:00+00', '2025-09-09 17:00:00+00', 45, 'Frontend dashboard development', 'Chrono Meister'),
  ('22222222-2222-2222-2222-222222222222', '2025-09-08 09:15:00+00', '2025-09-08 18:00:00+00', 60, 'API development and testing', 'Chrono Meister'),
  ('22222222-2222-2222-2222-222222222222', '2025-09-09 09:00:00+00', '2025-09-09 17:45:00+00', 30, 'Database optimization', 'Chrono Meister'),
  ('33333333-3333-3333-3333-333333333333', '2025-09-08 10:00:00+00', '2025-09-08 18:30:00+00', 45, 'UI mockups for time tracking', 'Chrono Meister'),
  ('55555555-5555-5555-5555-555555555555', '2025-09-08 08:45:00+00', '2025-09-08 17:15:00+00', 30, 'Testing authentication flow', 'Chrono Meister');

-- Insert sample vacation requests
INSERT INTO vacation_requests (employee_id, start_date, end_date, days_requested, request_type, reason, status) VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-09-20', '2025-09-22', 3, 'vacation', 'Family trip', 'pending'),
  ('22222222-2222-2222-2222-222222222222', '2025-10-01', '2025-10-05', 5, 'vacation', 'Annual leave', 'approved'),
  ('33333333-3333-3333-3333-333333333333', '2025-09-15', '2025-09-15', 1, 'sick', 'Medical appointment', 'approved');

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
  ('55555555-5555-5555-5555-555555555555', '2025-09-12', '08:30', '17:00', 30);
