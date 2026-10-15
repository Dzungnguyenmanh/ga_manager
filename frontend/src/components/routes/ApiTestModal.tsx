'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { KongRoute, TestRequestResult } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import {
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

interface HeaderItem {
  key: string;
  value: string;
}

interface ApiTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  route?: KongRoute | null;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export function ApiTestModal({ isOpen, onClose, route }: ApiTestModalProps) {
  const { activeCluster } = useClusterStore();
  const [method, setMethod] = React.useState('GET');
  const [requestPath, setRequestPath] = React.useState('/');
  const [headers, setHeaders] = React.useState<HeaderItem[]>([
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [body, setBody] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<TestRequestResult | null>(null);
  const [activeResTab, setActiveResTab] = React.useState<'body' | 'headers'>('body');
  const [isCopied, setIsCopied] = React.useState(false);

  // Initialize path from route
  React.useEffect(() => {
    if (route) {
      if (route.methods && route.methods.length > 0) {
        setMethod(route.methods[0]);
      } else {
        setMethod('GET');
      }
      if (route.paths && route.paths.length > 0) {
        setRequestPath(route.paths[0]);
      } else {
        setRequestPath('/');
      }
      setResult(null);
    }
  }, [route]);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...headers];
    next[index][field] = val;
    setHeaders(next);
  };

  const addPresetHeader = (key: string, value: string) => {
    if (!headers.some((h) => h.key.toLowerCase() === key.toLowerCase())) {
      setHeaders([...headers, { key, value }]);
    }
  };

  const handleSend = async () => {
    setIsLoading(true);
    setResult(null);

    const headerMap: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) {
        headerMap[h.key.trim()] = h.value;
      }
    });

    try {
      const res = await api.post('/api/kong/test-request', {
        method,
        url: requestPath,
        headers: headerMap,
        body: body.trim() ? body : undefined,
        timeout: 15,
      });
      setResult(res.data);
    } catch (err: any) {
      setResult({
        status_code: 500,
        status_text: err.response?.data?.error || err.message || 'Request failed',
        latency_ms: 0,
        headers: {},
        body: JSON.stringify(err.response?.data || { error: err.message }, null, 2),
        size_bytes: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    if (result?.body) {
      navigator.clipboard.writeText(result.body);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const formatJsonBody = () => {
    try {
      const parsed = JSON.parse(body);
      setBody(JSON.stringify(parsed, null, 2));
    } catch {
      // Not JSON, ignore
    }
  };

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return (
        <span className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> {code} OK
        </span>
      );
    }
    if (code >= 300 && code < 400) {
      return (
        <span className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-300">
          {code} REDIRECT
        </span>
      );
    }
    if (code >= 400 && code < 500) {
      return (
        <span className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle className="h-3 w-3" /> {code} CLIENT ERROR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800 border border-rose-300">
        <XCircle className="h-3 w-3" /> {code || 500} SERVER ERROR
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Kiểm Thử Route Trực Tiếp (API Test Request Builder)`}
      description={`Gửi request thử nghiệm đến Kong Proxy để xác nhận Route, xác thực (Auth), và Policy hoạt động chính xác.`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 text-xs">
        {/* URL Bar */}
        <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-300 bg-white font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Input
              value={requestPath}
              onChange={(e) => setRequestPath(e.target.value)}
              placeholder="VD: /api/v1/users hoặc http://localhost:8000/api/v1/users"
              className="font-mono text-xs h-9 bg-white pr-20"
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-gray-400 font-mono">
              Port: 8000
            </span>
          </div>

          <Button
            onClick={handleSend}
            disabled={isLoading || !requestPath}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 font-semibold gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Gửi Request
              </>
            )}
          </Button>
        </div>

        {/* Request Setup (Headers & Body) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Headers Column */}
          <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" /> Request Headers
              </span>
              <button
                type="button"
                onClick={addHeader}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Thêm Header
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1 pt-1 pb-1">
              <span className="text-[10px] text-gray-400 self-center">Mẫu:</span>
              <button
                type="button"
                onClick={() => addPresetHeader('apikey', 'my-api-key-123')}
                className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-mono border"
              >
                + apikey
              </button>
              <button
                type="button"
                onClick={() => addPresetHeader('Authorization', 'Bearer <JWT_TOKEN>')}
                className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-mono border"
              >
                + Bearer Token
              </button>
              <button
                type="button"
                onClick={() => addPresetHeader('X-Consumer-ID', 'consumer-xyz')}
                className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-mono border"
              >
                + X-Consumer-ID
              </button>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {headers.map((h, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <Input
                    value={h.key}
                    onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                    placeholder="Header Key (vd: apikey)"
                    className="h-7 text-xs font-mono"
                  />
                  <Input
                    value={h.value}
                    onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                    placeholder="Value"
                    className="h-7 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(idx)}
                    className="p-1 text-gray-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Body Column */}
          <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Request Body (JSON / Raw)</span>
              <button
                type="button"
                onClick={formatJsonBody}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Format JSON
              </button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{ "key": "value" }'
              rows={6}
              className="w-full rounded-lg border border-gray-300 p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>
        </div>

        {/* Response Viewer */}
        {result && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
            {/* Response Meta Header */}
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-700">Phản hồi từ Kong:</span>
                {getStatusBadge(result.status_code)}
                <span className="inline-flex items-center gap-1 font-mono text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                  <Clock className="h-3 w-3 text-blue-500" /> {result.latency_ms} ms
                </span>
                <span className="font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {result.size_bytes} Bytes
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-gray-200 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveResTab('body')}
                    className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      activeResTab === 'body' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    Body
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResTab('headers')}
                    className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      activeResTab === 'headers' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    Headers ({Object.keys(result.headers || {}).length})
                  </button>
                </div>

                <Button size="sm" variant="outline" onClick={copyResponse} className="h-7 px-2 text-xs">
                  {isCopied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-600" /> Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" /> Copy Body
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Tab: Body */}
            {activeResTab === 'body' && (
              <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-xs max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {result.body || '(Phản hồi rỗng)'}
              </pre>
            )}

            {/* Tab: Headers */}
            {activeResTab === 'headers' && (
              <div className="p-3 max-h-64 overflow-y-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <tbody>
                    {Object.entries(result.headers || {}).map(([key, val]) => (
                      <tr key={key} className="border-b border-gray-100">
                        <td className="py-1 px-2 font-semibold text-gray-700 w-1/3">{key}</td>
                        <td className="py-1 px-2 text-gray-600">{val.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
