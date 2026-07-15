const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'Request failed');
  }
  const data = await response.json();
  return data.data;
}

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

export interface EmployeeInput {
  name: string;
  employee_code: string;
  email?: string;
  phone?: string;
  department?: string;
  is_active?: boolean;
}

export const employeesApi = {
  list: (activeOnly = true) =>
    fetch(`${API_BASE}/employees?active_only=${activeOnly}`)
      .then(handleResponse<Employee[]>),

  get: (id: string) =>
    fetch(`${API_BASE}/employees/${id}`)
      .then(handleResponse<Employee>),

  create: (data: EmployeeInput) =>
    fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Employee>),

  update: (id: string, data: Partial<EmployeeInput>) =>
    fetch(`${API_BASE}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Employee>),

  delete: (id: string) =>
    fetch(`${API_BASE}/employees/${id}`, { method: 'DELETE' })
      .then(handleResponse<void>),
};

export interface Leave {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  employees?: { id: string; name: string; employee_code: string };
}

export interface LeaveInput {
  employee_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status?: string;
}

export const leavesApi = {
  list: () =>
    fetch(`${API_BASE}/leaves`)
      .then(handleResponse<Leave[]>),

  getByEmployee: (employeeId: string) =>
    fetch(`${API_BASE}/leaves/employee/${employeeId}`)
      .then(handleResponse<Leave[]>),

  create: (data: LeaveInput) =>
    fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Leave>),

  update: (id: string, data: Partial<LeaveInput>) =>
    fetch(`${API_BASE}/leaves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Leave>),

  delete: (id: string) =>
    fetch(`${API_BASE}/leaves/${id}`, { method: 'DELETE' })
      .then(handleResponse<void>),
};

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

export interface ShiftInput {
  name: string;
  start_time: string;
  end_time: string;
  min_employees?: number;
  max_employees?: number;
  display_order?: number;
  is_active?: boolean;
}

export const shiftsApi = {
  list: (activeOnly = true) =>
    fetch(`${API_BASE}/shifts?active_only=${activeOnly}`)
      .then(handleResponse<Shift[]>),

  get: (id: string) =>
    fetch(`${API_BASE}/shifts/${id}`)
      .then(handleResponse<Shift>),

  create: (data: ShiftInput) =>
    fetch(`${API_BASE}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Shift>),

  update: (id: string, data: Partial<ShiftInput>) =>
    fetch(`${API_BASE}/shifts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Shift>),

  delete: (id: string) =>
    fetch(`${API_BASE}/shifts/${id}`, { method: 'DELETE' })
      .then(handleResponse<void>),
};

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
  employees?: { id: string; name: string; employee_code: string };
  shifts?: { id: string; name: string; start_time: string; end_time: string } | null;
}

export interface RosterGenerateInput {
  name: string;
  start_date: string;
  end_date: string;
}

export interface RosterGenerateResult {
  roster: Roster;
  assignments: RosterAssignment[];
  statistics: Record<string, unknown>;
}

export const rostersApi = {
  list: () =>
    fetch(`${API_BASE}/rosters`)
      .then(handleResponse<Roster[]>),

  get: (id: string) =>
    fetch(`${API_BASE}/rosters/${id}`)
      .then(handleResponse<{ roster: Roster; assignments: RosterAssignment[] }>),

  generate: (data: RosterGenerateInput) =>
    fetch(`${API_BASE}/rosters/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<RosterGenerateResult>),

  publish: (id: string) =>
    fetch(`${API_BASE}/rosters/${id}/publish`, { method: 'PUT' })
      .then(handleResponse<Roster>),

  delete: (id: string) =>
    fetch(`${API_BASE}/rosters/${id}`, { method: 'DELETE' })
      .then(handleResponse<void>),

  getStatistics: (id: string) =>
    fetch(`${API_BASE}/rosters/${id}/statistics`)
      .then(handleResponse<Record<string, unknown>>),

  validate: (id: string) =>
    fetch(`${API_BASE}/rosters/${id}/validate`, { method: 'POST' })
      .then(handleResponse<{ is_valid: boolean; errors: string[]; warnings: string[] }>),
};

export const assignmentsApi = {
  update: (id: string, data: { shift_id?: string; is_weekly_off?: boolean; notes?: string }) =>
    fetch(`${API_BASE}/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<RosterAssignment>),

  bulkUpdate: (rosterId: string, assignments: Array<{ id: string; shift_id?: string; is_weekly_off?: boolean; notes?: string }>) =>
    fetch(`${API_BASE}/rosters/${rosterId}/assignments/bulk`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments }),
    }).then(handleResponse<RosterAssignment[]>),
};

export const exportApi = {
  export: async (rosterId: string, format: 'excel' | 'csv' | 'pdf') => {
    const response = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roster_id: rosterId, format }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : `roster.${format === 'excel' ? 'xlsx' : format}`;

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
