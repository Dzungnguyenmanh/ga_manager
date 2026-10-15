import axios from 'axios';
import { useClusterStore } from '@/store/cluster';
import { useAuthStore } from '@/store/auth';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== '')
      ? process.env.NEXT_PUBLIC_API_URL
      : '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach active cluster ID & Auth token, and sanitize browser URLs
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    if (config.baseURL && (config.baseURL.includes('localhost:8080') || config.baseURL.includes('127.0.0.1:8080'))) {
      config.baseURL = '';
    }
    if (config.url && config.url.startsWith('http://localhost:8080')) {
      config.url = config.url.replace('http://localhost:8080', '');
    }
  }
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
