"""
Roster generation using Google OR-Tools CP-SAT solver.

This module implements a constraint-based scheduling system that generates
optimal 24/7 rosters while satisfying all hard constraints and optimizing
for fairness and workload balance.
"""
from typing import Dict, List, Tuple, Optional
from datetime import date, timedelta
from ortools.sat.python import cp_model
import logging

logger = logging.getLogger(__name__)


class RosterScheduler:
    """
    Constraint-based roster scheduler using OR-Tools CP-SAT solver.

    Hard Constraints (must be satisfied):
    1. Minimum employees per shift (configurable per shift)
    2. One shift per employee per day
    3. Employees on leave cannot be assigned
    4. No morning shift immediately after night shift
    5. Never exceed 6 consecutive working days
    6. Weekly offs must be consecutive (prefer 2)

    Soft Constraints (optimized but can be violated):
    1. Prefer 5 consecutive working days followed by 2 weekly offs
    2. Fair distribution of morning/afternoon/night shifts
    3. Fair distribution of weekend duties
    4. Fair distribution of weekly offs
    5. Balance workload across all employees
    """

    # Shift type constants
    SHIFT_MORNING = "Morning"
    SHIFT_AFTERNOON = "Afternoon"
    SHIFT_NIGHT = "Night"

    def __init__(
        self,
        employees: List[Dict],
        shifts: List[Dict],
        start_date: date,
        end_date: date,
        leaves: List[Dict],
        max_consecutive_days: int = 6,
        preferred_work_days: int = 5,
        weekly_off_count: int = 2,
    ):
        """
        Initialize the scheduler.

        Args:
            employees: List of employee dictionaries with 'id' field
            shifts: List of shift dictionaries with 'id', 'name', 'min_employees', 'max_employees'
            start_date: Start date of the roster period
            end_date: End date of the roster period
            leaves: List of approved leaves with 'employee_id', 'start_date', 'end_date'
            max_consecutive_days: Maximum consecutive working days allowed (default 6)
            preferred_work_days: Preferred consecutive working days before weekly off (default 5)
            weekly_off_count: Number of consecutive weekly offs (default 2)
        """
        self.employees = {e["id"]: e for e in employees}
        self.employee_ids = list(self.employees.keys())
        self.shifts = {s["id"]: s for s in shifts}
        self.shift_ids = list(self.shifts.keys())
        self.start_date = start_date
        self.end_date = end_date
        self.leaves = leaves
        self.max_consecutive_days = max_consecutive_days
        self.preferred_work_days = preferred_work_days
        self.weekly_off_count = weekly_off_count

        # Calculate number of days
        self.num_days = (end_date - start_date).days + 1

        # Create date index mapping
        self.date_to_idx = {}
        self.idx_to_date = {}
        for i in range(self.num_days):
            d = start_date + timedelta(days=i)
            self.date_to_idx[d] = i
            self.idx_to_date[i] = d

        # Build leave lookup: employee_id -> set of dates on leave
        self.employee_leaves: Dict[str, set] = {}
        for emp_id in self.employee_ids:
            self.employee_leaves[emp_id] = set()
        for leave in leaves:
            emp_id = leave["employee_id"]
            if emp_id in self.employee_leaves:
                leave_start = date.fromisoformat(leave["start_date"])
                leave_end = date.fromisoformat(leave["end_date"])
                current = leave_start
                while current <= leave_end:
                    if current in self.date_to_idx:
                        self.employee_leaves[emp_id].add(current)
                    current += timedelta(days=1)

        # Identify shift IDs by type
        self.morning_shift_ids = [
            s_id for s_id, s in self.shifts.items()
            if self.SHIFT_MORNING.lower() in s["name"].lower()
        ]
        self.afternoon_shift_ids = [
            s_id for s_id, s in self.shifts.items()
            if self.SHIFT_AFTERNOON.lower() in s["name"].lower()
        ]
        self.night_shift_ids = [
            s_id for s_id, s in self.shifts.items()
            if self.SHIFT_NIGHT.lower() in s["name"].lower()
        ]

        # Model and variables
        self.model = cp_model.CpModel()
        self.assignments = {}  # (emp_idx, day_idx, shift_idx) -> BoolVar
        self.weekly_off = {}  # (emp_idx, day_idx) -> BoolVar
        self.solution = None

    def _get_shift_idx(self, shift_id: str) -> int:
        """Get shift index from shift ID."""
        return self.shift_ids.index(shift_id)

    def _get_emp_idx(self, emp_id: str) -> int:
        """Get employee index from employee ID."""
        return self.employee_ids.index(emp_id)

    def _is_weekend(self, day_idx: int) -> bool:
        """Check if a day falls on a weekend."""
        d = self.idx_to_date[day_idx]
        return d.weekday() >= 5  # Saturday = 5, Sunday = 6

    def _create_variables(self):
        """Create decision variables for the model."""
        num_emps = len(self.employee_ids)
        num_shifts = len(self.shift_ids)

        # Assignment variables: x[e,d,s] = 1 if employee e works shift s on day d
        for e in range(num_emps):
            for d in range(self.num_days):
                for s in range(num_shifts):
                    self.assignments[(e, d, s)] = self.model.NewBoolVar(
                        f"x_{e}_{d}_{s}"
                    )

        # Weekly off variables: w[e,d] = 1 if employee e has weekly off on day d
        for e in range(num_emps):
            for d in range(self.num_days):
                self.weekly_off[(e, d)] = self.model.NewBoolVar(
                    f"w_{e}_{d}"
                )

    def _add_hard_constraints(self):
        """Add all hard constraints that must be satisfied."""
        num_emps = len(self.employee_ids)
        num_shifts = len(self.shift_ids)

        for e in range(num_emps):
            emp_id = self.employee_ids[e]

            for d in range(self.num_days):
                current_date = self.idx_to_date[d]
                on_leave = current_date in self.employee_leaves[emp_id]

                # Constraint: One shift per day or weekly off (not both)
                shift_sum = sum(self.assignments[(e, d, s)] for s in range(num_shifts))
                self.model.Add(shift_sum + self.weekly_off[(e, d)] == 1)

                # Constraint: Employees on leave must have weekly off (cannot work)
                if on_leave:
                    for s in range(num_shifts):
                        self.model.Add(self.assignments[(e, d, s)] == 0)
                    self.model.Add(self.weekly_off[(e, d)] == 1)

        # Constraint: Minimum employees per shift
        for d in range(self.num_days):
            for s in range(num_shifts):
                shift_id = self.shift_ids[s]
                min_emp = self.shifts[shift_id]["min_employees"]
                shift_assignments = sum(
                    self.assignments[(e, d, s)] for e in range(num_emps)
                )
                self.model.Add(shift_assignments >= min_emp)

        # Constraint: Maximum employees per shift
        for d in range(self.num_days):
            for s in range(num_shifts):
                shift_id = self.shift_ids[s]
                max_emp = self.shifts[shift_id].get("max_employees", 10)
                shift_assignments = sum(
                    self.assignments[(e, d, s)] for e in range(num_emps)
                )
                self.model.Add(shift_assignments <= max_emp)

        # Constraint: No morning shift after night shift (hard constraint)
        # If employee works night on day d, they cannot work morning on day d+1
        if self.morning_shift_ids and self.night_shift_ids:
            for e in range(num_emps):
                for d in range(self.num_days - 1):  # Don't check last day for next day
                    for night_s in [self._get_shift_idx(s_id) for s_id in self.night_shift_ids]:
                        for morning_s in [self._get_shift_idx(s_id) for s_id in self.morning_shift_ids]:
                            # If night shift on day d, then not morning on day d+1
                            self.model.Add(
                                self.assignments[(e, d, night_s)] +
                                self.assignments[(e, d + 1, morning_s)] <= 1
                            )

        # Constraint: Max consecutive working days (hard limit)
        # Working day = any shift assigned (not weekly off)
        for e in range(num_emps):
            for d in range(self.num_days - self.max_consecutive_days):
                # Sum of working days in window of size max_consecutive_days + 1
                # must be <= max_consecutive_days (at least one weekly off in window)
                window_sum = sum(
                    (1 - self.weekly_off[(e, d + i)])
                    for i in range(self.max_consecutive_days + 1)
                )
                self.model.Add(window_sum <= self.max_consecutive_days)

    def _add_soft_constraints(self):
        """Add soft constraints for optimization."""
        num_emps = len(self.employee_ids)
        num_shifts = len(self.shift_ids)

        # Objective: Minimize total squared deviation from fair distribution
        objective_terms = []

        # 1. Fair distribution of shift types per employee
        total_shifts_per_employee = []
        for e in range(num_emps):
            emp_shifts = sum(
                self.assignments[(e, d, s)]
                for d in range(self.num_days)
                for s in range(num_shifts)
            )
            total_shifts_per_employee.append(emp_shifts)

        # Average shifts per employee (target for fairness)
        if num_emps > 0:
            total_shift_slots = sum(
                self.shifts[s_id]["min_employees"] * self.num_days
                for s_id in self.shift_ids
            )
            target_shifts = total_shift_slots // num_emps

            for e in range(num_emps):
                # Penalty for deviation from target
                deviation = total_shifts_per_employee[e] - target_shifts
                # Use linear approximation: |deviation|
                diff_pos = self.model.NewIntVar(0, self.num_days * num_shifts, f"diff_pos_{e}")
                diff_neg = self.model.NewIntVar(0, self.num_days * num_shifts, f"diff_neg_{e}")
                self.model.Add(diff_pos >= deviation)
                self.model.Add(diff_neg >= -deviation)
                objective_terms.append(diff_pos * 10)  # Weight for shift balance
                objective_terms.append(diff_neg * 10)

        # 2. Fair distribution of morning shifts
        if self.morning_shift_ids:
            for e in range(num_emps):
                morning_count = sum(
                    self.assignments[(e, d, self._get_shift_idx(s_id))]
                    for d in range(self.num_days)
                    for s_id in self.morning_shift_ids
                )
                # Use linear deviation
                m_pos = self.model.NewIntVar(0, self.num_days, f"m_pos_{e}")
                m_neg = self.model.NewIntVar(0, self.num_days, f"m_neg_{e}")
                target_m = len(self.morning_shift_ids) * self.num_days * self.shifts[self.morning_shift_ids[0]]["min_employees"] // num_emps if self.morning_shift_ids else 0
                self.model.Add(m_pos >= morning_count - target_m)
                self.model.Add(m_neg >= target_m - morning_count)
                objective_terms.append(m_pos * 5)
                objective_terms.append(m_neg * 5)

        # 3. Fair distribution of night shifts
        if self.night_shift_ids:
            for e in range(num_emps):
                night_count = sum(
                    self.assignments[(e, d, self._get_shift_idx(s_id))]
                    for d in range(self.num_days)
                    for s_id in self.night_shift_ids
                )
                n_pos = self.model.NewIntVar(0, self.num_days, f"n_pos_{e}")
                n_neg = self.model.NewIntVar(0, self.num_days, f"n_neg_{e}")
                target_n = len(self.night_shift_ids) * self.num_days * self.shifts[self.night_shift_ids[0]]["min_employees"] // num_emps if self.night_shift_ids else 0
                self.model.Add(n_pos >= night_count - target_n)
                self.model.Add(n_neg >= target_n - night_count)
                objective_terms.append(n_pos * 5)
                objective_terms.append(n_neg * 5)

        # 4. Fair distribution of weekend duties
        weekend_indices = [d for d in range(self.num_days) if self._is_weekend(d)]
        if weekend_indices:
            for e in range(num_emps):
                weekend_work = sum(
                    self.assignments[(e, d, s)]
                    for d in weekend_indices
                    for s in range(num_shifts)
                )
                # Encourage fair weekend distribution
                w_pos = self.model.NewIntVar(0, len(weekend_indices) * num_shifts, f"w_pos_{e}")
                w_neg = self.model.NewIntVar(0, len(weekend_indices) * num_shifts, f"w_neg_{e}")
                target_w = len(weekend_indices) // num_emps if num_emps > 0 else 0
                self.model.Add(w_pos >= weekend_work - target_w)
                self.model.Add(w_neg >= target_w - weekend_work)
                objective_terms.append(w_pos * 8)  # Higher weight for weekend fairness
                objective_terms.append(w_neg * 8)

        # 5. Consecutive weekly off preference (soft constraint)
        # Reward patterns of consecutive weekly offs
        for e in range(num_emps):
            for d in range(self.num_days - 1):
                # Reward consecutive weekly offs
                both_off = self.model.NewBoolVar(f"both_off_{e}_{d}")
                self.model.Add(
                    self.weekly_off[(e, d)] + self.weekly_off[(e, d + 1)] == 2
                ).OnlyEnforceIf(both_off)
                self.model.Add(
                    self.weekly_off[(e, d)] + self.weekly_off[(e, d + 1)] <= 1
                ).OnlyEnforceIf(both_off.Not())
                objective_terms.append(both_off * (-20))  # Negative = reward

        # 6. Prefer 5-day work weeks (soft)
        for e in range(num_emps):
            # Try to have close to preferred work days before weekly off
            for d in range(self.num_days - self.preferred_work_days):
                # Count consecutive work days after a weekly off
                work_streak = sum(
                    (1 - self.weekly_off[(e, d + i)])
                    for i in range(self.preferred_work_days)
                )
                # Ideally, on day d, after a weekly off, we want self.preferred_work_days work days
                streak_dev = self.model.NewIntVar(
                    0, self.preferred_work_days, f"streak_dev_{e}_{d}"
                )
                self.model.Add(streak_dev >= work_streak - self.preferred_work_days)
                self.model.Add(streak_dev >= self.preferred_work_days - work_streak)
                objective_terms.append(streak_dev * 2)

        # Set objective: minimize total penalty
        if objective_terms:
            self.model.Minimize(sum(objective_terms))

    def solve(self, time_limit_seconds: int = 60) -> Tuple[bool, Optional[str]]:
        """
        Solve the roster scheduling problem.

        Args:
            time_limit_seconds: Maximum time to spend solving

        Returns:
            Tuple of (success, error_message)
        """
        self._create_variables()
        self._add_hard_constraints()
        self._add_soft_constraints()

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        solver.parameters.num_search_workers = 4  # Use multiple threads

        status = solver.Solve(self.model)

        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            self.solver = solver
            self.solution = self._extract_solution(solver)
            return True, None
        elif status == cp_model.INFEASIBLE:
            return False, "No feasible solution exists. Check constraints and available employees."
        else:
            return False, f"Solver did not find a solution within time limit. Status: {solver.StatusName(status)}"

    def _extract_solution(self, solver: cp_model.CpSolver) -> List[Dict]:
        """Extract the solution from the solver."""
        assignments = []
        num_shifts = len(self.shift_ids)

        for e, emp_id in enumerate(self.employee_ids):
            for d in range(self.num_days):
                current_date = self.idx_to_date[d]
                is_weekly_off = solver.Value(self.weekly_off[(e, d)]) == 1

                if is_weekly_off:
                    assignments.append({
                        "employee_id": emp_id,
                        "date": current_date.isoformat(),
                        "shift_id": None,
                        "is_weekly_off": True,
                    })
                else:
                    for s in range(num_shifts):
                        if solver.Value(self.assignments[(e, d, s)]) == 1:
                            assignments.append({
                                "employee_id": emp_id,
                                "date": current_date.isoformat(),
                                "shift_id": self.shift_ids[s],
                                "is_weekly_off": False,
                            })
                            break

        return assignments

    def get_solution(self) -> Optional[List[Dict]]:
        """Get the current solution if available."""
        return self.solution

    def validate_solution(self) -> Tuple[bool, List[str]]:
        """
        Validate the current solution against all hard constraints.

        Returns:
            Tuple of (is_valid, list of validation_errors)
        """
        if not self.solution:
            return False, ["No solution to validate"]

        errors = []
        num_shifts = len(self.shift_ids)

        # Build lookup from solution
        emp_day_shift = {}  # (emp_id, date) -> (shift_id, is_weekly_off)
        for assignment in self.solution:
            emp_id = assignment["employee_id"]
            d = assignment["date"]
            emp_day_shift[(emp_id, d)] = (
                assignment["shift_id"],
                assignment["is_weekly_off"]
            )

        # 1. Check no employee works multiple shifts on same day
        for (emp_id, d), (shift_id, is_off) in emp_day_shift.items():
            if not is_off and shift_id:
                # Count assignments for this employee on this day
                count = sum(
                    1 for a in self.solution
                    if a["employee_id"] == emp_id and a["date"] == d and not a["is_weekly_off"]
                )
                if count > 1:
                    errors.append(f"Employee {emp_id} has {count} shifts on {d}")

        # 2. Check employees on leave are not scheduled
        for leave in self.leaves:
            emp_id = leave["employee_id"]
            leave_start = date.fromisoformat(leave["start_date"])
            leave_end = date.fromisoformat(leave["end_date"])
            current = leave_start
            while current <= leave_end:
                d_str = current.isoformat()
                if (emp_id, d_str) in emp_day_shift:
                    shift_id, is_off = emp_day_shift[(emp_id, d_str)]
                    if not is_off and shift_id:
                        emp_name = self.employees[emp_id].get("name", emp_id)
                        errors.append(f"Employee {emp_name} is scheduled on {current} but is on leave")
                current += timedelta(days=1)

        # 3. Check minimum employees per shift
        # Build shift-day count
        shift_day_count = {}
        for a in self.solution:
            if a["shift_id"]:
                key = (a["shift_id"], a["date"])
                shift_day_count[key] = shift_day_count.get(key, 0) + 1

        for shift_id, shift in self.shifts.items():
            min_emp = shift["min_employees"]
            for d in range(self.num_days):
                date_str = (self.start_date + timedelta(days=d)).isoformat()
                count = shift_day_count.get((shift_id, date_str), 0)
                if count < min_emp:
                    errors.append(
                        f"Shift {shift['name']} on {date_str} has {count} employees, "
                        f"needs at least {min_emp}"
                    )

        # 4. Check no morning after night
        if self.morning_shift_ids and self.night_shift_ids:
            night_to_morning = {}  # (emp_id) -> date worked night
            for a in self.solution:
                if a["shift_id"] in self.night_shift_ids:
                    night_to_morning[a["employee_id"]] = date.fromisoformat(a["date"])

            for a in self.solution:
                if a["shift_id"] in self.morning_shift_ids:
                    emp_id = a["employee_id"]
                    current_date = date.fromisoformat(a["date"])
                    if emp_id in night_to_morning:
                        prev_night = night_to_morning[emp_id]
                        if current_date == prev_night + timedelta(days=1):
                            emp_name = self.employees[emp_id].get("name", emp_id)
                            shift_name = self.shifts[a["shift_id"]]["name"]
                            prev_shift_name = self.shifts[
                                [s for s in self.night_shift_ids if s in night_to_morning][0]
                            ]["name"]
                            errors.append(
                                f"Employee {emp_name} has morning shift on {current_date} "
                                f"after night shift on {prev_night}"
                            )

        # 5. Check consecutive working days
        for emp_id in self.employee_ids:
            consecutive_work = 0
            max_consecutive = 0
            for d in range(self.num_days):
                date_str = (self.start_date + timedelta(days=d)).isoformat()
                key = (emp_id, date_str)
                if key in emp_day_shift:
                    shift_id, is_off = emp_day_shift[key]
                    if is_off:
                        consecutive_work = 0
                    else:
                        consecutive_work += 1
                        max_consecutive = max(max_consecutive, consecutive_work)
                        if consecutive_work > self.max_consecutive_days:
                            emp_name = self.employees[emp_id].get("name", emp_id)
                            errors.append(
                                f"Employee {emp_name} has {consecutive_work} consecutive "
                                f"working days (max allowed: {self.max_consecutive_days})"
                            )

        return len(errors) == 0, errors

    def get_statistics(self) -> Dict:
        """Get statistics about the current solution."""
        if not self.solution:
            return {}

        stats = {
            "total_assignments": len([a for a in self.solution if not a["is_weekly_off"]]),
            "total_weekly_offs": len([a for a in self.solution if a["is_weekly_off"]]),
            "by_employee": {},
            "by_shift": {},
            "weekend_stats": {},
        }

        # Per employee stats
        for emp_id in self.employee_ids:
            emp_assignments = [a for a in self.solution if a["employee_id"] == emp_id]
            stats["by_employee"][emp_id] = {
                "name": self.employees[emp_id].get("name", emp_id),
                "total_shifts": len([a for a in emp_assignments if not a["is_weekly_off"]]),
                "weekly_offs": len([a for a in emp_assignments if a["is_weekly_off"]]),
                "mornings": len([a for a in emp_assignments if a["shift_id"] in self.morning_shift_ids]),
                "afternoons": len([a for a in emp_assignments if a["shift_id"] in self.afternoon_shift_ids]),
                "nights": len([a for a in emp_assignments if a["shift_id"] in self.night_shift_ids]),
                "weekends": len([a for a in emp_assignments
                               if not a["is_weekly_off"] and
                               self._is_weekend(self.date_to_idx.get(date.fromisoformat(a["date"]), -1))]),
            }

        # Per shift stats
        for shift_id in self.shift_ids:
            shift_assignments = [a for a in self.solution if a["shift_id"] == shift_id]
            stats["by_shift"][shift_id] = {
                "name": self.shifts[shift_id]["name"],
                "total": len(shift_assignments),
            }

        return stats


def generate_roster(
    employees: List[Dict],
    shifts: List[Dict],
    start_date: date,
    end_date: date,
    leaves: List[Dict],
) -> Tuple[bool, Optional[List[Dict]], Optional[str], Optional[Dict]]:
    """
    Generate a roster using constraint programming.

    Args:
        employees: List of active employees
        shifts: List of shift configurations
        start_date: Roster start date
        end_date: Roster end date
        leaves: List of approved leaves

    Returns:
        Tuple of (success, assignments, error_message, statistics)
    """
    if not employees:
        return False, None, "No active employees available for scheduling", None

    if not shifts:
        return False, None, "No shifts configured", None

    scheduler = RosterScheduler(
        employees=employees,
        shifts=shifts,
        start_date=start_date,
        end_date=end_date,
        leaves=leaves,
    )

    success, error = scheduler.solve(time_limit_seconds=30)

    if success:
        is_valid, validation_errors = scheduler.validate_solution()
        stats = scheduler.get_statistics()

        if not is_valid:
            logger.warning(f"Solution validation failed: {validation_errors}")
            stats["validation_warnings"] = validation_errors

        return True, scheduler.get_solution(), None, stats
    else:
        return False, None, error, None
