"""FastAPI backend for Roster Management System."""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import date, datetime, timedelta
import io
import json
import logging

from database import (
    get_employees, get_employee, create_employee, update_employee, delete_employee,
    get_leaves, get_leaves_by_employee, get_approved_leaves_between,
    create_leave, update_leave, delete_leave,
    get_shifts, get_shift, create_shift, update_shift, delete_shift,
    get_rosters, get_roster, create_roster, update_roster, delete_roster,
    get_roster_assignments, create_roster_assignment, create_roster_assignments_bulk,
    update_roster_assignment, delete_roster_assignments,
    EmployeeCreate, EmployeeUpdate,
    LeaveCreate, LeaveUpdate,
    ShiftCreate, ShiftUpdate,
    RosterCreate, RosterAssignmentCreate,
)
from scheduler import generate_roster
from export_utils import export_to_excel, export_to_csv, export_to_pdf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Roster Management API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Pydantic Models for API ==============

class RosterGenerateRequest(BaseModel):
    name: str
    start_date: date
    end_date: date


class AssignmentUpdate(BaseModel):
    shift_id: Optional[str] = None
    is_weekly_off: Optional[bool] = None
    notes: Optional[str] = None


class BulkAssignmentsUpdate(BaseModel):
    assignments: List[Dict]


class ExportRequest(BaseModel):
    roster_id: str
    format: str  # 'excel', 'csv', 'pdf'


# ============== Health Check ==============

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ============== Employees Endpoints ==============

@app.get("/api/employees")
async def list_employees(active_only: bool = True):
    """Get all employees."""
    try:
        employees = await get_employees(active_only)
        return {"success": True, "data": employees}
    except Exception as e:
        logger.error(f"Error fetching employees: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/employees/{employee_id}")
