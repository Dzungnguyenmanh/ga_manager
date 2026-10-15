'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { KongDeclarativeConfig, KongDiffSummary, KongSnapshot } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import {
  FileCode,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  Play,
  RotateCcw,
  Trash2,
  Eye,
  Plus,
  Layers,
  Route as RouteIcon,
  Network,
  Users,
  Puzzle,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  Calendar,
  History,
  Archive,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Send,
} from 'lucide-react';
import Link from 'next/link';

type GitOpsTab = 'export' | 'import-sync' | 'snapshots' | 'promote';

export default function DeclarativePage() {
  const { activeCluster, activeClusterId, clusters } = useClusterStore();
  const [activeTab, setActiveTab] = React.useState<GitOpsTab>('export');

  // Export State
  const [exportFormat, setExportFormat] = React.useState<'yaml' | 'json'>('yaml');
  const [exportContent, setExportContent] = React.useState('');
  const [isExportLoading, setIsExportLoading] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);

  // Import / Sync State
  const [importContent, setImportContent] = React.useState('');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isDiffing, setIsDiffing] = React.useState(false);
  const [diffPreview, setDiffPreview] = React.useState<KongDiffSummary | null>(null);
  const [syncResult, setSyncResult] = React.useState<KongDiffSummary | null>(null);
  const [parsedPreview, setParsedPreview] = React.useState<KongDeclarativeConfig | null>(null);
  const [importError, setImportError] = React.useState('');

  // Snapshots State
  const [snapshots, setSnapshots] = React.useState<KongSnapshot[]>([]);
  const [isSnapshotsLoading, setIsSnapshotsLoading] = React.useState(false);
  const [isCreateSnapshotModalOpen, setIsCreateSnapshotModalOpen] = React.useState(false);
  const [newSnapshotName, setNewSnapshotName] = React.useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = React.useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = React.useState(false);
  const [viewingSnapshot, setViewingSnapshot] = React.useState<KongSnapshot | null>(null);

  // Environment Promotion State (DEV -> STG -> PROD)
  const [sourceClusterId, setSourceClusterId] = React.useState<number | null>(activeClusterId || null);
  const [targetClusterId, setTargetClusterId] = React.useState<number | null>(null);
  const [isPromoting, setIsPromoting] = React.useState(false);
  const [promoteResult, setPromoteResult] = React.useState<KongDiffSummary | null>(null);
  const [promoteError, setPromoteError] = React.useState('');
  const [prodConfirmationText, setProdConfirmationText] = React.useState('');

  const handlePromote = async () => {
    if (!sourceClusterId || !targetClusterId) {
      setPromoteError('Vui lòng chọn cụm nguồn và cụm đích');
      return;
    }
    if (sourceClusterId === targetClusterId) {
      setPromoteError('Cụm nguồn và cụm đích không được trùng nhau');
      return;
    }

    const targetCluster = clusters.find((c) => c.id === targetClusterId);
    if (targetCluster?.environment === 'PROD' && prodConfirmationText !== targetCluster.name) {
      setPromoteError(`Vui lòng nhập chính xác tên cụm PROD "${targetCluster.name}" để xác nhận`);
      return;
    }

    setIsPromoting(true);
    setPromoteError('');
    setPromoteResult(null);

    try {
      const res = await api.post('/api/clusters/promote', {
        source_cluster_id: sourceClusterId,
        target_cluster_id: targetClusterId,
      });
      setPromoteResult(res.data);
      setProdConfirmationText('');
    } catch (err: any) {
      setPromoteError(err.response?.data?.error || err.message || 'Lỗi khi promote cấu hình');
    } finally {
      setIsPromoting(false);
    }
  };

  // Fetch Exported Config
  const fetchExportConfig = React.useCallback(async () => {
    if (!activeClusterId) {
      setExportContent('');
      return;
    }
    try {
      setIsExportLoading(true);
      const res = await api.get(`/api/kong/declarative/dump?format=${exportFormat}`);
      if (exportFormat === 'yaml') {
        setExportContent(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2));
      } else {
        setExportContent(JSON.stringify(res.data, null, 2));
      }
    } catch (err: any) {
      console.error('Error fetching export config:', err);
      setExportContent('# Lỗi khi xuất cấu hình từ Kong Admin API\n# ' + (err.response?.data?.error || err.message));
    } finally {
      setIsExportLoading(false);
    }
  }, [activeClusterId, exportFormat]);

  // Fetch Snapshots List
  const fetchSnapshots = React.useCallback(async () => {
    if (!activeClusterId) {
      setSnapshots([]);
      return;
    }
    try {
      setIsSnapshotsLoading(true);
      const res = await api.get('/api/kong/snapshots');
      setSnapshots(res.data || []);
    } catch (err: any) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setIsSnapshotsLoading(false);
    }
  }, [activeClusterId]);

  React.useEffect(() => {
    if (activeTab === 'export') {
      fetchExportConfig();
    } else if (activeTab === 'snapshots') {
      fetchSnapshots();
    }
  }, [activeTab, fetchExportConfig, fetchSnapshots]);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `kong-${activeCluster?.name || 'cluster'}-${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
    const blob = new Blob([exportContent], { type: exportFormat === 'yaml' ? 'application/x-yaml' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportContent(content);
      parseAndPreview(content);
    };
    reader.readAsText(file);
  };

  const parseAndPreview = (content: string) => {
    setImportError('');
    setSyncResult(null);
    try {
      if (content.trim().startsWith('{')) {
        const json = JSON.parse(content);
        setParsedPreview(json);
      } else {
        // Basic parser preview if JSON parse fails
        setParsedPreview({ _format_version: '3.0' });
      }
    } catch (err: any) {
      setImportError('Cảnh báo: Định dạng JSON chưa hợp lệ (Nếu là YAML, hệ thống backend sẽ tự động phân giải khi Sync).');
    }
  };

  const handleDryRunDiff = async () => {
    if (!importContent.trim()) {
      alert('Vui lòng nhập hoặc tải file cấu hình YAML/JSON!');
      return;
    }

    try {
      setIsDiffing(true);
      setImportError('');
      setDiffPreview(null);

      const isYaml = !importContent.trim().startsWith('{');
      const headers = {
        'Content-Type': isYaml ? 'application/x-yaml' : 'application/json',
      };

      const res = await api.post('/api/kong/declarative/diff', isYaml ? importContent : JSON.parse(importContent), {
        headers,
      });

      setDiffPreview(res.data);
    } catch (err: any) {
      setImportError(err.response?.data?.error || err.message);
    } finally {
      setIsDiffing(false);
    }
  };

  const handleSyncToKong = async () => {
    if (!importContent.trim()) {
      alert('Vui lòng nhập hoặc tải file cấu hình YAML/JSON!');
      return;
    }

    if (!confirm('Bạn có chắc muốn áp dụng cấu hình này vào Kong Gateway? Các Service, Route, Plugin và Consumer khai báo sẽ được tạo hoặc cập nhật.')) {
      return;
    }

    try {
      setIsSyncing(true);
      setImportError('');
      setSyncResult(null);

      const isYaml = !importContent.trim().startsWith('{');
      const headers = {
        'Content-Type': isYaml ? 'application/x-yaml' : 'application/json',
      };

      const res = await api.post('/api/kong/declarative/sync', isYaml ? importContent : JSON.parse(importContent), {
        headers,
      });

      setSyncResult(res.data);
    } catch (err: any) {
      setImportError(err.response?.data?.error || err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotName.trim()) return;

    try {
      setIsCreatingSnapshot(true);
      const payload = {
        name: newSnapshotName.trim(),
        description: newSnapshotDesc.trim() || undefined,
      };
      const res = await api.post('/api/kong/snapshots', payload);
      setSnapshots((prev) => [res.data, ...prev]);
      setIsCreateSnapshotModalOpen(false);
      setNewSnapshotName('');
      setNewSnapshotDesc('');
    } catch (err: any) {
      alert(`Lỗi khi tạo Snapshot: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snap: KongSnapshot) => {
    if (confirm(`Bạn có chắc chắn muốn Rollback/Restore cụm Kong về bản Snapshot "${snap.name}"?`)) {
      try {
        const res = await api.post(`/api/kong/snapshots/${snap.id}/restore`);
        alert(`Khôi phục thành công! Đã đồng bộ:\n- Services: ${res.data.services_to_create}\n- Routes: ${res.data.routes_to_create}\n- Upstreams: ${res.data.upstreams_to_create}\n- Consumers: ${res.data.consumers_to_create}\n- Plugins: ${res.data.plugins_to_create}`);
      } catch (err: any) {
        alert(`Lỗi khi khôi phục snapshot: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const handleDeleteSnapshot = async (snapId: number) => {
    if (confirm('Bạn có chắc muốn xóa bản Snapshot này khỏi Database?')) {
      try {
        await api.delete(`/api/kong/snapshots/${snapId}`);
        setSnapshots((prev) => prev.filter((s) => s.id !== snapId));
      } catch (err: any) {
        alert(`Lỗi khi xóa Snapshot: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">decK GitOps & Declarative Config Hub</h1>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                decK Format v3.0
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Đồng bộ cấu hình toàn diện (Infrastructure as Code - IaC), xuất file <strong>YAML / JSON</strong> chuẩn decK, so sánh sai khác (Diff) và sao lưu Snapshot điểm thời gian.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setNewSnapshotName(`Backup-${new Date().toISOString().slice(0, 16).replace('T', '_')}`);
                setIsCreateSnapshotModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm text-xs"
            >
              <Archive className="h-4 w-4 mr-1.5" />
              Tạo Snapshot mới
            </Button>
          </div>
        </div>

        {/* Guidance Banner */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-indigo-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
              <FileCode className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold">Enterprise Declarative Configuration & GitOps Standard</p>
              <p className="text-indigo-800/80">
                Toàn bộ Services, Routes, Upstreams, Targets, Consumers, Credentials và Plugins được xuất/nhập dưới định dạng chuẩn <code className="font-mono bg-indigo-100 px-1 rounded">_format_version: &quot;3.0&quot;</code> tương thích hoàn toàn với <strong>decK CLI</strong> và <strong>Kong Konnect</strong>.
              </p>
            </div>
          </div>
        </div>

        {!activeClusterId && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>Chưa có Kong Cluster nào được chọn. Vui lòng kết nối Cluster để quản trị GitOps.</span>
            </div>
            <Link href="/settings/clusters">
              <Button size="sm" variant="outline" className="text-xs bg-white">
                Chọn Cluster
              </Button>
            </Link>
          </div>
        )}

        {/* Main Card with 3 Tabs */}
        <Card className="border border-gray-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-gray-100 pb-0 bg-slate-50/50">
            <div className="flex border-b border-gray-200 -mx-6 px-6">
              <button
                type="button"
                onClick={() => setActiveTab('export')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'export'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                1. Xuất Cấu Hình (decK YAML / JSON)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('import-sync')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'import-sync'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                2. Nhập & Đồng Bộ vào Kong (Sync Engine)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('snapshots')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'snapshots'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                3. Quản lý Snapshots & 1-Click Rollback
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
                  {snapshots.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('promote');
                  if (!sourceClusterId && activeClusterId) setSourceClusterId(activeClusterId);
                }}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'promote'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                4. Chuyển giao Cấu hình (DEV ➔ STG ➔ PROD)
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* TAB 1: Export Config */}
            {activeTab === 'export' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">Định dạng xuất:</span>
                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100">
                      <button
                        type="button"
                        onClick={() => setExportFormat('yaml')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                          exportFormat === 'yaml' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600'
                        }`}
                      >
                        YAML (decK)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportFormat('json')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                          exportFormat === 'json' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600'
                        }`}
                      >
                        JSON
                      </button>
                    </div>
                    <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 ml-2">
                      <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                      Secret Masking Protected
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchExportConfig} className="h-8 text-xs">
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isExportLoading ? 'animate-spin' : ''}`} />
                      Làm mới Dump
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs">
                      {isCopied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      {isCopied ? 'Đã sao chép' : 'Sao chép'}
                    </Button>
                    <Button size="sm" onClick={handleDownload} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Tải file {exportFormat.toUpperCase()}
                    </Button>
                  </div>
                </div>

                {isExportLoading ? (
                  <div className="py-16 text-center text-gray-400 space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-xs">Đang trích xuất toàn bộ cấu hình từ Kong Admin API...</p>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-gray-800 shadow-lg">
                    <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center justify-between text-xs text-gray-400">
                      <span className="font-mono">kong.{exportFormat}</span>
                      <span>UTF-8 • {exportContent.split('\n').length} dòng</span>
                    </div>
                    <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[550px] leading-relaxed select-all">
                      {exportContent}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Import & Sync Engine */}
            {activeTab === 'import-sync' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Nhập hoặc dán cấu hình YAML/JSON</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Dán nội dung hoặc tải lên file `.yaml` để kiểm tra sai khác và đồng bộ</p>
                  </div>
                  <div>
                    <label className="cursor-pointer px-3.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 inline-flex items-center gap-1.5 shadow-2xs">
                      <Upload className="h-3.5 w-3.5 text-indigo-600" />
                      Chọn file YAML / JSON
                      <input type="file" accept=".yaml,.yml,.json" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nội dung Declarative Configuration (decK):</label>
                    <textarea
                      rows={16}
                      placeholder={`_format_version: "3.0"\nservices:\n  - name: my-api-service\n    url: http://backend:8080\n    routes:\n      - name: my-route\n        paths:\n          - /api/v1\nconsumers:\n  - username: client-app\n    keyauth_credentials:\n      - key: my-secret-key`}
                      value={importContent}
                      onChange={(e) => {
                        setImportContent(e.target.value);
                        parseAndPreview(e.target.value);
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-slate-950 text-emerald-400 p-3.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 space-y-3">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        Xem trước Khối Cấu hình Sẽ Áp Dụng
                      </span>

                      {importError && (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
                          {importError}
                        </div>
                      )}

                      {syncResult ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-900">
                          <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            Đồng bộ thành công vào Kong Gateway!
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="p-2 bg-white rounded border border-emerald-200">
                              <span className="text-gray-500">Services đã tạo:</span> <strong>{syncResult.services_to_create}</strong>
                            </div>
                            <div className="p-2 bg-white rounded border border-emerald-200">
                              <span className="text-gray-500">Routes đã tạo:</span> <strong>{syncResult.routes_to_create}</strong>
                            </div>
                            <div className="p-2 bg-white rounded border border-emerald-200">
                              <span className="text-gray-500">Upstreams đã tạo:</span> <strong>{syncResult.upstreams_to_create}</strong>
                            </div>
                            <div className="p-2 bg-white rounded border border-emerald-200">
                              <span className="text-gray-500">Targets đã tạo:</span> <strong>{syncResult.targets_to_create}</strong>
                            </div>
                            <div className="p-2 bg-white rounded border border-emerald-200">
                              <span className="text-gray-500">Consumers đã tạo:</span> <strong>{syncResult.consumers_to_create}</strong>
                            </div>
                            <div className="p-2 bg-white rounded border border-emerald-200">
                              <span className="text-gray-500">Credentials đã cấp:</span> <strong>{syncResult.credentials_to_create}</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {diffPreview && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-900 mb-3">
                              <div className="flex items-center gap-1.5 font-bold text-blue-800">
                                <Eye className="h-4 w-4 text-blue-600" />
                                Kết quả Dry-run (Dự kiến thực thể sẽ tạo/cập nhật):
                              </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="p-1.5 bg-white rounded border border-blue-100">
                                Services: <strong>{diffPreview.services_to_create}</strong>
                              </div>
                              <div className="p-1.5 bg-white rounded border border-blue-100">
                                Routes: <strong>{diffPreview.routes_to_create}</strong>
                              </div>
                              <div className="p-1.5 bg-white rounded border border-blue-100">
                                Upstreams: <strong>{diffPreview.upstreams_to_create}</strong>
                              </div>
                              <div className="p-1.5 bg-white rounded border border-blue-100">
                                Targets: <strong>{diffPreview.targets_to_create}</strong>
                              </div>
                              <div className="p-1.5 bg-white rounded border border-blue-100">
                                Consumers: <strong>{diffPreview.consumers_to_create}</strong>
                              </div>
                              <div className="p-1.5 bg-white rounded border border-blue-100">
                                Plugins: <strong>{diffPreview.plugins_to_create}</strong>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2 text-xs text-gray-600">
                          <p>
                            Khuyến nghị production: chạy <strong>&quot;Kiểm tra trước (Dry-Run Diff)&quot;</strong> trước khi áp dụng đồng bộ thật vào cụm Gateway.
                          </p>
                          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleDryRunDiff}
                              isLoading={isDiffing}
                              disabled={!importContent.trim()}
                              className="text-xs h-8"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1 text-blue-600" />
                              Kiểm tra trước (Dry-Run Diff)
                            </Button>
                            <Button
                              onClick={handleSyncToKong}
                              isLoading={isSyncing}
                              disabled={!importContent.trim()}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8"
                            >
                              <Play className="h-3.5 w-3.5 mr-1.5" />
                              Áp dụng & Đồng bộ vào Kong Gateway
                            </Button>
                          </div>
                        </div>
                      </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Snapshots & Backup/Restore */}
            {activeTab === 'snapshots' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Danh sách Snapshots Điểm Thời Gian</h3>
                    <p className="text-xs text-gray-500">Lưu trữ trong Database ứng dụng, cho phép Rollback toàn bộ cấu hình 1-click</p>
                  </div>
                  <Button
                    onClick={() => {
                      setNewSnapshotName(`Backup-${new Date().toISOString().slice(0, 16).replace('T', '_')}`);
                      setIsCreateSnapshotModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Lưu Snapshot Ngay
                  </Button>
                </div>

                {isSnapshotsLoading ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-xs">Đang tải danh sách Snapshots...</p>
                  </div>
                ) : snapshots.length === 0 ? (
                  <div className="py-12 text-center space-y-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Archive className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Chưa có Snapshot nào được lưu</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                        Tạo Snapshot đầu tiên trước khi triển khai các thay đổi quan trọng để có điểm khôi phục tức thì.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                    <Table>
                      <TableHeader className="bg-gray-50/60">
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Tên Snapshot / Phiên bản</TableHead>
                          <TableHead className="text-xs font-semibold">Mô tả</TableHead>
                          <TableHead className="text-xs font-semibold">Số lượng thực thể</TableHead>
                          <TableHead className="text-xs font-semibold">Thời gian tạo</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {snapshots.map((snap) => {
                          const cfg = snap.config_json;
                          const svcCount = cfg?.services?.length || 0;
                          const routeCount = cfg?.routes?.length || 0;
                          const upCount = cfg?.upstreams?.length || 0;
                          const consumerCount = cfg?.consumers?.length || 0;

                          return (
                            <TableRow key={snap.id} className="text-xs hover:bg-indigo-50/20">
                              <TableCell className="font-semibold text-gray-900">
                                <div className="flex items-center gap-2">
                                  <Archive className="h-4 w-4 text-indigo-600" />
                                  <span>{snap.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-500 max-w-xs truncate">
                                {snap.description || <span className="italic text-gray-400">Không có mô tả</span>}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1.5 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                    {svcCount} Services
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {routeCount} Routes
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                    {consumerCount} Consumers
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-500 text-[11px]">
                                {new Date(snap.created_at).toLocaleString('vi-VN')}
                              </TableCell>
                              <TableCell className="text-right space-x-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRestoreSnapshot(snap)}
                                  className="h-7 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold"
                                  title="Phục hồi trạng thái này về Kong Gateway"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Rollback
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setViewingSnapshot(snap)}
                                  className="h-7 w-7 text-gray-400 hover:text-indigo-600"
                                  title="Xem nội dung YAML"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteSnapshot(snap.id)}
                                  className="h-7 w-7 text-gray-400 hover:text-red-600"
                                  title="Xóa Snapshot"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Environment Promotion */}
            {activeTab === 'promote' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Chuyển giao Cấu hình (Environment Promotion)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Đồng bộ trạng thái cấu hình hoàn chỉnh giữa các môi trường (ví dụ: DEV ➔ STG hoặc STG ➔ PROD) theo cơ chế Declarative GitOps, tự động ghi nhận Audit Log.
                  </p>
                </div>

                {/* Source & Target Cluster Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  {/* Source Cluster */}
                  <div className="md:col-span-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <span className="text-xs font-semibold uppercase text-gray-500">Cụm nguồn (Source Cluster)</span>
                    <select
                      value={sourceClusterId || ''}
                      onChange={(e) => setSourceClusterId(Number(e.target.value) || null)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                    >
                      <option value="">-- Chọn cụm nguồn --</option>
                      {clusters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.environment || 'DEV'})
                        </option>
                      ))}
                    </select>

                    {sourceClusterId && (() => {
                      const sc = clusters.find((c) => c.id === sourceClusterId);
                      return sc ? (
                        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">Môi trường:</span>
                            <Badge variant={sc.environment === 'PROD' ? 'destructive' : sc.environment === 'STG' ? 'warning' : 'success'}>
                              {sc.environment || 'DEV'}
                            </Badge>
                          </div>
                          <p className="truncate font-mono text-[11px] text-gray-400">{sc.url}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold mt-1">Đồng bộ sang</span>
                  </div>

                  {/* Target Cluster */}
                  <div className="md:col-span-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <span className="text-xs font-semibold uppercase text-gray-500">Cụm đích (Target Cluster)</span>
                    <select
                      value={targetClusterId || ''}
                      onChange={(e) => setTargetClusterId(Number(e.target.value) || null)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                    >
                      <option value="">-- Chọn cụm đích --</option>
                      {clusters.map((c) => (
                        <option key={c.id} value={c.id} disabled={c.id === sourceClusterId}>
                          {c.name} ({c.environment || 'DEV'})
                        </option>
                      ))}
                    </select>

                    {targetClusterId && (() => {
                      const tc = clusters.find((c) => c.id === targetClusterId);
                      return tc ? (
                        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">Môi trường:</span>
                            <Badge variant={tc.environment === 'PROD' ? 'destructive' : tc.environment === 'STG' ? 'warning' : 'success'}>
                              {tc.environment || 'DEV'}
                            </Badge>
                          </div>
                          <p className="truncate font-mono text-[11px] text-gray-400">{tc.url}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* PROD Protection Notice */}
                {(() => {
                  const tc = clusters.find((c) => c.id === targetClusterId);
                  if (tc?.environment === 'PROD') {
                    return (
                      <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2 text-rose-900 dark:text-rose-200">
                        <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
                          <ShieldAlert className="w-5 h-5 text-rose-600" />
                          <span>CẢNH BÁO BẢO VỆ MÔI TRƯỜNG PRODUCTION!</span>
                        </div>
                        <p className="text-xs">
                          Bạn chuẩn bị ghi đè và đồng bộ cấu hình vào hệ thống thực tế (PROD: <strong>{tc.name}</strong>). Hãy đảm bảo bạn đã chạy thử nghiệm kỹ lưỡng trên môi trường STG trước khi chuyển giao.
                        </p>
                        <div className="pt-2">
                          <label className="block text-xs font-semibold mb-1">
                            Nhập chính xác tên cụm <code className="bg-rose-200 dark:bg-rose-900 px-1 py-0.5 rounded font-mono">{tc.name}</code> để mở khóa:
                          </label>
                          <Input
                            value={prodConfirmationText}
                            onChange={(e) => setProdConfirmationText(e.target.value)}
                            placeholder={tc.name}
                            className="bg-white dark:bg-gray-900 max-w-sm text-xs"
                          />
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Error Banner */}
                {promoteError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>{promoteError}</span>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handlePromote}
                    disabled={isPromoting || !sourceClusterId || !targetClusterId}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                  >
                    <Send className={`w-4 h-4 ${isPromoting ? 'animate-spin' : ''}`} />
                    {isPromoting ? 'Đang chuyển giao cấu hình...' : 'Thực hiện Chuyển giao (Promote Config)'}
                  </Button>
                </div>

                {/* Promote Result Diff Card */}
                {promoteResult && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Chuyển giao cấu hình thành công!</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-emerald-100">
                        <span className="text-gray-500 block">Services:</span>
                        <span className="text-base font-bold font-mono text-emerald-700">{promoteResult.services_to_create}</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-emerald-100">
                        <span className="text-gray-500 block">Routes:</span>
                        <span className="text-base font-bold font-mono text-emerald-700">{promoteResult.routes_to_create}</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-emerald-100">
                        <span className="text-gray-500 block">Upstreams:</span>
                        <span className="text-base font-bold font-mono text-emerald-700">{promoteResult.upstreams_to_create}</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-emerald-100">
                        <span className="text-gray-500 block">Plugins:</span>
                        <span className="text-base font-bold font-mono text-emerald-700">{promoteResult.plugins_to_create}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: Create Snapshot Modal */}
      {/* ========================================================= */}
      <Modal
        isOpen={isCreateSnapshotModalOpen}
        onClose={() => setIsCreateSnapshotModalOpen(false)}
        title="Tạo Bản Snapshot Cụm Kong Mới"
        description="Chụp lại toàn bộ trạng thái cấu hình hiện tại của Kong Gateway và lưu vào Database"
      >
        <form onSubmit={handleCreateSnapshot} className="space-y-4">
          <Input
            label="Tên Snapshot"
            placeholder="vd: Pre-Deployment-Release-v3.0 hoặc Stable-Backup"
            value={newSnapshotName}
            onChange={(e) => setNewSnapshotName(e.target.value)}
            required
          />

          <Input
            label="Mô tả / Ghi chú phiên bản"
            placeholder="vd: Sao lưu trước khi cập nhật payment route và rate limit plugin"
            value={newSnapshotDesc}
            onChange={(e) => setNewSnapshotDesc(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateSnapshotModalOpen(false)} disabled={isCreatingSnapshot}>
              Hủy
            </Button>
            <Button type="submit" isLoading={isCreatingSnapshot} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Lưu Snapshot
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: View Snapshot JSON Modal */}
      {/* ========================================================= */}
      {viewingSnapshot && (
        <Modal
          isOpen={Boolean(viewingSnapshot)}
          onClose={() => setViewingSnapshot(null)}
          title={`Snapshot: ${viewingSnapshot.name}`}
          description={`Thời gian lưu: ${new Date(viewingSnapshot.created_at).toLocaleString('vi-VN')}`}
        >
          <div className="space-y-4">
            <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[450px] rounded-xl select-all">
              {JSON.stringify(viewingSnapshot.config_json, null, 2)}
            </pre>
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setViewingSnapshot(null)} className="text-xs">
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
