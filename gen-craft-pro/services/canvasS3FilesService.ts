/**
 * Canvas S3 Files Service
 * Handles syncing project files to/from S3 storage
 */

import { ProjectFile } from '../types';

const API_BASE = '/api/canvas/files';

interface FileMetadata {
  path: string;
  size: number;
  lastModified: string;
}

interface SyncResult {
  success: boolean;
  saved?: number;
  failed?: number;
  errors?: Array<{ path: string; error: string }>;
}

interface LoadResult {
  success: boolean;
  files?: Array<{
    path: string;
    content: string;
    size: number;
    lastModified: string;
  }>;
  fileCount?: number;
  error?: string;
}

export const canvasS3FilesService = {
  /**
   * Sync all project files to S3
   */
  async syncFiles(projectId: string, files: ProjectFile[]): Promise<SyncResult> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[CanvasS3Files] Not authenticated, skipping S3 sync');
          return { success: false, saved: 0, failed: files.length };
        }
        throw new Error(`Sync failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CanvasS3Files] Sync error:', error);
      return { success: false, saved: 0, failed: files.length };
    }
  },

  /**
   * Load all project files from S3
   */
  async loadProject(projectId: string): Promise<LoadResult> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/load`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[CanvasS3Files] Not authenticated');
          return { success: false, error: 'Not authenticated' };
        }
        throw new Error(`Load failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CanvasS3Files] Load error:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * List files in a project (metadata only)
   */
  async listFiles(projectId: string): Promise<{ success: boolean; files?: FileMetadata[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Not authenticated' };
        }
        throw new Error(`List failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CanvasS3Files] List error:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * Save a single file to S3
   */
  async saveFile(projectId: string, path: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ path, content }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Not authenticated' };
        }
        throw new Error(`Save failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CanvasS3Files] Save file error:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * Load a single file from S3
   */
  async loadFile(projectId: string, path: string): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/file?path=${encodeURIComponent(path)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'File not found' };
        }
        if (response.status === 401) {
          return { success: false, error: 'Not authenticated' };
        }
        throw new Error(`Load failed: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, content: data.content };
    } catch (error) {
      console.error('[CanvasS3Files] Load file error:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * Delete a file from S3
   */
  async deleteFile(projectId: string, path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/file?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CanvasS3Files] Delete file error:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * Delete all files for a project
   */
  async deleteProject(projectId: string): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Delete project failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CanvasS3Files] Delete project error:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * Get presigned upload URL for large files
   */
  async getUploadUrl(projectId: string, path: string): Promise<{ success: boolean; uploadUrl?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Authentication required' };
        }
        throw new Error(`Get upload URL failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CanvasS3Files] Get upload URL error:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * Get storage usage for the current user
   */
  async getStorageUsage(): Promise<{ success: boolean; usage?: { bytes: number; megabytes: string; fileCount: number }; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/storage/usage`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Not authenticated' };
        }
        throw new Error(`Get usage failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CanvasS3Files] Get usage error:', error);
      return { success: false, error: String(error) };
    }
  },
};

export default canvasS3FilesService;
