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
  Search,
  Filter,
  Globe,
  Server,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  X,
  FolderTree,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RouteFlowCanvasProps {
  initialRouteId?: string;
}

type GroupByMode = 'none' | 'hostname' | 'target';

interface ContextMenuState {
  nodeId: string;
  nodeType: string;
  nodeData: Record<string, any>;
  x: number;
  y: number;
}

export function RouteFlowCanvas({ initialRouteId }: RouteFlowCanvasProps) {
  const router = useRouter();
  const { activeCluster, activeClusterId } = useClusterStore();
  const [routes, setRoutes] = React.useState<KongRoute[]>([]);
  const [services, setServices] = React.useState<KongService[]>([]);
  const [plugins, setPlugins] = React.useState<KongPlugin[]>([]);
  const [consumers, setConsumers] = React.useState<KongConsumer[]>([]);
  const [upstreams, setUpstreams] = React.useState<KongUpstream[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState('');
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Filter & Grouping States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedHostname, setSelectedHostname] = React.useState<string>('all');
  const [selectedTarget, setSelectedTarget] = React.useState<string>('all');
  const [groupBy, setGroupBy] = React.useState<GroupByMode>('none');

  // Collapse / Expand States
  const [expandedNodeIds, setExpandedNodeIds] = React.useState<Set<string>>(new Set());
  const [collapsedBranchIds, setCollapsedBranchIds] = React.useState<Set<string>>(new Set());

  // Context Menu & Node Inspector States
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(null);
  const [inspectedNode, setInspectedNode] = React.useState<{
    id: string;
    type: string;
    data: Record<string, any>;
  } | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2200);
  }, []);

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

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Helper to resolve service, hostnames, and target for a route
  const routeEnrichedList = React.useMemo(() => {
    return routes.map((route) => {
      const svc = route.service?.id ? services.find((s) => s.id === route.service?.id) || null : null;
      const routeHosts = Array.isArray(route.hosts) && route.hosts.length > 0 ? route.hosts : [];
      const primaryHostname =
        routeHosts.length > 0
          ? routeHosts[0]
          : svc?.host
            ? svc.host
            : '* (Wildcard Host)';
      const allHostnames = Array.from(
        new Set([...routeHosts, ...(svc?.host ? [svc.host] : []), ...(routeHosts.length === 0 ? ['* (Wildcard Host)'] : [])])
      );
      const targetEndpoint = svc ? `${svc.host}:${svc.port}` : 'Chưa gắn Target';

      return {
        route,
        svc,
        routeHosts,
        primaryHostname,
        allHostnames,
        targetEndpoint,
      };
    });
  }, [routes, services]);

  // Extract unique Hostnames and Targets for filter dropdowns
  const availableHostnames = React.useMemo(() => {
    const set = new Set<string>();
    routeEnrichedList.forEach((item) => {
      item.allHostnames.forEach((h) => set.add(h));
    });
    return Array.from(set).sort();
  }, [routeEnrichedList]);

  const availableTargets = React.useMemo(() => {
    const map = new Map<string, number>();
    routeEnrichedList.forEach((item) => {
      map.set(item.targetEndpoint, (map.get(item.targetEndpoint) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [routeEnrichedList]);

  // Filtered routes based on initialRouteId, searchQuery, selectedHostname, and selectedTarget
  const filteredItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return routeEnrichedList.filter((item) => {
      if (initialRouteId && item.route.id !== initialRouteId) {
        return false;
      }
      if (selectedHostname !== 'all' && !item.allHostnames.includes(selectedHostname)) {
        return false;
      }
      if (selectedTarget !== 'all' && item.targetEndpoint !== selectedTarget) {
        return false;
      }
      if (q) {
        const routeName = (item.route.name || item.route.id || '').toLowerCase();
        const svcName = (item.svc?.name || '').toLowerCase();
        const pathsStr = (item.route.paths || []).join(' ').toLowerCase();
        const hostsStr = item.allHostnames.join(' ').toLowerCase();
        const targetStr = item.targetEndpoint.toLowerCase();
        return (
          routeName.includes(q) ||
          svcName.includes(q) ||
          pathsStr.includes(q) ||
          hostsStr.includes(q) ||
          targetStr.includes(q)
        );
      }
      return true;
    });
  }, [routeEnrichedList, initialRouteId, selectedHostname, selectedTarget, searchQuery]);

  // Toggle Node Detail Expand/Collapse
  const toggleNodeExpand = React.useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Toggle Branch Collapse/Expand
  const toggleBranchCollapse = React.useCallback((nodeId: string) => {
    setCollapsedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Open Context Menu from Node button or Right-Click
  const openContextMenuForNode = React.useCallback(
    (nodeId: string, nodeType: string, nodeData: Record<string, any>, clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.min(Math.max(12, clientX - rect.left), Math.max(12, rect.width - 250));
      const y = Math.min(Math.max(12, clientY - rect.top), Math.max(12, rect.height - 280));
      setContextMenu({
        nodeId,
        nodeType,
        nodeData,
        x,
        y,
      });
    },
    []
  );

  // Build Topology Graph supporting GroupBy ('none' | 'hostname' | 'target') and Collapse/Expand
  React.useEffect(() => {
    if (filteredItems.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const isIngressBranchCollapsed = collapsedBranchIds.has('root-ingress');

    // Helper to attach interactive callbacks to node data
    const withNodeActions = (
      nodeId: string,
      nodeType: string,
      baseData: Record<string, any>,
      hasChildren: boolean,
      hiddenChildCount = 0
    ) => {
      const enriched: Record<string, any> = {
        ...baseData,
        isExpanded: expandedNodeIds.has(nodeId),
        isBranchCollapsed: collapsedBranchIds.has(nodeId),
        hasChildren,
        hiddenChildCount,
        onToggleExpand: () => toggleNodeExpand(nodeId),
        onToggleBranch: hasChildren ? () => toggleBranchCollapse(nodeId) : undefined,
        onOpenContextMenu: (e: React.MouseEvent) => {
          openContextMenuForNode(nodeId, nodeType, enriched, e.clientX, e.clientY);
        },
      };
      return enriched;
    };

    const routeX = groupBy === 'hostname' ? 680 : 380;
    const serviceX = groupBy === 'hostname' ? 1020 : 720;
    const targetX = groupBy === 'hostname' ? 1360 : 1060;

    let currentY = 50;

    if (groupBy === 'target') {
      // Group routes by Target Endpoint (svc.host:svc.port)
      const targetGroups = new Map<string, typeof filteredItems>();
      filteredItems.forEach((item) => {
        const list = targetGroups.get(item.targetEndpoint) || [];
        list.push(item);
        targetGroups.set(item.targetEndpoint, list);
      });

      if (!isIngressBranchCollapsed) {
        Array.from(targetGroups.entries()).forEach(([targetKey, groupItems], gIdx) => {
          const groupStartY = currentY;
          const firstSvc = groupItems[0]?.svc;
          const routeNames = groupItems.map((gi) => gi.route.name || gi.route.id.slice(0, 12));

          groupItems.forEach((item) => {
            const { route } = item;
            const rNodeId = `node-r-${route.id}`;
            const isRExpanded = expandedNodeIds.has(rNodeId);
            const rowStep = isRExpanded ? 270 : 185;

            const rNode: Node = {
              id: rNodeId,
              type: 'routeNode',
              position: { x: routeX, y: currentY },
              data: withNodeActions(
                rNodeId,
                'routeNode',
                {
                  name: route.name || route.id.slice(0, 12),
                  methods: route.methods && route.methods.length > 0 ? route.methods : ['GET', 'POST'],
                  paths: route.paths && route.paths.length > 0 ? route.paths : ['/'],
                  hosts: item.routeHosts,
                  protocols: route.protocols || ['http', 'https'],
                  strip_path: route.strip_path ?? true,
                  preserve_host: route.preserve_host ?? false,
                  id: route.id,
                  hostname: item.primaryHostname,
                  targetEndpoint: item.targetEndpoint,
                },
                false
              ),
            };
            allNodes.push(rNode);

            allEdges.push({
              id: `edge-ingress-r-${route.id}`,
              source: 'root-ingress',
              target: rNodeId,
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
            });

            currentY += rowStep;
          });

          const groupMidY = (groupStartY + currentY - 185) / 2;

          if (firstSvc) {
            const sharedSvcId = `node-s-group-${gIdx}-${firstSvc.id}`;
            const isSvcBranchCollapsed = collapsedBranchIds.has(sharedSvcId);

            const sNode: Node = {
              id: sharedSvcId,
              type: 'serviceNode',
              position: { x: serviceX, y: Math.max(50, groupMidY) },
              data: withNodeActions(
                sharedSvcId,
                'serviceNode',
                {
                  name: firstSvc.name || 'backend-service',
                  protocol: firstSvc.protocol || 'http',
                  host: firstSvc.host,
                  port: firstSvc.port,
                  path: firstSvc.path,
                  connect_timeout: firstSvc.connect_timeout || 60000,
                  read_timeout: firstSvc.read_timeout || 60000,
                  id: firstSvc.id,
                  routeCount: groupItems.length,
                  hostname: firstSvc.host,
                  targetEndpoint: targetKey,
                },
                true,
                isSvcBranchCollapsed ? 1 : 0
              ),
            };
            allNodes.push(sNode);

            // Connect all routes in this target group to the shared Service Node
            groupItems.forEach((item) => {
              allEdges.push({
                id: `edge-r-s-${item.route.id}-${sharedSvcId}`,
                source: `node-r-${item.route.id}`,
                target: sharedSvcId,
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
              });
            });

            if (!isSvcBranchCollapsed) {
              const sharedTargetId = `node-t-group-${gIdx}-${targetKey}`;
              const tNode: Node = {
                id: sharedTargetId,
                type: 'targetNode',
                position: { x: targetX, y: Math.max(55, groupMidY + 5) },
                data: withNodeActions(
                  sharedTargetId,
                  'targetNode',
                  {
                    target: targetKey,
                    weight: 100,
                    routeCount: groupItems.length,
                    routeNames,
                    serviceName: firstSvc.name,
                    hostname: firstSvc.host,
                    targetEndpoint: targetKey,
                  },
                  false
                ),
              };
              allNodes.push(tNode);

              allEdges.push({
                id: `edge-s-t-${sharedSvcId}-${sharedTargetId}`,
                source: sharedSvcId,
                target: sharedTargetId,
                animated: true,
                style: { stroke: '#10b981', strokeWidth: 2.5, strokeDasharray: '5,5' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
              });
            }
          }

          currentY += 35; // Extra visual separation between Target Groups
        });
      }
    } else if (groupBy === 'hostname') {
      // Group routes by Hostname
      const hostGroups = new Map<string, typeof filteredItems>();
      filteredItems.forEach((item) => {
        const hKey = item.primaryHostname;
        const list = hostGroups.get(hKey) || [];
        list.push(item);
        hostGroups.set(hKey, list);
      });

      if (!isIngressBranchCollapsed) {
        Array.from(hostGroups.entries()).forEach(([hostKey, groupItems], hIdx) => {
          const hostNodeId = `node-host-${hIdx}-${hostKey}`;
          const isHostBranchCollapsed = collapsedBranchIds.has(hostNodeId);
          const groupStartY = currentY;
          const routeNames = groupItems.map((gi) => gi.route.name || gi.route.id.slice(0, 12));

          if (!isHostBranchCollapsed) {
            groupItems.forEach((item, rIdx) => {
              const { route, svc } = item;
              const rNodeId = `node-r-${route.id}`;
              const isRExpanded = expandedNodeIds.has(rNodeId);
              const isRBranchCollapsed = collapsedBranchIds.has(rNodeId);
              const rowStep = isRExpanded ? 270 : 185;

              const rNode: Node = {
                id: rNodeId,
                type: 'routeNode',
                position: { x: routeX, y: currentY },
                data: withNodeActions(
                  rNodeId,
                  'routeNode',
                  {
                    name: route.name || route.id.slice(0, 12),
                    methods: route.methods && route.methods.length > 0 ? route.methods : ['GET', 'POST'],
                    paths: route.paths && route.paths.length > 0 ? route.paths : ['/'],
                    hosts: item.routeHosts,
                    protocols: route.protocols || ['http', 'https'],
                    strip_path: route.strip_path ?? true,
                    preserve_host: route.preserve_host ?? false,
                    id: route.id,
                    hostname: hostKey,
                    targetEndpoint: item.targetEndpoint,
                  },
                  Boolean(svc),
                  isRBranchCollapsed && svc ? 2 : 0
                ),
              };
              allNodes.push(rNode);

              allEdges.push({
                id: `edge-host-r-${hostNodeId}-${route.id}`,
                source: hostNodeId,
                target: rNodeId,
                animated: true,
                style: { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '5,5' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
              });

              if (svc && !isRBranchCollapsed) {
                const sNodeId = `node-s-${svc.id}-${hIdx}-${rIdx}`;
                const isSBranchCollapsed = collapsedBranchIds.has(sNodeId);
                const sNode: Node = {
                  id: sNodeId,
                  type: 'serviceNode',
                  position: { x: serviceX, y: currentY },
                  data: withNodeActions(
                    sNodeId,
                    'serviceNode',
                    {
                      name: svc.name || 'backend-service',
                      protocol: svc.protocol || 'http',
                      host: svc.host,
                      port: svc.port,
                      path: svc.path,
                      connect_timeout: svc.connect_timeout || 60000,
                      read_timeout: svc.read_timeout || 60000,
                      id: svc.id,
                      hostname: hostKey,
                      targetEndpoint: item.targetEndpoint,
                    },
                    true,
                    isSBranchCollapsed ? 1 : 0
                  ),
                };
                allNodes.push(sNode);

                allEdges.push({
                  id: `edge-${route.id}-${sNodeId}`,
                  source: rNodeId,
                  target: sNodeId,
                  animated: true,
                  style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                });

                if (!isSBranchCollapsed) {
                  const tNodeId = `node-t-${svc.id}-${hIdx}-${rIdx}`;
                  const tNode: Node = {
                    id: tNodeId,
                    type: 'targetNode',
                    position: { x: targetX, y: currentY + 8 },
                    data: withNodeActions(
                      tNodeId,
                      'targetNode',
                      {
                        target: `${svc.host}:${svc.port}`,
                        weight: 100,
                        serviceName: svc.name,
                        hostname: hostKey,
                        targetEndpoint: item.targetEndpoint,
                      },
                      false
                    ),
                  };
                  allNodes.push(tNode);

                  allEdges.push({
                    id: `edge-target-${sNodeId}-${tNodeId}`,
                    source: sNodeId,
                    target: tNodeId,
                    animated: true,
                    style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
                  });
                }
              }

              currentY += rowStep;
            });
          } else {
            currentY += 150;
          }

          const hostMidY = isHostBranchCollapsed
            ? groupStartY
            : Math.max(50, (groupStartY + currentY - 185) / 2);

          const hostNode: Node = {
            id: hostNodeId,
            type: 'hostGroupNode',
            position: { x: 360, y: hostMidY },
            data: withNodeActions(
              hostNodeId,
              'hostGroupNode',
              {
                hostname: hostKey,
                routeCount: groupItems.length,
                routeNames,
              },
              true,
              isHostBranchCollapsed ? groupItems.length * 3 : 0
            ),
          };
          allNodes.push(hostNode);

          allEdges.push({
            id: `edge-ingress-host-${hostNodeId}`,
            source: 'root-ingress',
            target: hostNodeId,
            animated: true,
            style: { stroke: '#a855f7', strokeWidth: 2.2, strokeDasharray: '5,5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
          });

          currentY += 30;
        });
      }
    } else {
      // Standard Mode ('none'): Ingress ➔ Route ➔ Service ➔ Target with dynamic row height & clean spacing
      if (!isIngressBranchCollapsed) {
        filteredItems.forEach((item, idx) => {
          const { route, svc } = item;
          const rNodeId = `node-r-${route.id}`;
          const isRExpanded = expandedNodeIds.has(rNodeId);
          const isRBranchCollapsed = collapsedBranchIds.has(rNodeId);
          const rowStep = isRExpanded ? 275 : 190;

          const rNode: Node = {
            id: rNodeId,
            type: 'routeNode',
            position: { x: routeX, y: currentY },
            data: withNodeActions(
              rNodeId,
              'routeNode',
              {
                name: route.name || route.id.slice(0, 12),
                methods: route.methods && route.methods.length > 0 ? route.methods : ['GET', 'POST'],
                paths: route.paths && route.paths.length > 0 ? route.paths : ['/'],
                hosts: item.routeHosts,
                protocols: route.protocols || ['http', 'https'],
                strip_path: route.strip_path ?? true,
                preserve_host: route.preserve_host ?? false,
                id: route.id,
                hostname: item.primaryHostname,
                targetEndpoint: item.targetEndpoint,
              },
              Boolean(svc),
              isRBranchCollapsed && svc ? 2 : 0
            ),
          };
          allNodes.push(rNode);

          allEdges.push({
            id: `edge-ingress-r-${route.id}`,
            source: 'root-ingress',
            target: rNodeId,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          });

          if (svc && !isRBranchCollapsed) {
            const sNodeId = `node-s-${svc.id}-${idx}`;
            const isSBranchCollapsed = collapsedBranchIds.has(sNodeId);
            const sNode: Node = {
              id: sNodeId,
              type: 'serviceNode',
              position: { x: serviceX, y: currentY },
              data: withNodeActions(
                sNodeId,
                'serviceNode',
                {
                  name: svc.name || 'backend-service',
                  protocol: svc.protocol || 'http',
                  host: svc.host,
                  port: svc.port,
                  path: svc.path,
                  connect_timeout: svc.connect_timeout || 60000,
                  read_timeout: svc.read_timeout || 60000,
                  id: svc.id,
                  hostname: item.primaryHostname,
                  targetEndpoint: item.targetEndpoint,
                },
                true,
                isSBranchCollapsed ? 1 : 0
              ),
            };
            allNodes.push(sNode);

            allEdges.push({
              id: `edge-${route.id}-${svc.id}-${idx}`,
              source: rNodeId,
              target: sNodeId,
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
            });

            if (!isSBranchCollapsed) {
              const tNodeId = `node-t-${svc.id}-${idx}`;
              const tNode: Node = {
                id: tNodeId,
                type: 'targetNode',
                position: { x: targetX, y: currentY + 10 },
                data: withNodeActions(
                  tNodeId,
                  'targetNode',
                  {
                    target: `${svc.host}:${svc.port}`,
                    weight: 100,
                    serviceName: svc.name,
                    hostname: item.primaryHostname,
                    targetEndpoint: item.targetEndpoint,
                  },
                  false
                ),
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
          }

          currentY += rowStep;
        });
      }
    }

    const totalGraphHeight = Math.max(currentY, 240);
    const ingressY = Math.max(50, (totalGraphHeight - 180) / 2);

    // 1. Single Root Ingress Node
    const rootIngressNode: Node = {
      id: 'root-ingress',
      type: 'gatewayNode',
      position: { x: 40, y: ingressY },
      data: withNodeActions(
        'root-ingress',
        'gatewayNode',
        {
          label: 'Kong Ingress Proxy (:8000)',
          routeCount: filteredItems.length,
          serviceCount: services.length,
          targetCount: availableTargets.length,
          clusterName: activeCluster?.name || 'Kong Cluster',
        },
        true,
        isIngressBranchCollapsed ? allNodes.length : 0
      ),
    };
    allNodes.unshift(rootIngressNode);

    setNodes(allNodes);
    setEdges(allEdges);
  }, [
    filteredItems,
    services.length,
    availableTargets.length,
    activeCluster?.name,
    groupBy,
    expandedNodeIds,
    collapsedBranchIds,
    toggleNodeExpand,
    toggleBranchCollapse,
    openContextMenuForNode,
    setNodes,
    setEdges,
  ]);

  // Expand All / Collapse All details
  const handleExpandAllDetails = () => {
    const allIds = new Set<string>(nodes.map((n) => n.id));
    setExpandedNodeIds(allIds);
    setCollapsedBranchIds(new Set());
  };

  const handleCollapseAllDetails = () => {
    setExpandedNodeIds(new Set());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedHostname('all');
    setSelectedTarget('all');
    setGroupBy('none');
    setCollapsedBranchIds(new Set());
  };

  const hasActiveFilter =
    searchQuery.trim() !== '' || selectedHostname !== 'all' || selectedTarget !== 'all' || groupBy !== 'none';

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[calc(100vh-140px)] min-h-[720px]'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/95 px-4 py-2.5 text-white backdrop-blur z-20">
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
              {activeCluster ? activeCluster.name : 'Chưa chọn Cluster'} • Hiển thị{' '}
              <strong className="text-emerald-400">{filteredItems.length}</strong>/{routes.length} Routes •{' '}
              <strong className="text-purple-400">{availableHostnames.length}</strong> Hostnames •{' '}
              <strong className="text-blue-400">{availableTargets.length}</strong> Targets
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={
              expandedNodeIds.size > 0 ? handleCollapseAllDetails : handleExpandAllDetails
            }
            className="h-8 bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            title="Mở rộng hoặc thu gọn chi tiết tất cả các Node"
          >
            {expandedNodeIds.size > 0 ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1 text-amber-400" />
                Thu gọn Node
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                Mở rộng Node
              </>
            )}
          </Button>

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

      {/* Filter & Grouping Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/80 bg-slate-900/70 px-4 py-2 text-xs text-slate-200 z-20">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Quick Search */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo Route, Path, Host, Target..."
              className="w-full h-8 pl-8 pr-7 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter by Hostname */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 h-8">
            <Globe className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px] text-slate-400">Hostname:</span>
            <select
              value={selectedHostname}
              onChange={(e) => setSelectedHostname(e.target.value)}
              className="bg-slate-950 text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[180px]"
            >
              <option value="all">Tất cả Hostname ({availableHostnames.length})</option>
              {availableHostnames.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Target */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 h-8">
            <Server className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-slate-400">Target:</span>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="bg-slate-950 text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[210px]"
            >
              <option value="all">Tất cả Target ({availableTargets.length})</option>
              {availableTargets.map(([tName, count]) => (
                <option key={tName} value={tName}>
                  {tName} ({count} routes)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Group By Mode Selector & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700/80">
            <span className="flex items-center gap-1 text-[11px] text-slate-400 px-2">
              <FolderTree className="h-3.5 w-3.5 text-blue-400" />
              Nhóm theo:
            </span>
            <button
              type="button"
              onClick={() => setGroupBy('none')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                groupBy === 'none'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mặc định
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('hostname')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                groupBy === 'hostname'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hostname
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('target')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                groupBy === 'target'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Target
            </button>
          </div>

          {hasActiveFilter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetFilters}
              className="h-8 px-2.5 text-xs text-amber-300 hover:text-white hover:bg-slate-800"
              title="Đặt lại toàn bộ bộ lọc và chế độ nhóm"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Đặt lại
            </Button>
          )}
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
        {/* Toast feedback for copy/filter actions */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 text-xs font-medium shadow-xl">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

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
        ) : filteredItems.length === 0 && !isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10 bg-slate-950/90">
            <Filter className="h-10 w-10 text-slate-500" />
            <h4 className="text-sm font-bold text-white">Không tìm thấy luồng nào khớp với bộ lọc hiện tại</h4>
            <p className="text-xs text-slate-400">
              Thử thay đổi từ khóa tìm kiếm, Hostname hoặc Target để xem toàn bộ luồng.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetFilters}
              className="bg-slate-900 border-slate-700 text-white text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
              toggleNodeExpand(node.id);
            }}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              openContextMenuForNode(
                node.id,
                node.type || 'routeNode',
                (node.data || {}) as Record<string, any>,
                event.clientX,
                event.clientY
              );
            }}
            onPaneClick={() => {
              setContextMenu(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.15}
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
                  case 'hostGroupNode':
                    return '#a855f7';
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

        {/* Right-Click / Action Context Menu on Flow Nodes */}
        {contextMenu && (
          <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
            className="absolute z-50 w-60 rounded-xl border border-slate-700 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  {contextMenu.nodeType.replace('Node', '')} Menu
                </p>
                <p className="font-semibold text-white truncate">
                  {String(
                    contextMenu.nodeData.name ||
                      contextMenu.nodeData.hostname ||
                      contextMenu.nodeData.target ||
                      contextMenu.nodeData.label ||
                      contextMenu.nodeId
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContextMenu(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="py-1">
              {/* Toggle Node Details */}
              <button
                type="button"
                onClick={() => {
                  toggleNodeExpand(contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200"
              >
                {expandedNodeIds.has(contextMenu.nodeId) ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 text-amber-400" />
                    <span>Thu gọn chi tiết Node</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Mở rộng xem toàn bộ chi tiết</span>
                  </>
                )}
              </button>

              {/* Toggle Branch Collapse/Expand if node has children */}
              {Boolean(contextMenu.nodeData.hasChildren) && (
                <button
                  type="button"
                  onClick={() => {
                    toggleBranchCollapse(contextMenu.nodeId);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200"
                >
                  <FolderTree className="h-3.5 w-3.5 text-purple-400" />
                  <span>
                    {collapsedBranchIds.has(contextMenu.nodeId)
                      ? 'Mở rộng nhánh con phía sau'
                      : 'Thu gọn nhánh con phía sau'}
                  </span>
                </button>
              )}

              {/* Inspect Node JSON / Full Details */}
              <button
                type="button"
                onClick={() => {
                  setInspectedNode({
                    id: contextMenu.nodeId,
                    type: contextMenu.nodeType,
                    data: contextMenu.nodeData,
                  });
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200"
              >
                <Eye className="h-3.5 w-3.5 text-blue-400" />
                <span>Xem thông số kỹ thuật (Inspector)</span>
              </button>

              {/* Filter by this Hostname */}
              {(contextMenu.nodeData.hostname ||
                (Array.isArray(contextMenu.nodeData.hosts) && contextMenu.nodeData.hosts.length > 0)) && (
                <button
                  type="button"
                  onClick={() => {
                    const h =
                      contextMenu.nodeData.hostname ||
                      (Array.isArray(contextMenu.nodeData.hosts) ? contextMenu.nodeData.hosts[0] : '');
                    if (h) {
                      setSelectedHostname(String(h));
                      showToast(`Đã lọc theo Hostname: ${h}`);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-purple-300"
                >
                  <Globe className="h-3.5 w-3.5 text-purple-400" />
                  <span className="truncate">
                    Chỉ lọc Hostname: {String(contextMenu.nodeData.hostname || contextMenu.nodeData.hosts?.[0])}
                  </span>
                </button>
              )}

              {/* Filter by this Target */}
              {(contextMenu.nodeData.targetEndpoint || contextMenu.nodeData.target) && (
                <button
                  type="button"
                  onClick={() => {
                    const t = String(contextMenu.nodeData.targetEndpoint || contextMenu.nodeData.target);
                    setSelectedTarget(t);
                    showToast(`Đã lọc theo Target: ${t}`);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-emerald-300"
                >
                  <Server className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="truncate">
                    Chỉ lọc Target: {String(contextMenu.nodeData.targetEndpoint || contextMenu.nodeData.target)}
                  </span>
                </button>
              )}
            </div>

            {/* Copy Actions */}
            <div className="border-t border-slate-800 py-1">
              {Array.isArray(contextMenu.nodeData.paths) && contextMenu.nodeData.paths.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const text = contextMenu.nodeData.paths.join(', ');
                    navigator.clipboard?.writeText(text).catch(() => {});
                    showToast('Đã sao chép danh sách Paths');
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-300"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Sao chép danh sách Paths</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const val = String(
                    contextMenu.nodeData.target ||
                      contextMenu.nodeData.hostname ||
                      contextMenu.nodeData.name ||
                      contextMenu.nodeData.id ||
                      contextMenu.nodeId
                  );
                  navigator.clipboard?.writeText(val).catch(() => {});
                  showToast(`Đã sao chép: ${val}`);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-300"
              >
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Sao chép định danh / địa chỉ</span>
              </button>
            </div>

            {/* Navigation Links */}
            <div className="border-t border-slate-800 pt-1">
              {contextMenu.nodeType === 'routeNode' && (
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    router.push('/routes');
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-blue-400 font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Mở trang Quản lý Routes</span>
                </button>
              )}
              {contextMenu.nodeType === 'serviceNode' && (
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    router.push('/services');
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-blue-400 font-medium"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Mở trang Quản lý Services</span>
                </button>
              )}
              {contextMenu.nodeType === 'targetNode' && (
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    router.push('/upstreams');
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-blue-400 font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Mở trang Upstreams & Targets</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Node Inspector Drawer */}
        {inspectedNode && (
          <div className="absolute top-3 right-3 bottom-3 w-80 z-40 rounded-2xl border border-slate-700 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Node Inspector ({inspectedNode.type})
                </p>
                <h4 className="text-xs font-bold text-white truncate max-w-[210px]">
                  {String(
                    inspectedNode.data.name ||
                      inspectedNode.data.hostname ||
                      inspectedNode.data.target ||
                      inspectedNode.data.label ||
                      inspectedNode.id
                  )}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectedNode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
              {Array.isArray(inspectedNode.data.paths) && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Danh sách Paths ({inspectedNode.data.paths.length})
                  </p>
                  <div className="space-y-1">
                    {inspectedNode.data.paths.map((p: string, i: number) => (
                      <div
                        key={i}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 break-all"
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Raw Metadata</p>
                <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(inspectedNode.data).filter(
                        ([k, v]) => typeof v !== 'function' && !k.startsWith('on')
                      )
                    ),
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Hint Bar */}
        <div className="absolute bottom-3 left-3 z-20 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 backdrop-blur">
          <span>💡 <strong className="text-slate-200">Click vào Node</strong>: Mở rộng / thu gọn chi tiết</span>
          <span>•</span>
          <span><strong className="text-slate-200">Chuột phải (hoặc ⋮)</strong>: Mở Context Menu</span>
          <span>•</span>
          <span><strong className="text-slate-200">Nút [-] / [+]</strong>: Thu gọn / mở rộng nhánh</span>
        </div>
      </div>
    </div>
  );
}
