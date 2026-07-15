import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  FileText,
  File,
} from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Modal,
  EmptyState,
  LoadingSpinner,
  Badge,
  ConfirmDialog,
} from '../components/UI';
import {
  getRosters,
  getRoster,
  deleteRoster,
  updateRoster,
  Roster,
  RosterAssignment,
} from '../utils/supabase';
import { getShiftCode, getShiftStyle, SHIFT_CODES } from '../utils/scheduler';

export function RostersPage() {
  const [rosters, setRoasters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRoster, setViewRoster] = useState<{
    roster: Roster;
    assignments: RosterAssignment[];
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadRosters();
  }, []);

  async function loadRosters() {
    try {
      setLoading(true);
      const data = await getRosters();
      setRoasters(data);
    } catch (error) {
      console.error('Failed to load rosters:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleView(rosterId: string) {
    try {
      const data = await getRoster(rosterId);
      if (data) {
        setViewRoster(data);
      }
    } catch (error) {
      console.error('Failed to load roster:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRoster(id);
      setRoasters(rosters.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to delete roster:', error);
      alert('Failed to delete roster. Please try again.');
    }
    setDeleteConfirm(null);
  }

  async function handlePublish(id: string) {
    try {
      await updateRoster(id, { status: 'published' });
      setRoasters(rosters.map(r => r.id === id ? { ...r, status: 'published' } : r));
    } catch (error) {
      console.error('Failed to publish roster:', error);
      alert('Failed to publish roster. Please try again.');
    }
  }

  function handleExport(format: 'csv' | 'excel' | 'pdf') {
    if (!viewRoster) return;

    // Generate export data
    const data = generateExportData(viewRoster);

    if (format === 'csv' || format === 'excel') {
      downloadCSV(data, viewRoster.roster);
    } else {
      downloadPDF(data, viewRoster.roster);
    }
  }

  // Build roster grid for preview
  function buildRosterGrid() {
    if (!viewRoster) return null;

    const startDate = new Date(viewRoster.roster.start_date);
    const endDate = new Date(viewRoster.roster.end_date);
    const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dates = Array.from({ length: numDays }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });

    // Build employee assignments map
    const employeeMap = new Map<string, Map<string, RosterAssignment>>();
    viewRoster.assignments.forEach((a) => {
      if (!employeeMap.has(a.employee_id)) {
        employeeMap.set(a.employee_id, new Map());
      }
      employeeMap.get(a.employee_id)!.set(a.date, a);
    });

    // Get unique employees sorted by name
    const sortedEmployees = Array.from(
      new Map(
        viewRoster.assignments
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
        <h1 className="text-2xl font-bold text-gray-900">Rosters</h1>
        <p className="text-gray-600 mt-1">View and manage generated rosters</p>
      </div>

      {rosters.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="No rosters yet"
              description="Generate your first roster from the Generate Roster page"
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rosters.map((roster) => (
            <Card key={roster.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{roster.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(roster.start_date).toLocaleDateString()} -{' '}
                      {new Date(roster.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={roster.status === 'published' ? 'secondary' : 'warning'}>
                    {roster.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>
                    {Math.ceil(
                      (new Date(roster.end_date).getTime() -
                        new Date(roster.start_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1}{' '}
                    days
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(roster.id)}
                    icon={<Eye className="w-4 h-4" />}
                  >
                    View
                  </Button>
                  {roster.status === 'draft' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePublish(roster.id)}
                      icon={<CheckCircle className="w-4 h-4" />}
                    >
                      Publish
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteConfirm(roster.id)}
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* View Modal */}
      <Modal
        isOpen={!!viewRoster}
        onClose={() => setViewRoster(null)}
        title={viewRoster?.roster.name || 'Roster Preview'}
        maxWidth="xl"
      >
        <div className="max-h-[70vh] overflow-auto">
          {viewRoster && gridData && (
            <>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {new Date(viewRoster.roster.start_date).toLocaleDateString()} -{' '}
                    {new Date(viewRoster.roster.end_date).toLocaleDateString()}
                  </span>
                  <Badge variant={viewRoster.roster.status === 'published' ? 'secondary' : 'warning'}>
                    {viewRoster.roster.status}
                  </Badge>
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

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
            </>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Roster"
        message="Are you sure you want to delete this roster? This will also delete all assignments."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

// Export utilities
interface ExportRow {
  employee: string;
  assignments: { date: string; shift: string }[];
}

function generateExportData(roster: { roster: Roster; assignments: RosterAssignment[] }): ExportRow[] {
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
