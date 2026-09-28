'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { KongUpstream, KongTarget, KongTargetHealth, KongUpstreamHealth, KongHealthchecks } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import { 
  Network, 
  Plus, 
  Trash2, 
  Edit3, 
  Server, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  Layers,
  Search,
  Sliders,
  HeartPulse,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Check,
  XCircle,
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';
import Link from 'next/link';

interface UpstreamItem extends KongUpstream {
  targets?: KongTarget[];
  healthData?: KongTargetHealth[];
  targetsLoading?: boolean;
}

export default function UpstreamsPage() {
  const { activeCluster, activeClusterId } = useClusterStore();
  const [upstreams, setUpstreams] = React.useState<UpstreamItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isTargetsModalOpen, setIsTargetsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [modalTab, setModalTab] = React.useState<'basic' | 'healthchecks'>('basic');

  // Selected Upstream for Editing or Managing Targets
  const [selectedUpstream, setSelectedUpstream] = React.useState<UpstreamItem | null>(null);

  // Upstream Form State (Create & Edit)
  const [formName, setFormName] = React.useState('');
  const [formAlgorithm, setFormAlgorithm] = React.useState<'round-robin' | 'consistent-hashing' | 'least-connections' | 'latency'>('round-robin');
  const [formSlots, setFormSlots] = React.useState('10000');
  const [formHashOn, setFormHashOn] = React.useState<'none' | 'consumer' | 'ip' | 'header' | 'cookie'>('none');
  const [formHashFallback, setFormHashFallback] = React.useState<'none' | 'consumer' | 'ip' | 'header' | 'cookie'>('none');
  const [formHashOnHeader, setFormHashOnHeader] = React.useState('');
  const [formTags, setFormTags] = React.useState('');

  // Healthchecks form state
  const [enableActiveHC, setEnableActiveHC] = React.useState(false);
  const [activePath, setActivePath] = React.useState('/health');
  const [activeTimeout, setActiveTimeout] = React.useState('1');
  const [activeConcurrency, setActiveConcurrency] = React.useState('10');
  const [activeInterval, setActiveInterval] = React.useState('2');
  const [activeHealthySuccesses, setActiveHealthySuccesses] = React.useState('2');
  const [activeHealthyStatuses, setActiveHealthyStatuses] = React.useState('200, 302');
  const [activeUnhealthyFailures, setActiveUnhealthyFailures] = React.useState('5');
  const [activeUnhealthyStatuses, setActiveUnhealthyStatuses] = React.useState('429, 500, 503');

  const [enablePassiveHC, setEnablePassiveHC] = React.useState(false);
  const [passiveHealthySuccesses, setPassiveHealthySuccesses] = React.useState('5');
  const [passiveHealthyStatuses, setPassiveHealthyStatuses] = React.useState('200, 201, 202');
  const [passiveUnhealthyFailures, setPassiveUnhealthyFailures] = React.useState('5');
  const [passiveUnhealthyStatuses, setPassiveUnhealthyStatuses] = React.useState('429, 500, 503');

  // Target Management State
  const [currentTargets, setCurrentTargets] = React.useState<KongTarget[]>([]);
  const [targetHealthMap, setTargetHealthMap] = React.useState<Record<string, string>>({});
  const [isLoadingTargets, setIsLoadingTargets] = React.useState(false);
  const [newTargetHostPort, setNewTargetHostPort] = React.useState('');
  const [newTargetWeight, setNewTargetWeight] = React.useState('100');
  const [newTargetTags, setNewTargetTags] = React.useState('');
  const [isAddingTarget, setIsAddingTarget] = React.useState(false);

  // 1. Fetch all Upstreams and their associated targets and health
  const fetchUpstreams = React.useCallback(async () => {
    if (!activeClusterId) {
      setUpstreams([]);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await api.get('/api/kong/upstreams');
      const upstreamList: UpstreamItem[] = res.data || [];

      // Concurrently fetch targets and health for each upstream
      const populated = await Promise.all(
        upstreamList.map(async (up) => {
          try {
            const targetsRes = await api.get(`/api/kong/upstreams/${up.id}/targets`);
            let healthList: KongTargetHealth[] = [];
            try {
              const healthRes = await api.get(`/api/kong/upstreams/${up.id}/health`);
              healthList = healthRes.data?.data || [];
            } catch (he) {
              // Upstream health check might be disabled
            }
            return { ...up, targets: targetsRes.data || [], healthData: healthList };
          } catch (e) {
            return { ...up, targets: [], healthData: [] };
          }
        })
      );

      setUpstreams(populated);
    } catch (err: any) {
      console.error('Error fetching Kong upstreams:', err);
      setErrorMsg(err.response?.data?.error || 'Không thể kết nối Kong Gateway để lấy danh sách Upstreams');
    } finally {
      setIsLoading(false);
    }
  }, [activeClusterId]);

  React.useEffect(() => {
    fetchUpstreams();
  }, [fetchUpstreams]);

  const resetForm = () => {
    setFormName('');
    setFormAlgorithm('round-robin');
    setFormSlots('10000');
    setFormHashOn('none');
    setFormHashFallback('none');
    setFormHashOnHeader('');
    setFormTags('');
    setModalTab('basic');
    setEnableActiveHC(false);
    setActivePath('/health');
    setActiveTimeout('1');
    setActiveConcurrency('10');
    setActiveInterval('2');
    setActiveHealthySuccesses('2');
    setActiveHealthyStatuses('200, 302');
    setActiveUnhealthyFailures('5');
    setActiveUnhealthyStatuses('429, 500, 503');
    setEnablePassiveHC(false);
    setPassiveHealthySuccesses('5');
    setPassiveHealthyStatuses('200, 201, 202');
    setPassiveUnhealthyFailures('5');
    setPassiveUnhealthyStatuses('429, 500, 503');
  };

  // 2. Open Create Modal
  const handleOpenCreateModal = () => {
    if (!activeClusterId) {
      alert('Vui lòng chọn hoặc thêm một Kong Cluster trước!');
      return;
    }
    resetForm();
    setIsCreateModalOpen(true);
  };

  // 3. Open Edit Modal
  const handleOpenEditModal = (upstream: UpstreamItem) => {
    setSelectedUpstream(upstream);
    setFormName(upstream.name || '');
    setFormAlgorithm(upstream.algorithm || 'round-robin');
    setFormSlots(upstream.slots ? upstream.slots.toString() : '10000');
    setFormHashOn(upstream.hash_on || 'none');
    setFormHashFallback(upstream.hash_fallback || 'none');
    setFormHashOnHeader(upstream.hash_on_header || '');
    setFormTags(upstream.tags ? upstream.tags.join(', ') : '');
    setModalTab('basic');

    // Populate healthchecks
    if (upstream.healthchecks?.active && upstream.healthchecks.active.type !== 'tcp') {
      const act = upstream.healthchecks.active;
      setEnableActiveHC(Boolean(act.http_path || act.healthy?.interval));
      setActivePath(act.http_path || '/health');
      setActiveTimeout(act.timeout?.toString() || '1');
      setActiveConcurrency(act.concurrency?.toString() || '10');
      setActiveInterval(act.healthy?.interval?.toString() || '2');
      setActiveHealthySuccesses(act.healthy?.successes?.toString() || '2');
      setActiveHealthyStatuses(act.healthy?.http_statuses ? act.healthy.http_statuses.join(', ') : '200, 302');
      setActiveUnhealthyFailures(act.unhealthy?.http_failures?.toString() || '5');
      setActiveUnhealthyStatuses(act.unhealthy?.http_statuses ? act.unhealthy.http_statuses.join(', ') : '429, 500, 503');
    } else {
      setEnableActiveHC(false);
    }

    if (upstream.healthchecks?.passive) {
      const pas = upstream.healthchecks.passive;
      setEnablePassiveHC(Boolean(pas.healthy?.successes || pas.unhealthy?.http_failures));
      setPassiveHealthySuccesses(pas.healthy?.successes?.toString() || '5');
      setPassiveHealthyStatuses(pas.healthy?.http_statuses ? pas.healthy.http_statuses.join(', ') : '200, 201, 202');
      setPassiveUnhealthyFailures(pas.unhealthy?.http_failures?.toString() || '5');
      setPassiveUnhealthyStatuses(pas.unhealthy?.http_statuses ? pas.unhealthy.http_statuses.join(', ') : '429, 500, 503');
    } else {
      setEnablePassiveHC(false);
    }

    setIsEditModalOpen(true);
  };

  const buildHealthchecksPayload = (): KongHealthchecks | undefined => {
    if (!enableActiveHC && !enablePassiveHC) return undefined;

    const hc: KongHealthchecks = {};
    if (enableActiveHC) {
      const healthyStatuses = activeHealthyStatuses.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      const unhealthyStatuses = activeUnhealthyStatuses.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      hc.active = {
        type: 'http',
        http_path: activePath.trim() || '/health',
        timeout: parseFloat(activeTimeout) || 1,
        concurrency: parseInt(activeConcurrency, 10) || 10,
        healthy: {
          interval: parseInt(activeInterval, 10) || 2,
          successes: parseInt(activeHealthySuccesses, 10) || 2,
          http_statuses: healthyStatuses.length > 0 ? healthyStatuses : [200, 302],
        },
        unhealthy: {
          interval: parseInt(activeInterval, 10) || 2,
          http_failures: parseInt(activeUnhealthyFailures, 10) || 5,
          tcp_failures: 2,
          timeouts: 3,
          http_statuses: unhealthyStatuses.length > 0 ? unhealthyStatuses : [429, 500, 503],
        },
      };
    }

    if (enablePassiveHC) {
      const healthyStatuses = passiveHealthyStatuses.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      const unhealthyStatuses = passiveUnhealthyStatuses.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      hc.passive = {
        type: 'http',
        healthy: {
          successes: parseInt(passiveHealthySuccesses, 10) || 5,
          http_statuses: healthyStatuses.length > 0 ? healthyStatuses : [200, 201, 202],
        },
        unhealthy: {
          http_failures: parseInt(passiveUnhealthyFailures, 10) || 5,
          tcp_failures: 2,
          timeouts: 7,
          http_statuses: unhealthyStatuses.length > 0 ? unhealthyStatuses : [429, 500, 503],
        },
      };
    }

    return hc;
  };

  // 4. Submit Create Upstream
  const handleCreateUpstream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setIsSubmitting(true);
      const payload: Partial<KongUpstream> = {
        name: formName.trim(),
        algorithm: formAlgorithm,
        slots: parseInt(formSlots, 10) || 10000,
        hash_on: formHashOn !== 'none' ? formHashOn : undefined,
        hash_fallback: formHashFallback !== 'none' ? formHashFallback : undefined,
        hash_on_header: formHashOnHeader.trim() ? formHashOnHeader.trim() : undefined,
        healthchecks: buildHealthchecksPayload(),
        tags: formTags ? formTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      };

      const res = await api.post('/api/kong/upstreams', payload);
      const createdUp: UpstreamItem = { ...res.data, targets: [], healthData: [] };
      setUpstreams((prev) => [createdUp, ...prev]);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(`Lỗi khi tạo Upstream trên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Submit Edit Upstream
  const handleUpdateUpstream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpstream || !formName.trim()) return;

    try {
      setIsSubmitting(true);
      const payload: Partial<KongUpstream> = {
        id: selectedUpstream.id,
        name: formName.trim(),
        algorithm: formAlgorithm,
        slots: parseInt(formSlots, 10) || 10000,
        hash_on: formHashOn !== 'none' ? formHashOn : undefined,
        hash_fallback: formHashFallback !== 'none' ? formHashFallback : undefined,
        hash_on_header: formHashOnHeader.trim() ? formHashOnHeader.trim() : undefined,
        healthchecks: buildHealthchecksPayload(),
        tags: formTags ? formTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      };

      const res = await api.patch(`/api/kong/upstreams/${selectedUpstream.id}`, payload);
      const updatedUp = res.data;

      setUpstreams((prev) =>
        prev.map((u) => (u.id === selectedUpstream.id ? { ...u, ...updatedUp } : u))
      );
      setIsEditModalOpen(false);
      setSelectedUpstream(null);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật Upstream trên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Delete Upstream
  const handleDeleteUpstream = async (upstream: UpstreamItem) => {
    if (confirm(`Bạn có chắc chắn muốn xóa Upstream "${upstream.name}" khỏi Kong Gateway?`)) {
      try {
        await api.delete(`/api/kong/upstreams/${upstream.id}`);
        setUpstreams((prev) => prev.filter((u) => u.id !== upstream.id));
      } catch (err: any) {
        alert(`Lỗi khi xóa Upstream trên Kong: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  // 7. Open Targets Modal
  const handleOpenTargetsModal = async (upstream: UpstreamItem) => {
    setSelectedUpstream(upstream);
    setIsTargetsModalOpen(true);
    setNewTargetHostPort('');
    setNewTargetWeight('100');
    setNewTargetTags('');
    
    // Fetch fresh targets & health status
    try {
      setIsLoadingTargets(true);
      const [targetsRes, healthRes] = await Promise.all([
        api.get(`/api/kong/upstreams/${upstream.id}/targets`),
        api.get(`/api/kong/upstreams/${upstream.id}/health`).catch(() => ({ data: { data: [] } })),
      ]);

      const tList: KongTarget[] = targetsRes.data || [];
      const hList: KongTargetHealth[] = healthRes.data?.data || [];
      setCurrentTargets(tList);

      const hMap: Record<string, string> = {};
      hList.forEach((item) => {
        hMap[item.target] = item.health;
        hMap[item.id] = item.health;
      });
      setTargetHealthMap(hMap);
    } catch (err: any) {
      console.error('Error fetching targets & health:', err);
      setCurrentTargets([]);
    } finally {
      setIsLoadingTargets(false);
    }
  };

  // 8. Add Target to Upstream
  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpstream || !newTargetHostPort.trim()) return;

    try {
      setIsAddingTarget(true);
      const payload = {
        target: newTargetHostPort.trim(),
        weight: parseInt(newTargetWeight, 10) || 100,
        tags: newTargetTags ? newTargetTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      };

      const res = await api.post(`/api/kong/upstreams/${selectedUpstream.id}/targets`, payload);
      const newTarget = res.data;

      const updated = [newTarget, ...currentTargets];
      setCurrentTargets(updated);

      // Update parent list
      setUpstreams((prev) =>
        prev.map((u) => (u.id === selectedUpstream.id ? { ...u, targets: updated } : u))
      );

      setNewTargetHostPort('');
      setNewTargetWeight('100');
      setNewTargetTags('');
    } catch (err: any) {
      alert(`Lỗi khi thêm Target: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsAddingTarget(false);
    }
  };

  // 9. Delete / Drain Target
  const handleDeleteTarget = async (targetId: string) => {
    if (!selectedUpstream || !confirm('Bạn có chắc muốn xóa Target này khỏi Upstream pool?')) return;

    try {
      await api.delete(`/api/kong/upstreams/${selectedUpstream.id}/targets/${targetId}`);
      const updated = currentTargets.filter((t) => t.id !== targetId);
      setCurrentTargets(updated);
      setUpstreams((prev) =>
        prev.map((u) => (u.id === selectedUpstream.id ? { ...u, targets: updated } : u))
      );
    } catch (err: any) {
      alert(`Lỗi khi xóa Target: ${err.response?.data?.error || err.message}`);
    }
  };

  // 10. Manual Health State Flipping
  const handleSetTargetHealthy = async (target: KongTarget) => {
    if (!selectedUpstream) return;
    try {
      await api.post(`/api/kong/upstreams/${selectedUpstream.id}/targets/${target.target}/healthy`, {});
      setTargetHealthMap((prev) => ({ ...prev, [target.target]: 'HEALTHY', [target.id]: 'HEALTHY' }));
    } catch (err: any) {
      alert(`Lỗi khi đánh dấu Healthy: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleSetTargetUnhealthy = async (target: KongTarget) => {
    if (!selectedUpstream) return;
    try {
      await api.post(`/api/kong/upstreams/${selectedUpstream.id}/targets/${target.target}/unhealthy`, {});
      setTargetHealthMap((prev) => ({ ...prev, [target.target]: 'UNHEALTHY', [target.id]: 'UNHEALTHY' }));
    } catch (err: any) {
      alert(`Lỗi khi đánh dấu Unhealthy: ${err.response?.data?.error || err.message}`);
    }
  };

  // Filtered Upstreams
  const filteredUpstreams = upstreams.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Upstream Pools & Backend Targets</h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Enterprise Health Checks
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Quản lý cân bằng tải (Load Balancing Pools), Backend Targets (IP:Port), và giám sát <strong>Active & Passive Health Checks</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchUpstreams} className="text-xs">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Làm mới
            </Button>
            <Button onClick={handleOpenCreateModal} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Tạo Upstream Pool
            </Button>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <HeartPulse className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold">Enterprise Health Checks & Circuit Breaking</p>
              <p className="text-emerald-800/80">
                Kong tự động gửi probe kiểm tra HTTP <code className="font-mono bg-emerald-100/80 px-1 rounded">/health</code> định kỳ hoặc ngắt kết nối khi phát hiện 5xx liên tiếp.
              </p>
            </div>
          </div>
          <Link href="/services">
            <Button size="sm" variant="outline" className="h-8 text-xs bg-white text-emerald-700 border-emerald-300">
              Gán vào Kong Services
            </Button>
          </Link>
        </div>

        {!activeClusterId && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>Chưa có Kong Cluster nào được chọn. Vui lòng kết nối Cluster để quản lý Upstreams.</span>
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
            <Button size="sm" variant="outline" onClick={fetchUpstreams} className="h-7 text-xs">
              Thử lại
            </Button>
          </div>
        )}

        {/* Upstreams Table */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Danh sách Upstreams ({filteredUpstreams.length})</CardTitle>
                <CardDescription>Các nhóm máy chủ đích tiếp nhận lưu lượng từ Kong Gateway</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm theo Tên Upstream..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs">Đang tải danh sách Upstreams từ Kong Admin API...</p>
              </div>
            ) : filteredUpstreams.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Network className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {searchQuery ? 'Không tìm thấy Upstream phù hợp' : 'Chưa có Upstream Pool nào'}
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                    Tạo Upstream để gom nhiều máy chủ backend IP:Port và phân phối tải tự động.
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={handleOpenCreateModal} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo Upstream đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Tên Upstream Pool</TableHead>
                    <TableHead className="font-semibold text-gray-700">Thuật toán (Algorithm)</TableHead>
                    <TableHead className="font-semibold text-gray-700">Health Checks</TableHead>
                    <TableHead className="font-semibold text-gray-700">Backend Targets</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tags</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUpstreams.map((u) => {
                    const hasActiveHC = Boolean(u.healthchecks?.active?.http_path || u.healthchecks?.active?.healthy?.interval);
                    const hasPassiveHC = Boolean(u.healthchecks?.passive?.healthy?.successes);

                    return (
                      <TableRow key={u.id} className="hover:bg-emerald-50/20 transition-colors">
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700 font-bold text-xs uppercase shadow-xs">
                              <Network className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-semibold text-sm text-gray-900">{u.name}</span>
                              <div className="text-[11px] font-mono text-gray-400">{u.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs bg-gray-50 text-gray-700 border-gray-200">
                            {u.algorithm || 'round-robin'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasActiveHC ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                <HeartPulse className="h-3 w-3 text-emerald-600" /> Active Probe
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-gray-400">Không có Active</span>
                            )}
                            {hasPassiveHC && (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                                <Zap className="h-3 w-3 text-blue-600" /> Circuit Breaker
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                              {u.targets?.length || 0} Targets
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenTargetsModal(u)}
                              className="h-7 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <Server className="h-3 w-3 mr-1" />
                              Quản lý Targets
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {u.tags?.map((t) => (
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
                            onClick={() => handleOpenEditModal(u)}
                            className="h-8 w-8 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Chỉnh sửa Upstream"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUpstream(u)}
                            className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                            title="Xóa Upstream"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* ========================================================= */}
      {/* MODAL 1: Create / Edit Upstream Modal (2 Tabs) */}
      {/* ========================================================= */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedUpstream(null);
        }}
        title={isEditModalOpen ? `Chỉnh sửa Upstream: ${formName}` : 'Tạo Upstream Pool mới'}
        description="Đăng ký nhóm máy chủ đích, cấu hình thuật toán cân bằng tải và thiết lập Health Checks"
      >
        <form onSubmit={isEditModalOpen ? handleUpdateUpstream : handleCreateUpstream} className="space-y-4">
          {/* Modal Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setModalTab('basic')}
              className={`py-2 px-4 font-semibold text-xs border-b-2 transition-colors ${
                modalTab === 'basic'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              1. Cấu hình Cơ bản & Thuật toán
            </button>
            <button
              type="button"
              onClick={() => setModalTab('healthchecks')}
              className={`flex items-center gap-1 py-2 px-4 font-semibold text-xs border-b-2 transition-colors ${
                modalTab === 'healthchecks'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <HeartPulse className="h-3.5 w-3.5" />
              2. Health Checks (Active & Passive)
            </button>
          </div>

          {modalTab === 'basic' && (
            <div className="space-y-4">
              <Input
                label="Tên Upstream Pool (Upstream Name)"
                placeholder="vd: payment-service-upstream hoặc inventory.pool"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                helperText="Tên Upstream sẽ được sử dụng làm 'host' trong Kong Service"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Thuật toán Cân bằng tải</label>
                  <select
                    value={formAlgorithm}
                    onChange={(e) => setFormAlgorithm(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="round-robin">round-robin (Chia đều theo Weight)</option>
                    <option value="consistent-hashing">consistent-hashing (Băm theo Header/IP/Cookie)</option>
                    <option value="least-connections">least-connections (Ưu tiên ít kết nối)</option>
                    <option value="latency">latency (Ưu tiên phản hồi nhanh nhất)</option>
                  </select>
                </div>

                <Input
                  label="Slots (Số vị trí trên Hash Ring)"
                  type="number"
                  placeholder="10000"
                  value={formSlots}
                  onChange={(e) => setFormSlots(e.target.value)}
                  helperText="Mặc định: 10000 (10 đến 65536)"
                />
              </div>

              {formAlgorithm === 'consistent-hashing' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-3">
                  <span className="text-xs font-bold text-blue-900">Cấu hình Consistent Hashing</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Hash On (Khóa băm)</label>
                      <select
                        value={formHashOn}
                        onChange={(e) => setFormHashOn(e.target.value as any)}
                        className="w-full h-8 rounded border border-gray-300 bg-white px-2 text-xs"
                      >
                        <option value="none">none</option>
                        <option value="ip">ip (Client IP)</option>
                        <option value="header">header (HTTP Header)</option>
                        <option value="cookie">cookie (HTTP Cookie)</option>
                        <option value="consumer">consumer (Kong Consumer ID)</option>
                      </select>
                    </div>

                    {formHashOn === 'header' && (
                      <Input
                        label="Tên Header"
                        placeholder="X-User-Id"
                        value={formHashOnHeader}
                        onChange={(e) => setFormHashOnHeader(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    )}

                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Hash Fallback (Dự phòng)</label>
                      <select
                        value={formHashFallback}
                        onChange={(e) => setFormHashFallback(e.target.value as any)}
                        className="w-full h-8 rounded border border-gray-300 bg-white px-2 text-xs"
                      >
                        <option value="none">none</option>
                        <option value="ip">ip (Client IP)</option>
                        <option value="header">header</option>
                        <option value="cookie">cookie</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Tags (cách nhau dấu phẩy)"
                placeholder="production, v2, payments"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
              />
            </div>
          )}

          {modalTab === 'healthchecks' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Active Healthchecks Section */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-xs text-gray-900">Active Health Checks (Kong Probe định kỳ)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableActiveHC}
                      onChange={(e) => setEnableActiveHC(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {enableActiveHC && (
                  <div className="space-y-3 pt-2 border-t border-gray-200/80">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label="HTTP Path"
                        placeholder="/health"
                        value={activePath}
                        onChange={(e) => setActivePath(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                      <Input
                        label="Probe Interval (Giây)"
                        type="number"
                        placeholder="2"
                        value={activeInterval}
                        onChange={(e) => setActiveInterval(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                      <Input
                        label="Timeout (Giây)"
                        type="number"
                        placeholder="1"
                        value={activeTimeout}
                        onChange={(e) => setActiveTimeout(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-gray-200">
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-emerald-700">Điều kiện HEALTHY (Khỏe mạnh)</span>
                        <Input
                          label="Số lần thành công liên tiếp (Successes)"
                          type="number"
                          placeholder="2"
                          value={activeHealthySuccesses}
                          onChange={(e) => setActiveHealthySuccesses(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input
                          label="Mã HTTP hợp lệ"
                          placeholder="200, 302"
                          value={activeHealthyStatuses}
                          onChange={(e) => setActiveHealthyStatuses(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-red-700">Điều kiện UNHEALTHY (Lỗi)</span>
                        <Input
                          label="Số lần lỗi liên tiếp (Failures)"
                          type="number"
                          placeholder="5"
                          value={activeUnhealthyFailures}
                          onChange={(e) => setActiveUnhealthyFailures(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input
                          label="Mã HTTP coi là lỗi"
                          placeholder="429, 500, 503"
                          value={activeUnhealthyStatuses}
                          onChange={(e) => setActiveUnhealthyStatuses(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Passive Healthchecks Section */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-xs text-gray-900">Passive Health Checks (Circuit Breaker từ Request thực)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePassiveHC}
                      onChange={(e) => setEnablePassiveHC(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {enablePassiveHC && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-200/80 bg-white p-3 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-emerald-700">Thành công (Healthy)</span>
                      <Input
                        label="Số request thành công để khôi phục"
                        type="number"
                        placeholder="5"
                        value={passiveHealthySuccesses}
                        onChange={(e) => setPassiveHealthySuccesses(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        label="Mã HTTP hợp lệ"
                        placeholder="200, 201, 202"
                        value={passiveHealthyStatuses}
                        onChange={(e) => setPassiveHealthyStatuses(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-red-700">Thất bại (Unhealthy)</span>
                      <Input
                        label="Số request lỗi liên tiếp để ngắt mạch"
                        type="number"
                        placeholder="5"
                        value={passiveUnhealthyFailures}
                        onChange={(e) => setPassiveUnhealthyFailures(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        label="Mã HTTP coi là lỗi"
                        placeholder="429, 500, 503"
                        value={passiveUnhealthyStatuses}
                        onChange={(e) => setPassiveUnhealthyStatuses(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedUpstream(null);
              }}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isEditModalOpen ? 'Cập nhật Upstream' : 'Lưu Upstream'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: Targets & Health Monitor Modal */}
      {/* ========================================================= */}
      {selectedUpstream && isTargetsModalOpen && (
        <Modal
          isOpen={isTargetsModalOpen}
          onClose={() => {
            setIsTargetsModalOpen(false);
            setSelectedUpstream(null);
          }}
          title={`Backend Targets & Health: ${selectedUpstream.name}`}
          description={`Danh sách các địa chỉ máy chủ backend đích (IP:Port) và trạng thái sống/chết trong Pool`}
        >
          <div className="space-y-5">
            {/* Add Target Form */}
            <form onSubmit={handleAddTarget} className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-3">
              <span className="text-xs font-bold text-gray-800">Thêm Target mới vào Pool</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  label="Host:Port (Địa chỉ máy chủ)"
                  placeholder="192.168.1.50:8080 hoặc backend.internal:3000"
                  value={newTargetHostPort}
                  onChange={(e) => setNewTargetHostPort(e.target.value)}
                  className="text-xs h-9 bg-white"
                  required
                />
                <Input
                  label="Trọng số (Weight: 0 - 1000)"
                  type="number"
                  placeholder="100"
                  value={newTargetWeight}
                  onChange={(e) => setNewTargetWeight(e.target.value)}
                  className="text-xs h-9 bg-white"
                  helperText="0 = Drained (Ngừng nhận traffic)"
                />
                <Input
                  label="Tags"
                  placeholder="node-1, zone-a"
                  value={newTargetTags}
                  onChange={(e) => setNewTargetTags(e.target.value)}
                  className="text-xs h-9 bg-white"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" isLoading={isAddingTarget} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Thêm Target
                </Button>
              </div>
            </form>

            {/* Targets Table with Real-time Health Status */}
            {isLoadingTargets ? (
              <div className="py-6 text-center text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600" />
              </div>
            ) : currentTargets.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Upstream này chưa có Target nào. Vui lòng thêm máy chủ backend.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50/60">
                    <TableRow>
                      <TableHead className="text-xs">Target (Host:Port)</TableHead>
                      <TableHead className="text-xs">Trọng số (Weight)</TableHead>
                      <TableHead className="text-xs">Trạng thái Sống/Chết</TableHead>
                      <TableHead className="text-xs text-right">Điều khiển Health / Xóa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTargets.map((t) => {
                      const health = targetHealthMap[t.target] || targetHealthMap[t.id] || (t.weight === 0 ? 'DRAINED' : 'HEALTHY');

                      return (
                        <TableRow key={t.id} className="text-xs">
                          <TableCell className="font-mono font-semibold text-gray-900">{t.target}</TableCell>
                          <TableCell>
                            <span className="font-mono">{t.weight}</span>
                            {t.weight === 0 && (
                              <Badge variant="outline" className="ml-1.5 text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                Drained
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {health === 'HEALTHY' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> HEALTHY
                              </span>
                            )}
                            {health === 'UNHEALTHY' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                <XCircle className="h-3.5 w-3.5 text-red-600" /> UNHEALTHY
                              </span>
                            )}
                            {health === 'DRAINED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                <AlertCircle className="h-3.5 w-3.5 text-gray-500" /> DRAINED
                              </span>
                            )}
                            {health === 'DNS_ERROR' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                <AlertCircle className="h-3.5 w-3.5 text-purple-600" /> DNS_ERROR
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetTargetHealthy(t)}
                              className="h-7 text-[11px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              title="Thủ công đánh dấu Healthy"
                            >
                              Healthy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetTargetUnhealthy(t)}
                              className="h-7 text-[11px] px-2 text-amber-700 border-amber-200 hover:bg-amber-50"
                              title="Thủ công đánh dấu Unhealthy"
                            >
                              Unhealthy
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteTarget(t.id)}
                              className="h-7 w-7 text-gray-400 hover:text-red-600"
                              title="Xóa Target"
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

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTargetsModalOpen(false);
                  setSelectedUpstream(null);
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
