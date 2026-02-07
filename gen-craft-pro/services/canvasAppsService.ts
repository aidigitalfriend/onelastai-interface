// Canvas Apps Database Service
// Handles storing and retrieving user-generated apps from the database

import { GeneratedApp } from '../types';

const API_BASE = '/api/canvas/apps';

interface ApiResponse<T> {
  success: boolean;
  error?: string;
  app?: T;
  apps?: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface CanvasAppData {
  id: string;
  name: string;
  prompt: string;
  code: string;
  language: string;
  provider?: string | null;
  modelId?: string | null;
  thumbnail?: string | null;
  history?: any[];
  isFavorite: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// Convert database app to frontend GeneratedApp format
function toGeneratedApp(dbApp: CanvasAppData): GeneratedApp {
  return {
    id: dbApp.id,
    name: dbApp.name,
    code: dbApp.code,
    prompt: dbApp.prompt,
    timestamp: new Date(dbApp.createdAt).getTime(),
    history: dbApp.history || [],
    language: dbApp.language as any,
    provider: dbApp.provider || undefined,
    modelId: dbApp.modelId || undefined,
  };
}

// Convert frontend GeneratedApp to database format
function toDbFormat(app: GeneratedApp): Partial<CanvasAppData> {
  return {
    name: app.name,
    prompt: app.prompt,
    code: app.code,
    language: app.language || 'html',
    provider: app.provider || null,
    modelId: app.modelId || null,
    history: app.history || [],
  };
}

export const canvasAppsService = {
  // Fetch all apps for the user
  async getApps(page = 1, limit = 50): Promise<GeneratedApp[]> {
    try {
      const response = await fetch(`${API_BASE}?page=${page}&limit=${limit}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Fallback to localStorage if not logged in
        if (response.status === 401) {
          console.log('[CanvasApps] Not logged in, using localStorage fallback');
          return this.getLocalApps();
        }
        throw new Error('Failed to fetch apps');
      }
      
      const data: ApiResponse<CanvasAppData> = await response.json();
      
      if (data.success && data.apps) {
        return data.apps.map(toGeneratedApp);
      }
      
      return [];
    } catch (error) {
      console.error('[CanvasApps] Fetch error:', error);
      // Fallback to localStorage on error
      return this.getLocalApps();
    }
  },

  // Save a new app
  async saveApp(app: GeneratedApp): Promise<GeneratedApp | null> {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(toDbFormat(app)),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('[CanvasApps] Not logged in, saving to localStorage');
          return this.saveLocalApp(app);
        }
        throw new Error('Failed to save app');
      }
      
      const data: ApiResponse<CanvasAppData> = await response.json();
      
      if (data.success && data.app) {
        // Also clear old localStorage to free space
        this.clearLocalStorage();
        return toGeneratedApp(data.app);
      }
      
      return null;
    } catch (error) {
      console.error('[CanvasApps] Save error:', error);
      // Fallback to localStorage on error
      return this.saveLocalApp(app);
    }
  },

  // Update an existing app
  async updateApp(id: string, updates: Partial<GeneratedApp>): Promise<GeneratedApp | null> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: updates.name,
          prompt: updates.prompt,
          code: updates.code,
          language: updates.language,
          history: updates.history,
        }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('[CanvasApps] Not logged in, updating localStorage');
          return this.updateLocalApp(id, updates);
        }
        throw new Error('Failed to update app');
      }
      
      const data: ApiResponse<CanvasAppData> = await response.json();
      
      if (data.success && data.app) {
        return toGeneratedApp(data.app);
      }
      
      return null;
    } catch (error) {
      console.error('[CanvasApps] Update error:', error);
      return this.updateLocalApp(id, updates);
    }
  },

  // Delete an app
  async deleteApp(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return this.deleteLocalApp(id);
        }
        throw new Error('Failed to delete app');
      }
      
      return true;
    } catch (error) {
      console.error('[CanvasApps] Delete error:', error);
      return this.deleteLocalApp(id);
    }
  },

  // Delete all apps
  async clearAll(): Promise<boolean> {
    try {
      const response = await fetch(API_BASE, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      // Also clear localStorage
      this.clearLocalStorage();
      
      return response.ok;
    } catch (error) {
      console.error('[CanvasApps] Clear error:', error);
      this.clearLocalStorage();
      return false;
    }
  },

  // Migrate localStorage data to database
  async migrateFromLocalStorage(): Promise<void> {
    const localApps = this.getLocalApps();
    
    if (localApps.length === 0) {
      return;
    }
    
    console.log(`[CanvasApps] Migrating ${localApps.length} apps from localStorage to database`);
    
    for (const app of localApps) {
      try {
        await this.saveApp(app);
      } catch (error) {
        console.error('[CanvasApps] Migration error for app:', app.id, error);
      }
    }
    
    // Clear localStorage after successful migration
    this.clearLocalStorage();
    console.log('[CanvasApps] Migration complete');
  },

  // LocalStorage fallback methods
  getLocalApps(): GeneratedApp[] {
    try {
      const saved = localStorage.getItem('gencraft_v4_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('[CanvasApps] localStorage read error:', e);
    }
    return [];
  },

  saveLocalApp(app: GeneratedApp): GeneratedApp | null {
    try {
      const apps = this.getLocalApps();
      const newApps = [app, ...apps.filter(a => a.id !== app.id)].slice(0, 10); // Keep max 10 locally
      
      // Try to save with size limit check
      const json = JSON.stringify(newApps);
      if (json.length > 4 * 1024 * 1024) { // 4MB limit
        console.warn('[CanvasApps] localStorage limit reached, keeping only 5 recent apps');
        const reduced = newApps.slice(0, 5);
        localStorage.setItem('gencraft_v4_history', JSON.stringify(reduced));
      } else {
        localStorage.setItem('gencraft_v4_history', json);
      }
      
      return app;
    } catch (e: any) {
      console.error('[CanvasApps] localStorage save error:', e);
      
      // If quota exceeded, try to reduce stored data
      if (e.name === 'QuotaExceededError') {
        try {
          const apps = this.getLocalApps().slice(0, 3); // Keep only 3 apps
          localStorage.setItem('gencraft_v4_history', JSON.stringify([app, ...apps.slice(0, 2)]));
          return app;
        } catch {
          // Last resort: clear and save only current app
          localStorage.setItem('gencraft_v4_history', JSON.stringify([app]));
          return app;
        }
      }
      
      return null;
    }
  },

  updateLocalApp(id: string, updates: Partial<GeneratedApp>): GeneratedApp | null {
    const apps = this.getLocalApps();
    const index = apps.findIndex(a => a.id === id);
    
    if (index === -1) return null;
    
    apps[index] = { ...apps[index], ...updates };
    
    try {
      localStorage.setItem('gencraft_v4_history', JSON.stringify(apps));
      return apps[index];
    } catch (e) {
      console.error('[CanvasApps] localStorage update error:', e);
      return null;
    }
  },

  deleteLocalApp(id: string): boolean {
    try {
      const apps = this.getLocalApps().filter(a => a.id !== id);
      localStorage.setItem('gencraft_v4_history', JSON.stringify(apps));
      return true;
    } catch (e) {
      console.error('[CanvasApps] localStorage delete error:', e);
      return false;
    }
  },

  clearLocalStorage(): void {
    try {
      localStorage.removeItem('gencraft_v4_history');
    } catch (e) {
      console.error('[CanvasApps] localStorage clear error:', e);
    }
  },
};

export default canvasAppsService;
