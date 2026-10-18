'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Route as RouteIcon,
  Layers,
  Network,
  Users,
  Puzzle,
  ShieldCheck,
  Server,
  Zap,
  FileCode,
  History,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  orderNumber?: string;
}

interface NavSection {
  title: string;
  description?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'TỔNG QUAN',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Topology & Flow Graph', href: '/topology', icon: Zap, badge: 'Canvas' },
    ],
  },
  {
    title: 'TRAFFIC ROUTING (ĐỊNH TUYẾN)',
    description: 'Route ↓ Service ↓ Upstream ↓ Target',
    items: [
      { name: '1. Routes', href: '/routes', icon: RouteIcon, orderNumber: '1' },
      { name: '2. Services', href: '/services', icon: Layers, orderNumber: '2' },
      { name: '3. Upstreams & Targets', href: '/upstreams', icon: Network, orderNumber: '3' },
    ],
  },
  {
    title: 'IDENTITY & ACCESS (ĐỊNH DANH)',
    description: 'Consumer ↓ Credential',
    items: [
      { name: 'Consumers & Credentials', href: '/consumers', icon: Users, badge: 'Auth' },
    ],
  },
  {
    title: 'EXTENSIONS & POLICIES',
    description: 'Plugin ↓ Route/Service/Consumer/Global',
    items: [
      { name: 'Plugins Manager', href: '/plugins', icon: Puzzle, badge: 'Scope' },
    ],
  },
  {
    title: 'GITOPS & BACKUPS',
    description: 'decK Config & Snapshots',
    items: [
      { name: 'decK GitOps & Snapshots', href: '/declarative', icon: FileCode, badge: 'GitOps' },
    ],
  },
  {
    title: 'GOVERNANCE & AUDIT',
    description: 'Truy vết & Kiểm toán',
    items: [
      { name: 'Audit Logs', href: '/audit-logs', icon: History, badge: 'Audit' },
    ],
  },
  {
    title: 'SYSTEM & CLUSTERS',
    items: [
      { name: 'Certificates & SNIs', href: '/certificates', icon: ShieldCheck },
      { name: 'Kong Clusters', href: '/settings/clusters', icon: Server },
    ],
  },
];

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white flex flex-col shadow-lg lg:shadow-sm transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-gray-200 px-4 sm:px-5 bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-lg shadow-sm">
              G
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 text-base leading-none tracking-tight truncate">
                Gateway Manager
              </h1>
              <p className="text-[11px] text-gray-500 mt-1 font-medium truncate">
                Enterprise Gateway UI
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng menu"
              className="lg:hidden rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/70 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Nav List */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {section.title}
                </p>
                {section.description && (
                  <p className="text-[9px] font-mono text-blue-600/70 mt-0.5 tracking-tight font-medium">
                    {section.description}
                  </p>
                )}
              </div>

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => onClose?.()}
                      className={cn(
                        'group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all',
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ml-1',
                            isActive
                              ? 'bg-blue-200/70 text-blue-800'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Hierarchy Info */}
        <div className="border-t border-gray-200 p-3 bg-slate-50/70">
          <div className="rounded-md bg-white border border-gray-200 p-2.5 text-[11px] text-gray-600 space-y-1">
            <div className="flex items-center justify-between text-gray-700 font-semibold text-[11px]">
              <span>Kong Architecture</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                v3.8
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">
              Route ➔ Service ➔ Upstream ➔ Target
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
