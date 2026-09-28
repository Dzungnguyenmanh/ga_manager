'use client';

import * as React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import { nodeTypes } from './CustomNodes';
import { KongRoute, KongService, KongPlugin, KongConsumer, KongUpstream } from '@/types';
import { useClusterStore } from '@/store/cluster';
import { api } from '@/lib/api';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Radio,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface RouteFlowCanvasProps {
  initialRouteId?: string;
}

export function RouteFlowCanvas({ initialRouteId }: RouteFlowCanvasProps) {
  const { activeCluster, activeClusterId } = useClusterStore();
  const [routes, setRoutes] = React.useState<KongRoute[]>([]);
  const [services, setServices] = React.useState<KongService[]>([]);
  const [plugins, setPlugins] = React.useState<KongPlugin[]>([]);
  const [consumers, setConsumers] = React.useState<KongConsumer[]>([]);
  const [upstreams, setUpstreams] = React.useState<KongUpstream[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState('');
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Fetch all real topology data directly from Kong Admin API
  const fetchTopologyData = React.useCallback(async () => {
    if (!activeClusterId) {
      setRoutes([]);
      setServices([]);
      setPlugins([]);
      setConsumers([]);
      setUpstreams([]);
      return;
    }

    try {
      setIsLoading(true);
      setFetchError('');
      const [rRes, sRes, pRes, cRes, uRes] = await Promise.allSettled([
        api.get('/api/kong/routes'),
        api.get('/api/kong/services'),
        api.get('/api/kong/plugins'),
        api.get('/api/kong/consumers'),
        api.get('/api/kong/upstreams'),
      ]);

      const rData: KongRoute[] = rRes.status === 'fulfilled' && Array.isArray(rRes.value.data) ? rRes.value.data : [];
      const sData: KongService[] = sRes.status === 'fulfilled' && Array.isArray(sRes.value.data) ? sRes.value.data : [];
      const pData: KongPlugin[] = pRes.status === 'fulfilled' && Array.isArray(pRes.value.data) ? pRes.value.data : [];
      const cData: KongConsumer[] = cRes.status === 'fulfilled' && Array.isArray(cRes.value.data) ? cRes.value.data : [];
      const uData: KongUpstream[] = uRes.status === 'fulfilled' && Array.isArray(uRes.value.data) ? uRes.value.data : [];

      setRoutes(rData);
      setServices(sData);
      setPlugins(pData);
      setConsumers(cData);
      setUpstreams(uData);
    } catch (err: any) {
      console.error('Failed to load topology data from Kong:', err);
      setFetchError(err.response?.data?.error || 'Không thể kết nối Kong Gateway để lấy cấu hình thật.');
    } finally {
      setIsLoading(false);
    }
  }, [activeClusterId]);

  React.useEffect(() => {
    fetchTopologyData();
  }, [fetchTopologyData]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Build Topology Graph directly matching user request
  React.useEffect(() => {
    if (routes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const totalRoutes = routes.length;
    const rowHeight = 190;
    const totalHeight = totalRoutes * rowHeight;
    const ingressY = (totalHeight - rowHeight) / 2 + 30;

    // 1. Single Root Ingress Node
    const rootIngressNode: Node = {
      id: 'root-ingress',
      type: 'gatewayNode',
      position: { x: 40, y: Math.max(ingressY, 50) },
      data: {
        label: 'Kong Ingress Proxy (:8000)',
        routeCount: totalRoutes,
      },
    };
    allNodes.push(rootIngressNode);

    routes.forEach((route, idx) => {
      const yPos = 50 + idx * rowHeight;

      // 2. Route Node
      const rNodeId = `node-r-${route.id}`;
      const rNode: Node = {
        id: rNodeId,
        type: 'routeNode',
        position: { x: 380, y: yPos },
        data: {
          name: route.name || route.id.slice(0, 12),
          methods: route.methods && route.methods.length > 0 ? route.methods : ['GET', 'POST'],
          paths: route.paths && route.paths.length > 0 ? route.paths : ['/'],
          strip_path: route.strip_path ?? true,
          id: route.id,
        },
      };
      allNodes.push(rNode);

      // Edge from Ingress to this Route
      allEdges.push({
        id: `edge-ingress-r-${route.id}`,
        source: 'root-ingress',
        target: rNodeId,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      });

      // 3. Service Node
      const svc = route.service?.id ? services.find((s) => s.id === route.service?.id) : null;
      if (svc) {
        const sNodeId = `node-s-${svc.id}-${idx}`;
        const sNode: Node = {
          id: sNodeId,
          type: 'serviceNode',
          position: { x: 680, y: yPos },
          data: {
            name: svc.name || 'backend-service',
            protocol: svc.protocol || 'http',
            host: svc.host,
            port: svc.port,
            path: svc.path,
            connect_timeout: svc.connect_timeout || 60000,
            read_timeout: svc.read_timeout || 60000,
            id: svc.id,
          },
        };
        allNodes.push(sNode);

        allEdges.push({
          id: `edge-${route.id}-${svc.id}`,
          source: rNodeId,
          target: sNodeId,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        });

        // 4. Target Node
        const tNodeId = `node-t-${svc.id}-${idx}`;
        const tNode: Node = {
          id: tNodeId,
          type: 'targetNode',
          position: { x: 980, y: yPos + 10 },
          data: {
            target: `${svc.host}:${svc.port}`,
            weight: 100,
          },
        };
        allNodes.push(tNode);

        allEdges.push({
          id: `edge-target-${svc.id}-${idx}`,
          source: sNodeId,
          target: tNodeId,
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
        });
      }
    });

    setNodes(allNodes);
    setEdges(allEdges);
  }, [routes, services, plugins, consumers, upstreams, setNodes, setEdges]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[calc(100vh-140px)] min-h-[700px]'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 py-3 text-white backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
            <Radio className="h-4 w-4 animate-pulse text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Topology Sơ Đồ Luồng HTTP & Phân Nhánh
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                KONG LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Trực quan hóa cấu trúc định tuyến ({activeCluster ? activeCluster.name : 'Chưa chọn Cluster'}) • {routes.length} nhánh Routes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTopologyData}
            isLoading={isLoading}
            className="h-8 bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            title="Làm mới dữ liệu từ Kong"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Làm mới
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={toggleFullscreen}
            className="h-8 bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 mr-1" /> : <Maximize2 className="h-3.5 w-3.5 mr-1" />}
            {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          </Button>
        </div>
      </div>

      {fetchError && (
        <div className="p-3 bg-red-950/80 border-b border-red-800 text-red-300 text-xs flex items-center justify-between px-5">
          <span>{fetchError}</span>
          <Button size="sm" variant="ghost" onClick={fetchTopologyData} className="h-6 text-xs text-red-300 hover:text-white">
            Thử lại
          </Button>
        </div>
      )}

      {/* Main Single Screen Canvas */}
      <div className="relative flex-1 w-full bg-slate-950 overflow-hidden">
        {routes.length === 0 && !isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 z-10 bg-slate-950/90 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-3xl shadow-inner">
              🛣️
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-base font-bold text-white">Chưa có Route nào trong Kong Gateway</h4>
              <p className="text-xs text-slate-400">
                Hãy tạo Service và Route thật đầu tiên trong Kong Gateway để hệ thống tự động sinh sơ đồ phân nhánh thời gian thực.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/services">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Tạo Service Mới
                </Button>
              </Link>
              <Link href="/routes">
                <Button size="sm" variant="outline" className="bg-slate-800 border-slate-700 text-white text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                  Tạo Route Mới
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" gap={20} size={1.5} variant={BackgroundVariant.Dots} />
            <Controls className="!bg-slate-900 !border-slate-800 !fill-slate-300 [&>button]:!border-slate-800 [&>button]:!bg-slate-900 [&>button]:!text-slate-300 hover:[&>button]:!bg-slate-800" />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-slate-950/90 !border-slate-800 !rounded-xl overflow-hidden shadow-2xl"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'gatewayNode':
                    return '#3b82f6';
                  case 'routeNode':
                    return '#10b981';
                  case 'serviceNode':
                    return '#2563eb';
                  case 'targetNode':
                    return '#22c55e';
                  default:
                    return '#64748b';
                }
              }}
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
