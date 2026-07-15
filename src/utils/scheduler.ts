/**
 * Roster Scheduler - Fair shift assignment for 24/7 operations
 *
 * This scheduler ensures:
 * 1. ALL THREE SHIFTS COVERED DAILY (minimum employees per shift)
 * 2. Fair distribution of shifts across all employees
 * 3. Shift codes: F3 (Morning), S2 (Afternoon), T7 (Night)
 * 4. Max 6 consecutive working days, then mandatory off
 * 5. 2 weekly offs per employee per week
 * 6. Weekly offs distributed across different days
 * 7. No morning shift after night shift
 * 8. Employees on leave cannot be assigned
 */

export interface Employee {
  id: string;
  name: string;
  employee_code: string;
  is_active: boolean;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  min_employees: number;
  max_employees: number;
}

export interface Leave {
  employee_id: string;
  start_date: string;
  end_date: string;
}

export interface Assignment {
  employee_id: string;
  date: string;
  shift_id: string | null;
  is_weekly_off: boolean;
}

// Shift display codes
export const SHIFT_CODES: Record<string, string> = {
  morning: 'F3',
  afternoon: 'S2',
  night: 'T7',
};

const MAX_CONSECUTIVE_DAYS = 6;
const WEEKLY_OFFS_PER_WEEK = 2;

