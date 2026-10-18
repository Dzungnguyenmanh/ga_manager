'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import { KongStatus, KongNodeInfo } from '@/types';
import {
  Route as RouteIcon,
  Layers,
  Network,
  Users,
  Puzzle,
  KeyRound,
  Server,
  Plus,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  Zap,
  Activity,
  Globe,
  Radio,
  ExternalLink,
  HeartPulse,
  Database,
  Cpu,
  RefreshCw,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { DiagnosticsModal } from '@/components/diagnostics/DiagnosticsModal';

export default function DashboardPage() {
  const { activeCluster, activeClusterId } = useClusterStore();
  const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false);
  const [counts, setCounts] = React.useState({
    routes: 0,
    services: 0,
    upstreams: 0,
    consumers: 0,
    plugins: 0,
    certificates: 0,
  });
  const [status, setStatus] = React.useState<KongStatus | null>(null);
  const [nodeInfo, setNodeInfo] = React.useState<KongNodeInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchDashboardData = React.useCallback(() => {
    if (!activeClusterId) {
      setCounts({ routes: 0, services: 0, upstreams: 0, consumers: 0, plugins: 0, certificates: 0 });
      setStatus(null);
      setNodeInfo(null);
      return;
    }

    setIsLoading(true);
    Promise.allSettled([
      api.get('/api/kong/routes'),
      api.get('/api/kong/services'),
      api.get('/api/kong/upstreams'),
      api.get('/api/kong/plugins'),
      api.get('/api/kong/consumers'),
      api.get('/api/kong/certificates'),
      api.get('/api/kong/status'),
      api.get('/api/kong/node'),
    ]).then(([r, s, u, p, c, cert, st, nd]) => {
      setCounts({
        routes: r.status === 'fulfilled' && Array.isArray(r.value.data) ? r.value.data.length : 0,
        services: s.status === 'fulfilled' && Array.isArray(s.value.data) ? s.value.data.length : 0,
        upstreams: u.status === 'fulfilled' && Array.isArray(u.value.data) ? u.value.data.length : 0,
        plugins: p.status === 'fulfilled' && Array.isArray(p.value.data) ? p.value.data.length : 0,
        consumers: c.status === 'fulfilled' && Array.isArray(c.value.data) ? c.value.data.length : 0,
        certificates: cert.status === 'fulfilled' && Array.isArray(cert.value.data) ? cert.value.data.length : 0,
      });

      if (st.status === 'fulfilled') {
        setStatus(st.value.data);
      }
      if (nd.status === 'fulfilled') {
        setNodeInfo(nd.value.data);
      }
      setIsLoading(false);
    });
  }, [activeClusterId]);

  React.useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const metrics = [
    {
      title: '1. Routes',
      value: activeCluster ? String(counts.routes) : '-',
      description: 'Điểm tiếp nhận URL paths, methods, hosts',
      icon: RouteIcon,
      href: '/routes',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-100',
      badgeText: 'Matching',
    },
    {
      title: '2. Services',
      value: activeCluster ? String(counts.services) : '-',
      description: 'Dịch vụ Upstream Backend',
      icon: Layers,
      href: '/services',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-100',
      badgeText: 'Backend',
    },
    {
      title: '3. Upstreams & Pools',
      value: activeCluster ? String(counts.upstreams) : '-',
      description: 'Cân bằng tải & Health Checks',
      icon: Network,
      href: '/upstreams',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-100',
      badgeText: 'Load Balancer',
    },
    {
      title: '4. Consumers & ACLs',
      value: activeCluster ? String(counts.consumers) : '-',
      description: 'API Keys, JWT, Basic Auth & ACLs',
      icon: Users,
      href: '/consumers',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-100',
      badgeText: 'Identity Hub',
    },
    {
      title: '5. Plugins',
      value: activeCluster ? String(counts.plugins) : '-',
      description: 'Rate Limit, Auth, Security, Logging',
      icon: Puzzle,
      href: '/plugins',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-100',
      badgeText: 'Policies',
    },
    {
      title: '6. SSL Certificates',
      value: activeCluster ? String(counts.certificates) : '-',
      description: 'TLS Termination, SNIs & mTLS CAs',
      icon: Lock,
      href: '/certificates',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 border-rose-100',
      badgeText: 'Security',
    },
  ];

  const workflowSteps = [
    {
      step: 'Bước 1: Entrypoint',
      stepNum: '01',
      title: 'Routes & Matching',
      description: 'Tạo quy tắc định tuyến HTTP/HTTPS, header matching, path strip.',
      href: '/routes',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      hoverBorder: 'hover:border-emerald-400 hover:bg-emerald-50/40 hover:shadow-md',
      hoverText: 'group-hover:text-emerald-600',
      icon: RouteIcon,
    },
    {
      step: 'Bước 2: Backend',
      stepNum: '02',
      title: 'Service Definition',
      description: 'Khai báo URL/Host Backend xử lý nghiệp vụ, timeouts & retries.',
      href: '/services',
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
      hoverBorder: 'hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md',
      hoverText: 'group-hover:text-blue-600',
      icon: Layers,
    },
    {
      step: 'Bước 3: Load Balancing',
      stepNum: '03',
      title: 'Upstream & Targets',
      description: 'Cấu hình thuật toán round-robin/hashing và Active Health Checks.',
      href: '/upstreams',
      badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      hoverBorder: 'hover:border-indigo-400 hover:bg-indigo-50/40 hover:shadow-md',
      hoverText: 'group-hover:text-indigo-600',
      icon: Network,
    },
    {
      step: 'Bước 4: Identity',
      stepNum: '04',
      title: 'Consumer & Credential',
      description: 'Cấp phát API Key, JWT, Basic Auth và phân quyền nhóm ACL.',
      href: '/consumers',
      badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
      hoverBorder: 'hover:border-purple-400 hover:bg-purple-50/40 hover:shadow-md',
      hoverText: 'group-hover:text-purple-600',
      icon: Users,
    },
    {
      step: 'Bước 5: Policies',
      stepNum: '05',
      title: 'Plugin & Security',
      description: 'Kích hoạt Rate Limiting, Key Auth, CORS, IP Restriction.',
      href: '/plugins',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
      hoverBorder: 'hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-md',
      hoverText: 'group-hover:text-amber-600',
      icon: Puzzle,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-7">
        {/* Top Banner: Glassmorphism & High Contrast */}
        {activeCluster ? (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-950 p-4 sm:p-6 text-white shadow-lg">
              <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Kong Gateway Cluster Active
                    </span>
                    <span className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-md font-bold uppercase ${
                      activeCluster.environment === 'PROD'
                        ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30'
                        : activeCluster.environment === 'STG'
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30'
                        : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                    }`}>
                      {activeCluster.environment || 'DEV'}
                    </span>
                    <span className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-md bg-white/10 font-mono text-blue-200">
                      Cluster ID: #{activeCluster.id}
                    </span>
                    {nodeInfo?.topology && (
                      <span className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-md bg-indigo-500/30 font-semibold text-indigo-200 border border-indigo-400/30">
                        {nodeInfo.topology === 'db_less'
                          ? 'DB-less Mode'
                          : nodeInfo.topology === 'hybrid_cp'
                          ? 'Hybrid CP'
                          : nodeInfo.topology === 'hybrid_dp'
                          ? 'Hybrid DP'
                          : 'Traditional (DB)'}
                      </span>
                    )}
                    {nodeInfo?.version && (
                      <span className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-md bg-purple-500/20 font-mono text-purple-200 border border-purple-400/30">
                        Kong v{nodeInfo.version}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight break-words">{activeCluster.name}</h1>
                  <p className="text-[11px] sm:text-xs text-blue-100 font-mono flex items-center gap-x-2 gap-y-1 flex-wrap break-all">
                    <span>Admin API: <span className="text-blue-200 underline">{activeCluster.url}</span></span>
                    <span className="hidden sm:inline">•</span>
                    <span>Proxy Port: <span className="text-emerald-300 font-bold">:8000</span> (HTTP) / <span className="text-emerald-300 font-bold">:8443</span> (HTTPS)</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => setDiagnosticsOpen(true)}
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-9"
                  >
                    <Activity className="h-3.5 w-3.5 mr-1.5 text-blue-300" />
                    Chẩn đoán mạng
                  </Button>
                  <Button
                    onClick={fetchDashboardData}
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-9"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Làm mới
                  </Button>
                  <Link
                    href="/routes"
                    className="px-3.5 sm:px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Cấu hình Route mới
                  </Link>
                </div>
              </div>
            </div>

            {/* DB-less Topology Notice Banner */}
            {nodeInfo?.topology === 'db_less' && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/60 rounded-lg text-indigo-700 dark:text-indigo-300 shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">Cụm Kong đang chạy ở chế độ DB-less (Declarative Only)</h4>
                    <p className="text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
                      Thao tác CRUD trực tiếp qua Admin API bị vô hiệu hóa. Mọi thay đổi về Services, Routes và Plugins phải được đồng bộ qua file YAML hoặc GitOps.
                    </p>
                  </div>
                </div>
                <Link href="/declarative" className="shrink-0">
                  <Button size="sm" variant="outline" className="text-xs bg-white text-indigo-700 border-indigo-300 h-8 w-full sm:w-auto">
                    Mở decK GitOps
                  </Button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl p-5 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-semibold bg-white/10 px-3 py-1 rounded-full text-blue-300">
                Setup Kong Gateway
              </span>
              <h1 className="text-xl sm:text-2xl font-bold">Bắt đầu cấu hình Kong Cluster</h1>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
                Hệ thống chưa kết nối tới cụm Kong Gateway nào. Hãy thêm cụm Kong Gateway nội bộ (ví dụ: http://localhost:8001) để bắt đầu quản trị.
              </p>
            </div>
            <Link
              href="/settings/clusters"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shrink-0 w-full sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              Kết nối Cluster ngay
            </Link>
          </div>
        )}

        {/* Real-time Kong Vitals & Gateway Health Monitor Widget */}
        {status && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span>Active Connections</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
                {status.server?.connections_active ?? 0}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Kết nối đang mở</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Zap className="h-4 w-4 text-blue-600" />
                <span>Total Requests</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
                {status.server?.total_requests ?? 0}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Tổng số request đã xử lý</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Radio className="h-4 w-4 text-indigo-600" />
                <span>Reading / Writing</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
                {status.server?.connections_reading ?? 0} / {status.server?.connections_writing ?? 0}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Đọc header / Gửi response</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <HeartPulse className="h-4 w-4 text-purple-600" />
                <span>Waiting (Keep-Alive)</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
                {status.server?.connections_waiting ?? 0}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Đang chờ request tiếp theo</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Database className="h-4 w-4 text-emerald-600" />
                <span>Database Status</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {status.database?.reachable ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Reachable
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    Unreachable
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">PostgreSQL Database</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Cpu className="h-4 w-4 text-amber-600" />
                <span>Node Hostname</span>
              </div>
              <div className="text-xs font-mono font-bold text-gray-800 mt-1 truncate" title={nodeInfo?.hostname}>
                {nodeInfo?.hostname || 'kong-node-1'}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 truncate">{nodeInfo?.lua_version || 'LuaJIT 2.1.0'}</div>
            </div>
          </div>
        )}

        {/* Step by Step Workflow Guides - Modern Neo-card Layout */}
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-gray-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-[10px] font-bold">✓</span>
                  Quy Trình Triển Khai Gateway Theo Phân Cấp Kiến Trúc Chuẩn
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Thứ tự phụ thuộc dữ liệu: <strong>Route</strong> ➔ <strong>Service</strong> ➔ <strong>Upstream & Target</strong> ➔ <strong>Consumer & Credential</strong> ➔ <strong>Plugin</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {workflowSteps.map((step) => (
                <Link
                  key={step.title}
                  href={step.href}
                  className={`p-3.5 rounded-xl border border-gray-200 bg-white transition-all group flex flex-col justify-between ${step.hoverBorder}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${step.badgeColor}`}>
                        {step.step}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-400 group-hover:text-blue-600 transition">
                        {step.stepNum}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <step.icon className="h-4 w-4 text-gray-700 shrink-0" />
                      <h4 className="font-bold text-gray-900 text-sm">{step.title}</h4>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
                      {step.description}
                    </p>
                  </div>
                  <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-blue-600 font-semibold">
                    <span>Cấu hình ngay</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dedicated Topology Flow Showcase Card */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-600/30 text-blue-400 border border-blue-500/30">
                <Zap className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Visual Architecture Canvas
              </span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Sơ Đồ Luồng Kiến Trúc & Node-Flow Graph (Trang Chuyên Biệt)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Trực quan hóa toàn diện trên Canvas độ nét cao: theo dõi đường đi của Request từ Client ➔ Route Match ➔ Plugins Check ➔ Service Forwarding ➔ Upstream LB ➔ Target Nodes với chế độ MiniMap, Zoom/Pan và bảng tra cứu chi tiết Node.
            </p>
          </div>

          <Link href="/topology" className="shrink-0">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-2 px-5 py-5 rounded-xl shadow-lg hover:shadow-blue-500/25 transition">
              <Zap className="h-4 w-4" />
              Mở Trang Sơ Đồ Topology
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Metric Statistics Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Thống Kê Tài Nguyên Gateway ({metrics.length} Nhóm Thực Thể)
            </h3>
            {isLoading && (
              <span className="text-xs text-blue-600 animate-pulse font-medium">Đang làm mới số liệu...</span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
            {metrics.map((metric) => (
              <Link key={metric.title} href={metric.href}>
                <Card className="hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold text-gray-700 truncate">{metric.title}</CardTitle>
                    <div className={`p-1.5 rounded-lg border ${metric.bgColor}`}>
                      <metric.icon className={`h-4 w-4 ${metric.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-gray-900 tracking-tight">{metric.value}</div>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-tight">{metric.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <DiagnosticsModal
        isOpen={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
      />
    </AppLayout>
  );
}
