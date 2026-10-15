import axios from 'axios';
import { useClusterStore } from '@/store/cluster';
import { useAuthStore } from '@/store/auth';

const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : '')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach active cluster ID & Auth token
api.interceptors.request.use((config) => {
  const activeClusterId = useClusterStore.getState().activeClusterId;
  const token = useAuthStore.getState().token;

  if (activeClusterId) {
    config.headers['X-Kong-Cluster-Id'] = activeClusterId.toString();
  }

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