export function generateRoster(
  employees: Employee[],
  shifts: Shift[],
  startDate: string,
  endDate: string,
  leaves: Leave[]
): { assignments: Assignment[]; statistics: Record<string, unknown>; errors: string[] } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const numDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const weeksCount = Math.ceil(numDays / 7);

  // Identify shift types
  const morningShift = shifts.find(s => s.name.toLowerCase().includes('morning'));
  const afternoonShift = shifts.find(s => s.name.toLowerCase().includes('afternoon'));
  const nightShift = shifts.find(s => s.name.toLowerCase().includes('night'));

  if (!morningShift || !afternoonShift || !nightShift) {
    return {
      assignments: [],
      statistics: {},
      errors: ['Missing shift definitions. Ensure Morning, Afternoon, and Night shifts exist.']
    };
  }

  // Build leave lookup
  const leaveLookup = new Map<string, Set<string>>();
  leaves.forEach(leave => {
    const empId = leave.employee_id;
    if (!leaveLookup.has(empId)) {
      leaveLookup.set(empId, new Set());
    }
    const leaveStart = new Date(leave.start_date);
    const leaveEnd = new Date(leave.end_date);
    for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
      leaveLookup.get(empId)!.add(d.toISOString().split('T')[0]);
    }
  });

  // Generate date strings
  const dates: string[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const activeEmployees = employees.filter(e => e.is_active);
  const totalEmployees = activeEmployees.length;

  // Calculate minimum employees needed per day
  const minPerShift = Math.min(morningShift.min_employees, afternoonShift.min_employees, nightShift.min_employees);
  const minEmployeesNeededDaily = morningShift.min_employees + afternoonShift.min_employees + afternoonShift.min_employees;

  // Track employee stats
  const employeeStats = new Map<string, {
    totalShifts: number;
    morningCount: number;
    afternoonCount: number;
    nightCount: number;
    weeklyOffsCount: number;
    consecutiveWorkDays: number;
    lastShiftType: 'morning' | 'afternoon' | 'night' | null;
    lastWorkDate: string | null;
    assignedDates: Set<string>;
    weeklyOffDates: Set<string>;
  }>();

  activeEmployees.forEach(emp => {
    employeeStats.set(emp.id, {
      totalShifts: 0,
      morningCount: 0,
      afternoonCount: 0,
      nightCount: 0,
      weeklyOffsCount: 0,
      consecutiveWorkDays: 0,
      lastShiftType: null,
      lastWorkDate: null,
      assignedDates: new Set(),
      weeklyOffDates: new Set(),
    });
  });

  const assignments: Assignment[] = [];
  const errors: string[] = [];

  // Phase 1: Plan weekly offs first - distribute evenly across each week
  const weeklyOffPlan = new Map<string, Set<string>>(); // empId -> Set of dates
  activeEmployees.forEach(emp => weeklyOffPlan.set(emp.id, new Set()));

  for (let week = 0; week < weeksCount; week++) {
    const weekStart = week * 7;
    const weekEnd = Math.min((week + 1) * 7, numDays);

    // Get employees available this week (not on leave for entire week)
    const weekDates = dates.slice(weekStart, weekEnd);
    const availableThisWeek = activeEmployees.filter(emp => {
      const onLeaveDays = weekDates.filter(d => leaveLookup.get(emp.id)?.has(d)).length;
      return onLeaveDays < weekDates.length - 1; // Must have at least 2 non-leave days
    });

    // Each employee needs 2 weekly offs this week (if available)
    // Distribute to ensure enough coverage each day
    const dayEmployeeCounts = weekDates.map(() => 0); // Track how many people off each day

    // First pass: identify who needs to be on off for max consecutive day constraint
    // This will be handled dynamically during assignment

    // Second pass: assign 2 weekly offs per employee, distributing across days
    availableThisWeek.forEach((emp, empIndex) => {
      const empOffs = weeklyOffPlan.get(emp.id)!;
      const empStats = employeeStats.get(emp.id)!;

      // Find two consecutive days in this week where employee is not on leave
      // Stagger the start day based on employee index to distribute offs
      let offsAssigned = 0;
      const startOffset = (empIndex * 2) % Math.max(1, weekDates.length - 1);

      for (let i = startOffset; i < weekDates.length - 1 && offsAssigned < 2; i++) {
        const day1 = weekDates[i];
        const day2 = weekDates[i + 1];

        // Check if both days are available (not on leave)
        if (leaveLookup.get(emp.id)?.has(day1) || leaveLookup.get(emp.id)?.has(day2)) {
          continue;
        }

        // Check if enough employees available on these days
        const currentOffsDay1 = dayEmployeeCounts[i] || 0;
        const currentOffsDay2 = dayEmployeeCounts[i + 1] || 0;
        const maxOffsPerDay = Math.floor(totalEmployees * 0.4); // Max 40% off per day

        if (currentOffsDay1 < maxOffsPerDay && currentOffsDay2 < maxOffsPerDay) {
          empOffs.add(day1);
          empOffs.add(day2);
          dayEmployeeCounts[i] = (dayEmployeeCounts[i] || 0) + 1;
          dayEmployeeCounts[i + 1] = (dayEmployeeCounts[i + 1] || 0) + 1;
          offsAssigned = 2;
        }
      }

      // Fallback: assign non-consecutive if needed
      if (offsAssigned < 2) {
        for (let i = 0; i < weekDates.length && offsAssigned < 2; i++) {
          const day = weekDates[i];
          if (!leaveLookup.get(emp.id)?.has(day) && !empOffs.has(day)) {
            const currentOffs = dayEmployeeCounts[i] || 0;
            if (currentOffs < Math.floor(totalEmployees * 0.5)) {
              empOffs.add(day);
              dayEmployeeCounts[i] = currentOffs + 1;
              offsAssigned++;
            }
          }
        }
      }
    });
  }

  // Phase 2: Assign shifts day by day, ensuring all shifts are covered
  for (let dayIdx = 0; dayIdx < numDays; dayIdx++) {
    const date = dates[dayIdx];
    const yesterday = dayIdx > 0 ? dates[dayIdx - 1] : null;

    // Mark weekly offs and leaves first
    activeEmployees.forEach(emp => {
      const isWeeklyOff = weeklyOffPlan.get(emp.id)?.has(date) || false;
      const isOnLeave = leaveLookup.get(emp.id)?.has(date) || false;

      if (isWeeklyOff || isOnLeave) {
        assignments.push({
          employee_id: emp.id,
          date,
          shift_id: null,
          is_weekly_off: true,
        });

        const stats = employeeStats.get(emp.id)!;
        stats.consecutiveWorkDays = 0;
        stats.lastWorkDate = null;
        if (isWeeklyOff) {
          stats.weeklyOffsCount++;
          stats.weeklyOffDates.add(date);
        }
      }
    });

    // Get available employees for this day
    const availableForDay = activeEmployees.filter(emp => {
      const stats = employeeStats.get(emp.id)!;
      const isWeeklyOff = weeklyOffPlan.get(emp.id)?.has(date) || false;
      const isOnLeave = leaveLookup.get(emp.id)?.has(date) || false;

      if (isWeeklyOff || isOnLeave || !emp.is_active) return false;
      if (stats.consecutiveWorkDays >= MAX_CONSECUTIVE_DAYS) return false;
      if (stats.assignedDates.has(date)) return false;

      return true;
    });

    // Calculate priority score for each employee (lower = higher priority for assignment)
    const getPriorityScore = (empId: string, shiftType: 'morning' | 'afternoon' | 'night'): number => {
      const stats = employeeStats.get(empId)!;

      // Night constraint for morning shift
      if (shiftType === 'morning' && yesterday) {
        const yesterdayAssignment = assignments.find(
          a => a.employee_id === empId && a.date === yesterday && !a.is_weekly_off
        );
        if (yesterdayAssignment && yesterdayAssignment.shift_id === nightShift.id) {
          return 10000; // Cannot work morning after night
        }
      }

      // Base priority: fewer shifts = higher priority
      const shiftCount = shiftType === 'morning' ? stats.morningCount :
                        shiftType === 'afternoon' ? stats.afternoonCount :
                        stats.nightCount;

      // Score based on shift balance and total workload
      const balanceScore = shiftCount * 100;
      const workloadScore = stats.totalShifts * 10;
      const consecutivePenalty = (MAX_CONSECUTIVE_DAYS - stats.consecutiveWorkDays) * 5;

      return balanceScore + workloadScore - consecutivePenalty;
    };

    // Assign for each shift, ensuring minimum coverage
    const assignShift = (shift: Shift, shiftType: 'morning' | 'afternoon' | 'night', minNeeded: number) => {
      const currentCount = assignments.filter(
        a => a.date === date && a.shift_id === shift.id
      ).length;

      let needed = Math.max(0, minNeeded - currentCount);

      // Sort available employees by priority for this shift
      const candidates = availableForDay
        .filter(emp => {
          // Check if already assigned today
          const todayAssigned = assignments.find(
            a => a.employee_id === emp.id && a.date === date && !a.is_weekly_off
          );
          if (todayAssigned) return false;
          return getPriorityScore(emp.id, shiftType) < 10000;
        })
        .sort((a, b) => getPriorityScore(a.id, shiftType) - getPriorityScore(b.id, shiftType));

      // Assign employees
      for (const emp of candidates) {
        if (needed <= 0) break;

        assignments.push({
          employee_id: emp.id,
          date,
          shift_id: shift.id,
          is_weekly_off: false,
        });

        const stats = employeeStats.get(emp.id)!;
        stats.totalShifts++;
        stats.consecutiveWorkDays++;
        stats.assignedDates.add(date);
        stats.lastWorkDate = date;
        stats.lastShiftType = shiftType;

        if (shiftType === 'morning') stats.morningCount++;
        else if (shiftType === 'afternoon') stats.afternoonCount++;
        else stats.nightCount++;

        needed--;
      }

      if (needed > 0) {
        errors.push(`${shift.name} on ${date}: short by ${needed} employees (only ${currentCount + minNeeded - needed}/${minNeeded})`);
      }
    };

    // Assign morning first, then afternoon, then night
    // This ensures morning shift doesn't get blocked by night-shift workers
    assignShift(morningShift, 'morning', morningShift.min_employees);
    assignShift(afternoonShift, 'afternoon', afternoonShift.min_employees);
    assignShift(nightShift, 'night', nightShift.min_employees);
  }

  // Build statistics
  const statsByEmployee: Record<string, { name: string; shifts: number; weeklyOffs: number; byShift: Record<string, number> }> = {};
  activeEmployees.forEach(emp => {
    const stats = employeeStats.get(emp.id)!;
    statsByEmployee[emp.id] = {
      name: emp.name,
      shifts: stats.totalShifts,
      weeklyOffs: stats.weeklyOffsCount,
      byShift: {
        [SHIFT_CODES.morning]: stats.morningCount,
        [SHIFT_CODES.afternoon]: stats.afternoonCount,
        [SHIFT_CODES.night]: stats.nightCount,
      },
    };
  });

  const statistics = {
    total_assignments: assignments.filter(a => !a.is_weekly_off).length,
    total_weekly_offs: assignments.filter(a => a.is_weekly_off).length,
    by_employee: statsByEmployee,
    by_shift: {
      [SHIFT_CODES.morning]: assignments.filter(a => a.shift_id === morningShift.id).length,
      [SHIFT_CODES.afternoon]: assignments.filter(a => a.shift_id === afternoonShift.id).length,
      [SHIFT_CODES.night]: assignments.filter(a => a.shift_id === nightShift.id).length,
    },
  };

  return { assignments, statistics, errors };
}

