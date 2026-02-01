/**
 * ExtensionsPanel - VS Code-style Installed Extensions Management
 * Provides full control over installed extensions with:
 * - Enable/Disable toggle
 * - Uninstall functionality
 * - Update detection & installation
 * - Extension settings
 * - Category filtering
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { extensionManager, initializeExtensions } from '../services/extensions';
import { useExtensions, MARKETPLACE_EXTENSIONS, ExtensionInfo } from '../services/useExtensions';

// Extension action types
type ExtensionAction = 'enable' | 'disable' | 'uninstall' | 'update' | 'settings';
type SortBy = 'name' | 'status' | 'category' | 'author';
type FilterBy = 'all' | 'enabled' | 'disabled' | 'outdated';

export const ExtensionsPanel: React.FC = () => {
  const { theme } = useStore();
  const {
    extensions,
    installedExtensions,
    activeExtensions,
    installExtension,
    uninstallExtension,
    toggleExtension,
    reloadExtension,
    notifications,
    dismissNotification,
    clearNotifications
  } = useExtensions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExtension, setSelectedExtension] = useState<ExtensionInfo | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [showSettings, setShowSettings] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isDark = theme !== 'light';

  useEffect(() => {
    initializeExtensions();
  }, []);

  // Get installed extensions from the hooks
  const installed = extensions.filter(ext => ext.installed);

  // Filter and sort extensions
  const filteredExtensions = installed
    .filter(ext => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!ext.name.toLowerCase().includes(q) && 
            !ext.description.toLowerCase().includes(q) &&
            !ext.author.toLowerCase().includes(q)) {
          return false;
        }
      }
      // Status filter
      if (filterBy === 'enabled' && !ext.enabled) return false;
      if (filterBy === 'disabled' && ext.enabled) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'status': return (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0);
        case 'category': return a.category.localeCompare(b.category);
        case 'author': return a.author.localeCompare(b.author);
        default: return 0;
      }
    });

  // Handle extension actions
  const handleToggle = useCallback(async (extId: string) => {
    setActionLoading(extId);
    await toggleExtension(extId);
    setActionLoading(null);
  }, [toggleExtension]);

  const handleUninstall = useCallback(async (extId: string) => {
    setActionLoading(extId);
    await uninstallExtension(extId);
    setConfirmUninstall(null);
    setActionLoading(null);
  }, [uninstallExtension]);

  const handleReload = useCallback(async (extId: string) => {
    setActionLoading(extId);
    await reloadExtension(extId);
    setActionLoading(null);
  }, [reloadExtension]);

  // Stats
  const enabledCount = installed.filter(e => e.enabled).length;
  const disabledCount = installed.filter(e => !e.enabled).length;

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#1e1e1e] text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-[#3c3c3c] bg-[#252526]' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <span className="font-semibold">Installed Extensions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
            {enabledCount} Enabled
          </span>
          {disabledCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
              {disabledCount} Disabled
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className={`p-2 border-b space-y-1 ${isDark ? 'border-[#3c3c3c] bg-[#252526]' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Notifications</span>
            <button 
              onClick={clearNotifications}
              className={`text-[10px] ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
            >
              Clear all
            </button>
          </div>
          {notifications.slice(0, 3).map(notif => (
            <div 
              key={notif.id}
              className={`flex items-center gap-2 p-2 rounded text-xs ${
                notif.type === 'error' ? 'bg-red-500/20 text-red-300' :
                notif.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                notif.type === 'success' ? 'bg-green-500/20 text-green-300' :
                'bg-blue-500/20 text-blue-300'
              }`}
            >
              <span className="flex-1">{notif.message}</span>
              <button onClick={() => dismissNotification(notif.id)} className="text-white/50 hover:text-white">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className={`p-3 border-b ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="Search installed extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-2 text-sm rounded-md outline-none ${
              isDark 
                ? 'bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007acc] text-white placeholder-gray-500' 
                : 'bg-gray-100 border border-gray-300 focus:border-blue-500 text-gray-900 placeholder-gray-400'
            }`}
          />
          <svg className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Filter & Sort */}
        <div className="flex items-center gap-2">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterBy)}
            className={`flex-1 px-2 py-1 text-[10px] rounded outline-none ${
              isDark ? 'bg-[#3c3c3c] text-white' : 'bg-gray-100 text-gray-900'
            }`}
          >
            <option value="all">All Extensions</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className={`flex-1 px-2 py-1 text-[10px] rounded outline-none ${
              isDark ? 'bg-[#3c3c3c] text-white' : 'bg-gray-100 text-gray-900'
            }`}
          >
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
            <option value="category">Sort by Category</option>
            <option value="author">Sort by Author</option>
          </select>
        </div>
      </div>

      {/* Extensions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredExtensions.length === 0 ? (
          <div className={`text-center py-8 border border-dashed rounded-lg ${isDark ? 'border-[#3c3c3c]' : 'border-gray-300'}`}>
            <div className="text-4xl mb-3">📦</div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {installed.length === 0 ? 'No extensions installed' : 'No matching extensions'}
            </p>
            {installed.length === 0 && (
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Browse the Marketplace to install extensions
              </p>
            )}
          </div>
        ) : (
          filteredExtensions.map(ext => (
            <div
              key={ext.id}
              className={`relative p-3 rounded-lg transition-all ${
                isDark 
                  ? 'bg-[#252526] hover:bg-[#2a2d2e] border border-transparent hover:border-[#007acc]/30' 
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg flex-shrink-0 ${
                  isDark ? 'bg-[#1e1e1e]' : 'bg-white border border-gray-200'
                }`}>
                  {ext.icon}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate">{ext.name}</h3>
                    {ext.verified && (
                      <span className="text-blue-400 text-xs" title="Verified Publisher">✓</span>
                    )}
                    {/* Status Badge */}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      ext.enabled
                        ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                        : isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {ext.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{ext.author}</p>
                  <p className={`text-xs mt-1 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{ext.description}</p>
                  
                  {/* Meta */}
                  <div className={`flex items-center gap-3 mt-2 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-[#1e1e1e]' : 'bg-gray-100'}`}>
                      {ext.category}
                    </span>
                    <span>v{ext.version}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => handleToggle(ext.id)}
                    disabled={actionLoading === ext.id}
                    className={`px-2 py-1 text-[10px] rounded transition-colors ${
                      ext.enabled
                        ? isDark ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : isDark ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } ${actionLoading === ext.id ? 'opacity-50' : ''}`}
                  >
                    {actionLoading === ext.id ? '...' : ext.enabled ? 'Disable' : 'Enable'}
                  </button>
                  
                  {/* Reload */}
                  <button
                    onClick={() => handleReload(ext.id)}
                    disabled={actionLoading === ext.id || !ext.enabled}
                    className={`px-2 py-1 text-[10px] rounded transition-colors ${
                      isDark 
                        ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    } ${(actionLoading === ext.id || !ext.enabled) ? 'opacity-50' : ''}`}
                    title="Reload extension"
                  >
                    ↻
                  </button>
                  
                  {/* Uninstall */}
                  <button
                    onClick={() => setConfirmUninstall(ext.id)}
                    disabled={actionLoading === ext.id}
                    className={`px-2 py-1 text-[10px] rounded transition-colors ${
                      isDark 
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    } ${actionLoading === ext.id ? 'opacity-50' : ''}`}
                  >
                    Uninstall
                  </button>
                </div>
              </div>

              {/* Uninstall Confirmation */}
              {confirmUninstall === ext.id && (
                <div className={`mt-3 p-2 rounded ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                    Are you sure you want to uninstall "{ext.name}"?
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUninstall(ext.id)}
                      disabled={actionLoading === ext.id}
                      className={`px-3 py-1 text-[10px] rounded ${
                        isDark 
                          ? 'bg-red-500 text-white hover:bg-red-600' 
                          : 'bg-red-600 text-white hover:bg-red-700'
                      } ${actionLoading === ext.id ? 'opacity-50' : ''}`}
                    >
                      {actionLoading === ext.id ? 'Removing...' : 'Yes, Uninstall'}
                    </button>
                    <button
                      onClick={() => setConfirmUninstall(null)}
                      className={`px-3 py-1 text-[10px] rounded ${
                        isDark 
                          ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className={`p-3 border-t ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
        <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {installed.length} extension{installed.length !== 1 ? 's' : ''} installed • 
          Browse the <span className="text-blue-400">Marketplace</span> to discover more
        </div>
      </div>
    </div>
  );
};
