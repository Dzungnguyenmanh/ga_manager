'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { DiagnosticsInput, DiagnosticsResult, DiagnosticsStep } from '@/types';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Globe, 
  ShieldCheck, 
  Network, 
  ArrowRight,
  AlertTriangle,
  Server
} from 'lucide-react';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHost?: string;
  initialPort?: number;
  initialProtocol?: string;
  initialPath?: string;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  initialHost = '',
  initialPort = 80,
  initialProtocol = 'http',
  initialPath = '/',
}) => {
  const [host, setHost] = useState(initialHost);
  const [port, setPort] = useState(initialPort);
  const [protocol, setProtocol] = useState(initialProtocol);
  const [path, setPath] = useState(initialPath);
  const [timeout, setTimeoutVal] = useState(5);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHost(initialHost);
      setPort(initialPort || (initialProtocol === 'https' ? 443 : 80));
      setProtocol(initialProtocol || 'http');
      setPath(initialPath || '/');
      setResult(null);
      setError(null);
    }
  }, [isOpen, initialHost, initialPort, initialProtocol, initialPath]);

  const handleProtocolChange = (p: string) => {
    setProtocol(p);
    if (p === 'https' && port === 80) setPort(443);
    if (p === 'http' && port === 443) setPort(80);
    if (p === 'tls' && port === 80) setPort(443);
  };

  const runDiagnostics = async () => {
    if (!host.trim()) {
      setError('Vui lòng nhập Host hoặc IP mục tiêu');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: DiagnosticsInput = {
        host: host.trim(),
        port: Number(port) || 80,
        protocol,
        path: path.trim() || '/',
        timeout: Number(timeout) || 5,
      };

      const res = await api.post<DiagnosticsResult>('/api/kong/diagnostics', payload);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Lỗi kiểm tra kết nối mạng');
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'DNS':
        return <Globe className="w-4 h-4 text-indigo-500" />;
      case 'TCP_CONNECT':
        return <Network className="w-4 h-4 text-blue-500" />;
      case 'TLS_HANDSHAKE':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'HTTP_PROBE':
        return <Server className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStepName = (step: string) => {
    switch (step) {
      case 'DNS':
        return '1. Phân giải DNS';
      case 'TCP_CONNECT':
        return '2. Bắt tay TCP';
      case 'TLS_HANDSHAKE':
        return '3. Bắt tay TLS/SSL';
      case 'HTTP_PROBE':
        return '4. Thăm dò HTTP(S)';
      default:
        return step;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chẩn đoán kết nối & Hạ tầng mạng (Network Diagnostics)"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Xác định chính xác nguyên nhân lỗi Upstream (502/504) qua chuỗi kiểm thử 4 giai đoạn độc lập: 
          <strong className="text-gray-700 dark:text-gray-300"> DNS ➔ TCP Handshake ➔ TLS Handshake ➔ HTTP Probe</strong>.
        </p>

        {/* Input Form */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                Target Host / Domain / IP *
              </label>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="vd: api.example.com hoặc 10.0.0.12"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                Port *
              </label>
              <Input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="vd: 80, 443"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                Giao thức (Protocol)
              </label>
              <select
                value={protocol}
                onChange={(e) => handleProtocolChange(e.target.value)}
                aria-label="Giao thức kết nối"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="tcp">Raw TCP</option>
                <option value="tls">Raw TLS</option>
              </select>
            </div>
          </div>

          {(protocol === 'http' || protocol === 'https') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                  HTTP Health Path
                </label>
                <Input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/health hoặc /api/v1/ping"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                  Timeout (Giây)
                </label>
                <Input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeoutVal(Number(e.target.value))}
                  min={1}
                  max={30}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            <Button
              onClick={runDiagnostics}
              disabled={loading || !host.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Đang thăm dò kết nối...' : 'Bắt đầu kiểm tra (Run Probe)'}
            </Button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-semibold">Thăm dò thất bại</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Diagnostic Results Flow */}
        {result && (
          <div className="space-y-4">
            {/* Summary Top Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              result.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600 dark:rose-400" />
                )}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {result.success ? 'Tất cả các chặng kiểm tra mạng đều thông suốt' : 'Phát hiện sự cố nghẽn mạng / từ chối kết nối'}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Mục tiêu: <code className="font-mono text-gray-700 dark:text-gray-300 font-bold">{result.target}</code>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 dark:text-gray-400">Tổng độ trễ</span>
                <p className="text-base font-bold font-mono text-gray-900 dark:text-gray-100">
                  {result.total_ms} ms
                </p>
              </div>
            </div>

            {/* Diagnostic Steps Cards */}
            <div className="space-y-3">
              {result.steps.map((st: DiagnosticsStep, idx: number) => {
                const isSuccess = st.status === 'SUCCESS';
                const isFailed = st.status === 'FAILED';
                const isSkipped = st.status === 'SKIPPED';

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isFailed 
                        ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' 
                        : isSuccess
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        : 'bg-gray-50/50 dark:bg-gray-900/40 border-dashed border-gray-200 dark:border-gray-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700/60">
                          {getStepIcon(st.step)}
                        </div>
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {getStepName(st.step)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isSkipped && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {st.latency_ms} ms
                          </div>
                        )}
                        <Badge
                          variant={isSuccess ? 'success' : isFailed ? 'destructive' : 'secondary'}
                        >
                          {st.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 pl-9">
                      <p className={`text-xs font-mono break-all ${
                        isFailed 
                          ? 'text-red-700 dark:text-red-300 font-medium' 
                          : 'text-gray-600 dark:text-gray-300'
                      }`}>
                        {st.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Practical Troubleshooting Guide */}
            {!result.success && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4" /> Khuyến nghị khắc phục sự cố:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Lỗi DNS</strong>: Kiểm tra lại tên miền nội bộ trong CoreDNS / k8s Service hoặc file hosts.</li>
                  <li><strong>Lỗi TCP_CONNECT</strong>: Kiểm tra Security Group, Network Policy, Firewall hoặc Port của upstream service có đang lắng nghe không.</li>
                  <li><strong>Lỗi TLS_HANDSHAKE</strong>: Xác thực chứng chỉ SSL, SNI server name, hoặc phiên bản cipher suite được hỗ trợ.</li>
                  <li><strong>Lỗi HTTP_PROBE</strong>: Kiểm tra routing path, xác thực ứng dụng hoặc health check endpoint có trả về HTTP 2xx/3xx.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
