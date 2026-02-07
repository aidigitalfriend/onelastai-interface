/**
 * DependenciesPanel — npm packages manager
 * View, add, remove, and update project dependencies
 */
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Trash2, RefreshCw, Search, ArrowUp, Check, X, AlertTriangle, ExternalLink } from 'lucide-react';

export interface Dependency {
  name: string;
  version: string;
  latestVersion?: string;
  type: 'dependency' | 'devDependency';
  hasUpdate?: boolean;
  description?: string;
}

interface DependenciesPanelProps {
  dependencies: Dependency[];
  onInstall?: (name: string, version?: string, isDev?: boolean) => Promise<void>;
  onUninstall?: (name: string) => Promise<void>;
  onUpdate?: (name: string) => Promise<void>;
  onUpdateAll?: () => Promise<void>;
  isInstalling?: boolean;
  className?: string;
}

const DependenciesPanel: React.FC<DependenciesPanelProps> = ({
  dependencies,
  onInstall,
  onUninstall,
  onUpdate,
  onUpdateAll,
  isInstalling = false,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newPackage, setNewPackage] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [isDev, setIsDev] = useState(false);
  const [filter, setFilter] = useState<'all' | 'dependency' | 'devDependency'>('all');

  const filteredDeps = useMemo(() => {
    return dependencies.filter((dep) => {
      if (filter !== 'all' && dep.type !== filter) return false;
      if (searchQuery && !dep.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [dependencies, filter, searchQuery]);

  const updatableCount = dependencies.filter((d) => d.hasUpdate).length;

  const handleInstall = useCallback(async () => {
    if (!newPackage.trim() || !onInstall) return;
    await onInstall(newPackage.trim(), newVersion.trim() || undefined, isDev);
    setNewPackage('');
    setNewVersion('');
    setShowAdd(false);
  }, [newPackage, newVersion, isDev, onInstall]);

  const deps = filteredDeps.filter((d) => d.type === 'dependency');
  const devDeps = filteredDeps.filter((d) => d.type === 'devDependency');

  const renderDep = (dep: Dependency) => (
    <motion.div
      key={dep.name}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-900/40 transition-colors"
    >
      <Package className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-200 font-medium truncate">{dep.name}</span>
          {dep.hasUpdate && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Update available" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 font-mono">{dep.version}</span>
          {dep.hasUpdate && dep.latestVersion && (
            <>
              <ArrowUp className="w-2.5 h-2.5 text-blue-400" />
              <span className="text-[10px] text-blue-400 font-mono">{dep.latestVersion}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {dep.hasUpdate && onUpdate && (
          <button
            onClick={() => onUpdate(dep.name)}
            className="p-1 rounded text-blue-400 hover:bg-blue-500/10 transition-all"
            title="Update"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
        )}
        <a
          href={`https://www.npmjs.com/package/${dep.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
          title="View on npm"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
        {onUninstall && (
          <button
            onClick={() => onUninstall(dep.name)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Uninstall"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className={`flex flex-col h-full bg-zinc-950 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Package className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-200">Dependencies</h3>
            <p className="text-[10px] text-zinc-500">{dependencies.length} packages</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {updatableCount > 0 && onUpdateAll && (
            <button
              onClick={onUpdateAll}
              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
            >
              Update {updatableCount}
            </button>
          )}
        </div>
      </div>

      {/* Search + filter */}
      <div className="px-3 py-2 border-b border-zinc-800/50 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search packages..."
            className="w-full pl-7 pr-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-300 placeholder-zinc-600 focus:border-violet-500/30 outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'dependency', 'devDependency'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                filter === f ? 'bg-violet-500/15 text-violet-300' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {f === 'all' ? 'All' : f === 'dependency' ? 'Prod' : 'Dev'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {isInstalling && (
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/5 border-b border-zinc-800/50">
          <RefreshCw className="w-3 h-3 text-violet-400 animate-spin" />
          <span className="text-[10px] text-violet-400">Installing packages...</span>
        </div>
      )}

      {/* Dependency list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Productions deps */}
        {(filter === 'all' || filter === 'dependency') && deps.length > 0 && (
          <div>
            <div className="px-3 py-1.5 bg-zinc-900/30 sticky top-0 z-10">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Dependencies ({deps.length})
              </span>
            </div>
            {deps.map(renderDep)}
          </div>
        )}

        {/* Dev deps */}
        {(filter === 'all' || filter === 'devDependency') && devDeps.length > 0 && (
          <div>
            <div className="px-3 py-1.5 bg-zinc-900/30 sticky top-0 z-10">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Dev Dependencies ({devDeps.length})
              </span>
            </div>
            {devDeps.map(renderDep)}
          </div>
        )}

        {filteredDeps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <Package className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No packages found</p>
          </div>
        )}
      </div>

      {/* Add package */}
      <div className="border-t border-zinc-800 p-3">
        {showAdd ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPackage}
                onChange={(e) => setNewPackage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInstall()}
                placeholder="package-name"
                autoFocus
                className="flex-1 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-500/30 outline-none"
              />
              <input
                type="text"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="version"
                className="w-20 px-2 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-500/30 outline-none font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <input
                  type="checkbox"
                  checked={isDev}
                  onChange={(e) => setIsDev(e.target.checked)}
                  className="rounded border-zinc-600"
                />
                Dev dependency
              </label>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="text-[10px] text-zinc-500 hover:text-zinc-300">Cancel</button>
                <button
                  onClick={handleInstall}
                  disabled={!newPackage.trim()}
                  className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-[10px] font-semibold hover:bg-violet-500/30 disabled:opacity-30 transition-all"
                >
                  Install
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full px-3 py-2.5 bg-zinc-900/40 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add Package
          </button>
        )}
      </div>
    </div>
  );
};

export default DependenciesPanel;
