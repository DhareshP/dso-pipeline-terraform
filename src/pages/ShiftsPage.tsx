import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Clock, Sun, Sunset, Moon } from 'lucide-react';
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
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  Shift,
} from '../utils/supabase';

const DEFAULT_SHIFTS: Omit<Shift, 'id' | 'created_at'>[] = [
  { name: 'Morning', start_time: '06:00', end_time: '14:00', min_employees: 3, max_employees: 10, display_order: 1, is_active: true },
  { name: 'Afternoon', start_time: '14:00', end_time: '22:00', min_employees: 3, max_employees: 10, display_order: 2, is_active: true },
  { name: 'Night', start_time: '22:00', end_time: '06:00', min_employees: 3, max_employees: 10, display_order: 3, is_active: true },
];

function getShiftIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('morning')) return <Sun className="w-5 h-5" />;
  if (lower.includes('afternoon')) return <Sunset className="w-5 h-5" />;
  if (lower.includes('night')) return <Moon className="w-5 h-5" />;
  return <Clock className="w-5 h-5" />;
}

function getShiftColor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('morning')) return 'bg-amber-100 text-amber-600';
  if (lower.includes('afternoon')) return 'bg-emerald-100 text-emerald-600';
  if (lower.includes('night')) return 'bg-blue-100 text-blue-600';
  return 'bg-gray-100 text-gray-600';
}

export function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    start_time: '06:00',
    end_time: '14:00',
    min_employees: 3,
    max_employees: 10,
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadShifts();
  }, []);

  async function loadShifts() {
    try {
      setLoading(true);
      const data = await getShifts(false);
      setShifts(data);
    } catch (error) {
      console.error('Failed to load shifts:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(shift?: Shift) {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        min_employees: shift.min_employees,
        max_employees: shift.max_employees,
        display_order: shift.display_order,
        is_active: shift.is_active,
      });
    } else {
      setEditingShift(null);
      setFormData({
        name: '',
        start_time: '06:00',
        end_time: '14:00',
        min_employees: 3,
        max_employees: 10,
        display_order: shifts.length,
        is_active: true,
      });
    }
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingShift) {
        const updated = await updateShift(editingShift.id, formData);
        setShifts(shifts.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createShift(formData);
        setShifts([...shifts, created]);
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save shift:', error);
      alert('Failed to save shift. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteShift(id);
      setShifts(shifts.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete shift:', error);
      alert('Failed to delete shift. Please try again.');
    }
    setDeleteConfirm(null);
  }

  async function initializeDefaultShifts() {
    try {
      setSaving(true);
      for (const shift of DEFAULT_SHIFTS) {
        await createShift(shift);
      }
      await loadShifts();
    } catch (error) {
      console.error('Failed to initialize shifts:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Settings</h1>
          <p className="text-gray-600 mt-1">Configure shift timings and staffing requirements</p>
        </div>
        <Button onClick={() => openModal()} icon={<Plus className="w-4 h-4" />}>
          Add Shift
        </Button>
      </div>

      {shifts.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Clock className="w-8 h-8" />}
              title="No shifts configured"
              description="Initialize with default Morning, Afternoon, Night shifts or create custom ones"
              action={
                <div className="flex gap-3">
                  <Button onClick={initializeDefaultShifts} loading={saving}>
                    Initialize Defaults
                  </Button>
                  <Button variant="outline" onClick={() => openModal()}>
                    Create Custom
                  </Button>
                </div>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts
            .sort((a, b) => a.display_order - b.display_order)
            .map((shift) => (
              <Card key={shift.id} className={shift.is_active ? '' : 'opacity-60'}>
                <CardBody>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-xl ${getShiftColor(shift.name)}`}
                      >
                        {getShiftIcon(shift.name)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {shift.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {shift.start_time} - {shift.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openModal(shift)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(shift.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Minimum Staff</span>
                      <span className="font-semibold text-gray-900">
                        {shift.min_employees}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Maximum Staff</span>
                      <span className="font-semibold text-gray-900">
                        {shift.max_employees}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge variant={shift.is_active ? 'secondary' : 'gray'}>
                        {shift.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingShift ? 'Edit Shift' : 'Add Shift'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Shift Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Morning, Afternoon, Night"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Minimum Employees"
              type="number"
              min="1"
              value={formData.min_employees}
              onChange={(e) =>
                setFormData({ ...formData, min_employees: parseInt(e.target.value) || 1 })
              }
              required
            />
            <Input
              label="Maximum Employees"
              type="number"
              min="1"
              value={formData.max_employees}
              onChange={(e) =>
                setFormData({ ...formData, max_employees: parseInt(e.target.value) || 1 })
              }
              required
            />
          </div>
          <Input
            label="Display Order"
            type="number"
            min="0"
            value={formData.display_order}
            onChange={(e) =>
              setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
            }
            helpText="Lower numbers appear first"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Active shift</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingShift ? 'Save Changes' : 'Add Shift'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Shift"
        message="Are you sure you want to delete this shift? This will affect any rosters using this shift."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
