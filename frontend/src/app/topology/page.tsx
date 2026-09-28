'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { RouteFlowCanvas } from '@/components/flow/RouteFlowCanvas';
import { Button } from '@/components/ui/button';
import { useClusterStore } from '@/store/cluster';
import {
  Zap,
  Layers,
  Route as RouteIcon,
  AlertCircle,
  Network,
} from 'lucide-react';
import Link from 'next/link';

export default function TopologyPage() {
  const { activeCluster, activeClusterId } = useClusterStore();

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Zap className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Sơ Đồ Luồng Kiến Trúc (Topology Flow Graph)
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Trực quan hóa luồng request từ HTTP Ingress ➔ Phân nhánh Route ➔ Plugins ➔ Service ➔ Targets ({activeCluster ? activeCluster.name : 'Chưa chọn Cluster'})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/routes">
              <Button size="sm" variant="outline" className="text-xs h-8">
                <RouteIcon className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                Quản lý Routes
              </Button>
            </Link>
            <Link href="/services">
              <Button size="sm" variant="outline" className="text-xs h-8">
                <Layers className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                Quản lý Services
              </Button>
            </Link>
            <Link href="/upstreams">
              <Button size="sm" variant="outline" className="text-xs h-8">
                <Network className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                Upstreams & Targets
              </Button>
            </Link>
          </div>
        </div>

        {!activeClusterId && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>Chưa có Kong Cluster nào được chọn. Vui lòng kết nối Cluster để trực quan hóa sơ đồ luồng.</span>
            </div>
            <Link href="/settings/clusters">
              <Button size="sm" variant="outline" className="text-xs bg-white text-amber-900 border-amber-300 h-7">
                Chọn Cluster
              </Button>
            </Link>
          </div>
        )}

        {/* Dedicated Full Flow Canvas */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <RouteFlowCanvas />
        </div>
      </div>
    </AppLayout>
  );
}