export function getShiftCode(shiftName: string | null, isWeeklyOff: boolean): string {
  if (isWeeklyOff) return 'WO';
  if (!shiftName) return '-';

  const lower = shiftName.toLowerCase();
  if (lower.includes('morning')) return SHIFT_CODES.morning;
  if (lower.includes('afternoon')) return SHIFT_CODES.afternoon;
  if (lower.includes('night')) return SHIFT_CODES.night;

  return shiftName.substring(0, 2).toUpperCase();
}

export function getShiftStyle(shiftName: string | null, isWeeklyOff: boolean): string {
  if (isWeeklyOff) return 'bg-gray-100 text-gray-500';
  if (!shiftName) return 'bg-gray-50 text-gray-400';

  const lower = shiftName.toLowerCase();
  if (lower.includes('morning')) return 'bg-amber-100 text-amber-700';
  if (lower.includes('afternoon')) return 'bg-emerald-100 text-emerald-700';
  if (lower.includes('night')) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

export function validateRoster(
  assignments: Assignment[],
  employees: Employee[],
  shifts: Shift[],
  leaves: Leave[]
): { is_valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const morningShift = shifts.find(s => s.name.toLowerCase().includes('morning'));
  const afternoonShift = shifts.find(s => s.name.toLowerCase().includes('afternoon'));
  const nightShift = shifts.find(s => s.name.toLowerCase().includes('night'));

  // Build leave lookup
  const leaveLookup = new Map<string, Set<string>>();
  leaves.forEach(leave => {
    const empId = leave.employee_id;
    if (!leaveLookup.has(empId)) {
      leaveLookup.set(empId, new Set());
    }
    const leaveStart = new Date(leave.start_date);
    const leaveEnd = new Date(leave.end_date);
    for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
      leaveLookup.get(empId)!.add(d.toISOString().split('T')[0]);
    }
  });

  // Check each employee
  employees.forEach(emp => {
    if (!emp.is_active) return;

    const empAssignments = assignments.filter(a => a.employee_id === emp.id);
    const workAssignments = empAssignments.filter(a => !a.is_weekly_off);

    // Check consecutive days
    const sortedWork = workAssignments.sort((a, b) => a.date.localeCompare(b.date));
    let consecutive = 0;
    let prevDate: Date | null = null;

    sortedWork.forEach(a => {
      const currDate = new Date(a.date);

      if (prevDate) {
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff === 1) {
          consecutive++;
        } else if (dayDiff > 1) {
          consecutive = 1;
        }
      } else {
        consecutive = 1;
      }

      if (consecutive > MAX_CONSECUTIVE_DAYS) {
        errors.push(`${emp.name} has ${consecutive} consecutive working days ending on ${a.date}`);
      }

      prevDate = currDate;
    });

    // Check morning after night
    workAssignments.forEach(a => {
      if (!morningShift || a.shift_id !== morningShift.id) return;

      const date = new Date(a.date);
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      const prevAssignment = workAssignments.find(
        pa => pa.date === prevDateStr && pa.shift_id === nightShift?.id
      );

      if (prevAssignment) {
        errors.push(`${emp.name} has morning shift on ${a.date} after night shift on ${prevDateStr}`);
      }
    });
  });

  // Check shift distribution balance
  const activeEmployees = employees.filter(e => e.is_active);
  activeEmployees.forEach(emp => {
    const empAssignments = assignments.filter(a => a.employee_id === emp.id && !a.is_weekly_off);
    const morningCount = empAssignments.filter(a => a.shift_id === morningShift?.id).length;
    const afternoonCount = empAssignments.filter(a => a.shift_id === afternoonShift?.id).length;
    const nightCount = empAssignments.filter(a => a.shift_id === nightShift?.id).length;

    const total = morningCount + afternoonCount + nightCount;
    if (total > 0) {
      const avg = total / 3;
      const maxDeviation = Math.max(
        Math.abs(morningCount - avg),
        Math.abs(afternoonCount - avg),
        Math.abs(nightCount - avg)
      );

      if (maxDeviation > total * 0.3) {
        warnings.push(`${emp.name} has unbalanced shifts: F3=${morningCount}, S2=${afternoonCount}, T7=${nightCount}`);
      }
    }
  });

  return { is_valid: errors.length === 0, errors, warnings };
}
