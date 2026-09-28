'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { KongRoute, KongService } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import { 
  Route as RouteIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Search,
  Sliders,
  Globe,
  FileCode,
  ShieldAlert,
  SlidersHorizontal,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';

interface HeaderPair {
  key: string;
  values: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export default function RoutesPage() {
  const { activeCluster, activeClusterId } = useClusterStore();
  const [routes, setRoutes] = React.useState<KongRoute[]>([]);
  const [services, setServices] = React.useState<KongService[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'basic' | 'advanced'>('basic');

  // Selected route for editing
  const [selectedRoute, setSelectedRoute] = React.useState<KongRoute | null>(null);

  // Form State: Basic
  const [name, setName] = React.useState('');
  const [paths, setPaths] = React.useState('/');
  const [selectedMethods, setSelectedMethods] = React.useState<string[]>([]);
  const [hosts, setHosts] = React.useState('');
  const [selectedServiceId, setSelectedServiceId] = React.useState('');
  const [protocols, setProtocols] = React.useState<string[]>(['http', 'https']);
  const [tags, setTags] = React.useState('');

  // Form State: Advanced
  const [stripPath, setStripPath] = React.useState(true);
  const [preserveHost, setPreserveHost] = React.useState(false);
  const [regexPriority, setRegexPriority] = React.useState('0');
  const [pathHandling, setPathHandling] = React.useState<'v0' | 'v1'>('v0');
  const [httpsRedirectCode, setHttpsRedirectCode] = React.useState('426');
  const [requestBuffering, setRequestBuffering] = React.useState(true);
  const [responseBuffering, setResponseBuffering] = React.useState(true);
  const [snis, setSnis] = React.useState('');
  const [headersList, setHeadersList] = React.useState<HeaderPair[]>([]);

  // Method toggle helper
  const toggleMethod = (method: string) => {
    if (selectedMethods.includes(method)) {
      setSelectedMethods(selectedMethods.filter((m) => m !== method));
    } else {
      setSelectedMethods([...selectedMethods, method]);
    }
  };

  // Header pair helpers
  const addHeaderPair = () => {
    setHeadersList([...headersList, { key: '', values: '' }]);
  };

  const updateHeaderPair = (index: number, field: 'key' | 'values', val: string) => {
    const updated = [...headersList];
    updated[index][field] = val;
    setHeadersList(updated);
  };

  const removeHeaderPair = (index: number) => {
    setHeadersList(headersList.filter((_, i) => i !== index));
  };

  // Fetch routes and services from Kong Gateway
  const fetchData = React.useCallback(async () => {
    if (!activeClusterId) {
      setRoutes([]);
      setServices([]);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const [routesRes, servicesRes] = await Promise.all([
        api.get('/api/kong/routes'),
        api.get('/api/kong/services'),
      ]);
      setRoutes(routesRes.data || []);
      const svcs: KongService[] = servicesRes.data || [];
      setServices(svcs);
    } catch (err: any) {
      console.error('Error fetching Kong routes/services:', err);
      setErrorMsg(err.response?.data?.error || 'Không thể kết nối Kong Gateway để lấy danh sách Routes');
    } finally {
      setIsLoading(false);
    }
  }, [activeClusterId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset Form
  const resetForm = () => {
    setName('');
    setPaths('/');
    setSelectedMethods([]);
    setHosts('');
    setSelectedServiceId(services.length > 0 ? services[0].id : '');
    setProtocols(['http', 'https']);
    setTags('');
    setStripPath(true);
    setPreserveHost(false);
    setRegexPriority('0');
    setPathHandling('v0');
    setHttpsRedirectCode('426');
    setRequestBuffering(true);
    setResponseBuffering(true);
    setSnis('');
    setHeadersList([]);
    setActiveTab('basic');
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (!activeClusterId) {
      alert('Vui lòng chọn một Kong Cluster trước!');
      return;
    }
    resetForm();
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (route: KongRoute) => {
    setSelectedRoute(route);
    setName(route.name || '');
    setPaths(route.paths && route.paths.length > 0 ? route.paths.join(', ') : '/');
    setSelectedMethods(route.methods || []);
    setHosts(route.hosts ? route.hosts.join(', ') : '');
    setSelectedServiceId(route.service?.id || '');
    setProtocols(route.protocols && route.protocols.length > 0 ? route.protocols : ['http', 'https']);
    setTags(route.tags ? route.tags.join(', ') : '');

    // Advanced fields
    setStripPath(route.strip_path ?? true);
    setPreserveHost(route.preserve_host ?? false);
    setRegexPriority(route.regex_priority !== undefined ? route.regex_priority.toString() : '0');
    setPathHandling(route.path_handling || 'v0');
    setHttpsRedirectCode(route.https_redirect_status_code ? route.https_redirect_status_code.toString() : '426');
    setRequestBuffering(route.request_buffering ?? true);
    setResponseBuffering(route.response_buffering ?? true);
    setSnis(route.snis ? route.snis.join(', ') : '');

    // Parse Headers
    if (route.headers && Object.keys(route.headers).length > 0) {
      const parsed: HeaderPair[] = Object.entries(route.headers).map(([k, v]) => ({
        key: k,
        values: Array.isArray(v) ? v.join(', ') : String(v),
      }));
      setHeadersList(parsed);
    } else {
      setHeadersList([]);
    }

    setActiveTab('basic');
    setIsEditModalOpen(true);
  };

  // Build Payload
  const buildPayload = () => {
    // Process paths
    const parsedPaths = paths
      ? paths
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => (p.startsWith('/') || p.startsWith('~') ? p : `/${p}`))
      : ['/'];

    // Process hosts
    const parsedHosts = hosts
      ? hosts.split(',').map((h) => h.trim()).filter(Boolean)
      : undefined;

    // Process snis
    const parsedSnis = snis
      ? snis.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    // Process headers map
    let headersMap: Record<string, string[]> | undefined = undefined;
    if (headersList.length > 0) {
      headersMap = {};
      headersList.forEach((pair) => {
        if (pair.key.trim() && pair.values.trim()) {
          headersMap![pair.key.trim()] = pair.values.split(',').map((v) => v.trim()).filter(Boolean);
        }
      });
      if (Object.keys(headersMap).length === 0) headersMap = undefined;
    }

    const payload: Partial<KongRoute> = {
      name: name.trim() || undefined,
      protocols: protocols.length > 0 ? protocols : ['http', 'https'],
      paths: parsedPaths,
      methods: selectedMethods.length > 0 ? selectedMethods : undefined,
      hosts: parsedHosts,
      headers: headersMap,
      snis: parsedSnis,
      strip_path: stripPath,
      preserve_host: preserveHost,
      regex_priority: parseInt(regexPriority, 10) || 0,
      path_handling: pathHandling,
      https_redirect_status_code: parseInt(httpsRedirectCode, 10) || 426,
      request_buffering: requestBuffering,
      response_buffering: responseBuffering,
      service: selectedServiceId ? { id: selectedServiceId } : undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    };

    return payload;
  };

  // Create route directly in Kong
  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClusterId) {
      alert('Vui lòng chọn một Kong Cluster trước!');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = buildPayload();
      const res = await api.post('/api/kong/routes', payload);
      setRoutes((prev) => [res.data, ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(`Lỗi khi tạo Route trên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update route in Kong
  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;

    try {
      setIsSubmitting(true);
      const payload = buildPayload();
      const res = await api.patch(`/api/kong/routes/${selectedRoute.id}`, payload);
      setRoutes((prev) => prev.map((r) => (r.id === selectedRoute.id ? res.data : r)));
      setIsEditModalOpen(false);
      setSelectedRoute(null);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật Route trên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete route in Kong
  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa Route này khỏi Kong Gateway?')) {
      try {
        await api.delete(`/api/kong/routes/${id}`);
        setRoutes((prev) => prev.filter((r) => r.id !== id));
      } catch (err: any) {
        alert(`Lỗi khi xóa Route trên Kong: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  // Filtered routes
  const filteredRoutes = React.useMemo(() => {
    if (!searchQuery.trim()) return routes;
    const q = searchQuery.toLowerCase();
    return routes.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        r.paths?.some((p) => p.toLowerCase().includes(q)) ||
        r.methods?.some((m) => m.toLowerCase().includes(q)) ||
        r.hosts?.some((h) => h.toLowerCase().includes(q)) ||
        (r.service?.id && r.service.id.toLowerCase().includes(q))
    );
  }, [routes, searchQuery]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Kong Routes</h1>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                1. Traffic Ingress
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Định tuyến các request từ client đến các Kong Services tương ứng ({activeCluster ? activeCluster.name : 'Chưa chọn Cluster'})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="text-xs">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="h-4 w-4 mr-1.5" />
              Tạo Route mới
            </Button>
          </div>
        </div>

        {!activeClusterId && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span>Chưa có Kong Cluster nào được chọn. Vui lòng kết nối Cluster để quản lý Routes.</span>
            </div>
            <Link href="/settings/clusters">
              <Button size="sm" variant="outline" className="text-xs bg-white text-amber-900 border-amber-300">
                Chọn Cluster
              </Button>
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <Button size="sm" variant="outline" onClick={fetchData} className="h-7 text-xs bg-white">
              Thử lại
            </Button>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên Route, path, method, host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-gray-500">
            Tổng cộng: <strong className="text-gray-900">{filteredRoutes.length}</strong> Routes
          </span>
        </div>

        {/* Table Card */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b border-gray-100 pb-4 bg-gray-50/50 rounded-t-xl">
            <CardTitle className="text-base font-semibold">Danh sách Routes trên Kong</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Các quy tắc routing URL đang có hiệu lực trên Gateway
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-gray-400 space-y-2">
                <Loader2 className="h-7 w-7 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs">Đang tải danh sách Routes từ Kong Admin API...</p>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                  <RouteIcon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {searchQuery ? 'Không tìm thấy Route phù hợp' : 'Chưa có Route nào trên Kong'}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    Tạo đường dẫn định tuyến đầu tiên để nhận diện các yêu cầu HTTP/HTTPS.
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={handleOpenCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo Route đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/70 hover:bg-gray-50/70 text-xs">
                    <TableHead className="font-semibold text-gray-700">Tên Route</TableHead>
                    <TableHead className="font-semibold text-gray-700">Target Service</TableHead>
                    <TableHead className="font-semibold text-gray-700">Paths</TableHead>
                    <TableHead className="font-semibold text-gray-700">Methods</TableHead>
                    <TableHead className="font-semibold text-gray-700">Hosts & Headers</TableHead>
                    <TableHead className="font-semibold text-gray-700">Hành vi</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoutes.map((rt) => {
                    const matchedService = services.find((s) => s.id === rt.service?.id);
                    const headerCount = rt.headers ? Object.keys(rt.headers).length : 0;
                    return (
                      <TableRow key={rt.id} className="hover:bg-emerald-50/30 transition-colors">
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <RouteIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-semibold text-gray-900 block">{rt.name || 'Unnamed Route'}</span>
                              <span className="font-mono text-[10px] text-gray-400">ID: {rt.id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {matchedService ? (
                            <Badge variant="outline" className="font-mono text-[11px] bg-blue-50 text-blue-700 border-blue-200">
                              {matchedService.name} ({matchedService.host}:{matchedService.port})
                            </Badge>
                          ) : rt.service?.id ? (
                            <Badge variant="outline" className="font-mono text-[11px]">
                              {rt.service.id.slice(0, 8)}...
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Không gắn service</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-blue-600 font-semibold">
                          {rt.paths?.join(', ') || '/'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {rt.methods && rt.methods.length > 0 ? (
                              rt.methods.map((m) => (
                                <Badge key={m} variant="secondary" className="font-mono text-[10px]">
                                  {m}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="secondary" className="font-mono text-[10px] bg-gray-100 text-gray-600">
                                ALL
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-[11px]">
                            {rt.hosts && rt.hosts.length > 0 ? (
                              <div className="flex items-center gap-1 font-mono text-gray-700">
                                <Globe className="h-3 w-3 text-indigo-500" />
                                <span>{rt.hosts.join(', ')}</span>
                              </div>
                            ) : null}
                            {headerCount > 0 ? (
                              <span className="inline-block font-mono text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200">
                                {headerCount} headers match
                              </span>
                            ) : null}
                            {!rt.hosts?.length && !headerCount && (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-mono text-gray-600 space-y-0.5">
                          <div>strip_path: <span className="font-bold text-gray-900">{rt.strip_path ? 'true' : 'false'}</span></div>
                          {rt.preserve_host && <div className="text-purple-600 font-semibold">preserve_host: true</div>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditModal(rt)}
                              className="h-7 text-xs bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              title="Chỉnh sửa Route"
                            >
                              <Edit3 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                              Sửa
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(rt.id)}
                              className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              title="Xóa Route"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: TẠO ROUTE MỚI (TABBED: CƠ BẢN & NÂNG CAO) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo Kong Route mới"
        description="Định tuyến đường dẫn URL trực tiếp lên Kong Gateway"
      >
        <form onSubmit={handleAddRoute} className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 -mt-1 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              1. Tiêu chí Cơ bản
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'advanced'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              2. Tiêu chí Nâng cao & Headers
            </button>
          </div>

          {/* Tab 1: Cơ bản */}
          {activeTab === 'basic' && (
            <div className="space-y-3.5">
              <Input
                label="Tên Route"
                placeholder="api-users-v1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gắn vào Service</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Không gắn service --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.host}:{s.port})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Path Matching (Hỗ trợ nhiều path cách nhau bằng dấu phẩy hoặc Regex)"
                placeholder="/api/v1/users, /api/v2/users, ~/users/\d+"
                value={paths}
                onChange={(e) => setPaths(e.target.value)}
                helperText="Bắt đầu bằng / hoặc ~ cho biểu thức chính quy (Regex)"
                required
              />

              {/* Methods Multi-Select Badges */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  HTTP Methods (Chọn nhiều method, để trống = ALL)
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {HTTP_METHODS.map((m) => {
                    const isSelected = selectedMethods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMethod(m)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                  {selectedMethods.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethods([])}
                      className="px-2.5 py-1 text-xs text-red-600 hover:underline"
                    >
                      Xóa chọn
                    </button>
                  )}
                </div>
              </div>

              <Input
                label="Hosts / Domains (cách nhau bằng dấu phẩy)"
                placeholder="api.example.com, *.service.io"
                value={hosts}
                onChange={(e) => setHosts(e.target.value)}
                helperText="Khớp request theo Host header gửi lên"
              />

              <Input
                label="Tags (cách nhau bằng dấu phẩy)"
                placeholder="v1, public, mobile"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          )}

          {/* Tab 2: Nâng cao */}
          {activeTab === 'advanced' && (
            <div className="space-y-4 text-xs">
              {/* Header Match Rules */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                    <FileCode className="h-4 w-4 text-emerald-600" /> Header Match Rules
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={addHeaderPair} className="h-7 text-xs bg-white">
                    <Plus className="h-3 w-3 mr-1" /> Thêm Header
                  </Button>
                </div>
                {headersList.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">Chưa cấu hình header match nào</p>
                ) : (
                  <div className="space-y-2">
                    {headersList.map((pair, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Header (e.g. X-Version)"
                          value={pair.key}
                          onChange={(e) => updateHeaderPair(idx, 'key', e.target.value)}
                          className="w-1/2 h-8 rounded border border-gray-300 bg-white px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Values (v1, v2)"
                          value={pair.values}
                          onChange={(e) => updateHeaderPair(idx, 'values', e.target.value)}
                          className="w-1/2 h-8 rounded border border-gray-300 bg-white px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeHeaderPair(idx)}
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Routing Behaviors */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <SlidersHorizontal className="h-4 w-4 text-blue-600" /> Hành Vi Định Tuyến (Routing Behaviors)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="stripPathCreate"
                        checked={stripPath}
                        onChange={(e) => setStripPath(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="stripPathCreate" className="font-medium text-gray-700">
                        Strip Path (Cắt bỏ prefix)
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="preserveHostCreate"
                        checked={preserveHost}
                        onChange={(e) => setPreserveHost(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="preserveHostCreate" className="font-medium text-gray-700">
                        Preserve Host (Giữ nguyên Host)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="reqBufferingCreate"
                        checked={requestBuffering}
                        onChange={(e) => setRequestBuffering(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="reqBufferingCreate" className="font-medium text-gray-700">
                        Request Buffering
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="respBufferingCreate"
                        checked={responseBuffering}
                        onChange={(e) => setResponseBuffering(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="respBufferingCreate" className="font-medium text-gray-700">
                        Response Buffering
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-gray-200">
                  <Input
                    label="Regex Priority"
                    type="number"
                    value={regexPriority}
                    onChange={(e) => setRegexPriority(e.target.value)}
                    helperText="Mặc định: 0"
                  />

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Path Handling</label>
                    <select
                      value={pathHandling}
                      onChange={(e) => setPathHandling(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="v0">v0 (Kong Default)</option>
                      <option value="v1">v1 (RFC 3986)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">HTTPS Redirect Code</label>
                    <select
                      value={httpsRedirectCode}
                      onChange={(e) => setHttpsRedirectCode(e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="426">426 Upgrade Required</option>
                      <option value="301">301 Moved Permanently</option>
                      <option value="302">302 Found</option>
                      <option value="307">307 Temp Redirect</option>
                      <option value="308">308 Permanent Redirect</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="SNIs (TLS Server Name Indication)"
                  placeholder="api.domain.com, ssl.domain.com"
                  value={snis}
                  onChange={(e) => setSnis(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Lưu vào Kong
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CHỈNH SỬA ROUTE (TABBED: CƠ BẢN & NÂNG CAO) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRoute(null);
        }}
        title={`Chỉnh sửa Route: ${selectedRoute?.name || selectedRoute?.id || ''}`}
        description="Cập nhật quy tắc định tuyến trên Kong Gateway"
      >
        <form onSubmit={handleUpdateRoute} className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 -mt-1 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              1. Tiêu chí Cơ bản
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'advanced'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              2. Tiêu chí Nâng cao & Headers
            </button>
          </div>

          {/* Tab 1: Cơ bản */}
          {activeTab === 'basic' && (
            <div className="space-y-3.5">
              <Input
                label="Tên Route"
                placeholder="api-users-v1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gắn vào Service</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Không gắn service --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.host}:{s.port})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Path Matching (cách nhau bằng dấu phẩy hoặc Regex)"
                placeholder="/api/v1/users, ~/users/\d+"
                value={paths}
                onChange={(e) => setPaths(e.target.value)}
                required
              />

              {/* Methods Multi-Select Badges */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  HTTP Methods (Chọn nhiều method, để trống = ALL)
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {HTTP_METHODS.map((m) => {
                    const isSelected = selectedMethods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMethod(m)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                  {selectedMethods.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethods([])}
                      className="px-2.5 py-1 text-xs text-red-600 hover:underline"
                    >
                      Xóa chọn
                    </button>
                  )}
                </div>
              </div>

              <Input
                label="Hosts / Domains (cách nhau bằng dấu phẩy)"
                placeholder="api.example.com, *.service.io"
                value={hosts}
                onChange={(e) => setHosts(e.target.value)}
              />

              <Input
                label="Tags (cách nhau bằng dấu phẩy)"
                placeholder="v1, public, mobile"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          )}

          {/* Tab 2: Nâng cao */}
          {activeTab === 'advanced' && (
            <div className="space-y-4 text-xs">
              {/* Header Match Rules */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                    <FileCode className="h-4 w-4 text-emerald-600" /> Header Match Rules
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={addHeaderPair} className="h-7 text-xs bg-white">
                    <Plus className="h-3 w-3 mr-1" /> Thêm Header
                  </Button>
                </div>
                {headersList.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">Chưa cấu hình header match nào</p>
                ) : (
                  <div className="space-y-2">
                    {headersList.map((pair, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Header (e.g. X-Version)"
                          value={pair.key}
                          onChange={(e) => updateHeaderPair(idx, 'key', e.target.value)}
                          className="w-1/2 h-8 rounded border border-gray-300 bg-white px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Values (v1, v2)"
                          value={pair.values}
                          onChange={(e) => updateHeaderPair(idx, 'values', e.target.value)}
                          className="w-1/2 h-8 rounded border border-gray-300 bg-white px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeHeaderPair(idx)}
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Routing Behaviors */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <SlidersHorizontal className="h-4 w-4 text-blue-600" /> Hành Vi Định Tuyến (Routing Behaviors)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="stripPathEdit"
                        checked={stripPath}
                        onChange={(e) => setStripPath(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="stripPathEdit" className="font-medium text-gray-700">
                        Strip Path (Cắt bỏ prefix)
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="preserveHostEdit"
                        checked={preserveHost}
                        onChange={(e) => setPreserveHost(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="preserveHostEdit" className="font-medium text-gray-700">
                        Preserve Host (Giữ nguyên Host)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="reqBufferingEdit"
                        checked={requestBuffering}
                        onChange={(e) => setRequestBuffering(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="reqBufferingEdit" className="font-medium text-gray-700">
                        Request Buffering
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="respBufferingEdit"
                        checked={responseBuffering}
                        onChange={(e) => setResponseBuffering(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="respBufferingEdit" className="font-medium text-gray-700">
                        Response Buffering
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-gray-200">
                  <Input
                    label="Regex Priority"
                    type="number"
                    value={regexPriority}
                    onChange={(e) => setRegexPriority(e.target.value)}
                    helperText="Mặc định: 0"
                  />

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Path Handling</label>
                    <select
                      value={pathHandling}
                      onChange={(e) => setPathHandling(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="v0">v0 (Kong Default)</option>
                      <option value="v1">v1 (RFC 3986)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">HTTPS Redirect Code</label>
                    <select
                      value={httpsRedirectCode}
                      onChange={(e) => setHttpsRedirectCode(e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="426">426 Upgrade Required</option>
                      <option value="301">301 Moved Permanently</option>
                      <option value="302">302 Found</option>
                      <option value="307">307 Temp Redirect</option>
                      <option value="308">308 Permanent Redirect</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="SNIs (TLS Server Name Indication)"
                  placeholder="api.domain.com, ssl.domain.com"
                  value={snis}
                  onChange={(e) => setSnis(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedRoute(null);
              }}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
