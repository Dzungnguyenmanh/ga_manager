'use client';

import * as React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useClusterStore } from '@/store/cluster';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const fetchClusters = useClusterStore((state) => state.fetchClusters);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col min-h-screen min-w-0">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-5 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
