import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

console.log("URL:", supabaseUrl);
console.log("Anon Key:", supabaseAnonKey);
export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'dummy-key'
);

// Database types
export interface Employee {
  id: string;
  name: string;
  employee_code: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Leave {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  employees?: { id: string; name: string; employee_code: string } | null;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  min_employees: number;
  max_employees: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Roster {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'published';
  created_at: string;
}

export interface RosterAssignment {
  id: string;
  roster_id: string;
  employee_id: string;
  shift_id: string | null;
  date: string;
  is_weekly_off: boolean;
  notes: string | null;
  created_at: string;
  employees?: { id: string; name: string; employee_code: string } | null;
  shifts?: { id: string; name: string; start_time: string; end_time: string } | null;
}

// Employee operations
export async function getEmployees(activeOnly = true): Promise<Employee[]> {
  let query = supabase.from('employees').select('*').order('name');
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const { data, error } = await supabase.from('employees').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createEmployee(employee: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> {
  const { data, error } = await supabase.from('employees').insert(employee).select().single();
  if (error) throw error;
  return data;
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase.from('employees').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
}

// Leave operations
export async function getLeaves(): Promise<Leave[]> {
  const { data, error } = await supabase
    .from('leaves')
    .select('*, employees(id, name, employee_code)')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getLeavesByEmployee(employeeId: string): Promise<Leave[]> {
  const { data, error } = await supabase
    .from('leaves')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date');
  if (error) throw error;
  return data || [];
}

export async function getApprovedLeavesBetween(startDate: string, endDate: string): Promise<Leave[]> {
  const { data, error } = await supabase
    .from('leaves')
    .select('employee_id, start_date, end_date')
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate);
  if (error) throw error;
  return data || [];
}

export async function createLeave(leave: Omit<Leave, 'id' | 'created_at' | 'employees'>): Promise<Leave> {
  const { data, error } = await supabase.from('leaves').insert(leave).select().single();
  if (error) throw error;
  return data;
}

export async function updateLeave(id: string, updates: Partial<Leave>): Promise<Leave> {
  const { data, error } = await supabase.from('leaves').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLeave(id: string): Promise<void> {
  const { error } = await supabase.from('leaves').delete().eq('id', id);
  if (error) throw error;
}

// Shift operations
export async function getShifts(activeOnly = true): Promise<Shift[]> {
  let query = supabase.from('shifts').select('*').order('display_order');
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getShift(id: string): Promise<Shift | null> {
  const { data, error } = await supabase.from('shifts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createShift(shift: Omit<Shift, 'id' | 'created_at'>): Promise<Shift> {
  const { data, error } = await supabase.from('shifts').insert(shift).select().single();
  if (error) throw error;
  return data;
}

export async function updateShift(id: string, updates: Partial<Shift>): Promise<Shift> {
  const { data, error } = await supabase.from('shifts').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteShift(id: string): Promise<void> {
  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) throw error;
}

// Roster operations
export async function getRosters(): Promise<Roster[]> {
  const { data, error } = await supabase.from('rosters').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRoster(id: string): Promise<{ roster: Roster; assignments: RosterAssignment[] } | null> {
  const { data: roster, error: rosterError } = await supabase
    .from('rosters')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (rosterError) throw rosterError;
  if (!roster) return null;

  const { data: assignments, error: assignError } = await supabase
    .from('roster_assignments')
    .select('*, employees(id, name, employee_code), shifts(id, name, start_time, end_time)')
    .eq('roster_id', id)
    .order('date');
  if (assignError) throw assignError;

  return { roster, assignments: assignments || [] };
}

export async function createRoster(roster: Omit<Roster, 'id' | 'created_at'>): Promise<Roster> {
  const { data, error } = await supabase.from('rosters').insert(roster).select().single();
  if (error) throw error;
  return data;
}

export async function updateRoster(id: string, updates: Partial<Roster>): Promise<Roster> {
  const { data, error } = await supabase.from('rosters').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRoster(id: string): Promise<void> {
  // First delete all assignments
  await supabase.from('roster_assignments').delete().eq('roster_id', id);
  // Then delete the roster
  const { error } = await supabase.from('rosters').delete().eq('id', id);
  if (error) throw error;
}

// Roster assignment operations
export async function getRosterAssignments(rosterId: string): Promise<RosterAssignment[]> {
  const { data, error } = await supabase
    .from('roster_assignments')
    .select('*, employees(id, name, employee_code), shifts(id, name, start_time, end_time)')
    .eq('roster_id', rosterId)
    .order('date');
  if (error) throw error;
  return data || [];
}

export async function createRosterAssignments(assignments: Array<Omit<RosterAssignment, 'id' | 'created_at' | 'employees' | 'shifts'>>): Promise<RosterAssignment[]> {
  const { data, error } = await supabase.from('roster_assignments').insert(assignments).select();
  if (error) throw error;
  return data || [];
}

export async function updateRosterAssignment(id: string, updates: Partial<RosterAssignment>): Promise<RosterAssignment> {
  const { data, error } = await supabase.from('roster_assignments').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRosterAssignments(rosterId: string): Promise<void> {
  const { error } = await supabase.from('roster_assignments').delete().eq('roster_id', rosterId);
  if (error) throw error;
}
