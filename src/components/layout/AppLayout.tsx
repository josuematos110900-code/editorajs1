import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Topbar } from './Topbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main className="px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
