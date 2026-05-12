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
-- Admin account is auto-created by the backend on first startup.
-- Email: admin123@gmail.com  |  Password: Admin123
-- Do NOT add admin here — the server handles it automatically.
-- ============================================================
