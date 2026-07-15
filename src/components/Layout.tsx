import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarOff,
  Settings,
  CalendarClock,
  FileSpreadsheet,
  Menu,
  X,
} from 'lucide-react';

type Page = 'dashboard' | 'employees' | 'leaves' | 'shifts' | 'generate' | 'rosters';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const navItems: Array<{ id: Page; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'employees', label: 'Employees', icon: <Users className="w-5 h-5" /> },
  { id: 'leaves', label: 'Leave Management', icon: <CalendarOff className="w-5 h-5" /> },
  { id: 'shifts', label: 'Shift Settings', icon: <Settings className="w-5 h-5" /> },
  { id: 'generate', label: 'Generate Roster', icon: <CalendarClock className="w-5 h-5" /> },
  { id: 'rosters', label: 'View Rosters', icon: <FileSpreadsheet className="w-5 h-5" /> },
];

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Roster Manager</h1>
        <div className="w-10" />
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Roster</h1>
                  <p className="text-xs text-gray-500">Management System</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`nav-link w-full ${
                  currentPage === item.id ? 'active' : ''
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">24/7 Shift Scheduling</p>
            <p className="text-xs text-gray-400 mt-1">Powered by OR-Tools</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export type { Page };
