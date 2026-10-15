'use client';

import * as React from 'react';
import { useClusterStore } from '@/store/cluster';
import { Server, ChevronDown, Check, Plus } from 'lucide-react';
import Link from 'next/link';

export function ClusterSelector() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { clusters, activeClusterId, activeCluster, setActiveCluster } = useClusterStore();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        data-testid="cluster-selector-trigger"
      >
        <Server className="h-4 w-4 text-blue-600" />
        <span className="truncate max-w-[140px]">
          {activeCluster ? activeCluster.name : clusters.length > 0 ? 'Chọn Cluster' : 'Chưa có Cluster'}
        </span>
        {activeCluster?.environment && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
              activeCluster.environment === 'PROD'
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : activeCluster.environment === 'STG'
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
            }`}
          >
            {activeCluster.environment}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50 p-1 border border-gray-100"
          data-testid="cluster-selector-dropdown"
        >
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Kong Clusters ({clusters.length})
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {clusters.map((cluster) => {
              const isSelected = cluster.id === activeClusterId;
              const env = cluster.environment || 'DEV';
              return (
                <button
                  key={cluster.id}
                  onClick={() => {
                    setActiveCluster(cluster);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium truncate">{cluster.name}</p>
                      <span
                        className={`text-[9px] font-bold px-1 rounded border ${
                          env === 'PROD'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : env === 'STG'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {env}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{cluster.url}</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0 ml-2" />}
                </button>
              );
            })}

            {clusters.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-500 text-center">Chưa có cluster nào.</div>
            )}
          </div>

          <div className="border-t border-gray-100 mt-1 pt-1">
            <Link
              href="/settings/clusters"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Quản lý & Thêm Cluster</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
