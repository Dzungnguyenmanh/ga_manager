'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { KongCertificate, KongSNI, KongCACertificate } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import {
  ShieldCheck,
  Shield,
  Plus,
  Trash2,
  Lock,
  Globe,
  Key,
  FileCode,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

type CertTab = 'server-certs' | 'ca-certs';

export default function CertificatesPage() {
  const { activeCluster, activeClusterId } = useClusterStore();
  const [activeTab, setActiveTab] = React.useState<CertTab>('server-certs');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Server Certificates & SNIs State
  const [certs, setCerts] = React.useState<KongCertificate[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  // CA Certificates State
  const [caCerts, setCaCerts] = React.useState<KongCACertificate[]>([]);
  const [isLoadingCaCerts, setIsLoadingCaCerts] = React.useState(false);

  // Modals state
  const [isAddCertModalOpen, setIsAddCertModalOpen] = React.useState(false);
  const [isAddCaCertModalOpen, setIsAddCaCertModalOpen] = React.useState(false);
  const [isViewCertModalOpen, setIsViewCertModalOpen] = React.useState(false);
  const [selectedCertToView, setSelectedCertToView] = React.useState<KongCertificate | null>(null);

  // Form State for Server Cert
  const [certPem, setCertPem] = React.useState('');
  const [keyPem, setKeyPem] = React.useState('');
  const [snisInput, setSnisInput] = React.useState('');
  const [certTags, setCertTags] = React.useState('');
  const [isSubmittingCert, setIsSubmittingCert] = React.useState(false);

  // Form State for CA Cert
  const [caCertPem, setCaCertPem] = React.useState('');
  const [caCertTags, setCaCertTags] = React.useState('');
  const [isSubmittingCaCert, setIsSubmittingCaCert] = React.useState(false);

  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fetch Server Certificates
  const fetchCertificates = React.useCallback(async () => {
    if (!activeClusterId) {
      setCerts([]);
      return;
    }
    try {
      setIsLoadingCerts(true);
      setErrorMsg('');
      const res = await api.get('/api/kong/certificates');
      setCerts(res.data || []);
    } catch (err: any) {
      console.error('Error fetching certificates:', err);
      setErrorMsg(err.response?.data?.error || 'Không thể lấy danh sách chứng chỉ từ Kong');
    } finally {
      setIsLoadingCerts(false);
    }
  }, [activeClusterId]);

  // Fetch CA Certificates
  const fetchCACertificates = React.useCallback(async () => {
    if (!activeClusterId) {
      setCaCerts([]);
      return;
    }
    try {
      setIsLoadingCaCerts(true);
      const res = await api.get('/api/kong/ca-certificates');
      setCaCerts(res.data || []);
    } catch (err: any) {
      console.error('Error fetching CA certificates:', err);
    } finally {
      setIsLoadingCaCerts(false);
    }
  }, [activeClusterId]);

  React.useEffect(() => {
    fetchCertificates();
    fetchCACertificates();
  }, [fetchCertificates, fetchCACertificates]);

  // Submit Server Certificate
  const handleCreateCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certPem.trim() || !keyPem.trim()) {
      alert('Vui lòng nhập Certificate CRT và Private Key PEM');
      return;
    }

    try {
      setIsSubmittingCert(true);
      const parsedSnis = snisInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedTags = certTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Partial<KongCertificate> = {
        cert: certPem.trim(),
        key: keyPem.trim(),
        snis: parsedSnis.length > 0 ? parsedSnis : undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      };

      const res = await api.post('/api/kong/certificates', payload);
      setCerts((prev) => [res.data, ...prev]);
      setIsAddCertModalOpen(false);
      setCertPem('');
      setKeyPem('');
      setSnisInput('');
      setCertTags('');
    } catch (err: any) {
      alert(`Lỗi khi tải chứng chỉ lên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmittingCert(false);
    }
  };

  // Submit CA Certificate
  const handleCreateCACert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caCertPem.trim()) {
      alert('Vui lòng nhập CA Certificate PEM');
      return;
    }

    try {
      setIsSubmittingCaCert(true);
      const parsedTags = caCertTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Partial<KongCACertificate> = {
        cert: caCertPem.trim(),
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      };

      const res = await api.post('/api/kong/ca-certificates', payload);
      setCaCerts((prev) => [res.data, ...prev]);
      setIsAddCaCertModalOpen(false);
      setCaCertPem('');
      setCaCertTags('');
    } catch (err: any) {
      alert(`Lỗi khi tải CA Certificate lên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmittingCaCert(false);
    }
  };

  // Delete Server Cert
  const handleDeleteCert = async (certId: string) => {
    if (confirm('Bạn có chắc muốn xóa chứng chỉ SSL này? Các Route sử dụng SNI này sẽ mất TLS termination.')) {
      try {
        await api.delete(`/api/kong/certificates/${certId}`);
        setCerts((prev) => prev.filter((c) => c.id !== certId));
      } catch (err: any) {
        alert(`Lỗi khi xóa chứng chỉ: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  // Delete CA Cert
  const handleDeleteCACert = async (caCertId: string) => {
    if (confirm('Bạn có chắc muốn xóa CA Certificate này khỏi danh sách Trusted Root?')) {
      try {
        await api.delete(`/api/kong/ca-certificates/${caCertId}`);
        setCaCerts((prev) => prev.filter((c) => c.id !== caCertId));
      } catch (err: any) {
        alert(`Lỗi khi xóa CA Certificate: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  // Filtered lists
  const filteredCerts = certs.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.id.toLowerCase().includes(q) ||
      (c.snis && c.snis.some((s) => s.toLowerCase().includes(q))) ||
      (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const filteredCACerts = caCerts.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.id.toLowerCase().includes(q) || (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)));
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Chứng chỉ SSL / TLS & SNIs</h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                TLS Termination & mTLS
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Quản lý chứng chỉ số HTTPS/TLS, ánh xạ Server Name Indication (SNIs) và chứng chỉ gốc CA cho xác thực hai chiều mTLS.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                fetchCertificates();
                fetchCACertificates();
              }}
              className="text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Làm mới
            </Button>
            {activeTab === 'server-certs' ? (
              <Button onClick={() => setIsAddCertModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Upload SSL Certificate
              </Button>
            ) : (
              <Button onClick={() => setIsAddCaCertModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Upload CA Certificate
              </Button>
            )}
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 mt-0.5">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">1. TLS / SSL Termination (Server Certificates & SNIs)</p>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                Khi client truy cập qua domain HTTPS (SNI), Kong tự động khớp chứng chỉ tương ứng để giải mã kết nối TLS ở cổng proxy <code className="font-mono bg-emerald-100 px-1 rounded">:8443</code>.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700 mt-0.5">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">2. Mutual TLS (mTLS) & Trusted CA Certificates</p>
              <p className="text-[11px] text-indigo-800/80 mt-0.5">
                Đăng ký danh sách CA Certificates đáng tin cậy để xác thực client certificates khi bật plugin <code className="font-mono bg-indigo-100 px-1 rounded">mtls-auth</code> hoặc TLS Verify tới upstream.
              </p>
            </div>
          </div>
        </div>

        {!activeClusterId && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>Chưa có Kong Cluster nào được chọn. Vui lòng kết nối Cluster để quản lý Chứng chỉ SSL.</span>
            </div>
            <Link href="/settings/clusters">
              <Button size="sm" variant="outline" className="text-xs bg-white">
                Chọn Cluster
              </Button>
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
            <span>{errorMsg}</span>
            <Button size="sm" variant="outline" onClick={fetchCertificates} className="h-7 text-xs">
              Thử lại
            </Button>
          </div>
        )}

        {/* Main Card with Tabs */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Kho Quản lý Chứng chỉ Bảo mật</CardTitle>
                <CardDescription>Cấu hình mã hóa HTTPS cho Domain và xác thực CA Certificate</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm theo ID, Domain SNI, Tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-t border-gray-100 -mx-6 px-6">
              <button
                type="button"
                onClick={() => setActiveTab('server-certs')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'server-certs'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                SSL Server Certificates & SNIs
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                  {certs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ca-certs')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'ca-certs'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Trusted CA Certificates (mTLS)
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
                  {caCerts.length}
                </span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* TAB 1: Server Certificates */}
            {activeTab === 'server-certs' && (
              <>
                {isLoadingCerts ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                    <p className="text-xs">Đang tải danh sách chứng chỉ SSL từ Kong Admin API...</p>
                  </div>
                ) : filteredCerts.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {searchQuery ? 'Không tìm thấy chứng chỉ phù hợp' : 'Chưa có Chứng chỉ SSL nào trên Kong'}
                      </h3>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                        Upload chứng chỉ TLS CRT và Private Key để kích hoạt kết nối HTTPS an toàn cho các domain.
                      </p>
                    </div>
                    {!searchQuery && (
                      <Button onClick={() => setIsAddCertModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Chứng chỉ đầu tiên
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700">Certificate ID</TableHead>
                        <TableHead className="font-semibold text-gray-700">Ánh xạ SNIs (Domains)</TableHead>
                        <TableHead className="font-semibold text-gray-700">Loại khóa</TableHead>
                        <TableHead className="font-semibold text-gray-700">Tags</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCerts.map((c) => (
                        <TableRow key={c.id} className="hover:bg-emerald-50/20 transition-colors">
                          <TableCell className="font-medium text-gray-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700 shadow-xs">
                                <Lock className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 font-mono text-xs text-gray-900">
                                  <span>{c.id}</span>
                                  <button
                                    onClick={() => copyToClipboard(c.id, `cert-${c.id}`)}
                                    className="text-gray-400 hover:text-gray-700 p-0.5"
                                  >
                                    {copiedId === `cert-${c.id}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                </div>
                                <div className="text-[11px] text-gray-400">RSA / ECDSA TLS Key Pair</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5 flex-wrap max-w-sm">
                              {c.snis && c.snis.length > 0 ? (
                                c.snis.map((s) => (
                                  <Badge key={s} variant="outline" className="font-mono text-xs bg-gray-50 text-gray-800 border-gray-300 flex items-center gap-1">
                                    <Globe className="h-3 w-3 text-blue-600" />
                                    {s}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs italic">Chưa gán SNI</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                              Active Pair
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {c.tags?.map((t) => (
                                <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {t}
                                </Badge>
                              )) || <span className="text-gray-300">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCertToView(c);
                                setIsViewCertModalOpen(true);
                              }}
                              className="h-8 w-8 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Xem chi tiết chứng chỉ"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCert(c.id)}
                              className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                              title="Xóa chứng chỉ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}

            {/* TAB 2: CA Certificates */}
            {activeTab === 'ca-certs' && (
              <>
                {isLoadingCaCerts ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-xs">Đang tải danh sách CA Certificates từ Kong Admin API...</p>
                  </div>
                ) : filteredCACerts.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {searchQuery ? 'Không tìm thấy CA Certificate phù hợp' : 'Chưa có CA Certificate nào'}
                      </h3>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                        Thêm Trusted Root CA để xác thực mTLS client hoặc kiểm tra tính hợp lệ của Upstream TLS.
                      </p>
                    </div>
                    {!searchQuery && (
                      <Button onClick={() => setIsAddCaCertModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Upload CA Certificate đầu tiên
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700">CA Certificate ID</TableHead>
                        <TableHead className="font-semibold text-gray-700">Cert Digest / Fingerprint</TableHead>
                        <TableHead className="font-semibold text-gray-700">Tags</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCACerts.map((ca) => (
                        <TableRow key={ca.id} className="hover:bg-indigo-50/20 transition-colors">
                          <TableCell className="font-medium text-gray-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100/80 flex items-center justify-center text-indigo-700 shadow-xs">
                                <ShieldCheck className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-mono text-xs font-semibold text-gray-900">{ca.id}</span>
                                <div className="text-[11px] text-indigo-700 font-medium">Trusted Certificate Authority</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-600 max-w-md truncate">
                            {ca.cert_digest || `${ca.cert.slice(0, 30)}...`}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {ca.tags?.map((t) => (
                                <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {t}
                                </Badge>
                              )) || <span className="text-gray-300">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCACert(ca.id)}
                              className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                              title="Xóa CA Certificate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: Add Server Certificate & SNIs Modal */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAddCertModalOpen}
        onClose={() => setIsAddCertModalOpen(false)}
        title="Upload SSL/TLS Certificate & SNIs"
        description="Đăng ký cặp Certificate CRT và Private Key lên Kong Gateway để phục vụ TLS Termination"
      >
        <form onSubmit={handleCreateCert} className="space-y-4">
          <Input
            label="Domain SNIs (Server Name Indication - cách nhau dấu phẩy)"
            placeholder="api.company.com, *.company.com, auth.internal"
            value={snisInput}
            onChange={(e) => setSnisInput(e.target.value)}
            helperText="Các domain sẽ sử dụng chứng chỉ này khi client bắt tay TLS"
          />

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Certificate (PEM format) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="-----BEGIN CERTIFICATE-----&#10;MIIE...&#10;-----END CERTIFICATE-----"
              value={certPem}
              onChange={(e) => setCertPem(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Private Key (PEM format) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIE...&#10;-----END RSA PRIVATE KEY-----"
              value={keyPem}
              onChange={(e) => setKeyPem(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <Input
            label="Tags (Tùy chọn)"
            placeholder="wildcard, letsencrypt, prod"
            value={certTags}
            onChange={(e) => setCertTags(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsAddCertModalOpen(false)} disabled={isSubmittingCert}>
              Hủy
            </Button>
            <Button type="submit" isLoading={isSubmittingCert} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Lưu & Kích hoạt Chứng chỉ
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: Add CA Certificate Modal */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAddCaCertModalOpen}
        onClose={() => setIsAddCaCertModalOpen(false)}
        title="Upload Trusted CA Certificate"
        description="Đăng ký Root Certificate Authority cho xác thực hai chiều mTLS"
      >
        <form onSubmit={handleCreateCACert} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              CA Certificate (PEM format) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              placeholder="-----BEGIN CERTIFICATE-----&#10;MIIE...&#10;-----END CERTIFICATE-----"
              value={caCertPem}
              onChange={(e) => setCaCertPem(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <Input
            label="Tags (Tùy chọn)"
            placeholder="internal-root-ca, client-auth"
            value={caCertTags}
            onChange={(e) => setCaCertTags(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsAddCaCertModalOpen(false)} disabled={isSubmittingCaCert}>
              Hủy
            </Button>
            <Button type="submit" isLoading={isSubmittingCaCert} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Lưu CA Certificate
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: View Certificate Details Modal */}
      {/* ========================================================= */}
      {selectedCertToView && (
        <Modal
          isOpen={isViewCertModalOpen}
          onClose={() => {
            setIsViewCertModalOpen(false);
            setSelectedCertToView(null);
          }}
          title={`Chi tiết SSL Certificate: ${selectedCertToView.id}`}
          description="Nội dung mã hóa Certificate PEM và danh sách SNI Domains liên kết"
        >
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-gray-700">Domain SNIs:</span>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {selectedCertToView.snis?.map((s) => (
                  <Badge key={s} className="font-mono text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
                    {s}
                  </Badge>
                )) || <span className="text-xs text-gray-400">Không có</span>}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-700">Certificate (CRT PEM):</span>
              <pre className="mt-1 p-3 bg-gray-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48">
                {selectedCertToView.cert}
              </pre>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-700">Private Key (KEY PEM):</span>
              <pre className="mt-1 p-3 bg-gray-900 text-amber-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-32">
                {selectedCertToView.key ? `${selectedCertToView.key.slice(0, 100)}...\n[PROTECTED PRIVATE KEY]` : '[Private Key Loaded in Kong]'}
              </pre>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsViewCertModalOpen(false);
                  setSelectedCertToView(null);
                }}
                className="text-xs"
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
