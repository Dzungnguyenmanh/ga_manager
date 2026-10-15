import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { KongCluster } from '@/types';
import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== '')
      ? process.env.NEXT_PUBLIC_API_URL
      : '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
};

interface ClusterState {
  clusters: KongCluster[];
  activeClusterId: number | null;
  activeCluster: KongCluster | null;
  isLoading: boolean;
  setClusters: (clusters: KongCluster[]) => void;
  setActiveCluster: (cluster: KongCluster | number) => void;
  addCluster: (cluster: KongCluster) => void;
  removeCluster: (id: number) => void;
  fetchClusters: () => Promise<KongCluster[]>;
}

export const useClusterStore = create<ClusterState>()(
  persist(
    (set, get) => ({
      clusters: [],
      activeClusterId: null,
      activeCluster: null,
      isLoading: false,

      fetchClusters: async () => {
        try {
          set({ isLoading: true });
          const res = await axios.get(`${getApiBaseUrl()}/api/clusters`);
          const data: KongCluster[] = Array.isArray(res.data) ? res.data : [];

          const currentActiveId = get().activeClusterId;
          let matchedActive: KongCluster | null = null;

          if (currentActiveId) {
            matchedActive = data.find((c) => c.id === currentActiveId) || null;
          }

          // If no active cluster or previous cluster was deleted, select the first available
          if (!matchedActive && data.length > 0) {
            matchedActive = data[0];
          }

          set({
            clusters: data,
            activeClusterId: matchedActive ? matchedActive.id : null,
            activeCluster: matchedActive,
            isLoading: false,
          });

          return data;
        } catch (err) {
          console.error('Failed to fetch clusters from backend:', err);
          set({ isLoading: false });
          return [];
        }
      },

      setClusters: (clusters) => {
        const currentActiveId = get().activeClusterId;
        let matchedActive: KongCluster | null = null;
        if (currentActiveId) {
          matchedActive = clusters.find((c) => c.id === currentActiveId) || null;
        }
        if (!matchedActive && clusters.length > 0) {
          matchedActive = clusters[0];
        }
        set({
          clusters,
          activeClusterId: matchedActive ? matchedActive.id : null,
          activeCluster: matchedActive,
        });
      },

      setActiveCluster: (clusterOrId) => {
        if (typeof clusterOrId === 'number') {
          const found = get().clusters.find((c) => c.id === clusterOrId) || null;
          set({ activeClusterId: clusterOrId, activeCluster: found });
        } else {
          set({ activeClusterId: clusterOrId.id, activeCluster: clusterOrId });
        }
      },

      addCluster: (cluster) => {
        const updated = [...get().clusters.filter((c) => c.id !== cluster.id), cluster];
        set({ clusters: updated });
        if (!get().activeClusterId) {
          set({ activeClusterId: cluster.id, activeCluster: cluster });
        }
      },

      removeCluster: (id) => {
        const updated = get().clusters.filter((c) => c.id !== id);
        const next = updated[0] || null;
        set({
          clusters: updated,
          activeClusterId: get().activeClusterId === id ? (next ? next.id : null) : get().activeClusterId,
          activeCluster: get().activeClusterId === id ? next : get().activeCluster,
        });
      },
    }),
    {
      name: 'kong-cluster-storage',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({
        activeClusterId: state.activeClusterId,
        activeCluster: state.activeCluster,
        clusters: state.clusters,
      }),
    }
  )
);
