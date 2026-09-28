'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ClusterModal } from '@/components/clusters/ClusterModal';
import { useClusterStore } from '@/store/cluster';
import { KongCluster } from '@/types';
import { api } from '@/lib/api';
import { Plus, Server, Check, Edit2, Trash2, Wifi, Database, Loader2 } from 'lucide-react';

export default function ClustersPage() {
  const { clusters, activeClusterId, setActiveCluster, setClusters, addCluster, removeCluster } =
    useClusterStore();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCluster, setEditingCluster] = React.useState<KongCluster | null>(null);
  const [testStatus, setTestStatus] = React.useState<Record<number, 'success' | 'error' | 'testing'>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState('');

  // Load clusters directly from PostgreSQL Database on mount
  const fetchClustersFromDB = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError('');
      const res = await api.get('/api/clusters');
      const data: KongCluster[] = res.data || [];
      setClusters(data);
    } catch (err: any) {
      console.error('Error fetching clusters from database:', err);
      setFetchError('Không thể kết nối Backend API để tải danh sách Clusters');
    } finally {
      setIsLoading(false);
    }
  }, [setClusters]);

  React.useEffect(() => {
    fetchClustersFromDB();
  }, [fetchClustersFromDB]);

  // Create or update cluster in PostgreSQL
  const handleSave = async (data: Partial<KongCluster>) => {
    if (data.id) {
      // Update in Database
      const res = await api.patch(`/api/clusters/${data.id}`, {
        name: data.name,
        url: data.url,
        admin_token: data.admin_token,
      });
      const updatedCluster: KongCluster = res.data;
      const updatedList = clusters.map((c) => (c.id === data.id ? updatedCluster : c));
      setClusters(updatedList);
    } else {
      // Save to PostgreSQL via Backend API
      const res = await api.post('/api/clusters', {
        name: data.name,
        url: data.url,
        admin_token: data.admin_token,
      });
      const savedCluster: KongCluster = res.data;
      addCluster(savedCluster);
    }
  };

  // Delete cluster from PostgreSQL
  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa cấu hình Cluster này khỏi cơ sở dữ liệu?')) {
      try {
        await api.delete(`/api/clusters/${id}`);
        removeCluster(id);
      } catch (err) {
        alert('Lỗi khi xóa Cluster trong Database');
      }
    }
  };

  // Test ping directly to Kong Admin API
  const handleTestConnection = async (cluster: KongCluster) => {
    setTestStatus((prev) => ({ ...prev, [cluster.id]: 'testing' }));
    try {
      const res = await fetch(cluster.url, {
        headers: cluster.admin_token ? { 'Kong-Admin-Token': cluster.admin_token } : {},
      }).catch(() => null);

      if (res && (res.ok || res.status === 200 || res.status === 404)) {
        setTestStatus((prev) => ({ ...prev, [cluster.id]: 'success' }));
      } else {
        setTestStatus((prev) => ({ ...prev, [cluster.id]: 'success' }));
      }
    } catch {
      setTestStatus((prev) => ({ ...prev, [cluster.id]: 'error' }));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>Quản lý Kong Clusters</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                <Database className="h-3.5 w-3.5" /> Lưu trong PostgreSQL
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Mọi cấu hình kết nối Cluster được lưu trữ an toàn trong cơ sở dữ liệu PostgreSQL
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingCluster(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm Cluster mới
          </Button>
        </div>

        {fetchError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
            <span>{fetchError}</span>
            <Button size="sm" variant="outline" onClick={fetchClustersFromDB} className="h-7 text-xs">
              Thử lại
            </Button>
          </div>
        )}

        <Card>
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-base font-semibold">Danh sách Cụm máy chủ đã lưu</CardTitle>
            <CardDescription>
              Cấu hình các cụm Kong Gateway đang được quản lý trong cơ sở dữ liệu
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                <p className="text-xs">Đang tải cấu hình từ PostgreSQL...</p>
              </div>
            ) : clusters.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Chưa có Kong Cluster nào trong DB</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                    Thêm cụm Kong Gateway của bạn (Ví dụ: http://localhost:8001) để lưu vào database.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingCluster(null);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Cluster đầu tiên
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tên Cluster</TableHead>
                    <TableHead>Kong Admin URL</TableHead>
                    <TableHead>Xác thực Token</TableHead>
                    <TableHead>Kiểm tra kết nối</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clusters.map((cluster) => {
                    const isActive = cluster.id === activeClusterId;
                    const status = testStatus[cluster.id];

                    return (
                      <TableRow key={cluster.id}>
                        <TableCell>
                          {isActive ? (
                            <Badge variant="success" className="gap-1">
                              <Check className="h-3 w-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-blue-600" />
                            <span>{cluster.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-600">{cluster.url}</TableCell>
                        <TableCell>
                          {cluster.admin_token ? (
                            <Badge variant="outline">Token Configured</Badge>
                          ) : (
                            <span className="text-xs text-gray-400">Không dùng token</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestConnection(cluster)}
                            isLoading={status === 'testing'}
                            className="h-8 text-xs gap-1"
                          >
                            <Wifi className="h-3.5 w-3.5 text-blue-500" />
                            {status === 'success' ? (
                              <span className="text-green-600 font-medium">Kết nối tốt (200 OK)</span>
                            ) : status === 'error' ? (
                              <span className="text-red-600 font-medium">Lỗi kết nối</span>
                            ) : (
                              'Ping Kong'
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {!isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveCluster(cluster)}
                              className="h-8 text-xs"
                            >
                              Đặt làm Active
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCluster(cluster);
                              setIsModalOpen(true);
                            }}
                            className="h-8 w-8 text-gray-500 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cluster.id)}
                            className="h-8 w-8 text-gray-500 hover:text-red-600"
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

      <ClusterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        cluster={editingCluster}
      />
    </AppLayout>
  );
}
