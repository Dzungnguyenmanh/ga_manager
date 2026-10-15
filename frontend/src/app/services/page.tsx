'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { KongService } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Search,
  Sliders,
  ShieldCheck,
  Clock,
  Link as LinkIcon,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function ServicesPage() {
  const { activeCluster, activeClusterId } = useClusterStore();
  const [services, setServices] = React.useState<KongService[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'basic' | 'advanced'>('basic');

  // Selected Service for editing
  const [selectedService, setSelectedService] = React.useState<KongService | null>(null);

  // Form State: Basic
  const [urlShorthand, setUrlShorthand] = React.useState('');
  const [name, setName] = React.useState('');
  const [protocol, setProtocol] = React.useState('http');
  const [host, setHost] = React.useState('');
  const [port, setPort] = React.useState('80');
  const [path, setPath] = React.useState('/');
  const [tags, setTags] = React.useState('');
  const [owner, setOwner] = React.useState('');
  const [criticality, setCriticality] = React.useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // Form State: Advanced
  const [retries, setRetries] = React.useState('5');
  const [connectTimeout, setConnectTimeout] = React.useState('60000');
  const [readTimeout, setReadTimeout] = React.useState('60000');
  const [writeTimeout, setWriteTimeout] = React.useState('60000');
  const [tlsVerify, setTlsVerify] = React.useState<'default' | 'true' | 'false'>('default');
  const [tlsVerifyDepth, setTlsVerifyDepth] = React.useState('');
  const [caCertificates, setCaCertificates] = React.useState('');
  const [clientCertificateId, setClientCertificateId] = React.useState('');
  const [enabled, setEnabled] = React.useState(true);

  // Auto URL Parser helper
  const handleUrlShorthandChange = (val: string) => {
    setUrlShorthand(val);
    if (!val.trim()) return;

    try {
      let parsedUrl: URL;
      if (!val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('grpc://') && !val.startsWith('grpcs://')) {
        parsedUrl = new URL(`http://${val}`);
      } else {
        parsedUrl = new URL(val);
      }

      if (parsedUrl.protocol) {
        const proto = parsedUrl.protocol.replace(':', '');
        setProtocol(proto);
        if (proto === 'https' && (!port || port === '80')) {
          setPort('443');
        } else if (proto === 'http' && (!port || port === '443')) {
          setPort('80');
        }
      }

      if (parsedUrl.hostname) {
        setHost(parsedUrl.hostname);
      }

      if (parsedUrl.port) {
        setPort(parsedUrl.port);
      }

      if (parsedUrl.pathname) {
        setPath(parsedUrl.pathname);
      }
    } catch (e) {
      // Ignored during intermediate typing
    }
  };

  // Fetch services from Kong Gateway
  const fetchServices = React.useCallback(async () => {
    if (!activeClusterId) {
      setServices([]);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await api.get('/api/kong/services');
      setServices(res.data || []);
    } catch (err: any) {
      console.error('Error fetching Kong services:', err);
      setErrorMsg(err.response?.data?.error || 'Không thể kết nối Kong Gateway để lấy danh sách Services');
    } finally {
      setIsLoading(false);
    }
  }, [activeClusterId]);

  React.useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Reset form fields
  const resetForm = () => {
    setUrlShorthand('');
    setName('');
    setProtocol('http');
    setHost('');
    setPort('80');
    setPath('/');
    setTags('');
    setOwner('');
    setCriticality('medium');
    setRetries('5');
    setConnectTimeout('60000');
    setReadTimeout('60000');
    setWriteTimeout('60000');
    setTlsVerify('default');
    setTlsVerifyDepth('');
    setCaCertificates('');
    setClientCertificateId('');
    setEnabled(true);
    setActiveTab('basic');
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (!activeClusterId) {
      alert('Vui lòng chọn hoặc thêm một Kong Cluster trước!');
      return;
    }
    resetForm();
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (svc: KongService) => {
    setSelectedService(svc);
    setUrlShorthand('');
    setName(svc.name || '');
    setProtocol(svc.protocol || 'http');
    setHost(svc.host || '');
    setPort(svc.port ? svc.port.toString() : '80');
    setPath(svc.path || '/');

    // Parse metadata from tags
    const cleanTags: string[] = [];
    let extractedOwner = '';
    let extractedCrit: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    (svc.tags || []).forEach((t) => {
      if (t.startsWith('owner:')) {
        extractedOwner = t.slice(6);
      } else if (t.startsWith('criticality:')) {
        const val = t.slice(12) as any;
        if (['low', 'medium', 'high', 'critical'].includes(val)) {
          extractedCrit = val;
        }
      } else {
        cleanTags.push(t);
      }
    });

    setOwner(extractedOwner);
    setCriticality(extractedCrit);
    setTags(cleanTags.join(', '));
    
    // Advanced fields
    setRetries(svc.retries !== undefined ? svc.retries.toString() : '5');
    setConnectTimeout(svc.connect_timeout ? svc.connect_timeout.toString() : '60000');
    setReadTimeout(svc.read_timeout ? svc.read_timeout.toString() : '60000');
    setWriteTimeout(svc.write_timeout ? svc.write_timeout.toString() : '60000');
    setTlsVerify(svc.tls_verify === true ? 'true' : svc.tls_verify === false ? 'false' : 'default');
    setTlsVerifyDepth(svc.tls_verify_depth !== undefined && svc.tls_verify_depth !== null ? svc.tls_verify_depth.toString() : '');
    setCaCertificates(svc.ca_certificates ? svc.ca_certificates.join(', ') : '');
    setClientCertificateId(svc.client_certificate?.id || '');
    setEnabled(svc.enabled ?? true);

    setActiveTab('basic');
    setIsEditModalOpen(true);
  };

  // Create service directly in Kong
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClusterId) {
      alert('Vui lòng chọn hoặc thêm một Kong Cluster trước khi tạo Service!');
      return;
    }

    if (activeCluster?.environment === 'PROD' && !owner.trim()) {
      alert('⚠️ QUY TẮC PRODUCTION: Bắt buộc khai báo API Owner (Đội ngũ phụ trách) cho Service trên môi trường PROD!');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalTags = tags ? tags.split(',').map((t) => t.trim()).filter((t) => Boolean(t) && !t.startsWith('owner:') && !t.startsWith('criticality:')) : [];
      if (owner.trim()) {
        finalTags.push(`owner:${owner.trim()}`);
      }
      if (criticality) {
        finalTags.push(`criticality:${criticality}`);
      }

      const payload: Partial<KongService> = {
        name: name.trim(),
        protocol,
        host: host.trim(),
        port: parseInt(port, 10) || 80,
        path: path ? (path.startsWith('/') ? path : `/${path}`) : undefined,
        retries: parseInt(retries, 10) || 5,
        connect_timeout: parseInt(connectTimeout, 10) || 60000,
        read_timeout: parseInt(readTimeout, 10) || 60000,
        write_timeout: parseInt(writeTimeout, 10) || 60000,
        tls_verify: tlsVerify === 'true' ? true : tlsVerify === 'false' ? false : null,
        tls_verify_depth: tlsVerifyDepth ? parseInt(tlsVerifyDepth, 10) : null,
        ca_certificates: caCertificates ? caCertificates.split(',').map((c) => c.trim()).filter(Boolean) : undefined,
        client_certificate: clientCertificateId.trim() ? { id: clientCertificateId.trim() } : undefined,
        enabled,
        tags: finalTags.length > 0 ? finalTags : undefined,
      };

      const res = await api.post('/api/kong/services', payload);
      setServices((prev) => [res.data, ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(`Lỗi khi tạo Service trên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update service in Kong
  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    if (activeCluster?.environment === 'PROD' && !owner.trim()) {
      alert('⚠️ QUY TẮC PRODUCTION: Bắt buộc khai báo API Owner (Đội ngũ phụ trách) cho Service trên môi trường PROD!');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalTags = tags ? tags.split(',').map((t) => t.trim()).filter((t) => Boolean(t) && !t.startsWith('owner:') && !t.startsWith('criticality:')) : [];
      if (owner.trim()) {
        finalTags.push(`owner:${owner.trim()}`);
      }
      if (criticality) {
        finalTags.push(`criticality:${criticality}`);
      }

      const payload: Partial<KongService> = {
        id: selectedService.id,
        name: name.trim(),
        protocol,
        host: host.trim(),
        port: parseInt(port, 10) || 80,
        path: path ? (path.startsWith('/') ? path : `/${path}`) : '',
        retries: parseInt(retries, 10) || 5,
        connect_timeout: parseInt(connectTimeout, 10) || 60000,
        read_timeout: parseInt(readTimeout, 10) || 60000,
        write_timeout: parseInt(writeTimeout, 10) || 60000,
        tls_verify: tlsVerify === 'true' ? true : tlsVerify === 'false' ? false : null,
        tls_verify_depth: tlsVerifyDepth ? parseInt(tlsVerifyDepth, 10) : null,
        ca_certificates: caCertificates ? caCertificates.split(',').map((c) => c.trim()).filter(Boolean) : [],
        client_certificate: clientCertificateId.trim() ? { id: clientCertificateId.trim() } : undefined,
        enabled,
        tags: finalTags,
      };

      const res = await api.patch(`/api/kong/services/${selectedService.id}`, payload);
      setServices((prev) => prev.map((s) => (s.id === selectedService.id ? res.data : s)));
      setIsEditModalOpen(false);
      setSelectedService(null);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật Service trên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete service in Kong with Impact Analysis & PROD confirmation
  const handleDelete = async (id: string, serviceName?: string) => {
    try {
      // 1. Dependency Impact Analysis: check if routes depend on this service
      const routesRes = await api.get('/api/kong/routes').catch(() => ({ data: [] }));
      const dependentRoutes = (routesRes.data || []).filter((r: any) => r.service?.id === id);

      if (dependentRoutes.length > 0) {
        const routeNames = dependentRoutes.map((r: any) => r.name || r.paths?.[0] || r.id).join(', ');
        const confirmMsg = `⚠️ CẢNH BÁO TÁC ĐỘNG (Dependency Impact Analysis):\nService "${serviceName || id}" đang có ${dependentRoutes.length} Route phụ thuộc:\n[${routeNames}]\n\nXóa Service này sẽ khiến các Route trên bị gián đoạn hoạt động! Bạn có chắc chắn muốn tiếp tục không?`;
        if (!confirm(confirmMsg)) {
          return;
        }
      }

      // 2. PROD Environment safety check
      if (activeCluster?.environment === 'PROD') {
        const confirmed = prompt(
          `⚠️ CẢNH BÁO: Môi trường PRODUCTION (${activeCluster.name})!\nVui lòng nhập tên Service "${serviceName || id}" để xác nhận xóa:`
        );
        if (confirmed !== (serviceName || id)) {
          alert('Tên Service không khớp. Đã hủy thao tác xóa an toàn.');
          return;
        }
      } else if (dependentRoutes.length === 0) {
        if (!confirm(`Bạn có chắc muốn xóa Service "${serviceName || id}" khỏi Kong Gateway?`)) {
          return;
        }
      }

      await api.delete(`/api/kong/services/${id}`);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa Service trên Kong: ${err.response?.data?.error || err.message}`);
    }
  };

  // Filtered Services
  const filteredServices = React.useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.host.toLowerCase().includes(q) ||
        s.protocol?.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [services, searchQuery]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Kong Services</h1>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                2. Backend Services
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Đăng ký và cấu hình máy chủ backend / upstream trực tiếp vào Kong Gateway ({activeCluster ? activeCluster.name : 'Chưa chọn Cluster'})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchServices} disabled={isLoading} className="text-xs">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="h-4 w-4 mr-1.5" />
              Tạo Service mới
            </Button>
          </div>
        </div>

        {!activeClusterId && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span>Chưa có Kong Cluster nào được chọn. Vui lòng kết nối Cluster để quản lý Services.</span>
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
            <Button size="sm" variant="outline" onClick={fetchServices} className="h-7 text-xs bg-white">
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
              placeholder="Tìm theo tên Service, host, protocol, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs text-gray-500">
            Tổng cộng: <strong className="text-gray-900">{filteredServices.length}</strong> Services
          </span>
        </div>

        {/* Table Card */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b border-gray-100 pb-4 bg-gray-50/50 rounded-t-xl">
            <CardTitle className="text-base font-semibold">Danh sách Services trên Kong</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Các dịch vụ backend đang nhận định tuyến từ Kong Gateway
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-gray-400 space-y-2">
                <Loader2 className="h-7 w-7 animate-spin mx-auto text-blue-600" />
                <p className="text-xs">Đang tải danh sách Services từ Kong Admin API...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                  <Layers className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {searchQuery ? 'Không tìm thấy Service phù hợp' : 'Chưa có Service nào trên Kong'}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    Đăng ký dịch vụ backend đầu tiên để Kong Gateway bắt đầu chuyển tiếp traffic.
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={handleOpenCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo Service đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/70 hover:bg-gray-50/70 text-xs">
                    <TableHead className="font-semibold text-gray-700">Tên Service</TableHead>
                    <TableHead className="font-semibold text-gray-700">Protocol</TableHead>
                    <TableHead className="font-semibold text-gray-700">Host & Port</TableHead>
                    <TableHead className="font-semibold text-gray-700">Path Prefix</TableHead>
                    <TableHead className="font-semibold text-gray-700">Timeouts & Retries</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((svc) => {
                    const svcOwner = svc.tags?.find((t) => t.startsWith('owner:'))?.replace('owner:', '');
                    const svcCrit = svc.tags?.find((t) => t.startsWith('criticality:'))?.replace('criticality:', '');
                    return (
                      <TableRow key={svc.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                              <Layers className="h-4 w-4 shrink-0" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{svc.name}</span>
                                {svcCrit && (
                                  <span
                                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      svcCrit === 'critical'
                                        ? 'bg-red-100 text-red-700 border border-red-200'
                                        : svcCrit === 'high'
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                        : svcCrit === 'medium'
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                                    }`}
                                  >
                                    {svcCrit}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] text-gray-400">ID: {svc.id.slice(0, 8)}...</span>
                                {svcOwner && (
                                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-medium">
                                    👤 {svcOwner}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      <TableCell>
                        <Badge variant={svc.protocol === 'https' ? 'success' : 'secondary'} className="text-[11px] font-mono">
                          {svc.protocol?.toUpperCase() || 'HTTP'}
                        </Badge>
                        {svc.tls_verify === true && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-0.5">
                            <ShieldCheck className="h-3 w-3" /> TLS Verified
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-700">
                        <span className="font-semibold">{svc.host}</span>:{svc.port}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{svc.path || '/'}</TableCell>
                      <TableCell className="font-mono text-[11px] text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>{(svc.connect_timeout || 60000) / 1000}s / {(svc.read_timeout || 60000) / 1000}s</span>
                          <span className="text-gray-400">• {svc.retries ?? 5} retries</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(svc)}
                            className="h-7 text-xs bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                            title="Chỉnh sửa Service"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1 text-blue-600" />
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(svc.id, svc.name)}
                            className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Xóa Service"
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
      {/* MODAL: TẠO SERVICE MỚI (TABBED: CƠ BẢN & NÂNG CAO) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo Kong Service mới"
        description="Đăng ký dịch vụ backend trực tiếp lên Kong Admin API"
      >
        <form onSubmit={handleAddService} className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 -mt-1 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              1. Cấu hình Cơ bản
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'advanced'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              2. Cấu hình Nâng cao (Timeouts & TLS)
            </button>
          </div>

          {/* Tab 1: Cấu hình Cơ bản */}
          {activeTab === 'basic' && (
            <div className="space-y-3.5">
              {/* Auto URL Parser Bar */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>Dán URL Đầy Đủ (Tự Động Bóc Tách)</span>
                </div>
                <input
                  type="text"
                  placeholder="https://api.internal.com:8443/v1/orders"
                  value={urlShorthand}
                  onChange={(e) => handleUrlShorthandChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-blue-300 bg-white px-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-blue-700/80">
                  Hệ thống sẽ tự động trích xuất Protocol, Host, Port và Path prefix vào các ô bên dưới.
                </p>
              </div>

              <Input
                label="Tên Service (bắt buộc)"
                placeholder="order-backend-service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="grpc">gRPC</option>
                    <option value="grpcs">gRPCS</option>
                    <option value="tcp">TCP</option>
                    <option value="tls">TLS</option>
                    <option value="udp">UDP</option>
                  </select>
                </div>

                <Input
                  label="Port"
                  type="number"
                  placeholder="80"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Host (Tên miền, IP hoặc tên Upstream Pool)"
                placeholder="httpbin.org hoặc order-backend-pool"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                helperText="Nếu khớp với tên một Upstream, Kong sẽ tự động cân bằng tải tới các Target nodes"
                required
              />

              <Input
                label="Path Prefix (Tùy chọn)"
                placeholder="/api/v1"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={`API Owner / Đội ngũ phụ trách${activeCluster?.environment === 'PROD' ? ' *' : ''}`}
                  placeholder="team-checkout / john.doe"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  helperText={activeCluster?.environment === 'PROD' ? 'Bắt buộc trên môi trường PROD' : 'Tùy chọn'}
                  required={activeCluster?.environment === 'PROD'}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ quan trọng (Criticality)</label>
                  <select
                    value={criticality}
                    onChange={(e) => setCriticality(e.target.value as any)}
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="critical">Critical (Tối quan trọng)</option>
                    <option value="high">High (Cao)</option>
                    <option value="medium">Medium (Trung bình)</option>
                    <option value="low">Low (Thấp)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Tags (cách nhau bằng dấu phẩy)"
                placeholder="prod, payments, v1"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          )}

          {/* Tab 2: Cấu hình Nâng cao */}
          {activeTab === 'advanced' && (
            <div className="space-y-4 text-xs">
              {/* Section: Timeouts & Retries */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <Clock className="h-4 w-4 text-blue-600" /> Timeouts & Retries
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Số lần Retries"
                    type="number"
                    value={retries}
                    onChange={(e) => setRetries(e.target.value)}
                    helperText="Mặc định: 5 lần"
                  />
                  <Input
                    label="Connect Timeout (ms)"
                    type="number"
                    value={connectTimeout}
                    onChange={(e) => setConnectTimeout(e.target.value)}
                    helperText="Mặc định: 60000ms"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Read Timeout (ms)"
                    type="number"
                    value={readTimeout}
                    onChange={(e) => setReadTimeout(e.target.value)}
                    helperText="Mặc định: 60000ms"
                  />
                  <Input
                    label="Write Timeout (ms)"
                    type="number"
                    value={writeTimeout}
                    onChange={(e) => setWriteTimeout(e.target.value)}
                    helperText="Mặc định: 60000ms"
                  />
                </div>
              </div>

              {/* Section: Upstream TLS & mTLS */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Bảo Mật Upstream TLS & mTLS
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">TLS Verify</label>
                    <select
                      value={tlsVerify}
                      onChange={(e) => setTlsVerify(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-gray-300 bg-white px-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="default">Mặc định (Default)</option>
                      <option value="true">Xác thực chứng chỉ (Verify: True)</option>
                      <option value="false">Không xác thực (Do Not Verify: False)</option>
                    </select>
                  </div>

                  <Input
                    label="TLS Verify Depth (Độ sâu chuỗi cert)"
                    type="number"
                    placeholder="Null / 1-5"
                    value={tlsVerifyDepth}
                    onChange={(e) => setTlsVerifyDepth(e.target.value)}
                  />
                </div>

                <Input
                  label="CA Certificates (IDs cách nhau bằng dấu phẩy)"
                  placeholder="ca-cert-id-1, ca-cert-id-2"
                  value={caCertificates}
                  onChange={(e) => setCaCertificates(e.target.value)}
                  helperText="Danh sách ID chứng chỉ CA để xác thực upstream"
                />

                <Input
                  label="Client Certificate ID (mTLS)"
                  placeholder="cert-uuid-for-client-auth"
                  value={clientCertificateId}
                  onChange={(e) => setClientCertificateId(e.target.value)}
                  helperText="ID chứng chỉ mTLS gửi tới máy chủ backend"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="enabledCreate"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enabledCreate" className="text-xs font-medium text-gray-700">
                  Kích hoạt Service này ngay sau khi tạo (Enabled)
                </label>
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
      {/* MODAL: CHỈNH SỬA SERVICE (TABBED: CƠ BẢN & NÂNG CAO) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedService(null);
        }}
        title={`Chỉnh sửa Service: ${selectedService?.name || ''}`}
        description="Cập nhật cấu hình dịch vụ backend trên Kong Gateway"
      >
        <form onSubmit={handleUpdateService} className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 -mt-1 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              1. Cấu hình Cơ bản
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'advanced'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              2. Cấu hình Nâng cao (Timeouts & TLS)
            </button>
          </div>

          {/* Tab 1: Cấu hình Cơ bản */}
          {activeTab === 'basic' && (
            <div className="space-y-3.5">
              <Input
                label="Tên Service (bắt buộc)"
                placeholder="order-backend-service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="grpc">gRPC</option>
                    <option value="grpcs">gRPCS</option>
                    <option value="tcp">TCP</option>
                    <option value="tls">TLS</option>
                    <option value="udp">UDP</option>
                  </select>
                </div>

                <Input
                  label="Port"
                  type="number"
                  placeholder="80"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Host"
                placeholder="httpbin.org hoặc order-backend-pool"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                helperText="Địa chỉ máy chủ đích hoặc tên Virtual Upstream"
                required
              />

              <Input
                label="Path Prefix"
                placeholder="/api/v1"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={`API Owner / Đội ngũ phụ trách${activeCluster?.environment === 'PROD' ? ' *' : ''}`}
                  placeholder="team-checkout / john.doe"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  helperText={activeCluster?.environment === 'PROD' ? 'Bắt buộc trên môi trường PROD' : 'Tùy chọn'}
                  required={activeCluster?.environment === 'PROD'}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Criticality (Mức độ quan trọng)</label>
                  <select
                    value={criticality}
                    onChange={(e) => setCriticality(e.target.value as any)}
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="critical">Critical (Tối quan trọng)</option>
                    <option value="high">High (Cao)</option>
                    <option value="medium">Medium (Trung bình)</option>
                    <option value="low">Low (Thấp)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Tags (cách nhau bằng dấu phẩy)"
                placeholder="prod, payments, v1"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          )}

          {/* Tab 2: Cấu hình Nâng cao */}
          {activeTab === 'advanced' && (
            <div className="space-y-4 text-xs">
              {/* Section: Timeouts & Retries */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <Clock className="h-4 w-4 text-blue-600" /> Timeouts & Retries
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Số lần Retries"
                    type="number"
                    value={retries}
                    onChange={(e) => setRetries(e.target.value)}
                    helperText="Mặc định: 5 lần"
                  />
                  <Input
                    label="Connect Timeout (ms)"
                    type="number"
                    value={connectTimeout}
                    onChange={(e) => setConnectTimeout(e.target.value)}
                    helperText="Mặc định: 60000ms"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Read Timeout (ms)"
                    type="number"
                    value={readTimeout}
                    onChange={(e) => setReadTimeout(e.target.value)}
                    helperText="Mặc định: 60000ms"
                  />
                  <Input
                    label="Write Timeout (ms)"
                    type="number"
                    value={writeTimeout}
                    onChange={(e) => setWriteTimeout(e.target.value)}
                    helperText="Mặc định: 60000ms"
                  />
                </div>
              </div>

              {/* Section: Upstream TLS & mTLS */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Bảo Mật Upstream TLS & mTLS
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">TLS Verify</label>
                    <select
                      value={tlsVerify}
                      onChange={(e) => setTlsVerify(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-gray-300 bg-white px-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="default">Mặc định (Default)</option>
                      <option value="true">Xác thực chứng chỉ (Verify: True)</option>
                      <option value="false">Không xác thực (Do Not Verify: False)</option>
                    </select>
                  </div>

                  <Input
                    label="TLS Verify Depth (Độ sâu chuỗi cert)"
                    type="number"
                    placeholder="Null / 1-5"
                    value={tlsVerifyDepth}
                    onChange={(e) => setTlsVerifyDepth(e.target.value)}
                  />
                </div>

                <Input
                  label="CA Certificates (IDs cách nhau bằng dấu phẩy)"
                  placeholder="ca-cert-id-1, ca-cert-id-2"
                  value={caCertificates}
                  onChange={(e) => setCaCertificates(e.target.value)}
                />

                <Input
                  label="Client Certificate ID (mTLS)"
                  placeholder="cert-uuid-for-client-auth"
                  value={clientCertificateId}
                  onChange={(e) => setClientCertificateId(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="enabledEdit"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enabledEdit" className="text-xs font-medium text-gray-700">
                  Kích hoạt Service này (Enabled)
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedService(null);
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
