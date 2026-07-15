/*
# Create Roster Management Schema

1. New Tables
- `employees`: Stores employee information
  - id (uuid, primary key)
  - name (text, not null)
  - employee_code (text, unique, not null) - unique identifier for employee
  - email (text, unique)
  - phone (text)
  - department (text)
  - is_active (boolean, default true)
  - created_at (timestamp)

- `leaves`: Stores approved leave records
  - id (uuid, primary key)
  - employee_id (uuid, FK to employees)
  - start_date (date, not null)
  - end_date (date, not null)
  - reason (text)
  - status (text, default 'approved') - approved/pending/rejected
  - created_at (timestamp)

- `shifts`: Stores shift configurations
  - id (uuid, primary key)
  - name (text, not null) - e.g., 'Morning', 'Afternoon', 'Night'
  - start_time (time, not null)
  - end_time (time, not null)
  - min_employees (integer, default 3)
  - max_employees (integer, default 10)
  - display_order (integer, default 0) - order of shifts in UI
  - is_active (boolean, default true)
  - created_at (timestamp)

- `rosters`: Stores roster generation records
  - id (uuid, primary key)
  - name (text, not null)
  - start_date (date, not null)
  - end_date (date, not null)
  - status (text, default 'draft') - draft/published
  - created_at (timestamp)

- `roster_assignments`: Stores individual shift assignments
  - id (uuid, primary key)
  - roster_id (uuid, FK to rosters)
  - employee_id (uuid, FK to employees)
  - shift_id (uuid, FK to shifts)
  - date (date, not null)
  - is_weekly_off (boolean, default false)
  - notes (text)
  - created_at (timestamp)
  - Unique constraint on (roster_id, employee_id, date)

2. Security
- Enable RLS on all tables
- Allow anon + authenticated full CRUD access (single-tenant, no auth)

3. Important Notes
- This is a single-tenant application with no authentication
- All policies use `TO anon, authenticated` with full access
- Unique constraint prevents duplicate assignments for same employee on same date in same roster
*/

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  employee_code text UNIQUE NOT NULL,
  email text UNIQUE,
  phone text,
  department text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_employees" ON employees;
CREATE POLICY "anon_select_employees" ON employees FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employees" ON employees;
CREATE POLICY "anon_insert_employees" ON employees FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_employees" ON employees;
CREATE POLICY "anon_update_employees" ON employees FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_employees" ON employees;
CREATE POLICY "anon_delete_employees" ON employees FOR DELETE
  TO anon, authenticated USING (true);

-- Leaves table
CREATE TABLE IF NOT EXISTS leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_leaves" ON leaves;
CREATE POLICY "anon_select_leaves" ON leaves FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_leaves" ON leaves;
CREATE POLICY "anon_insert_leaves" ON leaves FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_leaves" ON leaves;
CREATE POLICY "anon_update_leaves" ON leaves FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_leaves" ON leaves;
CREATE POLICY "anon_delete_leaves" ON leaves FOR DELETE
  TO anon, authenticated USING (true);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  min_employees integer NOT NULL DEFAULT 3,
  max_employees integer NOT NULL DEFAULT 10,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_shifts" ON shifts;
CREATE POLICY "anon_select_shifts" ON shifts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_shifts" ON shifts;
CREATE POLICY "anon_insert_shifts" ON shifts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_shifts" ON shifts;
CREATE POLICY "anon_update_shifts" ON shifts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_shifts" ON shifts;
CREATE POLICY "anon_delete_shifts" ON shifts FOR DELETE
  TO anon, authenticated USING (true);

-- Rosters table
CREATE TABLE IF NOT EXISTS rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_roster_date_range CHECK (end_date >= start_date)
);

ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rosters" ON rosters;
CREATE POLICY "anon_select_rosters" ON rosters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rosters" ON rosters;
CREATE POLICY "anon_insert_rosters" ON rosters FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rosters" ON rosters;
CREATE POLICY "anon_update_rosters" ON rosters FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rosters" ON rosters;
CREATE POLICY "anon_delete_rosters" ON rosters FOR DELETE
  TO anon, authenticated USING (true);

-- Roster Assignments table
CREATE TABLE IF NOT EXISTS roster_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  date date NOT NULL,
  is_weekly_off boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_employee_date_per_roster UNIQUE (roster_id, employee_id, date)
);

ALTER TABLE roster_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_assignments" ON roster_assignments;
CREATE POLICY "anon_select_assignments" ON roster_assignments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_assignments" ON roster_assignments;
CREATE POLICY "anon_insert_assignments" ON roster_assignments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_assignments" ON roster_assignments;
CREATE POLICY "anon_update_assignments" ON roster_assignments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_assignments" ON roster_assignments;
CREATE POLICY "anon_delete_assignments" ON roster_assignments FOR DELETE
  TO anon, authenticated USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_assignments_roster ON roster_assignments(roster_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON roster_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_date ON roster_assignments(date);
CREATE INDEX IF NOT EXISTS idx_assignments_shift ON roster_assignments(shift_id);