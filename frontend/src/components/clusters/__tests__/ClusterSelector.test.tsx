import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ClusterSelector } from '../ClusterSelector';
import { useClusterStore } from '@/store/cluster';

describe('ClusterSelector component', () => {
  beforeEach(() => {
    useClusterStore.setState({
      clusters: [
        { id: 1, name: 'Kong Production', url: 'http://kong-prod:8001' },
        { id: 2, name: 'Kong Staging', url: 'http://kong-stage:8001' },
      ],
      activeClusterId: 1,
      activeCluster: { id: 1, name: 'Kong Production', url: 'http://kong-prod:8001' },
    });
  });

  it('renders active cluster name on trigger button', () => {
    render(<ClusterSelector />);
    expect(screen.getByText('Kong Production')).toBeInTheDocument();
  });

  it('opens dropdown and allows switching clusters', () => {
    render(<ClusterSelector />);
    const trigger = screen.getByTestId('cluster-selector-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('cluster-selector-dropdown')).toBeInTheDocument();
    expect(screen.getByText('Kong Staging')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Kong Staging'));
    expect(useClusterStore.getState().activeClusterId).toBe(2);
  });
});
