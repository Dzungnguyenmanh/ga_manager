'use client';

import * as React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Route as RouteIcon,
  Layers,
  Network,
  Users,
  Puzzle,
  Server,
  Globe,
  CheckCircle2,
  GitFork,
  Radio,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  MinusSquare,
  PlusSquare,
  Copy,
  Check,
} from 'lucide-react';

// Helper action bar for Collapse/Expand Details, Branch Collapse/Expand, and Context Menu trigger
function NodeActionHeader({
  nodeData,
  accentClass = 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
  dark = false,
}: {
  nodeData: Record<string, any>;
  accentClass?: string;
  dark?: boolean;
}) {
  const isExpanded = Boolean(nodeData.isExpanded);
  const isBranchCollapsed = Boolean(nodeData.isBranchCollapsed);
  const hasChildren = Boolean(nodeData.hasChildren);
  const hiddenChildCount = Number(nodeData.hiddenChildCount || 0);

  return (
    <div className="flex items-center gap-1 shrink-0">
      {typeof nodeData.onToggleExpand === 'function' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nodeData.onToggleExpand();
          }}
          title={isExpanded ? 'Thu gọn chi tiết node' : 'Mở rộng xem chi tiết node'}
          className={`p-1 rounded transition-colors ${accentClass}`}
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      {hasChildren && typeof nodeData.onToggleBranch === 'function' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nodeData.onToggleBranch();
          }}
          title={isBranchCollapsed ? 'Mở rộng nhánh con' : 'Thu gọn nhánh con'}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
            isBranchCollapsed
              ? dark
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
              : accentClass
          }`}
        >
          {isBranchCollapsed ? (
            <>
              <PlusSquare className="h-3 w-3" />
              {hiddenChildCount > 0 && <span>+{hiddenChildCount}</span>}
            </>
          ) : (
            <MinusSquare className="h-3 w-3" />
          )}
        </button>
      )}

      {typeof nodeData.onOpenContextMenu === 'function' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nodeData.onOpenContextMenu(e);
          }}
          title="Menu thao tác nhanh (Chuột phải)"
          className={`p-1 rounded transition-colors ${accentClass}`}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// 0. HTTP Ingress / Kong Gateway Proxy Node
export function GatewayNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  const isExpanded = Boolean(nodeData.isExpanded);

  return (
    <div
      className={`w-[260px] max-w-[260px] rounded-2xl border-2 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-3.5 shadow-xl transition-all cursor-pointer select-none ${
        selected ? 'border-blue-400 ring-4 ring-blue-900/40' : 'border-blue-600/80 hover:border-blue-400'
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 shrink-0">
            <Radio className="h-4 w-4 animate-pulse text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">HTTP Ingress</p>
            <h4 className="text-xs font-bold text-white truncate" title={String(nodeData.label || 'Kong Proxy')}>
              {String(nodeData.label || 'Kong Proxy (:8000)')}
            </h4>
          </div>
        </div>
        <NodeActionHeader
          nodeData={nodeData}
          dark
          accentClass="text-slate-400 hover:text-white hover:bg-slate-800"
        />
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Listening:</span>
          <span className="font-mono text-xs font-bold text-blue-300">:8000 / :8443 (SSL)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Phân nhánh (Routes):</span>
          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
            {Number(nodeData.routeCount || 0)} nhánh
          </span>
        </div>
        {nodeData.groupCount !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Nhóm hiển thị:</span>
            <span className="font-mono text-[10px] font-semibold text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/50">
              {Number(nodeData.groupCount)} nhóm
            </span>
          </div>
        )}
        <div className="p-1.5 rounded bg-slate-800/60 border border-slate-700/50 text-[10px] text-slate-400 flex items-center gap-1.5">
          <GitFork className="h-3 w-3 text-blue-400 shrink-0" />
          <span className="truncate">Match: Host ➔ Path ➔ Method</span>
        </div>

        {isExpanded && (
          <div className="pt-2 mt-2 border-t border-slate-800 space-y-1 text-[10px] text-slate-400">
            <div className="flex justify-between">
              <span>Cluster:</span>
              <span className="text-slate-200 font-semibold truncate max-w-[140px]">
                {String(nodeData.clusterName || 'Active Kong Cluster')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tổng Services:</span>
              <span className="text-blue-300 font-mono">{Number(nodeData.serviceCount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tổng Targets:</span>
              <span className="text-emerald-300 font-mono">{Number(nodeData.targetCount || 0)}</span>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-blue-500 !border-2 !border-slate-900"
      />
    </div>
  );
}

// 0.5 Hostname Group Node (For Grouping by Hostname)
export function HostGroupNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  const isExpanded = Boolean(nodeData.isExpanded);
  const routeNames: string[] = Array.isArray(nodeData.routeNames) ? nodeData.routeNames : [];

  return (
    <div
      className={`w-[250px] max-w-[250px] rounded-xl border-2 bg-gradient-to-b from-purple-950/90 to-slate-900 text-white p-3.5 shadow-lg transition-all cursor-pointer select-none ${
        selected ? 'border-purple-400 ring-4 ring-purple-900/40' : 'border-purple-500/70 hover:border-purple-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-slate-900"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-800/60 gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
            <Globe className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Hostname Group</p>
            <h4
              className="text-xs font-bold text-white font-mono truncate"
              title={String(nodeData.hostname || '*')}
            >
              {String(nodeData.hostname || '* (All Hosts)')}
            </h4>
          </div>
        </div>
        <NodeActionHeader
          nodeData={nodeData}
          dark
          accentClass="text-purple-300 hover:text-white hover:bg-purple-900/60"
        />
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Số lượng Routes:</span>
          <span className="font-mono font-bold text-purple-200 bg-purple-900/60 px-1.5 py-0.5 rounded border border-purple-700/60">
            {Number(nodeData.routeCount || routeNames.length)} routes
          </span>
        </div>

        {isExpanded && routeNames.length > 0 && (
          <div className="pt-1.5 mt-1.5 border-t border-purple-800/50 space-y-1 max-h-32 overflow-y-auto pr-1">
            <p className="text-[10px] text-purple-300 font-semibold">Routes thuộc Host này:</p>
            {routeNames.map((rName, i) => (
              <div
                key={i}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 text-slate-200 truncate border border-purple-800/40"
                title={rName}
              >
                • {rName}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-slate-900"
      />
    </div>
  );
}

// 1. Client / Consumer Node
export function ClientNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  return (
    <div
      className={`w-[230px] max-w-[230px] rounded-xl border-2 bg-white p-3.5 shadow-md transition-all cursor-pointer select-none ${
        selected ? 'border-purple-600 ring-4 ring-purple-100' : 'border-purple-300 hover:border-purple-400'
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Client / Consumer</p>
            <h4 className="text-xs font-bold text-gray-900 truncate">{String(nodeData.label || 'Web / Mobile Client')}</h4>
          </div>
        </div>
        <NodeActionHeader nodeData={nodeData} />
      </div>

      <div className="space-y-1 text-[11px] text-gray-600">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-400 shrink-0">Request:</span>
          <span className="font-mono font-bold text-emerald-600 truncate">
            {String(nodeData.method || 'GET')} {String(nodeData.path || '/api/*')}
          </span>
        </div>
        {nodeData.credential ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-400 shrink-0">Auth Token:</span>
            <span className="font-mono text-[10px] text-purple-600 truncate">{String(nodeData.credential)}</span>
          </div>
        ) : null}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-600 !border-2 !border-white"
      />
    </div>
  );
}

// 2. Route Node — Fixed width & responsive path chips so long paths NEVER overflow or overlap adjacent nodes
export function RouteNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  const methods: string[] = Array.isArray(nodeData.methods) && nodeData.methods.length > 0 ? nodeData.methods : ['ANY'];
  const paths: string[] = Array.isArray(nodeData.paths) && nodeData.paths.length > 0 ? nodeData.paths : ['/'];
  const hosts: string[] = Array.isArray(nodeData.hosts) ? nodeData.hosts : [];
  const protocols: string[] = Array.isArray(nodeData.protocols) ? nodeData.protocols : ['http', 'https'];
  const isExpanded = Boolean(nodeData.isExpanded);

  const [copiedPath, setCopiedPath] = React.useState<string | null>(null);

  const visiblePaths = isExpanded ? paths : paths.slice(0, 2);
  const remainingPathsCount = Math.max(0, paths.length - visiblePaths.length);

  const handleCopyPath = (e: React.MouseEvent, p: string) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(p).catch(() => {});
      setCopiedPath(p);
      setTimeout(() => setCopiedPath(null), 1200);
    }
  };

  return (
    <div
      className={`w-[265px] max-w-[265px] rounded-xl border-2 bg-white p-3.5 shadow-md transition-all cursor-pointer select-none ${
        selected ? 'border-emerald-600 ring-4 ring-emerald-100' : 'border-emerald-300 hover:border-emerald-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-100 gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
            <RouteIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Kong Route (Định tuyến)
            </p>
            <h4
              className="text-xs font-bold text-gray-900 truncate"
              title={String(nodeData.name || 'api-route')}
            >
              {String(nodeData.name || 'api-route')}
            </h4>
          </div>
        </div>
        <NodeActionHeader
          nodeData={nodeData}
          accentClass="text-gray-400 hover:text-emerald-700 hover:bg-emerald-50"
        />
      </div>

      <div className="space-y-2 text-[11px]">
        {/* HTTP Methods */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 flex-wrap">
            {methods.slice(0, isExpanded ? methods.length : 4).map((m: string) => (
              <span
                key={m}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200/60"
              >
                {m}
              </span>
            ))}
            {!isExpanded && methods.length > 4 && (
              <span className="px-1 py-0.5 rounded text-[9px] font-mono bg-gray-100 text-gray-600">
                +{methods.length - 4}
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 shrink-0">
            {paths.length} {paths.length === 1 ? 'path' : 'paths'}
          </span>
        </div>

        {/* Hostnames badge if present */}
        {hosts.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded">
            <Globe className="h-3 w-3 shrink-0 text-purple-600" />
            <span className="font-mono truncate" title={hosts.join(', ')}>
              {hosts.join(', ')}
            </span>
          </div>
        )}

        {/* Paths Container — Strictly bounded width with clean chips and scroll on expand */}
        <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-200/80 space-y-1">
          <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-gray-400 px-0.5">
            <span>Paths ({paths.length})</span>
            {paths.length > 2 && typeof nodeData.onToggleExpand === 'function' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nodeData.onToggleExpand();
                }}
                className="text-emerald-600 hover:underline font-bold normal-case"
              >
                {isExpanded ? 'Thu gọn' : `+${remainingPathsCount} xem thêm`}
              </button>
            )}
          </div>

          <div
            className={`space-y-1 ${
              isExpanded ? 'max-h-36 overflow-y-auto pr-0.5' : ''
            }`}
          >
            {visiblePaths.map((p: string, i: number) => (
              <div
                key={`${p}-${i}`}
                onClick={(e) => handleCopyPath(e, p)}
                title={`${p} (Click để sao chép)`}
                className="group flex items-center justify-between gap-1 px-2 py-1 rounded bg-white border border-gray-200/90 font-mono text-[10px] text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
              >
                <span className="truncate block w-full">{p}</span>
                {copiedPath === p ? (
                  <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="h-2.5 w-2.5 text-gray-300 group-hover:text-emerald-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            ))}
          </div>

          {!isExpanded && remainingPathsCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof nodeData.onToggleExpand === 'function') {
                  nodeData.onToggleExpand();
                }
              }}
              className="w-full text-center py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 rounded border border-emerald-200/60 transition-colors"
            >
              + {remainingPathsCount} đường dẫn khác (Click để mở rộng)
            </button>
          )}
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span>Strip Path:</span>
          <span className="font-semibold text-gray-600">
            {nodeData.strip_path ? 'Yes (True)' : 'No (False)'}
          </span>
        </div>

        {/* Expanded Extra Metadata */}
        {isExpanded && (
          <div className="pt-2 mt-1 border-t border-gray-100 space-y-1 text-[10px] text-gray-500">
            <div className="flex items-center justify-between">
              <span>Protocols:</span>
              <span className="font-mono text-gray-700 font-semibold">{protocols.join(', ')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Preserve Host:</span>
              <span className="font-mono text-gray-700">
                {nodeData.preserve_host ? 'True' : 'False'}
              </span>
            </div>
            {nodeData.id && (
              <div className="flex items-center justify-between gap-2">
                <span className="shrink-0">Route ID:</span>
                <span className="font-mono text-[9px] text-gray-600 truncate" title={String(nodeData.id)}>
                  {String(nodeData.id)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white"
      />
    </div>
  );
}

// 3. Plugin Node (Policies / Middleware)
export function PluginNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  const plugins = Array.isArray(nodeData.plugins) ? nodeData.plugins : [];
  const isExpanded = Boolean(nodeData.isExpanded);
  const visiblePlugins = isExpanded ? plugins : plugins.slice(0, 3);

  return (
    <div
      className={`w-[220px] max-w-[220px] rounded-xl border-2 bg-gradient-to-b from-amber-50/70 to-white p-3 shadow-md transition-all cursor-pointer select-none ${
        selected ? 'border-amber-600 ring-4 ring-amber-100' : 'border-amber-300 hover:border-amber-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />

      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-amber-200 gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Puzzle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 truncate">
            Plugins ({plugins.length})
          </span>
        </div>
        <NodeActionHeader
          nodeData={nodeData}
          accentClass="text-amber-700 hover:bg-amber-100"
        />
      </div>

      <div className="space-y-1">
        {plugins.length === 0 ? (
          <p className="text-[10px] text-gray-400 italic">Không có plugin nào</p>
        ) : (
          visiblePlugins.map((p: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between px-2 py-1 rounded bg-white border border-amber-200 text-[10px] font-medium text-gray-800 shadow-xs"
            >
              <span className="truncate">{p.name || p}</span>
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            </div>
          ))
        )}
        {!isExpanded && plugins.length > 3 && (
          <div className="text-[9px] text-center text-amber-700 font-semibold pt-0.5">
            +{plugins.length - 3} plugin khác
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
    </div>
  );
}

// 4. Service Node (Upstream Backend)
export function ServiceNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  const isExpanded = Boolean(nodeData.isExpanded);
  const fullUrl = `${String(nodeData.protocol || 'http')}://${String(nodeData.host || 'localhost')}:${String(
    nodeData.port || '80'
  )}${nodeData.path ? String(nodeData.path) : ''}`;

  return (
    <div
      className={`w-[260px] max-w-[260px] rounded-xl border-2 bg-white p-3.5 shadow-md transition-all cursor-pointer select-none ${
        selected ? 'border-blue-600 ring-4 ring-blue-100' : 'border-blue-300 hover:border-blue-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-100 gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Kong Service (Dịch vụ)
            </p>
            <h4
              className="text-xs font-bold text-gray-900 truncate"
              title={String(nodeData.name || 'backend-service')}
            >
              {String(nodeData.name || 'backend-service')}
            </h4>
          </div>
        </div>
        <NodeActionHeader
          nodeData={nodeData}
          accentClass="text-gray-400 hover:text-blue-700 hover:bg-blue-50"
        />
      </div>

      <div className="space-y-1.5 text-[11px] text-gray-600">
        <div
          className={`p-1.5 bg-slate-50 rounded border border-slate-200/80 font-mono text-[10px] text-blue-800 font-semibold ${
            isExpanded ? 'break-all' : 'truncate'
          }`}
          title={fullUrl}
        >
          {fullUrl}
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>Timeouts:</span>
          <span className="font-mono">
            {Number(nodeData.connect_timeout || 60000) / 1000}s / {Number(nodeData.read_timeout || 60000) / 1000}s
          </span>
        </div>

        {nodeData.routeCount !== undefined && Number(nodeData.routeCount) > 1 && (
          <div className="flex items-center justify-between text-[10px] text-blue-600 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-100">
            <span>Routes liên kết:</span>
            <span className="font-mono font-bold">{Number(nodeData.routeCount)} routes</span>
          </div>
        )}

        {isExpanded && (
          <div className="pt-2 mt-1 border-t border-gray-100 space-y-1 text-[10px] text-gray-500">
            <div className="flex justify-between gap-2">
              <span className="shrink-0">Host:</span>
              <span className="font-mono text-gray-800 truncate" title={String(nodeData.host || '')}>
                {String(nodeData.host || 'localhost')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Port / Protocol:</span>
              <span className="font-mono text-gray-800">
                {String(nodeData.port || 80)} ({String(nodeData.protocol || 'http').toUpperCase()})
              </span>
            </div>
            {nodeData.path && (
              <div className="flex justify-between gap-2">
                <span className="shrink-0">Base Path:</span>
                <span className="font-mono text-gray-800 truncate">{String(nodeData.path)}</span>
              </div>
            )}
            {nodeData.id && (
              <div className="flex justify-between gap-2">
                <span className="shrink-0">Service ID:</span>
                <span className="font-mono text-[9px] text-gray-600 truncate" title={String(nodeData.id)}>
                  {String(nodeData.id)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
    </div>
  );
}

// 5. Upstream Node (Load Balancing)
export function UpstreamNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  return (
    <div
      className={`w-[230px] max-w-[230px] rounded-xl border-2 bg-white p-3.5 shadow-md transition-all cursor-pointer select-none ${
        selected ? 'border-indigo-600 ring-4 ring-indigo-100' : 'border-indigo-300 hover:border-indigo-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-600 !border-2 !border-white"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100 gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
            <Network className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Upstream (LB)</p>
            <h4 className="text-xs font-bold text-gray-900 truncate">{String(nodeData.name || 'upstream-pool')}</h4>
          </div>
        </div>
        <NodeActionHeader nodeData={nodeData} />
      </div>

      <div className="space-y-1 text-[11px] text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Algorithm:</span>
          <span className="font-semibold text-indigo-700">{String(nodeData.algorithm || 'round-robin')}</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-400">Slots:</span>
          <span className="font-mono">{Number(nodeData.slots || 10000)}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-600 !border-2 !border-white"
      />
    </div>
  );
}

// 6. Target Node (Individual Backend Node IP:Port)
export function TargetNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  const isExpanded = Boolean(nodeData.isExpanded);
  const routeNames: string[] = Array.isArray(nodeData.routeNames) ? nodeData.routeNames : [];

  return (
    <div
      className={`w-[240px] max-w-[240px] rounded-xl border-2 bg-slate-900 text-white p-3.5 shadow-md transition-all cursor-pointer select-none ${
        selected ? 'border-green-400 ring-4 ring-green-900/40' : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900"
      />

      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800 gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Server className="h-3.5 w-3.5 text-green-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 truncate">
            Target Endpoint
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-semibold border border-green-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
            Healthy
          </span>
          <NodeActionHeader
            nodeData={nodeData}
            dark
            accentClass="text-slate-400 hover:text-white hover:bg-slate-800"
          />
        </div>
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div
          className={`text-green-300 font-semibold bg-slate-950/80 px-2 py-1 rounded border border-slate-800 ${
            isExpanded ? 'break-all' : 'truncate'
          }`}
          title={String(nodeData.target || '10.0.1.10:8080')}
        >
          {String(nodeData.target || '10.0.1.10:8080')}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
          <span>Weight:</span>
          <span className="text-white font-mono font-bold">{Number(nodeData.weight || 100)}</span>
        </div>
        {nodeData.routeCount !== undefined && Number(nodeData.routeCount) > 1 && (
          <div className="flex items-center justify-between text-[10px] text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50 font-sans">
            <span>Nhánh gom về Target:</span>
            <span className="font-mono font-bold">{Number(nodeData.routeCount)} routes</span>
          </div>
        )}

        {isExpanded && (
          <div className="pt-2 mt-1 border-t border-slate-800 space-y-1 text-[10px] text-slate-400 font-sans">
            {nodeData.serviceName && (
              <div className="flex justify-between gap-2">
                <span className="shrink-0">Service:</span>
                <span className="text-slate-200 font-mono truncate">{String(nodeData.serviceName)}</span>
              </div>
            )}
            {routeNames.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[9px] uppercase text-slate-400 font-semibold">
                  Routes đích ({routeNames.length}):
                </span>
                <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1">
                  {routeNames.map((rn, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] font-mono text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded truncate"
                      title={rn}
                    >
                      • {rn}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const nodeTypes = {
  gatewayNode: GatewayNode,
  hostGroupNode: HostGroupNode,
  clientNode: ClientNode,
  routeNode: RouteNode,
  pluginNode: PluginNode,
  serviceNode: ServiceNode,
  upstreamNode: UpstreamNode,
  targetNode: TargetNode,
};
