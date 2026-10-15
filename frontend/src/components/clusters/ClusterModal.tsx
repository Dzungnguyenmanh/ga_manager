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
  const [environment, setEnvironment] = React.useState<'DEV' | 'STG' | 'PROD'>('DEV');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (cluster) {
      setName(cluster.name || '');
      setUrl(cluster.url || '');
      setAdminToken(cluster.admin_token || '');
      setEnvironment(cluster.environment || 'DEV');
    } else {
      setName('');
      setUrl('http://localhost:8001');
      setAdminToken('');
      setEnvironment('DEV');
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
        environment,
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

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Phân loại môi trường (Environment)
          </label>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as any)}
            className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="DEV">DEV (Môi trường Phát triển - An toàn)</option>
            <option value="STG">STG (Môi trường Staging / Pre-prod)</option>
            <option value="PROD">PROD (Môi trường Production - Cảnh báo nghiêm ngặt)</option>
          </select>
          <p className="text-[11px] text-gray-500">
            Môi trường PROD sẽ kích hoạt xác nhận an toàn 2 bước trước mọi thao tác xóa / sync
          </p>
        </div>

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
