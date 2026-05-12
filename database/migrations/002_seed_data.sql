-- ============================================================
-- Seed Data for Development/Testing
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Default Leave Types
INSERT INTO leave_types (name, days_allowed, carry_forward, description) VALUES
  ('Annual Leave', 21, true, 'Yearly paid vacation leave'),
  ('Sick Leave', 14, false, 'Medical leave with doctor certificate'),
  ('Emergency Leave', 3, false, 'For personal emergencies'),
  ('Maternity Leave', 90, false, 'For female employees (childbirth)'),
  ('Paternity Leave', 7, false, 'For male employees (childbirth)'),
  ('Unpaid Leave', 0, false, 'Leave without pay')
ON CONFLICT (name) DO NOTHING;

-- Sample Public Holidays (2025)
INSERT INTO holidays (name, date) VALUES
  ('New Year''s Day', '2025-01-01'),
  ('Chinese New Year', '2025-01-29'),
  ('Chinese New Year Holiday', '2025-01-30'),
  ('Federal Territory Day', '2025-02-01'),
  ('Labour Day', '2025-05-01'),
  ('Wesak Day', '2025-05-12'),
  ('National Day', '2025-08-31'),
  ('Malaysia Day', '2025-09-16'),
  ('Christmas Day', '2025-12-25')
ON CONFLICT (date) DO NOTHING;

-- ============================================================
-- Admin User (password: Admin@123456)
-- bcrypt hash of 'Admin@123456' with salt rounds 12
-- ============================================================
INSERT INTO users (
  email,
  password_hash,
  full_name,
  role,
  department,
  position,
  phone,
  employee_id,
  join_date,
  is_active
) VALUES (
  'admin@company.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oFRDgCnWe',
  'System Administrator',
  'admin',
  'IT',
  'System Admin',
  '+60123456789',
  'EMP001',
  '2023-01-01',
  true
) ON CONFLICT (email) DO NOTHING;

-- Sample Manager (password: Manager@123456)
INSERT INTO users (
  email,
  password_hash,
  full_name,
  role,
  department,
  position,
  phone,
  employee_id,
  join_date,
  is_active
) VALUES (
  'manager@company.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oFRDgCnWe',
  'Jane Smith',
  'manager',
  'Engineering',
  'Engineering Manager',
  '+60123456788',
  'EMP002',
  '2023-02-01',
  true
) ON CONFLICT (email) DO NOTHING;

-- Sample Employee (password: Employee@123456)
INSERT INTO users (
  email,
  password_hash,
  full_name,
  role,
  department,
  position,
  phone,
  employee_id,
  join_date,
  is_active
) VALUES (
  'employee@company.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oFRDgCnWe',
  'John Doe',
  'employee',
  'Engineering',
  'Software Developer',
  '+60123456787',
  'EMP003',
  '2023-03-01',
  true
) ON CONFLICT (email) DO NOTHING;
