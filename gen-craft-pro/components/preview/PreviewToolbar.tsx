/**
 * PreviewToolbar — URL bar, refresh, responsive toggle, zoom
 * Gorgeous toolbar above the live preview area
 */
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, Monitor, Tablet, Smartphone, ExternalLink, ZoomIn, ZoomOut,
  RotateCcw, Maximize2, Minimize2, Globe, ChevronDown, Copy, Check
} from 'lucide-react';
import type { DeviceType } from './DeviceFrames';

interface PreviewToolbarProps {
  url?: string;
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  onRefresh?: () => void;
  onOpenExternal?: () => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  isLoading?: boolean;
  className?: string;
}

const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  url = 'localhost:3000',
  device,
  onDeviceChange,
  onRefresh,
  onOpenExternal,
  zoom = 100,
  onZoomChange,
  isLoading = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [url]);

  const devices: { type: DeviceType; icon: React.ElementType; label: string; shortcut: string }[] = [
    { type: 'desktop', icon: Monitor, label: 'Desktop', shortcut: 'D' },
    { type: 'tablet', icon: Tablet, label: 'Tablet', shortcut: 'T' },
    { type: 'mobile', icon: Smartphone, label: 'Mobile', shortcut: 'M' },
  ];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border-b border-zinc-800/40 shrink-0 ${className}`}>
      {/* Navigation controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* URL bar */}
      <div className="flex-1 flex items-center">
        <div className="flex items-center flex-1 max-w-xl mx-auto bg-zinc-900/50 border border-zinc-800/60 rounded-lg px-3 py-1 gap-2 group hover:border-zinc-700 transition-all">
          <Globe className="w-3 h-3 text-zinc-600 shrink-0" />
          <span className="text-[11px] text-zinc-400 truncate flex-1 font-mono">{url}</span>
          <button
            onClick={handleCopyUrl}
            className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all"
            title="Copy URL"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Device toggles */}
      <div className="flex items-center gap-0.5 bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-0.5">
        {devices.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => onDeviceChange(type)}
            className={`p-1.5 rounded-md transition-all ${
              device === type
                ? 'bg-violet-500/15 text-violet-300 shadow-sm shadow-violet-500/10'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
            title={label}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onZoomChange?.(Math.max(50, zoom - 10))}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-zinc-500 font-mono w-8 text-center">{zoom}%</span>
        <button
          onClick={() => onZoomChange?.(Math.min(200, zoom + 10))}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        {zoom !== 100 && (
          <button
            onClick={() => onZoomChange?.(100)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
            title="Reset zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* External link */}
      <button
        onClick={onOpenExternal}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
        title="Open in new tab"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default PreviewToolbar;
