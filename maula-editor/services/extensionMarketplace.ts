/**
 * Extension Service - Frontend client for Extension Marketplace
 * Handles installation, updates, execution, and sandboxing
 */

import { io, Socket } from 'socket.io-client';

// Types
export interface MarketplaceExtension {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: string;
  downloads: number;
  rating: number;
  verified: boolean;
  tags: string[];
  permissions: string[];
  config?: Record<string, any>;
  main?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstalledExtension extends MarketplaceExtension {
  enabled: boolean;
  installedAt: string;
  projectEnabled?: Record<string, boolean>;
}

export type ExtensionCategory = 
  | 'all'
  | 'AI'
  | 'Formatters'
  | 'Linters'
  | 'Languages'
  | 'Themes'
  | 'Tools'
  | 'SCM'
  | 'API'
  | 'Visual'
  | 'Other';

// Extension Marketplace Client
class ExtensionMarketplaceService {
  private socket: Socket | null = null;
  private connected = false;
  private userId: string | null = null;
  private installedExtensions = new Map<string, InstalledExtension>();
  private listeners = new Map<string, Set<Function>>();
  
  // Get socket URL
  private getSocketUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // GitHub Codespaces
      if (hostname.includes('.app.github.dev')) {
        return window.location.origin.replace('-3000.', '-4001.');
      }
    }
    return 'http://localhost:4001';
  }
  
  // Connect to extension server
  async connect(userId?: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('[Extensions] Already connected');
      return;
    }
    
    return new Promise((resolve, reject) => {
      const url = this.getSocketUrl();
      console.log('[Extensions] Connecting to:', url);
      
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000
      });
      
      this.socket.on('connect', () => {
        console.log('[Extensions] Connected');
        this.connected = true;
        
        if (userId) {
          this.userId = userId;
          this.socket?.emit('extension:auth', { userId });
        }
        
        resolve();
      });
      
      this.socket.on('connect_error', (err) => {
        console.error('[Extensions] Connection error:', err.message);
        reject(err);
      });
      
      // Handle events
      this.socket.on('extension:installed', ({ extension }) => {
        this.installedExtensions.set(extension.id, {
          ...extension,
          enabled: true,
          installedAt: new Date().toISOString()
        });
        this.emit('installed', extension);
      });
      
      this.socket.on('extension:uninstalled', ({ extensionId }) => {
        this.installedExtensions.delete(extensionId);
        this.emit('uninstalled', extensionId);
      });
      
      this.socket.on('extension:notification', ({ extensionId, message, type }) => {
        this.emit('notification', { extensionId, message, type });
      });
      
      this.socket.on('extension:terminal', ({ command }) => {
        this.emit('terminal', command);
      });
      
      this.socket.on('extension:error', ({ error }) => {
        console.error('[Extensions] Error:', error);
        this.emit('error', error);
      });
      
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }
  
  // Disconnect
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
  }
  
  // Check connection
  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }
  
  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }
  
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
  
  // Get marketplace extensions
  async getMarketplace(options?: {
    category?: ExtensionCategory;
    search?: string;
    sort?: 'downloads' | 'rating' | 'name';
  }): Promise<MarketplaceExtension[]> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        // Fallback to REST API
        fetch(`${this.getSocketUrl().replace('ws', 'http')}/api/extensions?${new URLSearchParams(options as any)}`)
          .then(res => res.json())
          .then(data => resolve(data.extensions || []))
          .catch(() => resolve([]));
        return;
      }
      
      this.socket.emit('extension:marketplace', options || {});
      this.socket.once('extension:marketplace:response', ({ extensions }) => {
        resolve(extensions);
      });
    });
  }
  
  // Get extension details
  async getExtension(extensionId: string): Promise<MarketplaceExtension | null> {
    try {
      const res = await fetch(`${this.getSocketUrl()}/api/extensions/${extensionId}`);
      const data = await res.json();
      return data.extension;
    } catch {
      return null;
    }
  }
  
  // Install extension
  async install(extensionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected'));
        return;
      }
      
      this.socket.emit('extension:install', { extensionId });
      this.socket.once('extension:installed', () => resolve());
      this.socket.once('extension:error', ({ error }) => reject(new Error(error)));
      
      setTimeout(() => reject(new Error('Install timeout')), 10000);
    });
  }
  
  // Uninstall extension
  async uninstall(extensionId: string): Promise<void> {
    return new Promise((resolve) => {
      this.socket?.emit('extension:uninstall', { extensionId });
      this.installedExtensions.delete(extensionId);
      resolve();
    });
  }
  
  // Enable/disable extension
  toggle(extensionId: string): boolean {
    const ext = this.installedExtensions.get(extensionId);
    if (ext) {
      ext.enabled = !ext.enabled;
      this.emit('toggled', { extensionId, enabled: ext.enabled });
      return ext.enabled;
    }
    return false;
  }
  
  // Enable/disable for specific project
  toggleForProject(extensionId: string, projectId: string): boolean {
    const ext = this.installedExtensions.get(extensionId);
    if (ext) {
      if (!ext.projectEnabled) ext.projectEnabled = {};
      ext.projectEnabled[projectId] = !ext.projectEnabled[projectId];
      return ext.projectEnabled[projectId];
    }
    return false;
  }
  
  // Execute extension
  execute(extensionId: string): void {
    this.socket?.emit('extension:execute', { extensionId });
  }
  
  // Get recommendations
  async getRecommendations(projectType: string): Promise<MarketplaceExtension[]> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve([]);
        return;
      }
      
      this.socket.emit('extension:recommendations', { projectType });
      this.socket.once('extension:recommendations:response', ({ recommendations }) => {
        resolve(recommendations);
      });
      
      setTimeout(() => resolve([]), 5000);
    });
  }
  
  // Get installed extensions
  getInstalled(): InstalledExtension[] {
    return Array.from(this.installedExtensions.values());
  }
  
  // Check if extension is installed
  isInstalled(extensionId: string): boolean {
    return this.installedExtensions.has(extensionId);
  }
  
  // Check if extension is enabled
  isEnabled(extensionId: string): boolean {
    return this.installedExtensions.get(extensionId)?.enabled === true;
  }
}

