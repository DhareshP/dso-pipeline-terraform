import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, UserPlus, Search } from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Modal,
  Input,
  EmptyState,
  LoadingSpinner,
  ConfirmDialog,
  Badge,
} from '../components/UI';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  Employee,
} from '../utils/supabase';

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    employee_code: '',
    email: '',
    phone: '',
    department: '',
    is_active: true,
  });

  useEffect(() => {
    loadEmployees();
  }, [showInactive]);

  async function loadEmployees() {
    try {
      setLoading(true);
      const data = await getEmployees(!showInactive);
      setEmployees(data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(employee?: Employee) {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        employee_code: employee.employee_code,
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department || '',
        is_active: employee.is_active,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        employee_code: '',
        email: '',
        phone: '',
        department: '',
        is_active: true,
      });
    }
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingEmployee) {
        const updated = await updateEmployee(editingEmployee.id, formData);
        setEmployees(employees.map((emp) => (emp.id === updated.id ? updated : emp)));
      } else {
        const created = await createEmployee(formData);
        setEmployees([...employees, created]);
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save employee:', error);
      alert('Failed to save employee. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteEmployee(id);
      setEmployees(employees.filter((emp) => emp.id !== id));
    } catch (error) {
      console.error('Failed to delete employee:', error);
      alert('Failed to delete employee. Please try again.');
    }
    setDeleteConfirm(null);
  }

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.department?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage your workforce</p>
        </div>
        <Button onClick={() => openModal()} icon={<Plus className="w-4 h-4" />}>
          Add Employee
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Show inactive</span>
            </label>
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="w-8 h-8" />}
            title="No employees found"
            description={
              searchQuery
                ? 'Try adjusting your search query'
                : 'Add your first employee to get started'
            }
            action={!searchQuery && <Button onClick={() => openModal()}>Add Employee</Button>}
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {employee.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <span className="font-medium text-gray-900">{employee.name}</span>
                      </div>
                    </td>
                    <td className="text-gray-600 font-mono">{employee.employee_code}</td>
                    <td className="text-gray-600">{employee.department || '-'}</td>
                    <td className="text-gray-600">{employee.email || '-'}</td>
                    <td className="text-gray-600">{employee.phone || '-'}</td>
                    <td>
                      <Badge variant={employee.is_active ? 'secondary' : 'gray'}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModal(employee)}
                          icon={<Pencil className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteConfirm(employee.id)}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="John Doe"
            />
            <Input
              label="Employee Code"
              value={formData.employee_code}
              onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
              required
              placeholder="EMP001"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
            <Input
              label="Phone"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 234 567 890"
            />
          </div>
          <Input
            label="Department"
            value={formData.department || ''}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="Operations"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Active employee</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingEmployee ? 'Save Changes' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Employee"
        message="Are you sure you want to delete this employee? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
