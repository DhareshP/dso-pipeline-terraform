"""Supabase database client and operations."""
from typing import Optional
from datetime import date, datetime
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from pydantic import BaseModel

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# Pydantic models for type validation
class EmployeeCreate(BaseModel):
    name: str
    employee_code: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: bool = True


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    employee_code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class LeaveCreate(BaseModel):
    employee_id: str
    start_date: date
    end_date: date
    reason: Optional[str] = None
    status: str = "approved"


class LeaveUpdate(BaseModel):
    employee_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None
    status: Optional[str] = None


class ShiftCreate(BaseModel):
    name: str
    start_time: str
    end_time: str
    min_employees: int = 3
    max_employees: int = 10
    display_order: int = 0
    is_active: bool = True


class ShiftUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    min_employees: Optional[int] = None
    max_employees: Optional[int] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class RosterCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    status: str = "draft"


class RosterAssignmentCreate(BaseModel):
    roster_id: str
    employee_id: str
    shift_id: Optional[str] = None
    date: date
    is_weekly_off: bool = False
    notes: Optional[str] = None


# Database operations
async def get_employees(active_only: bool = True):
    """Get all employees."""
    query = supabase.table("employees").select("*")
    if active_only:
        query = query.eq("is_active", True)
    response = query.order("name").execute()
    return response.data


async def get_employee(employee_id: str):
    """Get a single employee by ID."""
    response = supabase.table("employees").select("*").eq("id", employee_id).maybe_single().execute()
    return response.data


async def create_employee(employee: EmployeeCreate):
    """Create a new employee."""
    response = supabase.table("employees").insert(employee.model_dump()).execute()
    return response.data[0] if response.data else None


async def update_employee(employee_id: str, employee: EmployeeUpdate):
    """Update an employee."""
    data = {k: v for k, v in employee.model_dump().items() if v is not None}
    response = supabase.table("employees").update(data).eq("id", employee_id).execute()
    return response.data[0] if response.data else None


async def delete_employee(employee_id: str):
    """Delete an employee."""
    response = supabase.table("employees").delete().eq("id", employee_id).execute()
    return response.data[0] if response.data else None


async def get_leaves():
    """Get all leave records with employee details."""
    response = supabase.table("leaves").select(
        "*, employees(id, name, employee_code)"
    ).order("start_date", desc=True).execute()
    return response.data


async def get_leaves_by_employee(employee_id: str):
    """Get leave records for a specific employee."""
    response = supabase.table("leaves").select("*").eq("employee_id", employee_id).order("start_date").execute()
    return response.data


async def get_approved_leaves_between(start_date: date, end_date: date):
    """Get all approved leaves within a date range."""
    response = supabase.table("leaves").select(
        "employee_id, start_date, end_date"
    ).eq("status", "approved").execute()

    # Filter leaves that overlap with the given date range
    overlapping = []
    for leave in response.data:
        leave_start = date.fromisoformat(leave["start_date"])
        leave_end = date.fromisoformat(leave["end_date"])
        if leave_start <= end_date and leave_end >= start_date:
            overlapping.append(leave)
    return overlapping


async def create_leave(leave: LeaveCreate):
    """Create a new leave record."""
    response = supabase.table("leaves").insert(leave.model_dump()).execute()
    return response.data[0] if response.data else None


async def update_leave(leave_id: str, leave: LeaveUpdate):
    """Update a leave record."""
    data = {k: v for k, v in leave.model_dump().items() if v is not None}
    response = supabase.table("leaves").update(data).eq("id", leave_id).execute()
    return response.data[0] if response.data else None


async def delete_leave(leave_id: str):
    """Delete a leave record."""
    response = supabase.table("leaves").delete().eq("id", leave_id).execute()
    return response.data[0] if response.data else None


async def get_shifts(active_only: bool = True):
    """Get all shifts."""
    query = supabase.table("shifts").select("*")
    if active_only:
        query = query.eq("is_active", True)
    response = query.order("display_order").execute()
    return response.data


async def get_shift(shift_id: str):
    """Get a single shift by ID."""
    response = supabase.table("shifts").select("*").eq("id", shift_id).maybe_single().execute()
    return response.data


async def create_shift(shift: ShiftCreate):
    """Create a new shift."""
    response = supabase.table("shifts").insert(shift.model_dump()).execute()
    return response.data[0] if response.data else None


async def update_shift(shift_id: str, shift: ShiftUpdate):
    """Update a shift."""
    data = {k: v for k, v in shift.model_dump().items() if v is not None}
    response = supabase.table("shifts").update(data).eq("id", shift_id).execute()
    return response.data[0] if response.data else None


async def delete_shift(shift_id: str):
    """Delete a shift."""
    response = supabase.table("shifts").delete().eq("id", shift_id).execute()
    return response.data[0] if response.data else None


async def get_rosters():
    """Get all rosters."""
    response = supabase.table("rosters").select("*").order("created_at", desc=True).execute()
    return response.data


async def get_roster(roster_id: str):
    """Get a single roster by ID."""
    response = supabase.table("rosters").select("*").eq("id", roster_id).maybe_single().execute()
    return response.data


async def create_roster(roster: RosterCreate):
    """Create a new roster."""
    response = supabase.table("rosters").insert(roster.model_dump()).execute()
    return response.data[0] if response.data else None


async def update_roster(roster_id: str, status: str = None, name: str = None):
    """Update a roster."""
    data = {}
    if status:
        data["status"] = status
    if name:
        data["name"] = name
    if data:
        response = supabase.table("rosters").update(data).eq("id", roster_id).execute()
        return response.data[0] if response.data else None
    return None


async def delete_roster(roster_id: str):
    """Delete a roster and all its assignments."""
    # First delete all assignments
    await delete_roster_assignments(roster_id)
    # Then delete the roster
    response = supabase.table("rosters").delete().eq("id", roster_id).execute()
    return response.data[0] if response.data else None


async def get_roster_assignments(roster_id: str):
    """Get all assignments for a roster with employee and shift details."""
    response = supabase.table("roster_assignments").select(
        "*, employees(id, name, employee_code), shifts(id, name, start_time, end_time)"
    ).eq("roster_id", roster_id).order("date").execute()
    return response.data


async def create_roster_assignment(assignment: RosterAssignmentCreate):
    """Create a new roster assignment."""
    response = supabase.table("roster_assignments").insert(assignment.model_dump()).execute()
    return response.data[0] if response.data else None


async def create_roster_assignments_bulk(assignments: list):
    """Create multiple roster assignments."""
    if not assignments:
        return []
    response = supabase.table("roster_assignments").insert(assignments).execute()
    return response.data


async def update_roster_assignment(assignment_id: str, shift_id: str = None, is_weekly_off: bool = None, notes: str = None):
    """Update a roster assignment."""
    data = {}
    if shift_id is not None:
        data["shift_id"] = shift_id
    if is_weekly_off is not None:
        data["is_weekly_off"] = is_weekly_off
    if notes is not None:
        data["notes"] = notes
    if data:
        response = supabase.table("roster_assignments").update(data).eq("id", assignment_id).execute()
        return response.data[0] if response.data else None
    return None


async def delete_roster_assignments(roster_id: str):
    """Delete all assignments for a roster."""
    response = supabase.table("roster_assignments").delete().eq("roster_id", roster_id).execute()
    return response.data


async def delete_roster_assignment(assignment_id: str):
    """Delete a single roster assignment."""
    response = supabase.table("roster_assignments").delete().eq("id", assignment_id).execute()
    return response.data[0] if response.data else None
