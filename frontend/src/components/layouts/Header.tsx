'use client';

import { ClusterSelector } from '@/components/clusters/ClusterSelector';
import { useAuthStore } from '@/store/auth';
import { useClusterStore } from '@/store/cluster';
import { LogOut, User as UserIcon, Shield, ShieldAlert, Menu } from 'lucide-react';
import Link from 'next/link';

export interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { activeCluster } = useClusterStore();

  return (
    <header className="sticky top-0 z-20 flex h-14 sm:h-16 w-full items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-3 sm:px-6 lg:px-8 backdrop-blur">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Mở menu điều hướng"
            className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <span className="hidden md:inline text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
          Cluster:
        </span>
        <ClusterSelector />

        {activeCluster?.environment === 'PROD' && (
          <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shrink-0">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            MÔI TRƯỜNG PRODUCTION
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {isAuthenticated ? (
          <div className="flex items-center gap-1.5 sm:gap-3">
            {user?.sso_provider && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                <Shield className="h-3 w-3" />
                SSO Active
              </span>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline max-w-[140px] truncate">
                {user?.username || 'Admin User'}
              </span>
            </div>
            <button
              onClick={logout}
              title="Đăng xuất"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}
