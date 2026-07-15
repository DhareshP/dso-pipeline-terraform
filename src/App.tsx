import React, { useState } from 'react';
import { Layout, Page } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { EmployeesPage } from './pages/EmployeesPage';
import { LeavesPage } from './pages/LeavesPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { GenerateRosterPage } from './pages/GenerateRosterPage';
import { RostersPage } from './pages/RostersPage';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <EmployeesPage />;
      case 'leaves':
        return <LeavesPage />;
      case 'shifts':
        return <ShiftsPage />;
      case 'generate':
        return <GenerateRosterPage />;
      case 'rosters':
        return <RostersPage />;
      default:
        return <Dashboard />;
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
