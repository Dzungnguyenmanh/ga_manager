'use client';

import { ClusterSelector } from '@/components/clusters/ClusterSelector';
import { useAuthStore } from '@/store/auth';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/95 px-8 backdrop-blur">
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cluster:</span>
        <ClusterSelector />
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            {user?.sso_provider && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                <Shield className="h-3 w-3" />
                SSO Active
              </span>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                <UserIcon className="h-4 w-4" />
              </div>
              <span>{user?.username || 'Admin User'}</span>
            </div>
            <button
              onClick={logout}
              title="Đăng xuất"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}
