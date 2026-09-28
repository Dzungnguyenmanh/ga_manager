import { describe, it, expect, beforeEach } from 'vitest';
import { useClusterStore } from '../cluster';

describe('useClusterStore', () => {
  beforeEach(() => {
    useClusterStore.setState({
      clusters: [],
      activeClusterId: null,
      activeCluster: null,
    });
  });

  it('sets cluster list and defaults active cluster to the first one', () => {
    const mockClusters = [
      { id: 1, name: 'Cluster 1', url: 'http://c1:8001' },
      { id: 2, name: 'Cluster 2', url: 'http://c2:8001' },
    ];

    useClusterStore.getState().setClusters(mockClusters);

    expect(useClusterStore.getState().clusters).toHaveLength(2);
    expect(useClusterStore.getState().activeClusterId).toBe(1);
    expect(useClusterStore.getState().activeCluster?.name).toBe('Cluster 1');
  });

  it('switches active cluster correctly', () => {
    const mockClusters = [
      { id: 10, name: 'Cluster 10', url: 'http://c10:8001' },
      { id: 20, name: 'Cluster 20', url: 'http://c20:8001' },
    ];

    useClusterStore.getState().setClusters(mockClusters);
    useClusterStore.getState().setActiveCluster(20);

    expect(useClusterStore.getState().activeClusterId).toBe(20);
    expect(useClusterStore.getState().activeCluster?.name).toBe('Cluster 20');
  });

  it('adds and removes cluster', () => {
    const c1 = { id: 1, name: 'C1', url: 'http://c1:8001' };
    const c2 = { id: 2, name: 'C2', url: 'http://c2:8001' };

    useClusterStore.getState().addCluster(c1);
    expect(useClusterStore.getState().clusters).toHaveLength(1);
    expect(useClusterStore.getState().activeClusterId).toBe(1);

    useClusterStore.getState().addCluster(c2);
    expect(useClusterStore.getState().clusters).toHaveLength(2);

    useClusterStore.getState().removeCluster(1);
    expect(useClusterStore.getState().clusters).toHaveLength(1);
    expect(useClusterStore.getState().activeClusterId).toBe(2);
  });
});
