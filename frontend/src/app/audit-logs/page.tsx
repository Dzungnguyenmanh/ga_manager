'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { AuditLog } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import {
  History,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  PlusCircle,
  RotateCcw,
  User,
  Calendar,
  Layers,
  FileCode,
  Loader2,
} from 'lucide-react';

export default function AuditLogsPage() {
  const { activeCluster, activeClusterId } = useClusterStore();
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  // Filters
  const [selectedAction, setSelectedAction] = React.useState<string>('ALL');
  const [selectedResource, setSelectedResource] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Detail Modal
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const url = activeClusterId
        ? `/api/audit-logs?cluster_id=${activeClusterId}&limit=100`
        : `/api/audit-logs?limit=100`;
      const res = await api.get(url);
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Không thể tải lịch sử Audit Logs');
    } finally {
      setIsLoading(false);
    }
  }, [activeClusterId]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = React.useMemo(() => {
    return logs.filter((l) => {
      if (selectedAction !== 'ALL' && l.action !== selectedAction) return false;
      if (selectedResource !== 'ALL' && l.resource !== selectedResource) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const str = `${l.action} ${l.resource} ${l.resource_id} ${l.username} ${JSON.stringify(l.details || {})}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [logs, selectedAction, selectedResource, searchQuery]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PlusCircle className="h-3 w-3" /> CREATE
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Edit2 className="h-3 w-3" /> UPDATE
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 className="h-3 w-3" /> DELETE
          </span>
        );
      case 'RESTORE_SNAPSHOT':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw className="h-3 w-3" /> RESTORE
          </span>
        );
      case 'SYNC_GITOPS':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <FileCode className="h-3 w-3" /> SYNC_GITOPS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">
            {action}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <History className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Nhật Ký Kiểm Toán (Audit Logs)
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Truy vết và lưu giữ mọi hành vi thay đổi cấu hình, tạo/sửa/xóa và khôi phục Gateway ({activeCluster?.name || 'Tất cả Clusters'})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading} className="text-xs h-9">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <span>{errorMsg}</span>
            <Button size="sm" variant="outline" onClick={fetchLogs} className="h-7 text-xs bg-white">
              Thử lại
            </Button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm log, user, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="CREATE">CREATE (Tạo mới)</option>
              <option value="UPDATE">UPDATE (Chỉnh sửa)</option>
              <option value="DELETE">DELETE (Xóa bỏ)</option>
              <option value="RESTORE_SNAPSHOT">RESTORE (Khôi phục Snapshot)</option>
              <option value="SYNC_GITOPS">SYNC_GITOPS (Đồng bộ decK)</option>
            </select>

            {/* Resource Filter */}
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">Tất cả tài nguyên</option>
              <option value="service">Service</option>
              <option value="route">Route</option>
              <option value="plugin">Plugin</option>
              <option value="consumer">Consumer</option>
              <option value="key_auth">Key Auth</option>
              <option value="jwt">JWT</option>
              <option value="basic_auth">Basic Auth</option>
              <option value="acl">ACL</option>
              <option value="upstream">Upstream</option>
              <option value="target">Target</option>
              <option value="snapshot">Snapshot</option>
            </select>
          </div>

          <span className="text-xs text-gray-500">
            Hiển thị <strong className="text-gray-900">{filteredLogs.length}</strong> / {total} sự kiện
          </span>
        </div>

        {/* Audit Log Table */}
        <Card className="shadow-xs border-gray-200">
          <CardHeader className="border-b border-gray-100 pb-3 bg-gray-50/50 rounded-t-xl">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>Lịch sử truy vết thực thể</span>
              <span className="text-xs font-normal text-gray-500">
                (Được bảo vệ và lưu trữ vĩnh viễn trong PostgreSQL)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-gray-400 space-y-2">
                <Loader2 className="h-7 w-7 animate-spin mx-auto text-purple-600" />
                <p className="text-xs">Đang tải nhật ký kiểm toán từ cơ sở dữ liệu...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Chưa có bản ghi Audit Log nào</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    Các thao tác tạo, sửa, xóa Service, Route, Plugin hoặc khôi phục Snapshot sẽ tự động hiển thị tại đây.
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/70 text-xs">
                    <TableHead className="font-semibold text-gray-700">Thời gian (Timestamp)</TableHead>
                    <TableHead className="font-semibold text-gray-700">Hành động</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tài nguyên</TableHead>
                    <TableHead className="font-semibold text-gray-700">Resource ID / Tên</TableHead>
                    <TableHead className="font-semibold text-gray-700">Người thực hiện</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="text-xs hover:bg-gray-50/60">
                      <TableCell className="font-mono text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>{formatDate(log.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 uppercase text-[11px] bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {log.resource}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-gray-700">
                        {log.resource_id ? (
                          <span className="truncate max-w-[200px] inline-block" title={log.resource_id}>
                            {log.resource_id}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-gray-700">
                          <User className="h-3 w-3 text-blue-500" />
                          <span>{log.username || 'operator'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-7 text-xs text-purple-700 hover:bg-purple-50"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-purple-600" /> Xem Payload
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

      {/* Payload Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Chi tiết Audit Log #${selectedLog.id}`}
          description={`${selectedLog.action} trên ${selectedLog.resource} (${selectedLog.resource_id || ''}) lúc ${formatDate(selectedLog.created_at)}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 font-mono">
              <div>
                <span className="text-gray-500">Hành động:</span>{' '}
                <strong className="text-gray-900">{selectedLog.action}</strong>
              </div>
              <div>
                <span className="text-gray-500">Tài nguyên:</span>{' '}
                <strong className="text-gray-900">{selectedLog.resource}</strong>
              </div>
              <div>
                <span className="text-gray-500">Người thực hiện:</span>{' '}
                <strong className="text-gray-900">{selectedLog.username}</strong>
              </div>
              <div>
                <span className="text-gray-500">Resource ID:</span>{' '}
                <strong className="text-gray-900">{selectedLog.resource_id || 'N/A'}</strong>
              </div>
            </div>

            <div>
              <span className="font-semibold text-gray-700 block mb-1">Payload / Details:</span>
              <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed max-h-72">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedLog(null)} variant="outline" size="sm">
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