async def get_single_employee(employee_id: str):
    """Get a single employee by ID."""
    try:
        employee = await get_employee(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        return {"success": True, "data": employee}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/employees")
async def add_employee(employee: EmployeeCreate):
    """Create a new employee."""
    try:
        new_employee = await create_employee(employee)
        return {"success": True, "data": new_employee}
    except Exception as e:
        logger.error(f"Error creating employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/employees/{employee_id}")
async def edit_employee(employee_id: str, employee: EmployeeUpdate):
    """Update an employee."""
    try:
        updated = await update_employee(employee_id, employee)
        if not updated:
            raise HTTPException(status_code=404, detail="Employee not found")
        return {"success": True, "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/employees/{employee_id}")
async def remove_employee(employee_id: str):
    """Delete an employee."""
    try:
        deleted = await delete_employee(employee_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Employee not found")
        return {"success": True, "message": "Employee deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Leaves Endpoints ==============

@app.get("/api/leaves")
async def list_leaves():
    """Get all leave records."""
    try:
        leaves = await get_leaves()
        return {"success": True, "data": leaves}
    except Exception as e:
        logger.error(f"Error fetching leaves: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/leaves/employee/{employee_id}")
async def list_employee_leaves(employee_id: str):
    """Get leaves for a specific employee."""
    try:
        leaves = await get_leaves_by_employee(employee_id)
        return {"success": True, "data": leaves}
    except Exception as e:
        logger.error(f"Error fetching employee leaves: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/leaves")
async def add_leave(leave: LeaveCreate):
    """Create a new leave record."""
    try:
        new_leave = await create_leave(leave)
        return {"success": True, "data": new_leave}
    except Exception as e:
        logger.error(f"Error creating leave: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/leaves/{leave_id}")
async def edit_leave(leave_id: str, leave: LeaveUpdate):
    """Update a leave record."""
    try:
        updated = await update_leave(leave_id, leave)
        if not updated:
            raise HTTPException(status_code=404, detail="Leave not found")
        return {"success": True, "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating leave: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/leaves/{leave_id}")
async def remove_leave(leave_id: str):
    """Delete a leave record."""
    try:
        deleted = await delete_leave(leave_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Leave not found")
        return {"success": True, "message": "Leave deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting leave: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Shifts Endpoints ==============

@app.get("/api/shifts")
async def list_shifts(active_only: bool = True):
    """Get all shifts."""
    try:
        shifts = await get_shifts(active_only)
        return {"success": True, "data": shifts}
    except Exception as e:
        logger.error(f"Error fetching shifts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/shifts/{shift_id}")
async def get_single_shift(shift_id: str):
    """Get a single shift by ID."""
    try:
        shift = await get_shift(shift_id)
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
        return {"success": True, "data": shift}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shift: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/shifts")
async def add_shift(shift: ShiftCreate):
    """Create a new shift."""
    try:
        new_shift = await create_shift(shift)
        return {"success": True, "data": new_shift}
    except Exception as e:
        logger.error(f"Error creating shift: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/shifts/{shift_id}")
async def edit_shift(shift_id: str, shift: ShiftUpdate):
    """Update a shift."""
    try:
        updated = await update_shift(shift_id, shift)
        if not updated:
            raise HTTPException(status_code=404, detail="Shift not found")
        return {"success": True, "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating shift: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/shifts/{shift_id}")
async def remove_shift(shift_id: str):
    """Delete a shift."""
    try:
        deleted = await delete_shift(shift_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Shift not found")
        return {"success": True, "message": "Shift deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shift: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Rosters Endpoints ==============

@app.get("/api/rosters")
async def list_rosters():
    """Get all rosters."""
    try:
        rosters = await get_rosters()
        return {"success": True, "data": rosters}
    except Exception as e:
        logger.error(f"Error fetching rosters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rosters/{roster_id}")
async def get_single_roster(roster_id: str):
    """Get a single roster by ID with its assignments."""
    try:
        roster = await get_roster(roster_id)
        if not roster:
            raise HTTPException(status_code=404, detail="Roster not found")
        assignments = await get_roster_assignments(roster_id)
        return {"success": True, "data": {"roster": roster, "assignments": assignments}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching roster: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rosters/generate")
async def generate_new_roster(request: RosterGenerateRequest):
    """Generate a new roster using OR-Tools scheduler."""
    try:
        # Get active employees
        employees = await get_employees(active_only=True)
        if not employees:
            raise HTTPException(status_code=400, detail="No active employees available")

        # Get active shifts
        shifts = await get_shifts(active_only=True)
        if not shifts:
            raise HTTPException(status_code=400, detail="No active shifts configured")

        # Get approved leaves in the date range
        leaves = await get_approved_leaves_between(request.start_date, request.end_date)

        # Generate roster using OR-Tools
        success, assignments, error, stats = generate_roster(
            employees=employees,
            shifts=shifts,
            start_date=request.start_date,
            end_date=request.end_date,
            leaves=leaves,
        )

        if not success:
            raise HTTPException(status_code=400, detail=error or "Failed to generate roster")

        # Create roster record
        roster_data = RosterCreate(
            name=request.name,
            start_date=request.start_date,
            end_date=request.end_date,
            status="draft"
        )
        new_roster = await create_roster(roster_data)
        roster_id = new_roster["id"]

        # Save assignments to database
        db_assignments = []
        for a in assignments:
            db_assignments.append({
                "roster_id": roster_id,
                "employee_id": a["employee_id"],
                "shift_id": a["shift_id"],
                "date": a["date"],
                "is_weekly_off": a["is_weekly_off"],
            })

        await create_roster_assignments_bulk(db_assignments)

        # Get the saved assignments with joined data
        saved_assignments = await get_roster_assignments(roster_id)

        return {
            "success": True,
            "data": {
                "roster": new_roster,
                "assignments": saved_assignments,
                "statistics": stats,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating roster: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/rosters/{roster_id}/publish")
async def publish_roster(roster_id: str):
    """Publish a draft roster."""
    try:
        updated = await update_roster(roster_id, status="published")
        if not updated:
            raise HTTPException(status_code=404, detail="Roster not found")
        return {"success": True, "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing roster: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/rosters/{roster_id}")
async def remove_roster(roster_id: str):
    """Delete a roster and all its assignments."""
    try:
        deleted = await delete_roster(roster_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Roster not found")
        return {"success": True, "message": "Roster deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting roster: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Roster Assignments Endpoints ==============

@app.get("/api/rosters/{roster_id}/assignments")
async def get_assignments(roster_id: str):
    """Get all assignments for a roster."""
    try:
        assignments = await get_roster_assignments(roster_id)
        return {"success": True, "data": assignments}
    except Exception as e:
        logger.error(f"Error fetching assignments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/assignments/{assignment_id}")
async def edit_assignment(assignment_id: str, update: AssignmentUpdate):
    """Update a single assignment."""
    try:
        updated = await update_roster_assignment(
            assignment_id,
            shift_id=update.shift_id,
            is_weekly_off=update.is_weekly_off,
            notes=update.notes,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {"success": True, "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/rosters/{roster_id}/assignments/bulk")
async def edit_assignments_bulk(roster_id: str, update: BulkAssignmentsUpdate):
    """Update multiple assignments at once."""
    try:
        updated_assignments = []
        for a in update.assignments:
            if "id" in a:
                result = await update_roster_assignment(
                    a["id"],
                    shift_id=a.get("shift_id"),
                    is_weekly_off=a.get("is_weekly_off"),
                    notes=a.get("notes"),
                )
                if result:
                    updated_assignments.append(result)
        return {"success": True, "data": updated_assignments}
    except Exception as e:
        logger.error(f"Error bulk updating assignments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Export Endpoints ==============

from fastapi.responses import StreamingResponse

@app.post("/api/export")
async def export_roster(request: ExportRequest):
    """Export roster to Excel, CSV, or PDF format."""
    try:
        roster = await get_roster(request.roster_id)
        if not roster:
            raise HTTPException(status_code=404, detail="Roster not found")

        assignments = await get_roster_assignments(request.roster_id)
        shifts = await get_shifts(active_only=False)

        if request.format == "excel":
            buffer = export_to_excel(roster, assignments, shifts)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"roster_{roster['start_date']}.xlsx"
        elif request.format == "csv":
            buffer = export_to_csv(roster, assignments, shifts)
            media_type = "text/csv"
            filename = f"roster_{roster['start_date']}.csv"
        elif request.format == "pdf":
            buffer = export_to_pdf(roster, assignments, shifts)
            media_type = "application/pdf"
            filename = f"roster_{roster['start_date']}.pdf"
        else:
            raise HTTPException(status_code=400, detail="Invalid export format")

        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting roster: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Validation Endpoint ==============

@app.post("/api/rosters/{roster_id}/validate")
async def validate_roster_assignments(roster_id: str):
    """Validate roster assignments for constraint violations."""
    try:
        roster = await get_roster(roster_id)
        if not roster:
            raise HTTPException(status_code=404, detail="Roster not found")

        assignments = await get_roster_assignments(roster_id)
        employees = await get_employees(active_only=False)
        shifts = await get_shifts(active_only=False)

        errors = []
        warnings = []

        # Build lookups
        emp_lookup = {e["id"]: e for e in employees}
        shift_lookup = {s["id"]: s for s in shifts}

        # Get leaves for period
        leaves = await get_approved_leaves_between(
            date.fromisoformat(roster["start_date"]),
            date.fromisoformat(roster["end_date"])
        )

        # Build leave lookup
        leave_lookup = {}
        for leave in leaves:
            emp_id = leave["employee_id"]
            if emp_id not in leave_lookup:
                leave_lookup[emp_id] = []
            leave_lookup[emp_id].append(leave)

        def is_on_leave(emp_id, check_date):
            if emp_id not in leave_lookup:
                return False
            for leave in leave_lookup[emp_id]:
                start = date.fromisoformat(leave["start_date"])
                end = date.fromisoformat(leave["end_date"])
                if start <= check_date <= end:
                    return True
            return False

        # Build assignment matrix
        emp_day_assign = {}  # emp_id -> date -> assignment
        for a in assignments:
            emp_id = a["employee_id"]
            d = a["date"]
            if emp_id not in emp_day_assign:
                emp_day_assign[emp_id] = {}
            emp_day_assign[emp_id][d] = a

        # Get shift types
        morning_ids = [s["id"] for s in shifts if "morning" in s["name"].lower()]
        night_ids = [s["id"] for s in shifts if "night" in s["name"].lower()]

        # Validate each assignment
        for a in assignments:
            emp_id = a["employee_id"]
            emp_name = emp_lookup.get(emp_id, {}).get("name", emp_id)
            d = date.fromisoformat(a["date"])

            # Check leave conflict
            if not a["is_weekly_off"] and a["shift_id"]:
                if is_on_leave(emp_id, d):
                    errors.append(f"{emp_name} is scheduled on {d} but is on leave")

            # Check morning after night
            if a["shift_id"] in morning_ids and d > date.fromisoformat(roster["start_date"]):
                prev_date = (d - timedelta(days=1)).isoformat()
                if emp_id in emp_day_assign and prev_date in emp_day_assign[emp_id]:
                    prev_assign = emp_day_assign[emp_id][prev_date]
                    if prev_assign["shift_id"] in night_ids:
                        errors.append(
                            f"{emp_name} has morning shift on {d} after night shift"
                        )

        # Check minimum coverage per shift per day
        shift_day_assign = {}  # shift_id -> date -> count
        for a in assignments:
            if a["shift_id"]:
                shift_id = a["shift_id"]
                d = a["date"]
                if shift_id not in shift_day_assign:
                    shift_day_assign[shift_id] = {}
                shift_day_assign[shift_id][d] = shift_day_assign[shift_id].get(d, 0) + 1

        for date_str in emp_day_assign.get(list(emp_day_assign.keys())[0], {}):
            for s_id, shift in shift_lookup.items():
                min_emp = shift.get("min_employees", 3)
                assign_count = shift_day_assign.get(s_id, {}).get(date_str, 0)
                if assign_count < min_emp:
                    errors.append(
                        f"{shift['name']} on {date_str} has {assign_count} employees, "
                        f"needs at least {min_emp}"
                    )

        # Check consecutive working days
        for emp_id in emp_day_assign:
            emp_name = emp_lookup.get(emp_id, {}).get("name", emp_id)
            dates_sorted = sorted(emp_day_assign[emp_id].keys())
            consecutive = 0
            prev_date = None
            for d_str in dates_sorted:
                d = date.fromisoformat(d_str)
                a = emp_day_assign[emp_id][d_str]
                if prev_date and d == prev_date + timedelta(days=1):
                    if not a["is_weekly_off"]:
                        consecutive += 1
                    else:
                        consecutive = 0
                else:
                    consecutive = 0 if a["is_weekly_off"] else 1

                if consecutive > 6:
                    errors.append(
                        f"{emp_name} has {consecutive} consecutive working days ending on {d}"
                    )
                prev_date = d

        return {
            "success": True,
            "data": {
                "is_valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating roster: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Statistics Endpoint ==============

@app.get("/api/rosters/{roster_id}/statistics")
async def get_roster_statistics(roster_id: str):
    """Get statistics for a roster."""
    try:
        roster = await get_roster(roster_id)
        if not roster:
            raise HTTPException(status_code=404, detail="Roster not found")

        assignments = await get_roster_assignments(roster_id)
        employees = await get_employees(active_only=False)
        shifts = await get_shifts(active_only=False)

        emp_lookup = {e["id"]: e for e in employees}
        shift_lookup = {s["id"]: s for s in shifts}

        stats = {
            "total_assignments": len([a for a in assignments if not a["is_weekly_off"]]),
            "total_weekly_offs": len([a for a in assignments if a["is_weekly_off"]]),
            "by_employee": {},
            "by_shift": {},
        }

        # Per employee stats
        for emp_id in emp_lookup:
            emp_assigns = [a for a in assignments if a["employee_id"] == emp_id]
            stats["by_employee"][emp_id] = {
                "name": emp_lookup[emp_id]["name"],
                "total_shifts": len([a for a in emp_assigns if not a["is_weekly_off"]]),
                "weekly_offs": len([a for a in emp_assigns if a["is_weekly_off"]]),
                "by_shift": {},
            }
            for s_id, shift in shift_lookup.items():
                count = len([a for a in emp_assigns if a["shift_id"] == s_id])
                stats["by_employee"][emp_id]["by_shift"][s_id] = {
                    "name": shift["name"],
                    "count": count,
                }

        # Per shift stats
        for s_id, shift in shift_lookup.items():
            shift_assigns = [a for a in assignments if a["shift_id"] == s_id]
            stats["by_shift"][s_id] = {
                "name": shift["name"],
                "total": len(shift_assigns),
            }

        return {"success": True, "data": stats}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
