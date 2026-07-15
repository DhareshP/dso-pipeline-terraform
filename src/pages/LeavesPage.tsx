import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CalendarPlus, Search } from 'lucide-react';
import {
  Card,
  Button,
  Modal,
  Input,
  Select,
  EmptyState,
  LoadingSpinner,
  ConfirmDialog,
  Badge,
} from '../components/UI';
import {
  getLeaves,
  getEmployees,
  createLeave,
  updateLeave,
  deleteLeave,
  Leave,
  Employee,
} from '../utils/supabase';

export function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'approved',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [leavesData, employeesData] = await Promise.all([
        getLeaves(),
        getEmployees(true),
      ]);
      setLeaves(leavesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(leave?: Leave) {
    if (leave) {
      setEditingLeave(leave);
      setFormData({
        employee_id: leave.employee_id,
        start_date: leave.start_date,
        end_date: leave.end_date,
        reason: leave.reason || '',
        status: leave.status,
      });
    } else {
      setEditingLeave(null);
      setFormData({
        employee_id: employees[0]?.id || '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
        status: 'approved',
      });
    }
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingLeave) {
        const updated = await updateLeave(editingLeave.id, formData);
        // Reload to get the employee data
        const leavesData = await getLeaves();
        setLeaves(leavesData);
      } else {
        await createLeave(formData);
        // Reload to get the employee data
        const leavesData = await getLeaves();
        setLeaves(leavesData);
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save leave:', error);
      alert('Failed to save leave. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLeave(id);
      setLeaves(leaves.filter((l) => l.id !== id));
    } catch (error) {
      console.error('Failed to delete leave:', error);
      alert('Failed to delete leave. Please try again.');
    }
    setDeleteConfirm(null);
  }

  const filteredLeaves = leaves.filter((leave) => {
    const empName = leave.employees?.name || '';
    const empCode = leave.employees?.employee_code || '';
    const query = searchQuery.toLowerCase();
    return (
      empName.toLowerCase().includes(query) ||
      empCode.toLowerCase().includes(query) ||
      (leave.reason?.toLowerCase() || '').includes(query)
    );
  });

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.name} (${emp.employee_code})`,
  }));

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Manage approved leave records</p>
        </div>
        <Button
          onClick={() => openModal()}
          icon={<Plus className="w-4 h-4" />}
          disabled={employees.length === 0}
        >
          Add Leave
        </Button>
      </div>

      {employees.length === 0 && (
        <Card className="mb-6">
          <div className="p-4 bg-amber-50 text-amber-800 rounded-lg">
            <p className="text-sm">
              <strong>Note:</strong> You need to add employees before you can manage leave records.
            </p>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leaves by employee or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {filteredLeaves.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus className="w-8 h-8" />}
            title="No leave records found"
            description={
              searchQuery
                ? 'Try adjusting your search query'
                : 'Add leave records for employees who will be off'
            }
            action={
              !searchQuery && employees.length > 0 && (
                <Button onClick={() => openModal()}>Add Leave</Button>
              )
            }
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave) => {
                  const startDate = new Date(leave.start_date);
                  const endDate = new Date(leave.end_date);
                  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                  return (
                    <tr key={leave.id}>
                      <td>
                        <div>
                          <p className="font-medium text-gray-900">
                            {leave.employees?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {leave.employees?.employee_code}
                          </p>
                        </div>
                      </td>
                      <td className="text-gray-600">
                        {new Date(leave.start_date).toLocaleDateString()}
                      </td>
                      <td className="text-gray-600">
                        {new Date(leave.end_date).toLocaleDateString()}
                      </td>
                      <td>
                        <Badge variant="primary">{days} day{days !== 1 ? 's' : ''}</Badge>
                      </td>
                      <td className="text-gray-600 max-w-xs truncate">
                        {leave.reason || '-'}
                      </td>
                      <td>
                        <Badge
                          variant={
                            leave.status === 'approved'
                              ? 'secondary'
                              : leave.status === 'pending'
                              ? 'warning'
                              : 'error'
                          }
                        >
                          {leave.status}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openModal(leave)}
                            icon={<Pencil className="w-3.5 h-3.5" />}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteConfirm(leave.id)}
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLeave ? 'Edit Leave' : 'Add Leave'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Employee"
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            options={employeeOptions}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Input
            label="Reason"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Vacation, sick leave, etc."
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'approved', label: 'Approved' },
              { value: 'pending', label: 'Pending' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingLeave ? 'Save Changes' : 'Add Leave'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Leave Record"
        message="Are you sure you want to delete this leave record?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
