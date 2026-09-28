'use client';

import * as React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useClusterStore } from '@/store/cluster';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const fetchClusters = useClusterStore((state) => state.fetchClusters);

  React.useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
