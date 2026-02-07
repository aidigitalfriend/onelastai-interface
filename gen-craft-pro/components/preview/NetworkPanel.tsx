/**
 * NetworkPanel — Network requests inspector
 * Shows fetch/XHR requests from the preview with timing
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, ArrowDown, ArrowUp, Clock, FileCode, Image, File, 
  Filter, Trash2, X, ChevronRight, AlertTriangle
} from 'lucide-react';

export interface NetworkRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  url: string;
  status: number;
  statusText: string;
  type: 'fetch' | 'xhr' | 'script' | 'stylesheet' | 'image' | 'font' | 'other';
  size: number;
  duration: number;      // ms
  startTime: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  error?: string;
}

interface NetworkPanelProps {
  requests: NetworkRequest[];
  onClear?: () => void;
  className?: string;
}

const methodColors: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-blue-400',
  PUT: 'text-amber-400',
  DELETE: 'text-red-400',
  PATCH: 'text-violet-400',
  OPTIONS: 'text-zinc-500',
  HEAD: 'text-zinc-500',
};

const statusColors = (status: number): string => {
  if (status >= 500) return 'text-red-400 bg-red-500/10';
  if (status >= 400) return 'text-amber-400 bg-amber-500/10';
  if (status >= 300) return 'text-blue-400 bg-blue-500/10';
  if (status >= 200) return 'text-emerald-400 bg-emerald-500/10';
  return 'text-zinc-400';
};

const typeIcons: Record<string, React.ElementType> = {
  fetch: Globe,
  xhr: Globe,
  script: FileCode,
  stylesheet: FileCode,
  image: Image,
  font: File,
  other: File,
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatDuration = (ms: number): string => {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const NetworkPanel: React.FC<NetworkPanelProps> = ({ requests, onClear, className = '' }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (typeFilter && req.type !== typeFilter) return false;
      if (searchQuery && !req.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [requests, typeFilter, searchQuery]);

  const selected = selectedId ? requests.find((r) => r.id === selectedId) : null;

  const totalSize = filteredRequests.reduce((sum, r) => sum + r.size, 0);
  const totalDuration = filteredRequests.length > 0
    ? Math.max(...filteredRequests.map((r) => r.duration))
    : 0;

  return (
    <div className={`flex flex-col h-full bg-zinc-950 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800/40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-zinc-400">Network</span>

          {/* Type filters */}
          <div className="flex items-center gap-0.5">
            {['All', 'fetch', 'script', 'stylesheet', 'image'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type === 'All' ? null : type)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                  (type === 'All' && !typeFilter) || typeFilter === type
                    ? 'bg-violet-500/15 text-violet-300'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {type === 'All' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-600 font-mono">
            {filteredRequests.length} requests · {formatSize(totalSize)} · {formatDuration(totalDuration)}
          </span>
          <button
            onClick={onClear}
            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-all"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1 border-b border-zinc-800/40">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter URLs..."
          className="w-full px-2 py-1 bg-zinc-900/50 border border-zinc-800/60 rounded text-[11px] text-zinc-300 placeholder-zinc-600 focus:border-violet-500/30 outline-none"
        />
      </div>

      {/* Request list + Detail split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Request list */}
        <div className={`${selected ? 'w-1/2' : 'w-full'} overflow-y-auto custom-scrollbar border-r border-zinc-800/40`}>
          {/* Header row */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-900/30 border-b border-zinc-800/40 sticky top-0">
            <span className="w-12">Status</span>
            <span className="w-10">Method</span>
            <span className="flex-1">URL</span>
            <span className="w-14 text-right">Size</span>
            <span className="w-14 text-right">Time</span>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
              <Globe className="w-5 h-5 mb-2 opacity-30" />
              <p className="text-[10px]">No network requests</p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const TypeIcon = typeIcons[req.type] || File;
              const isSelected = req.id === selectedId;

              return (
                <button
                  key={req.id}
                  onClick={() => setSelectedId(isSelected ? null : req.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1 text-[11px] font-mono hover:bg-zinc-800/30 transition-colors ${
                    isSelected ? 'bg-violet-500/10' : ''
                  } ${req.error ? 'bg-red-500/5' : ''}`}
                >
                  {/* Status */}
                  <span className={`w-12 text-center px-1 py-0.5 rounded text-[10px] font-bold ${statusColors(req.status)}`}>
                    {req.status || '—'}
                  </span>

                  {/* Method */}
                  <span className={`w-10 text-[10px] font-bold ${methodColors[req.method] || 'text-zinc-400'}`}>
                    {req.method}
                  </span>

                  {/* URL */}
                  <span className="flex-1 truncate text-zinc-300 text-left">
                    {req.url.split('/').pop() || req.url}
                  </span>

                  {/* Size */}
                  <span className="w-14 text-right text-zinc-500">
                    {req.size > 0 ? formatSize(req.size) : '—'}
                  </span>

                  {/* Duration */}
                  <span className={`w-14 text-right ${req.duration > 1000 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {formatDuration(req.duration)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '50%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-y-auto custom-scrollbar"
            >
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300">Request Details</h3>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* General */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">General</h4>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">URL</span>
                      <span className="text-zinc-300 truncate ml-4 max-w-[200px]">{selected.url}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Method</span>
                      <span className={methodColors[selected.method]}>{selected.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Status</span>
                      <span className={statusColors(selected.status).split(' ')[0]}>
                        {selected.status} {selected.statusText}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Duration</span>
                      <span className="text-zinc-300">{formatDuration(selected.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Size</span>
                      <span className="text-zinc-300">{formatSize(selected.size)}</span>
                    </div>
                  </div>
                </div>

                {/* Request Headers */}
                {selected.requestHeaders && Object.keys(selected.requestHeaders).length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Request Headers</h4>
                    <div className="space-y-0.5 text-[10px] font-mono bg-zinc-900/40 rounded-lg p-2">
                      {Object.entries(selected.requestHeaders).map(([key, val]) => (
                        <div key={key} className="flex">
                          <span className="text-violet-400 mr-2">{key}:</span>
                          <span className="text-zinc-400 break-all">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response Headers */}
                {selected.responseHeaders && Object.keys(selected.responseHeaders).length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Response Headers</h4>
                    <div className="space-y-0.5 text-[10px] font-mono bg-zinc-900/40 rounded-lg p-2">
                      {Object.entries(selected.responseHeaders).map(([key, val]) => (
                        <div key={key} className="flex">
                          <span className="text-violet-400 mr-2">{key}:</span>
                          <span className="text-zinc-400 break-all">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response body preview */}
                {selected.responseBody && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Response</h4>
                    <pre className="text-[10px] font-mono text-zinc-400 bg-zinc-900/40 rounded-lg p-2 max-h-[200px] overflow-auto custom-scrollbar whitespace-pre-wrap break-all">
                      {selected.responseBody.slice(0, 5000)}
                      {selected.responseBody.length > 5000 && '\n... (truncated)'}
                    </pre>
                  </div>
                )}

                {/* Error */}
                {selected.error && (
                  <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-red-300">{selected.error}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NetworkPanel;
