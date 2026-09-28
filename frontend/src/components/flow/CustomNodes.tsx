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
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  KeyRound,
  Zap,
  GitFork,
  Radio,
} from 'lucide-react';

// 0. HTTP Ingress / Kong Gateway Proxy Node
export function GatewayNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  return (
    <div
      className={`min-w-[240px] rounded-2xl border-2 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-4 shadow-xl transition-all ${
        selected ? 'border-blue-400 ring-4 ring-blue-900/40' : 'border-blue-600/80 hover:border-blue-400'
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40">
            <Radio className="h-4 w-4 animate-pulse text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">HTTP Ingress Entrypoint</p>
            <h4 className="text-xs font-bold text-white truncate">{String(nodeData.label || 'Kong Proxy (Port 8000)')}</h4>
          </div>
        </div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
          Proxy Ingress
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Listening:</span>
          <span className="font-mono text-xs font-bold text-blue-300">:8000 / :8443 (SSL)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Phân nhánh (Routes):</span>
          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
            {Number(nodeData.routeCount || 1)} nhánh
          </span>
        </div>
        <div className="p-1.5 rounded bg-slate-800/60 border border-slate-700/50 text-[10px] text-slate-400 flex items-center gap-1">
          <GitFork className="h-3 w-3 text-blue-400 shrink-0" />
          <span>Match theo Host ➔ Path ➔ Method</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-blue-500 !border-2 !border-slate-900"
      />
    </div>
  );
}

// 1. Client / Consumer Node
export function ClientNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  return (
    <div
      className={`min-w-[220px] rounded-xl border-2 bg-white p-3.5 shadow-md transition-all ${
        selected ? 'border-purple-600 ring-4 ring-purple-100' : 'border-purple-300 hover:border-purple-400'
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Client / Consumer</p>
            <h4 className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{String(nodeData.label || 'Web / Mobile Client')}</h4>
          </div>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
          Source
        </span>
      </div>

      <div className="space-y-1 text-[11px] text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Request:</span>
          <span className="font-mono font-bold text-emerald-600">{String(nodeData.method || 'GET')} {String(nodeData.path || '/api/*')}</span>
        </div>
        {nodeData.credential ? (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Auth Token:</span>
            <span className="font-mono text-[10px] text-purple-600 truncate max-w-[100px]">{String(nodeData.credential)}</span>
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

// 2. Route Node
export function RouteNode({ data, selected }: NodeProps) {
  const nodeData = data as Record<string, any>;
  const methods = Array.isArray(nodeData.methods) ? nodeData.methods : ['GET', 'POST'];
  const paths = Array.isArray(nodeData.paths) ? nodeData.paths : ['/api/v1'];

  return (
    <div
      className={`min-w-[240px] rounded-xl border-2 bg-white p-3.5 shadow-md transition-all ${
        selected ? 'border-emerald-600 ring-4 ring-emerald-100' : 'border-emerald-300 hover:border-emerald-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
            <RouteIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Kong Route (Định tuyến)</p>
            <h4 className="text-xs font-bold text-gray-900 truncate max-w-[130px]">{String(nodeData.name || 'api-route')}</h4>
          </div>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
          Match
        </span>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center gap-1 flex-wrap">
          {methods.map((m: string) => (
            <span key={m} className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800">
              {m}
            </span>
          ))}
        </div>
        <div className="p-1.5 bg-gray-50 rounded border border-gray-100 font-mono text-[10px] text-gray-700 break-all">
          Paths: {paths.join(', ')}
        </div>
        {nodeData.strip_path !== undefined ? (
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>Strip Path:</span>
            <span className="font-semibold text-gray-600">{nodeData.strip_path ? 'Yes (True)' : 'No (False)'}</span>
          </div>
        ) : null}
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

  return (
    <div
      className={`min-w-[200px] rounded-xl border-2 bg-gradient-to-b from-amber-50/70 to-white p-3 shadow-md transition-all ${
        selected ? 'border-amber-600 ring-4 ring-amber-100' : 'border-amber-300 hover:border-amber-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />

      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-amber-200">
        <div className="flex items-center gap-1.5">
          <Puzzle className="h-4 w-4 text-amber-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Plugins Applied</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
          {plugins.length} active
        </span>
      </div>

      <div className="space-y-1">
        {plugins.length === 0 ? (
          <p className="text-[10px] text-gray-400 italic">Không có plugin nào</p>
        ) : (
          plugins.map((p: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between px-2 py-1 rounded bg-white border border-amber-200 text-[10px] font-medium text-gray-800 shadow-xs"
            >
              <span className="truncate">{p.name || p}</span>
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            </div>
          ))
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
  return (
    <div
      className={`min-w-[240px] rounded-xl border-2 bg-white p-3.5 shadow-md transition-all ${
        selected ? 'border-blue-600 ring-4 ring-blue-100' : 'border-blue-300 hover:border-blue-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Kong Service (Dịch vụ)</p>
            <h4 className="text-xs font-bold text-gray-900 truncate max-w-[130px]">{String(nodeData.name || 'backend-service')}</h4>
          </div>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
          Target
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] text-gray-600">
        <div className="p-1.5 bg-slate-50 rounded border border-slate-100 font-mono text-[10px] text-blue-800 break-all font-semibold">
          {String(nodeData.protocol || 'http')}://{String(nodeData.host || 'localhost')}:{String(nodeData.port || '80')}
          {nodeData.path ? String(nodeData.path) : ''}
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>Timeouts:</span>
          <span className="font-mono">{Number(nodeData.connect_timeout || 60000) / 1000}s / {Number(nodeData.read_timeout || 60000) / 1000}s</span>
        </div>
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
      className={`min-w-[220px] rounded-xl border-2 bg-white p-3.5 shadow-md transition-all ${
        selected ? 'border-indigo-600 ring-4 ring-indigo-100' : 'border-indigo-300 hover:border-indigo-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-600 !border-2 !border-white"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Upstream (Load Balancer)</p>
            <h4 className="text-xs font-bold text-gray-900 truncate max-w-[110px]">{String(nodeData.name || 'upstream-pool')}</h4>
          </div>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
          LB
        </span>
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
  return (
    <div
      className={`min-w-[190px] rounded-xl border-2 bg-slate-900 text-white p-3 shadow-md transition-all ${
        selected ? 'border-green-400 ring-4 ring-green-900/40' : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-slate-900"
      />

      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-green-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Target Node</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-green-500/20 text-green-400 font-semibold border border-green-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
          Healthy
        </span>
      </div>

      <div className="space-y-1 font-mono text-[11px]">
        <div className="text-green-300 font-semibold truncate">{String(nodeData.target || '10.0.1.10:8080')}</div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>Weight:</span>
          <span className="text-white font-bold">{Number(nodeData.weight || 100)}</span>
        </div>
      </div>
    </div>
  );
}

export const nodeTypes = {
  gatewayNode: GatewayNode,
  clientNode: ClientNode,
  routeNode: RouteNode,
  pluginNode: PluginNode,
  serviceNode: ServiceNode,
  upstreamNode: UpstreamNode,
  targetNode: TargetNode,
};
