import React, { useEffect, useState } from 'react';
import { Users, CalendarOff, Settings, FileSpreadsheet, TrendingUp, Clock } from 'lucide-react';
import { Card, CardBody } from '../components/UI';
import { getEmployees, getLeaves, getShifts, getRosters } from '../utils/supabase';

interface Stats {
  employees: number;
  activeEmployees: number;
  leaves: number;
  shifts: number;
  rosters: number;
  publishedRosters: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [employees, leaves, shifts, rosters] = await Promise.all([
          getEmployees(false),
          getLeaves(),
          getShifts(false),
          getRosters(),
        ]);

        setStats({
          employees: employees.length,
          activeEmployees: employees.filter((e) => e.is_active).length,
          leaves: leaves.length,
          shifts: shifts.length,
          rosters: rosters.length,
          publishedRosters: rosters.filter((r) => r.status === 'published').length,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Employees',
      value: stats?.employees || 0,
      subtext: `${stats?.activeEmployees || 0} active`,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500',
    },
    {
      label: 'Leave Records',
      value: stats?.leaves || 0,
      subtext: 'Approved leaves',
      icon: <CalendarOff className="w-6 h-6" />,
      color: 'bg-amber-500',
    },
    {
      label: 'Shift Configurations',
      value: stats?.shifts || 0,
      subtext: 'Active shifts',
      icon: <Settings className="w-6 h-6" />,
      color: 'bg-emerald-500',
    },
    {
      label: 'Generated Rosters',
      value: stats?.rosters || 0,
      subtext: `${stats?.publishedRosters || 0} published`,
      icon: <FileSpreadsheet className="w-6 h-6" />,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your roster management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, idx) => (
          <Card key={idx}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color} text-white`}>{stat.icon}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href="#employees"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200 transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Manage Employees</p>
                  <p className="text-sm text-gray-500">Add, edit, or deactivate employees</p>
                </div>
              </a>
              <a
                href="#shifts"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Configure Shifts</p>
                  <p className="text-sm text-gray-500">Set up shift timings and minimum staff</p>
                </div>
              </a>
              <a
                href="#generate"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600 group-hover:bg-amber-200 transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Generate Roster</p>
                  <p className="text-sm text-gray-500">Create a new optimized schedule</p>
                </div>
              </a>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Info</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Shift Types</span>
                </div>
                <span className="font-semibold text-gray-900">Morning, Afternoon, Night</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Min Staff per Shift</span>
                </div>
                <span className="font-semibold text-gray-900">3 (configurable)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Work Pattern</span>
                </div>
                <span className="font-semibold text-gray-900">5 on, 2 off</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CalendarOff className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Max Consecutive Days</span>
                </div>
                <span className="font-semibold text-gray-900">6 days</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
