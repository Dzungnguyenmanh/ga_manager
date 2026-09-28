'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KongCluster } from '@/types';

interface ClusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cluster: Partial<KongCluster>) => Promise<void>;
  cluster?: KongCluster | null;
}

export function ClusterModal({ isOpen, onClose, onSave, cluster }: ClusterModalProps) {
  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [adminToken, setAdminToken] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (cluster) {
      setName(cluster.name || '');
      setUrl(cluster.url || '');
      setAdminToken(cluster.admin_token || '');
    } else {
      setName('');
      setUrl('http://localhost:8001');
      setAdminToken('');
    }
    setError('');
  }, [cluster, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên Cluster');
      return;
    }
    if (!url.trim()) {
      setError('Vui lòng nhập URL Kong Admin API');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await onSave({
        id: cluster?.id,
        name: name.trim(),
        url: url.trim(),
        admin_token: adminToken.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể lưu cấu hình Cluster');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cluster ? 'Chỉnh sửa Kong Cluster' : 'Thêm Kong Cluster mới'}
      description="Cấu hình thông tin kết nối tới Kong Gateway Admin API"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Tên Cluster"
          placeholder="Ví dụ: Kong Production, Kong Staging"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Kong Admin URL"
          placeholder="http://kong-admin.local:8001"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          helperText="Địa chỉ Admin API của Kong Gateway"
          required
        />

        <Input
          label="Kong Admin Token (Nếu có)"
          type="password"
          placeholder="Kong-Admin-Token hoặc API Key"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          helperText="Để trống nếu Kong Gateway không kích hoạt xác thực Admin"
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {cluster ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
