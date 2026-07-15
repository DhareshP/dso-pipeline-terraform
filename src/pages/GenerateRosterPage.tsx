import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FileText,
  File,
} from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Input,
  LoadingSpinner,
  Badge,
} from '../components/UI';
import {
  getEmployees,
  getShifts,
  getApprovedLeavesBetween,
  createRoster,
  createRosterAssignments,
  updateRoster,
  Employee,
  Shift,
  Leave,
  Roster,
  RosterAssignment,
} from '../utils/supabase';
import { generateRoster, validateRoster, getShiftCode, getShiftStyle, SHIFT_CODES, Assignment } from '../utils/scheduler';

interface RosterWithAssignments {
  roster: Roster;
  assignments: RosterAssignment[];
  statistics: Record<string, unknown>;
}

export function GenerateRosterPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [formData, setFormData] = useState({
    name: `Roster - ${new Date().toLocaleDateString()}`,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [generatedRoster, setGeneratedRoster] = useState<RosterWithAssignments | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [shiftsData, employeesData] = await Promise.all([
        getShifts(true),
        getEmployees(true),
      ]);
      setShifts(shiftsData);
      setEmployees(employeesData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      setError(null);
      setGeneratedRoster(null);
      setValidationErrors([]);

      // Get leaves for the period
      const leaves = await getApprovedLeavesBetween(formData.start_date, formData.end_date);

      // Generate roster using client-side scheduler
      const result = generateRoster(
        employees,
        shifts,
        formData.start_date,
        formData.end_date,
        leaves
      );

      // Validate the roster
      const validation = validateRoster(result.assignments, employees, shifts, leaves);

      // Save to database
      const roster = await createRoster({
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: 'draft',
      });

      // Create assignments
      const assignmentsToCreate = result.assignments.map(a => ({
        roster_id: roster.id,
        employee_id: a.employee_id,
        shift_id: a.shift_id,
        date: a.date,
        is_weekly_off: a.is_weekly_off,
      }));

      await createRosterAssignments(assignmentsToCreate);

      // Fetch the assignments with employee/shift details
      const rosterData = await fetchRosterWithDetails(roster.id);

      setGeneratedRoster({
        roster,
        assignments: rosterData.assignments,
        statistics: result.statistics,
      });
      setValidationErrors([...validation.errors, ...result.errors]);
    } catch (err) {
      console.error('Failed to generate roster:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate roster');
    } finally {
      setGenerating(false);
    }
  }

  async function fetchRosterWithDetails(rosterId: string) {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/roster_assignments?roster_id=eq.${rosterId}&select=*,employees(id,name,employee_code),shifts(id,name,start_time,end_time)`,
      {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }
    );
    const assignments = await response.json();
    return { assignments };
  }

  async function handlePublish() {
    if (!generatedRoster) return;

    try {
      setPublishing(true);
      await updateRoster(generatedRoster.roster.id, { status: 'published' });
      setGeneratedRoster({
        ...generatedRoster,
        roster: { ...generatedRoster.roster, status: 'published' },
      });
    } catch (err) {
      console.error('Failed to publish roster:', err);
      alert('Failed to publish roster. Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleExport(format: 'excel' | 'csv' | 'pdf') {
    if (!generatedRoster) return;

    try {
      // Generate export data
      const exportData = generateExportData(generatedRoster, shifts);

      if (format === 'csv') {
        downloadCSV(exportData, generatedRoster.roster);
      } else if (format === 'excel') {
        // For Excel, we'll use CSV format (simplified)
        downloadCSV(exportData, generatedRoster.roster);
      } else {
        // For PDF, generate a simple text report
        downloadPDF(exportData, generatedRoster.roster);
      }
    } catch (err) {
      console.error('Failed to export roster:', err);
      alert('Failed to export roster. Please try again.');
    }
  }

  // Build roster grid for preview
  function buildRosterGrid() {
    if (!generatedRoster) return null;

    const startDate = new Date(generatedRoster.roster.start_date);
    const endDate = new Date(generatedRoster.roster.end_date);
    const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dates = Array.from({ length: numDays }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });

    // Build employee assignments map
    const employeeMap = new Map<string, Map<string, RosterAssignment>>();
    generatedRoster.assignments.forEach((a) => {
      if (!employeeMap.has(a.employee_id)) {
        employeeMap.set(a.employee_id, new Map());
      }
      employeeMap.get(a.employee_id)!.set(a.date, a);
    });

    // Get unique employees sorted by name
    const sortedEmployees = Array.from(
      new Map(
        generatedRoster.assignments
          .filter((a) => a.employees)
          .map((a) => [a.employee_id, a.employees])
      ).values()
    ).sort((a, b) => (a?.name || '').localeCompare(b?.name || '')) as Array<{ id: string; name: string; employee_code: string }>;

    return { dates, employees: sortedEmployees, employeeMap };
  }

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  const gridData = buildRosterGrid();

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Generate Roster</h1>
        <p className="text-gray-600 mt-1">Create an optimized schedule using constraint programming</p>
      </div>

      {/* Configuration */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Roster Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              required
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <Button
              onClick={handleGenerate}
              loading={generating}
              icon={<Sparkles className="w-4 h-4" />}
              disabled={!formData.name || !formData.start_date || !formData.end_date || shifts.length === 0 || employees.length === 0}
            >
              Generate Roster
            </Button>
            {shifts.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                Configure shifts before generating
              </div>
            )}
            {employees.length === 0 && shifts.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                Add employees before generating
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Error */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardBody>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800">Generation Failed</h4>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Generated Roster Preview */}
      {generatedRoster && gridData && (
        <>
          {/* Validation Status */}
          <Card className={`mb-6 ${validationErrors.length === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {validationErrors.length === 0 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-semibold ${validationErrors.length === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {validationErrors.length === 0 ? 'Roster Generated Successfully' : 'Roster Generated with Warnings'}
                    </h4>
                    {validationErrors.length > 0 && (
                      <ul className="mt-2 text-sm text-amber-700 space-y-1">
                        {validationErrors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {validationErrors.length > 5 && (
                          <li>...and {validationErrors.length - 5} more issues</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv')}
                    icon={<FileText className="w-4 h-4" />}
                  >
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('excel')}
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                  >
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('pdf')}
                    icon={<File className="w-4 h-4" />}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Roster Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">{generatedRoster.roster.name}</h2>
              <Badge variant={generatedRoster.roster.status === 'published' ? 'secondary' : 'warning'}>
                {generatedRoster.roster.status}
              </Badge>
            </div>
            {generatedRoster.roster.status === 'draft' && (
              <Button
                variant="secondary"
                onClick={handlePublish}
                loading={publishing}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                Publish Roster
              </Button>
            )}
          </div>

          {/* Roster Grid */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 z-10">
                      Employee
                    </th>
                    {gridData.dates.map((date) => (
                      <th
                        key={date.toISOString()}
                        className={`px-2 py-3 text-center font-semibold min-w-[40px] ${
                          date.getDay() === 0 || date.getDay() === 6
                            ? 'text-amber-600 bg-amber-50'
                            : 'text-gray-700'
                        }`}
                      >
                        <div className="text-xs">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-sm">{date.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gridData.employees.map((emp) => {
                    const empAssigns = gridData.employeeMap.get(emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="sticky left-0 bg-white px-4 py-2 font-medium text-gray-900 z-10 whitespace-nowrap">
                          {emp.name}
                        </td>
                        {gridData.dates.map((date) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const assignment = empAssigns?.get(dateStr);
                          const shiftName = assignment?.shifts?.name || null;
                          const isWeeklyOff = assignment?.is_weekly_off || false;

                          return (
                            <td
                              key={dateStr}
                              className={`px-2 py-2 text-center border-t border-gray-100 ${getShiftStyle(
                                shiftName,
                                isWeeklyOff
                              )}`}
                            >
                              <span className="text-xs font-medium">
                                {getShiftCode(shiftName, isWeeklyOff)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">{SHIFT_CODES.morning}</span>
              <span>Morning Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium">{SHIFT_CODES.afternoon}</span>
              <span>Afternoon Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">{SHIFT_CODES.night}</span>
              <span>Night Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-500 font-medium">WO</span>
              <span>Weekly Off</span>
            </div>
          </div>

          {/* Statistics */}
          {generatedRoster.statistics && (
            <Card className="mt-6">
              <CardBody>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {(generatedRoster.statistics.total_assignments as number) || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Assignments</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {(generatedRoster.statistics.total_weekly_offs as number) || 0}
                    </p>
                    <p className="text-sm text-gray-600">Weekly Offs</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.keys(generatedRoster.statistics.by_employee || {}).length}
                    </p>
                    <p className="text-sm text-gray-600">Employees Scheduled</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {gridData?.dates.length || 0}
                    </p>
                    <p className="text-sm text-gray-600">Days Covered</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// Export utilities
interface ExportRow {
  employee: string;
  assignments: { date: string; shift: string }[];
}

function generateExportData(roster: RosterWithAssignments, shifts: Shift[]): ExportRow[] {
  const employeeMap = new Map<string, ExportRow>();

  roster.assignments.forEach((a) => {
    if (!employeeMap.has(a.employee_id)) {
      employeeMap.set(a.employee_id, {
        employee: a.employees?.name || 'Unknown',
        assignments: [],
      });
    }

    const shiftCode = a.is_weekly_off
      ? 'WO'
      : getShiftCode(a.shifts?.name || null, false);

    employeeMap.get(a.employee_id)!.assignments.push({
      date: a.date,
      shift: shiftCode,
    });
  });

  return Array.from(employeeMap.values());
}

function downloadCSV(data: ExportRow[], roster: Roster) {
  // Get all unique dates
  const dates = new Set<string>();
  data.forEach(row => {
    row.assignments.forEach(a => dates.add(a.date));
  });
  const sortedDates = Array.from(dates).sort();

  // Build CSV
  let csv = 'Employee,' + sortedDates.map(d => d).join(',') + '\n';
  data.forEach(row => {
    const dateMap = new Map(row.assignments.map(a => [a.date, a.shift]));
    csv += `"${row.employee}",` + sortedDates.map(d => dateMap.get(d) || '-').join(',') + '\n';
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roster_${roster.start_date}.csv`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function downloadPDF(data: ExportRow[], roster: Roster) {
  // Generate a simple text report for PDF (simplified)
  let text = `Roster: ${roster.name}\n`;
  text += `Period: ${roster.start_date} to ${roster.end_date}\n\n`;
  text += '='.repeat(60) + '\n\n';

  data.forEach(row => {
    text += `${row.employee}\n`;
    row.assignments.sort((a, b) => a.date.localeCompare(b.date)).forEach(a => {
      text += `  ${a.date}: ${a.shift}\n`;
    });
    text += '\n';
  });

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roster_${roster.start_date}.txt`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
