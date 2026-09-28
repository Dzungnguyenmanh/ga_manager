'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { KongConsumer, KongKeyAuth, KongJWT, KongBasicAuth, KongACL } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  KeyRound,
  Shield,
  Lock,
  Tag,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Search,
  ExternalLink,
  Info,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

type CredentialTab = 'key-auth' | 'jwt' | 'basic-auth' | 'acls';

export default function ConsumersPage() {
  const { activeCluster, activeClusterId } = useClusterStore();
  const [consumers, setConsumers] = React.useState<KongConsumer[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Create / Edit Consumer Modal
  const [isConsumerModalOpen, setIsConsumerModalOpen] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [consumerToEdit, setConsumerToEdit] = React.useState<KongConsumer | null>(null);
  const [isSubmittingConsumer, setIsSubmittingConsumer] = React.useState(false);
  const [consumerUsername, setConsumerUsername] = React.useState('');
  const [consumerCustomId, setConsumerCustomId] = React.useState('');
  const [consumerTags, setConsumerTags] = React.useState('');

  // Credentials Hub Modal
  const [selectedConsumer, setSelectedConsumer] = React.useState<KongConsumer | null>(null);
  const [activeTab, setActiveTab] = React.useState<CredentialTab>('key-auth');
  const [isCredLoading, setIsCredLoading] = React.useState(false);
  const [copiedKeyId, setCopiedKeyId] = React.useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = React.useState<Record<string, boolean>>({});

  // Credential lists for active consumer
  const [keyAuthList, setKeyAuthList] = React.useState<KongKeyAuth[]>([]);
  const [jwtList, setJwtList] = React.useState<KongJWT[]>([]);
  const [basicAuthList, setBasicAuthList] = React.useState<KongBasicAuth[]>([]);
  const [aclList, setAclList] = React.useState<KongACL[]>([]);

  // Add Credential Form States
  const [newKeyAuthKey, setNewKeyAuthKey] = React.useState('');
  const [newKeyAuthTags, setNewKeyAuthTags] = React.useState('');

  const [newJwtKey, setNewJwtKey] = React.useState('');
  const [newJwtAlgorithm, setNewJwtAlgorithm] = React.useState<'HS256' | 'RS256' | 'ES256'>('HS256');
  const [newJwtSecret, setNewJwtSecret] = React.useState('');
  const [newJwtRsaPublicKey, setNewJwtRsaPublicKey] = React.useState('');
  const [newJwtTags, setNewJwtTags] = React.useState('');

  const [newBasicUsername, setNewBasicUsername] = React.useState('');
  const [newBasicPassword, setNewBasicPassword] = React.useState('');
  const [newBasicTags, setNewBasicTags] = React.useState('');

  const [newAclGroup, setNewAclGroup] = React.useState('');
  const [newAclTags, setNewAclTags] = React.useState('');
  const [isAddingCred, setIsAddingCred] = React.useState(false);

  const fetchConsumers = React.useCallback(async () => {
    if (!activeClusterId) {
      setConsumers([]);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await api.get('/api/kong/consumers');
      setConsumers(res.data || []);
    } catch (err: any) {
      console.error('Error fetching Kong consumers:', err);
      setErrorMsg(err.response?.data?.error || 'Không thể kết nối Kong Gateway để lấy danh sách Consumers');
    } finally {
      setIsLoading(false);
    }
  }, [activeClusterId]);

  React.useEffect(() => {
    fetchConsumers();
  }, [fetchConsumers]);

  // Load credentials whenever active tab or selected consumer changes
  const loadCredentials = React.useCallback(async (consumer: KongConsumer, tab: CredentialTab) => {
    if (!consumer) return;
    try {
      setIsCredLoading(true);
      if (tab === 'key-auth') {
        const res = await api.get(`/api/kong/consumers/${consumer.id}/key-auth`);
        setKeyAuthList(res.data || []);
      } else if (tab === 'jwt') {
        const res = await api.get(`/api/kong/consumers/${consumer.id}/jwt`);
        setJwtList(res.data || []);
      } else if (tab === 'basic-auth') {
        const res = await api.get(`/api/kong/consumers/${consumer.id}/basic-auth`);
        setBasicAuthList(res.data || []);
      } else if (tab === 'acls') {
        const res = await api.get(`/api/kong/consumers/${consumer.id}/acls`);
        setAclList(res.data || []);
      }
    } catch (err: any) {
      console.error(`Error loading ${tab}:`, err);
    } finally {
      setIsCredLoading(false);
    }
  }, []);

  const openCredentialsModal = (consumer: KongConsumer) => {
    setSelectedConsumer(consumer);
    setActiveTab('key-auth');
    // reset form fields
    setNewKeyAuthKey('');
    setNewKeyAuthTags('');
    setNewJwtKey('');
    setNewJwtSecret('');
    setNewJwtRsaPublicKey('');
    setNewJwtTags('');
    setNewBasicUsername('');
    setNewBasicPassword('');
    setNewBasicTags('');
    setNewAclGroup('');
    setNewAclTags('');
    loadCredentials(consumer, 'key-auth');
  };

  const handleTabChange = (tab: CredentialTab) => {
    setActiveTab(tab);
    if (selectedConsumer) {
      loadCredentials(selectedConsumer, tab);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setConsumerToEdit(null);
    setConsumerUsername('');
    setConsumerCustomId('');
    setConsumerTags('');
    setIsConsumerModalOpen(true);
  };

  const openEditModal = (consumer: KongConsumer) => {
    setIsEditMode(true);
    setConsumerToEdit(consumer);
    setConsumerUsername(consumer.username || '');
    setConsumerCustomId(consumer.custom_id || '');
    setConsumerTags(consumer.tags ? consumer.tags.join(', ') : '');
    setIsConsumerModalOpen(true);
  };

  const handleSaveConsumer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClusterId) {
      alert('Vui lòng chọn một Kong Cluster trước!');
      return;
    }

    try {
      setIsSubmittingConsumer(true);
      const parsedTags = consumerTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Partial<KongConsumer> = {
        username: consumerUsername.trim() || undefined,
        custom_id: consumerCustomId.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      };

      if (isEditMode && consumerToEdit) {
        const res = await api.patch(`/api/kong/consumers/${consumerToEdit.id}`, payload);
        setConsumers((prev) => prev.map((c) => (c.id === consumerToEdit.id ? res.data : c)));
      } else {
        const res = await api.post('/api/kong/consumers', payload);
        setConsumers((prev) => [...prev, res.data]);
      }
      setIsConsumerModalOpen(false);
    } catch (err: any) {
      alert(`Lỗi khi lưu Consumer trên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmittingConsumer(false);
    }
  };

  const handleDeleteConsumer = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa Consumer này khỏi Kong Gateway? Tất cả credentials liên kết sẽ bị thu hồi.')) {
      try {
        await api.delete(`/api/kong/consumers/${id}`);
        setConsumers((prev) => prev.filter((c) => c.id !== id));
        if (selectedConsumer?.id === id) {
          setSelectedConsumer(null);
        }
      } catch (err: any) {
        alert(`Lỗi khi xóa Consumer trên Kong: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  // Helper generators
  const generateRandomKey = (len: number = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // -------------------------------------------------------------
  // Credential Handlers
  // -------------------------------------------------------------

  // KeyAuth
  const handleAddKeyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsumer) return;
    try {
      setIsAddingCred(true);
      const parsedTags = newKeyAuthTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload: any = {
        key: newKeyAuthKey.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      };
      const res = await api.post(`/api/kong/consumers/${selectedConsumer.id}/key-auth`, payload);
      setKeyAuthList((prev) => [res.data, ...prev]);
      setNewKeyAuthKey('');
      setNewKeyAuthTags('');
    } catch (err: any) {
      alert(`Lỗi khi tạo API Key: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsAddingCred(false);
    }
  };

  const handleDeleteKeyAuth = async (keyId: string) => {
    if (!selectedConsumer || !confirm('Bạn có chắc muốn thu hồi API Key này?')) return;
    try {
      await api.delete(`/api/kong/consumers/${selectedConsumer.id}/key-auth/${keyId}`);
      setKeyAuthList((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err: any) {
      alert(`Lỗi khi xóa API Key: ${err.response?.data?.error || err.message}`);
    }
  };

  // JWT
  const handleAddJWT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsumer) return;
    try {
      setIsAddingCred(true);
      const parsedTags = newJwtTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload: any = {
        key: newJwtKey.trim() || undefined,
        algorithm: newJwtAlgorithm,
        secret: newJwtSecret.trim() || undefined,
        rsa_public_key: newJwtAlgorithm.startsWith('RS') || newJwtAlgorithm.startsWith('ES') ? newJwtRsaPublicKey.trim() : undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      };
      const res = await api.post(`/api/kong/consumers/${selectedConsumer.id}/jwt`, payload);
      setJwtList((prev) => [res.data, ...prev]);
      setNewJwtKey('');
      setNewJwtSecret('');
      setNewJwtRsaPublicKey('');
      setNewJwtTags('');
    } catch (err: any) {
      alert(`Lỗi khi tạo JWT Credential: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsAddingCred(false);
    }
  };

  const handleDeleteJWT = async (jwtId: string) => {
    if (!selectedConsumer || !confirm('Bạn có chắc muốn xóa JWT Credential này?')) return;
    try {
      await api.delete(`/api/kong/consumers/${selectedConsumer.id}/jwt/${jwtId}`);
      setJwtList((prev) => prev.filter((j) => j.id !== jwtId));
    } catch (err: any) {
      alert(`Lỗi khi xóa JWT Credential: ${err.response?.data?.error || err.message}`);
    }
  };

  // BasicAuth
  const handleAddBasicAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsumer) return;
    if (!newBasicUsername.trim() || !newBasicPassword.trim()) {
      alert('Vui lòng nhập Username và Password');
      return;
    }
    try {
      setIsAddingCred(true);
      const parsedTags = newBasicTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload: any = {
        username: newBasicUsername.trim(),
        password: newBasicPassword.trim(),
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      };
      const res = await api.post(`/api/kong/consumers/${selectedConsumer.id}/basic-auth`, payload);
      setBasicAuthList((prev) => [res.data, ...prev]);
      setNewBasicUsername('');
      setNewBasicPassword('');
      setNewBasicTags('');
    } catch (err: any) {
      alert(`Lỗi khi tạo Basic Auth: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsAddingCred(false);
    }
  };

  const handleDeleteBasicAuth = async (authId: string) => {
    if (!selectedConsumer || !confirm('Bạn có chắc muốn xóa Basic Auth credential này?')) return;
    try {
      await api.delete(`/api/kong/consumers/${selectedConsumer.id}/basic-auth/${authId}`);
      setBasicAuthList((prev) => prev.filter((b) => b.id !== authId));
    } catch (err: any) {
      alert(`Lỗi khi xóa Basic Auth: ${err.response?.data?.error || err.message}`);
    }
  };

  // ACLs
  const handleAddACL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsumer) return;
    if (!newAclGroup.trim()) {
      alert('Vui lòng nhập tên nhóm ACL (Group name)');
      return;
    }
    try {
      setIsAddingCred(true);
      const parsedTags = newAclTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload: any = {
        group: newAclGroup.trim(),
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      };
      const res = await api.post(`/api/kong/consumers/${selectedConsumer.id}/acls`, payload);
      setAclList((prev) => [res.data, ...prev]);
      setNewAclGroup('');
      setNewAclTags('');
    } catch (err: any) {
      alert(`Lỗi khi gán ACL Group: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsAddingCred(false);
    }
  };

  const handleDeleteACL = async (aclId: string) => {
    if (!selectedConsumer || !confirm('Bạn có chắc muốn xóa Consumer khỏi nhóm ACL này?')) return;
    try {
      await api.delete(`/api/kong/consumers/${selectedConsumer.id}/acls/${aclId}`);
      setAclList((prev) => prev.filter((a) => a.id !== aclId));
    } catch (err: any) {
      alert(`Lỗi khi xóa ACL: ${err.response?.data?.error || err.message}`);
    }
  };

  // Filtered consumers
  const filteredConsumers = consumers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.custom_id && c.custom_id.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Consumers & Credentials</h1>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Enterprise Hub
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Mô hình chuẩn Kong Enterprise: Quản lý Định danh <strong>Consumer</strong> ➔ Cấp phát <strong>API Key</strong>, <strong>JWT</strong>, <strong>Basic Auth</strong>, và Phân quyền nhóm <strong>ACL Groups</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={openCreateModal} className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Tạo Consumer mới
            </Button>
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-3 flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700 mt-0.5">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-950">1. API Keys (key-auth)</p>
              <p className="text-[11px] text-blue-800/80 mt-0.5">Xác thực qua header <code className="font-mono bg-blue-100/70 px-1 rounded">apikey</code> hoặc query params.</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-xl p-3 flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700 mt-0.5">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">2. JWT Tokens (jwt)</p>
              <p className="text-[11px] text-indigo-800/80 mt-0.5">Xác thực token theo thuật toán HS256 / RS256 và Secret/RSA Key.</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 mt-0.5">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">3. Basic Auth (basic-auth)</p>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">Xác thực HTTP Basic Authorization (Base64 username:password).</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 mt-0.5">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">4. ACL Groups (acls)</p>
              <p className="text-[11px] text-amber-800/80 mt-0.5">Gán nhóm quyền (<code className="font-mono bg-amber-100/70 px-1 rounded">admin</code>, <code className="font-mono bg-amber-100/70 px-1 rounded">premium</code>) để phân nhánh truy cập.</p>
            </div>
          </div>
        </div>

        {!activeClusterId && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>Chưa có Kong Cluster nào được chọn. Vui lòng kết nối Cluster để quản lý Consumers & Credentials.</span>
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
            <Button size="sm" variant="outline" onClick={fetchConsumers} className="h-7 text-xs">
              Thử lại
            </Button>
          </div>
        )}

        {/* Consumer Table Card */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Danh sách Consumers trên Kong ({filteredConsumers.length})</CardTitle>
                <CardDescription>Mỗi Consumer đại diện cho một ứng dụng hoặc người dùng sử dụng API</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm theo Username, Custom ID..."
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
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" />
                <p className="text-xs">Đang tải danh sách Consumers từ Kong Admin API...</p>
              </div>
            ) : filteredConsumers.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {searchQuery ? 'Không tìm thấy Consumer phù hợp' : 'Chưa có Consumer nào trên Kong'}
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                    {searchQuery
                      ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc'
                      : 'Đăng ký Consumer đầu tiên để bắt đầu cấp phát API Key, JWT hoặc phân quyền ACL.'}
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={openCreateModal} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo Consumer đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Username / Định danh</TableHead>
                    <TableHead className="font-semibold text-gray-700">Custom ID (Mã Ngoài)</TableHead>
                    <TableHead className="font-semibold text-gray-700">Kong Consumer ID</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tags</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Credentials Hub</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConsumers.map((c) => (
                    <TableRow key={c.id} className="hover:bg-purple-50/20 transition-colors">
                      <TableCell className="font-medium text-gray-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-100/80 flex items-center justify-center text-purple-700 font-bold text-xs uppercase shadow-xs">
                            {c.username ? c.username.slice(0, 2) : 'ID'}
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-gray-900">{c.username || 'Chưa đặt Username'}</span>
                            <div className="text-[11px] text-gray-400">Client / Consumer</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-700">
                        {c.custom_id ? (
                          <Badge variant="secondary" className="font-mono font-normal text-xs bg-gray-100 text-gray-800">
                            {c.custom_id}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Không có</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[140px]" title={c.id}>
                            {c.id}
                          </span>
                          <button
                            onClick={() => copyToClipboard(c.id, `consumer-${c.id}`)}
                            className="text-gray-400 hover:text-gray-700 p-0.5 rounded"
                            title="Sao chép Consumer ID"
                          >
                            {copiedKeyId === `consumer-${c.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {c.tags && c.tags.length > 0 ? (
                            c.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-600 border-gray-200">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCredentialsModal(c)}
                          className="h-8 text-xs font-semibold bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 shadow-2xs"
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
                          Quản lý Credentials & ACLs
                        </Button>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(c)}
                          className="h-8 w-8 text-gray-500 hover:text-purple-700 hover:bg-purple-50"
                          title="Chỉnh sửa Consumer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteConsumer(c.id)}
                          className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          title="Xóa Consumer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: Create / Edit Consumer Modal */}
      {/* ========================================================= */}
      <Modal
        isOpen={isConsumerModalOpen}
        onClose={() => setIsConsumerModalOpen(false)}
        title={isEditMode ? 'Chỉnh sửa Kong Consumer' : 'Tạo Kong Consumer mới'}
        description="Đăng ký client trực tiếp lên Kong Admin API để sau đó cấp phát Credential (API Key, JWT, Basic Auth...)"
      >
        <form onSubmit={handleSaveConsumer} className="space-y-4">
          <Input
            label="Username (Tên định danh)"
            placeholder="client-mobile-app hoặc user@company.com"
            value={consumerUsername}
            onChange={(e) => setConsumerUsername(e.target.value)}
            helperText="Tên định danh đại diện người dùng hoặc client trong hệ thống"
          />

          <Input
            label="Custom ID (Tùy chọn)"
            placeholder="client_123456"
            value={consumerCustomId}
            onChange={(e) => setConsumerCustomId(e.target.value)}
            helperText="Mã định danh ngoài ánh xạ từ Database của bạn (ví dụ User ID trong PostgreSQL/MySQL)"
          />

          <Input
            label="Tags (Phân nhóm, cách nhau dấu phẩy)"
            placeholder="mobile, internal, vip-tier"
            value={consumerTags}
            onChange={(e) => setConsumerTags(e.target.value)}
            helperText="Gán nhãn giúp lọc và quản lý consumer dễ dàng qua API"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsConsumerModalOpen(false)} disabled={isSubmittingConsumer}>
              Hủy
            </Button>
            <Button type="submit" isLoading={isSubmittingConsumer} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isEditMode ? 'Cập nhật Consumer' : 'Lưu Consumer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: Credentials & ACL Groups Hub Modal */}
      {/* ========================================================= */}
      {selectedConsumer && (
        <Modal
          isOpen={Boolean(selectedConsumer)}
          onClose={() => setSelectedConsumer(null)}
          title={`Credentials & ACLs: ${selectedConsumer.username || selectedConsumer.custom_id || selectedConsumer.id}`}
          description={`Quản lý toàn bộ API Keys, JWT Credentials, Basic Auth và ACL Groups cho Consumer ID: ${selectedConsumer.id}`}
        >
          <div className="space-y-5">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => handleTabChange('key-auth')}
                className={`flex items-center gap-1.5 py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'key-auth'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                API Keys (key-auth)
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800">
                  {keyAuthList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('jwt')}
                className={`flex items-center gap-1.5 py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'jwt'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                JWT Credentials
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
                  {jwtList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('basic-auth')}
                className={`flex items-center gap-1.5 py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'basic-auth'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                Basic Auth
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                  {basicAuthList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('acls')}
                className={`flex items-center gap-1.5 py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors ${
                  activeTab === 'acls'
                    ? 'border-amber-600 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                ACL Groups
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
                  {aclList.length}
                </span>
              </button>
            </div>

            {/* TAB CONTENT 1: Key Auth */}
            {activeTab === 'key-auth' && (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Cơ chế xác thực API Key (`key-auth`)</p>
                    <p className="text-blue-800/80 mt-0.5">
                      Client gửi API Key qua HTTP Header <code className="font-mono bg-blue-100 px-1 rounded">apikey: &lt;key&gt;</code> hoặc query parameter <code className="font-mono bg-blue-100 px-1 rounded">?apikey=&lt;key&gt;</code>.
                    </p>
                  </div>
                </div>

                {/* Create Key Auth Form */}
                <form onSubmit={handleAddKeyAuth} className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Cấp phát API Key mới</span>
                    <button
                      type="button"
                      onClick={() => setNewKeyAuthKey(generateRandomKey(32))}
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="h-3 w-3" />
                      Tạo ngẫu nhiên (32 ký tự)
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Nhập khóa tùy chỉnh hoặc để trống để Kong tự tạo"
                      value={newKeyAuthKey}
                      onChange={(e) => setNewKeyAuthKey(e.target.value)}
                      className="text-xs h-9 bg-white"
                    />
                    <Input
                      placeholder="Tags (vd: mobile-v1, production)"
                      value={newKeyAuthTags}
                      onChange={(e) => setNewKeyAuthTags(e.target.value)}
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" isLoading={isAddingCred} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Tạo & Cấp API Key
                    </Button>
                  </div>
                </form>

                {/* Key Auth List */}
                {isCredLoading ? (
                  <div className="py-6 text-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
                  </div>
                ) : keyAuthList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Chưa có API Key nào được cấp cho Consumer này.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50/60">
                        <TableRow>
                          <TableHead className="text-xs">API Key</TableHead>
                          <TableHead className="text-xs">Tags</TableHead>
                          <TableHead className="text-xs">Ngày cấp</TableHead>
                          <TableHead className="text-xs text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keyAuthList.map((k) => (
                          <TableRow key={k.id} className="text-xs">
                            <TableCell className="font-mono">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                  {revealedSecrets[k.id] ? k.key : `${k.key.slice(0, 6)}••••••••••••••••${k.key.slice(-4)}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleReveal(k.id)}
                                  className="text-gray-400 hover:text-gray-700 p-1"
                                  title={revealedSecrets[k.id] ? 'Ẩn' : 'Hiện'}
                                >
                                  {revealedSecrets[k.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(k.key, k.id)}
                                  className="text-gray-400 hover:text-blue-600 p-1"
                                  title="Sao chép API Key"
                                >
                                  {copiedKeyId === k.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {k.tags?.map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                                    {t}
                                  </Badge>
                                )) || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-500 text-[11px]">
                              {k.created_at ? new Date(k.created_at * 1000).toLocaleString('vi-VN') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteKeyAuth(k.id)}
                                className="h-7 w-7 text-gray-400 hover:text-red-600"
                                title="Thu hồi API Key"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: JWT Credentials */}
            {activeTab === 'jwt' && (
              <div className="space-y-4">
                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-3 text-xs text-indigo-900 flex items-start gap-2">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Cơ chế xác thực JWT (`jwt`)</p>
                    <p className="text-indigo-800/80 mt-0.5">
                      Kong Gateway giải mã và xác minh chữ ký của JWT token thông qua `iss` (trùng khớp với Key) và Secret / Public Key.
                    </p>
                  </div>
                </div>

                {/* Create JWT Form */}
                <form onSubmit={handleAddJWT} className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Tạo JWT Credential mới</span>
                    <button
                      type="button"
                      onClick={() => setNewJwtSecret(generateRandomKey(40))}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="h-3 w-3" />
                      Tạo Secret ngẫu nhiên
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      label="Key (Issuer - iss)"
                      placeholder="vd: my-auth-issuer hoặc my-app-key"
                      value={newJwtKey}
                      onChange={(e) => setNewJwtKey(e.target.value)}
                      className="text-xs h-9 bg-white"
                      helperText="Được so khớp với claim 'iss' trong JWT"
                    />

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Thuật toán (Algorithm)</label>
                      <select
                        value={newJwtAlgorithm}
                        onChange={(e) => setNewJwtAlgorithm(e.target.value as any)}
                        className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="HS256">HS256 (HMAC with SHA-256)</option>
                        <option value="RS256">RS256 (RSA Signature with SHA-256)</option>
                        <option value="ES256">ES256 (ECDSA with SHA-256)</option>
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">HS256 dùng Secret, RS256/ES256 dùng Public Key</p>
                    </div>

                    <Input
                      label="Secret (cho HS256)"
                      placeholder="Khóa bí mật dùng ký HMAC"
                      value={newJwtSecret}
                      onChange={(e) => setNewJwtSecret(e.target.value)}
                      className="text-xs h-9 bg-white"
                      disabled={newJwtAlgorithm.startsWith('RS') || newJwtAlgorithm.startsWith('ES')}
                    />
                  </div>

                  {(newJwtAlgorithm.startsWith('RS') || newJwtAlgorithm.startsWith('ES')) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">RSA / ECDSA Public Key (PEM format)</label>
                      <textarea
                        rows={3}
                        placeholder="-----BEGIN PUBLIC KEY-----&#10;MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...&#10;-----END PUBLIC KEY-----"
                        value={newJwtRsaPublicKey}
                        onChange={(e) => setNewJwtRsaPublicKey(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" size="sm" isLoading={isAddingCred} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Lưu JWT Credential
                    </Button>
                  </div>
                </form>

                {/* JWT List */}
                {isCredLoading ? (
                  <div className="py-6 text-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                  </div>
                ) : jwtList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Chưa có JWT Credential nào cho Consumer này.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50/60">
                        <TableRow>
                          <TableHead className="text-xs">Key (iss)</TableHead>
                          <TableHead className="text-xs">Algorithm</TableHead>
                          <TableHead className="text-xs">Secret / Public Key</TableHead>
                          <TableHead className="text-xs text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jwtList.map((j) => (
                          <TableRow key={j.id} className="text-xs">
                            <TableCell className="font-mono font-semibold text-gray-900">{j.key}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                                {j.algorithm || 'HS256'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-gray-600">
                              {j.secret ? (
                                <div className="flex items-center gap-2">
                                  <span>
                                    {revealedSecrets[j.id] ? j.secret : `${j.secret.slice(0, 4)}••••••••${j.secret.slice(-4)}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleReveal(j.id)}
                                    className="text-gray-400 hover:text-gray-700 p-0.5"
                                  >
                                    {revealedSecrets[j.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(j.secret || '', j.id)}
                                    className="text-gray-400 hover:text-indigo-600 p-0.5"
                                  >
                                    {copiedKeyId === j.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                </div>
                              ) : j.rsa_public_key ? (
                                <span className="text-[11px] text-gray-500 font-mono italic">[RSA/ECDSA Public Key Configured]</span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteJWT(j.id)}
                                className="h-7 w-7 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: Basic Auth */}
            {activeTab === 'basic-auth' && (
              <div className="space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2">
                  <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Cơ chế xác thực Basic Auth (`basic-auth`)</p>
                    <p className="text-emerald-800/80 mt-0.5">
                      Client gửi Header <code className="font-mono bg-emerald-100 px-1 rounded">Authorization: Basic &lt;Base64(username:password)&gt;</code>.
                    </p>
                  </div>
                </div>

                {/* Create Basic Auth Form */}
                <form onSubmit={handleAddBasicAuth} className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Thêm tài khoản Basic Auth</span>
                    <button
                      type="button"
                      onClick={() => setNewBasicPassword(generateRandomKey(16))}
                      className="text-[11px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="h-3 w-3" />
                      Tạo mật khẩu ngẫu nhiên
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Username (vd: admin-client)"
                      value={newBasicUsername}
                      onChange={(e) => setNewBasicUsername(e.target.value)}
                      className="text-xs h-9 bg-white"
                      required
                    />
                    <Input
                      placeholder="Password (Mật khẩu)"
                      value={newBasicPassword}
                      onChange={(e) => setNewBasicPassword(e.target.value)}
                      className="text-xs h-9 bg-white"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" isLoading={isAddingCred} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Lưu Basic Auth
                    </Button>
                  </div>
                </form>

                {/* Basic Auth List */}
                {isCredLoading ? (
                  <div className="py-6 text-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600" />
                  </div>
                ) : basicAuthList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Chưa có thông tin Basic Auth nào cho Consumer này.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50/60">
                        <TableRow>
                          <TableHead className="text-xs">Username</TableHead>
                          <TableHead className="text-xs">Password</TableHead>
                          <TableHead className="text-xs">Ngày cấp</TableHead>
                          <TableHead className="text-xs text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {basicAuthList.map((b) => (
                          <TableRow key={b.id} className="text-xs">
                            <TableCell className="font-semibold text-gray-900">{b.username}</TableCell>
                            <TableCell className="font-mono text-gray-600">
                              {b.password ? (
                                <div className="flex items-center gap-2">
                                  <span>{revealedSecrets[b.id] ? b.password : '••••••••••••'}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleReveal(b.id)}
                                    className="text-gray-400 hover:text-gray-700 p-0.5"
                                  >
                                    {revealedSecrets[b.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(b.password || '', b.id)}
                                    className="text-gray-400 hover:text-emerald-600 p-0.5"
                                  >
                                    {copiedKeyId === b.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="italic text-gray-400">Đã băm (Hashed)</span>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-500 text-[11px]">
                              {b.created_at ? new Date(b.created_at * 1000).toLocaleString('vi-VN') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteBasicAuth(b.id)}
                                className="h-7 w-7 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 4: ACL Groups */}
            {activeTab === 'acls' && (
              <div className="space-y-4">
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Phân quyền theo Nhóm ACL (`acl` plugin)</p>
                    <p className="text-amber-800/80 mt-0.5">
                      Gán Consumer vào các nhóm quyền. Plugin ACL trên Route / Service sẽ kiểm tra danh sách nhóm này để cho phép (`allow`) hoặc chặn (`deny`) truy cập.
                    </p>
                  </div>
                </div>

                {/* Add ACL Group Form */}
                <form onSubmit={handleAddACL} className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-3">
                  <span className="text-xs font-bold text-gray-800">Thêm Consumer vào nhóm ACL</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Tên nhóm ACL (vd: admin, premium, partner)"
                      value={newAclGroup}
                      onChange={(e) => setNewAclGroup(e.target.value)}
                      className="text-xs h-9 bg-white"
                      required
                    />
                    <Input
                      placeholder="Tags (vd: rbac-v1)"
                      value={newAclTags}
                      onChange={(e) => setNewAclTags(e.target.value)}
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span>Gợi ý:</span>
                      {['admin', 'vip', 'premium', 'internal-app', 'public-users'].map((grp) => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setNewAclGroup(grp)}
                          className="px-2 py-0.5 bg-gray-200 hover:bg-amber-100 hover:text-amber-800 rounded font-mono text-[10px] transition-colors"
                        >
                          {grp}
                        </button>
                      ))}
                    </div>
                    <Button type="submit" size="sm" isLoading={isAddingCred} className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Gán Nhóm ACL
                    </Button>
                  </div>
                </form>

                {/* ACL Groups List */}
                {isCredLoading ? (
                  <div className="py-6 text-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-amber-600" />
                  </div>
                ) : aclList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Consumer này chưa thuộc bất kỳ nhóm ACL nào.</p>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    {aclList.map((a) => (
                      <div
                        key={a.id}
                        className="inline-flex items-center gap-2 bg-white border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-900 shadow-2xs"
                      >
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        <span className="font-mono">{a.group}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteACL(a.id)}
                          className="text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors"
                          title="Xóa khỏi nhóm"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setSelectedConsumer(null)} className="text-xs">
                Đóng Hub
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
