'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { KongPlugin } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import {
  Puzzle,
  Plus,
  CheckCircle,
  XCircle,
  Trash2,
  Code,
  RotateCcw,
  Info,
  Loader2,
  AlertCircle,
  Route as RouteIcon,
  Layers,
  Users,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

interface PluginTemplate {
  name: string;
  title: string;
  category: 'Authentication' | 'Security' | 'Traffic Control' | 'Analytics & Logging' | 'Transformations';
  description: string;
  defaultConfig: Record<string, any>;
}

const PLUGIN_TEMPLATES: Record<string, PluginTemplate> = {
  'rate-limiting': {
    name: 'rate-limiting',
    title: 'Rate Limiting',
    category: 'Traffic Control',
    description: 'Giới hạn số lượng yêu cầu HTTP mà client có thể gọi trong khoảng thời gian nhất định.',
    defaultConfig: {
      minute: 100,
      hour: 10000,
      policy: 'local',
      fault_tolerant: true,
      hide_client_headers: false,
      limit_by: 'consumer',
    },
  },
  'key-auth': {
    name: 'key-auth',
    title: 'API Key Authentication',
    category: 'Authentication',
    description: 'Xác thực request thông qua API Key trong Header hoặc Query parameter.',
    defaultConfig: {
      key_names: ['apikey', 'X-API-Key'],
      key_in_header: true,
      key_in_query: true,
      key_in_body: false,
      hide_credentials: true,
      run_on_preflight: true,
    },
  },
  jwt: {
    name: 'jwt',
    title: 'JWT Authentication',
    category: 'Authentication',
    description: 'Xác thực chữ ký JSON Web Token (JWT) và bảo vệ an toàn cho upstream API.',
    defaultConfig: {
      uri_param_names: ['jwt'],
      cookie_names: [],
      header_names: ['authorization'],
      key_claim_name: 'iss',
      claims_to_verify: ['exp'],
      secret_is_base64: false,
      run_on_preflight: true,
      maximum_expiration: 86400,
    },
  },
  'basic-auth': {
    name: 'basic-auth',
    title: 'Basic Authentication',
    category: 'Authentication',
    description: 'Bảo vệ endpoint bằng chuẩn HTTP Basic Auth (Username / Password).',
    defaultConfig: {
      hide_credentials: true,
    },
  },
  cors: {
    name: 'cors',
    title: 'Cross-Origin Resource Sharing (CORS)',
    category: 'Security',
    description: 'Cấu hình chính sách chia sẻ tài nguyên giữa các domain khác nhau cho Web Browsers.',
    defaultConfig: {
      origins: ['*'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      headers: [
        'Accept',
        'Accept-Version',
        'Content-Length',
        'Content-MD5',
        'Content-Type',
        'Date',
        'Authorization',
        'X-Kong-Cluster-Id',
      ],
      exposed_headers: ['X-Auth-Token', 'X-Total-Count'],
      credentials: true,
      max_age: 3600,
      preflight_continue: false,
    },
  },
  'ip-restriction': {
    name: 'ip-restriction',
    title: 'IP Restriction',
    category: 'Security',
    description: 'Danh sách trắng (Whitelist) hoặc danh sách đen (Blacklist) các địa chỉ IP được phép gọi API.',
    defaultConfig: {
      allow: ['127.0.0.1', '10.0.0.0/8', '192.168.0.0/16'],
      status: 403,
      message: 'Truy cập bị từ chối do IP không hợp lệ',
    },
  },
  'bot-detection': {
    name: 'bot-detection',
    title: 'Bot Detection',
    category: 'Security',
    description: 'Phát hiện và ngăn chặn các bot độc hại, web scrapers tự động.',
    defaultConfig: {
      allow: ['googlebot', 'bingbot'],
      deny: [],
    },
  },
  prometheus: {
    name: 'prometheus',
    title: 'Prometheus Metrics',
    category: 'Analytics & Logging',
    description: 'Thu thập và xuất các chỉ số hiệu năng (Latency, Status code, Bandwidth) cho Prometheus.',
    defaultConfig: {
      per_consumer: true,
      status_code_metrics: true,
      latency_metrics: true,
      bandwidth_metrics: true,
      upstream_health_metrics: true,
    },
  },
  'file-log': {
    name: 'file-log',
    title: 'File Logging',
    category: 'Analytics & Logging',
    description: 'Ghi lại nhật ký các yêu cầu (access log) dưới dạng JSON vào file trên đĩa.',
    defaultConfig: {
      path: '/tmp/kong_access.log',
      reopen: false,
    },
  },
  'http-log': {
    name: 'http-log',
    title: 'HTTP Logging',
    category: 'Analytics & Logging',
    description: 'Gửi toàn bộ nhật ký truy cập API đến HTTP endpoint của hệ thống Log Server trung tâm.',
    defaultConfig: {
      http_endpoint: 'http://log-collector.internal/v1/logs',
      method: 'POST',
      content_type: 'application/json',
      timeout: 10000,
      keepalive: 60000,
      flush_timeout: 2,
      retry_count: 10,
    },
  },
  'proxy-cache': {
    name: 'proxy-cache',
    title: 'Proxy Caching',
    category: 'Traffic Control',
    description: 'Lưu bộ nhớ đệm (Cache) phản hồi từ upstream để giảm tải cho backend service.',
    defaultConfig: {
      response_code: [200, 301, 404],
      request_method: ['GET', 'HEAD'],
      content_type: ['application/json', 'text/plain'],
      cache_ttl: 300,
      strategy: 'memory',
      memory: {
        dictionary_name: 'kong_db_cache',
      },
    },
  },
  'request-transformer': {
    name: 'request-transformer',
    title: 'Request Transformer',
    category: 'Transformations',
    description: 'Tự động thêm, sửa, xóa Headers/Query/Body trước khi gửi sang upstream backend.',
    defaultConfig: {
      add: {
        headers: ['X-Forwarded-By:Kong-Gateway', 'X-Gateway-Version:3.8'],
        querystring: [],
      },
      remove: {
        headers: ['X-Internal-Secret'],
        querystring: [],
      },
    },
  },
  'response-transformer': {
    name: 'response-transformer',
    title: 'Response Transformer',
    category: 'Transformations',
    description: 'Biến đổi headers hoặc cấu trúc phản hồi trước khi trả về cho Client.',
    defaultConfig: {
      add: {
        headers: ['X-Powered-By:Kong-Manager', 'X-Response-Time:Dynamic'],
      },
      remove: {
        headers: ['Server', 'X-Powered-By'],
      },
    },
  },
  'correlation-id': {
    name: 'correlation-id',
    title: 'Correlation ID',
    category: 'Transformations',
    description: 'Tự động gán hoặc chuyển tiếp mã định danh Request Trace ID qua các microservices.',
    defaultConfig: {
      header_name: 'Kong-Request-ID',
      generator: 'uuid#counter',
      echo_downstream: true,
    },
  },
  'mtls-auth': {
    name: 'mtls-auth',
    title: 'Mutual TLS (mTLS) Authentication',
    category: 'Authentication',
    description: 'Xác thực client inbound hai chiều (Mutual TLS) đối chiếu với các CA Certificates đã cấu hình.',
    defaultConfig: {
      ca_certificates: [],
      cache_ttl: 60,
      revocation_check_mode: 'IGNORE',
      skip_consumer_lookup: false,
      send_ca_dn: false,
    },
  },
  canary: {
    name: 'canary',
    title: 'Canary Release & Traffic Splitting',
    category: 'Traffic Control',
    description: 'Phân tách lưu lượng truy cập Canary dựa trên tỷ lệ phần trăm, header hoặc cookie để thử nghiệm an toàn.',
    defaultConfig: {
      percentage: 10,
      upstream_fallback: false,
      hash: 'consumer',
      hash_header: 'X-Canary',
      hash_cookie: 'canary_token',
      duration: 3600,
      steps: 10,
    },
  },
};

export default function PluginsPage() {
  const { activeCluster, activeClusterId } = useClusterStore();
  const [plugins, setPlugins] = React.useState<KongPlugin[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [selectedPluginKey, setSelectedPluginKey] = React.useState<string>('rate-limiting');
  const [scopeType, setScopeType] = React.useState<'global' | 'route' | 'service' | 'consumer'>('global');
  const [scopeId, setScopeId] = React.useState('');
  const [configJson, setConfigJson] = React.useState('');

  const currentTemplate = PLUGIN_TEMPLATES[selectedPluginKey] || PLUGIN_TEMPLATES['rate-limiting'];

  React.useEffect(() => {
    if (currentTemplate) {
      setConfigJson(JSON.stringify(currentTemplate.defaultConfig, null, 2));
    }
  }, [selectedPluginKey, isModalOpen]);

  const handleResetToDefault = () => {
    if (currentTemplate) {
      setConfigJson(JSON.stringify(currentTemplate.defaultConfig, null, 2));
    }
  };

  const fetchPlugins = React.useCallback(async () => {
    if (!activeClusterId) {
      setPlugins([]);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await api.get('/api/kong/plugins');
      setPlugins(res.data || []);
    } catch (err: any) {
      console.error('Error fetching Kong plugins:', err);
      setErrorMsg(err.response?.data?.error || 'Không thể kết nối Kong Gateway để lấy danh sách Plugins');
    } finally {
      setIsLoading(false);
    }
  }, [activeClusterId]);

  React.useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const handleAddPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClusterId) {
      alert('Vui lòng chọn một Kong Cluster trước!');
      return;
    }

    try {
      setIsSubmitting(true);
      const parsedConfig = JSON.parse(configJson);
      const payload: any = {
        name: currentTemplate.name,
        enabled: true,
        config: parsedConfig,
      };

      if (scopeType === 'route' && scopeId) {
        payload.route = { id: scopeId };
      } else if (scopeType === 'service' && scopeId) {
        payload.service = { id: scopeId };
      } else if (scopeType === 'consumer' && scopeId) {
        payload.consumer = { id: scopeId };
      }

      const res = await api.post('/api/kong/plugins', payload);
      setPlugins((prev) => [...prev, res.data]);
      setIsModalOpen(false);
      setScopeId('');
      setScopeType('global');
    } catch (err: any) {
      alert(`Lỗi khi kích hoạt Plugin trên Kong: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn tắt & xóa Plugin này khỏi Kong Gateway?')) {
      try {
        await api.delete(`/api/kong/plugins/${id}`);
        setPlugins((prev) => prev.filter((p) => p.id !== id));
      } catch (err: any) {
        alert(`Lỗi khi xóa Plugin trên Kong: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Kong Plugins</h1>
            <p className="text-sm text-gray-500">
              Gắn chính sách theo thứ tự ưu tiên: <strong>Route</strong> ➔ <strong>Service</strong> ➔ <strong>Consumer</strong> ➔ <strong>Global</strong> ({activeCluster ? activeCluster.name : 'Chưa chọn Cluster'})
            </p>
          </div>
          <Button
            onClick={() => {
              if (!activeClusterId) {
                alert('Vui lòng thêm hoặc chọn một Kong Cluster trước!');
                return;
              }
              setSelectedPluginKey('rate-limiting');
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Kích hoạt Plugin mới
          </Button>
        </div>

        {!activeClusterId && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>Chưa có Kong Cluster nào được chọn. Vui lòng kết nối Cluster để quản lý Plugins.</span>
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
            <Button size="sm" variant="outline" onClick={fetchPlugins} className="h-7 text-xs">
              Thử lại
            </Button>
          </div>
        )}

        <Card>
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Danh sách Plugins đang áp dụng trên Kong</CardTitle>
                <CardDescription>Cấu hình theo phạm vi: Route / Service / Consumer / Global</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                <p className="text-xs">Đang tải danh sách Plugins từ Kong Admin API...</p>
              </div>
            ) : plugins.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Puzzle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Chưa có Plugin nào trên Kong</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                    Bật plugin đầu tiên (Rate Limiting, Key Auth, CORS...) với cấu hình mặc định chuẩn để bảo vệ Gateway.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (!activeClusterId) {
                      alert('Vui lòng thêm hoặc chọn một Kong Cluster trước!');
                      return;
                    }
                    setSelectedPluginKey('rate-limiting');
                    setIsModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Kích hoạt Plugin đầu tiên
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plugin</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Phạm vi áp dụng (Scope)</TableHead>
                    <TableHead>Cấu hình (Config JSON)</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plugins.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Puzzle className="h-4 w-4 text-amber-600" />
                          <span className="font-semibold">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.enabled ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Enabled
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.route ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <RouteIcon className="h-3 w-3" />
                            <span>Route: {p.route.id}</span>
                          </div>
                        ) : p.service ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <Layers className="h-3 w-3" />
                            <span>Service: {p.service.id}</span>
                          </div>
                        ) : p.consumer ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            <Users className="h-3 w-3" />
                            <span>Consumer: {p.consumer.id}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <Globe className="h-3 w-3" />
                            <span>Global (Toàn cụm)</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-xs truncate text-gray-600">
                        {JSON.stringify(p.config)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(p.id)}
                          className="h-8 w-8 text-gray-500 hover:text-red-600"
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Kích hoạt Plugin mới"
        description="Chọn plugin và phạm vi áp dụng theo thứ tự: Route / Service / Consumer / Global"
      >
        <form onSubmit={handleAddPlugin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chọn Plugin ({Object.keys(PLUGIN_TEMPLATES).length} plugins có sẵn)
            </label>
            <select
              value={selectedPluginKey}
              onChange={(e) => setSelectedPluginKey(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <optgroup label="Traffic Control (Kiểm soát lưu lượng)">
                <option value="rate-limiting">rate-limiting - Giới hạn tần suất gọi API</option>
                <option value="proxy-cache">proxy-cache - Bộ nhớ đệm phản hồi</option>
                <option value="canary">canary - Phân tách lưu lượng Canary & Traffic Splitting</option>
              </optgroup>
              <optgroup label="Authentication & Security (Bảo mật & Xác thực)">
                <option value="key-auth">key-auth - Xác thực API Key</option>
                <option value="jwt">jwt - Xác thực JSON Web Token</option>
                <option value="basic-auth">basic-auth - Xác thực HTTP Basic</option>
                <option value="mtls-auth">mtls-auth - Xác thực mTLS hai chiều (Mutual TLS)</option>
                <option value="cors">cors - Cấu hình Cross-Origin Sharing</option>
                <option value="ip-restriction">ip-restriction - Giới hạn IP Whitelist/Blacklist</option>
                <option value="bot-detection">bot-detection - Chống bot & web scrapers</option>
              </optgroup>
              <optgroup label="Analytics & Logging (Giám sát & Nhật ký)">
                <option value="prometheus">prometheus - Thu thập Metrics cho Prometheus</option>
                <option value="file-log">file-log - Ghi Access Log vào File</option>
                <option value="http-log">http-log - Gửi Log qua HTTP Endpoint</option>
              </optgroup>
              <optgroup label="Transformations (Biến đổi Request/Response)">
                <option value="request-transformer">request-transformer - Biến đổi Header/Body gửi đi</option>
                <option value="response-transformer">response-transformer - Biến đổi Header trả về</option>
                <option value="correlation-id">correlation-id - Gán Trace ID theo dõi yêu cầu</option>
              </optgroup>
            </select>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-blue-900">
              <Info className="h-4 w-4 text-blue-600" />
              <span>{currentTemplate.title}</span>
              <span className="text-[10px] px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full font-normal">
                {currentTemplate.category}
              </span>
            </div>
            <p className="text-blue-800/80 leading-relaxed">{currentTemplate.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phạm vi áp dụng (Plugin Scope)
              </label>
              <select
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value as any)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="global">1. Toàn cục (Global - Mọi API)</option>
                <option value="route">2. Gắn vào Route cụ thể</option>
                <option value="service">3. Gắn vào Service cụ thể</option>
                <option value="consumer">4. Gắn vào Consumer cụ thể</option>
              </select>
            </div>

            {scopeType !== 'global' && (
              <Input
                label={
                  scopeType === 'route'
                    ? 'Route ID / Name'
                    : scopeType === 'service'
                    ? 'Service ID / Name'
                    : 'Consumer ID / Username'
                }
                placeholder={`Nhập ${scopeType} ID hoặc tên`}
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                required
              />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Thông số Cấu hình (JSON Config)
              </label>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer font-medium"
                title="Khôi phục về mẫu cấu hình chuẩn của Kong"
              >
                <RotateCcw className="h-3 w-3" />
                Khôi phục mẫu chuẩn
              </button>
            </div>
            <textarea
              rows={8}
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-3 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-900 text-green-400 font-medium leading-relaxed"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Kích hoạt trên Kong
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