// Singleton instance
export const extensionMarketplace = new ExtensionMarketplaceService();

// React hook for extensions
import { useState, useEffect, useCallback } from 'react';

export function useExtensionMarketplace() {
  const [connected, setConnected] = useState(false);
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>([]);
  const [installed, setInstalled] = useState<InstalledExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const connect = async () => {
      try {
        await extensionMarketplace.connect();
        setConnected(true);
        
        const marketplace = await extensionMarketplace.getMarketplace();
        setExtensions(marketplace);
        setInstalled(extensionMarketplace.getInstalled());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    connect();
    
    // Listen for changes
    extensionMarketplace.on('installed', () => {
      setInstalled(extensionMarketplace.getInstalled());
    });
    
    extensionMarketplace.on('uninstalled', () => {
      setInstalled(extensionMarketplace.getInstalled());
    });
    
    extensionMarketplace.on('error', (err: string) => {
      setError(err);
    });
    
    return () => {
      // Cleanup
    };
  }, []);
  
  const install = useCallback(async (extensionId: string) => {
    try {
      await extensionMarketplace.install(extensionId);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);
  
  const uninstall = useCallback(async (extensionId: string) => {
    await extensionMarketplace.uninstall(extensionId);
    setInstalled(extensionMarketplace.getInstalled());
  }, []);
  
  const toggle = useCallback((extensionId: string) => {
    extensionMarketplace.toggle(extensionId);
    setInstalled(extensionMarketplace.getInstalled());
  }, []);
  
  const search = useCallback(async (query: string, category?: ExtensionCategory) => {
    setLoading(true);
    const results = await extensionMarketplace.getMarketplace({
      search: query,
      category
    });
    setExtensions(results);
    setLoading(false);
  }, []);
  
  const getRecommendations = useCallback(async (projectType: string) => {
    return extensionMarketplace.getRecommendations(projectType);
  }, []);
  
  return {
    connected,
    extensions,
    installed,
    loading,
    error,
    install,
    uninstall,
    toggle,
    search,
    getRecommendations,
    isInstalled: (id: string) => extensionMarketplace.isInstalled(id),
    isEnabled: (id: string) => extensionMarketplace.isEnabled(id)
  };
}

export default extensionMarketplace;
