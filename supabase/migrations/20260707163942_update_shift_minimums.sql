-- Update shift minimum employees to 3 for full coverage
UPDATE shifts SET min_employees = 3 WHERE is_active = true;