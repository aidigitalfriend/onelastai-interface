/**
 * AssetService — Asset pipeline client
 * Handles image/video upload, optimization, and CDN delivery
 * 
 * Phase 4: Upload → Auto-optimize → CDN URL
 */

export type AssetType = 'image' | 'video' | 'font' | 'file';

export interface Asset {
  id: string;
  projectId: string;
  type: AssetType;
  originalName: string;
  originalSize: number;
  optimizedSize: number;
  s3Key: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  metadata: AssetMetadata;
  variants?: AssetVariant[];
  createdAt: string;
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  format?: string;
  duration?: number;     // video duration in seconds
  bitrate?: number;      // video bitrate
  mimeType: string;
  alt?: string;
  caption?: string;
}

export interface AssetVariant {
  name: string;          // e.g., 'thumb', 'medium', 'large'
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;        // e.g., 'webp', 'avif'
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AssetUploadOptions {
  projectId: string;
  optimize?: boolean;
  generateThumbnail?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;       // 1-100
  formats?: ('webp' | 'avif' | 'png' | 'jpg')[];
}

export interface AssetUsage {
  totalAssets: number;
  totalSize: number;
  limitSize: number;
  breakdown: { type: AssetType; count: number; size: number }[];
}

class AssetService {
  private baseUrl = '/api/assets';

  /**
   * Upload an asset (image, video, font, or file)
   */
  async upload(
    file: File,
    options: AssetUploadOptions,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Asset> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', options.projectId);
      formData.append('optimize', String(options.optimize ?? true));
      formData.append('generateThumbnail', String(options.generateThumbnail ?? true));
      if (options.maxWidth) formData.append('maxWidth', String(options.maxWidth));
      if (options.maxHeight) formData.append('maxHeight', String(options.maxHeight));
      if (options.quality) formData.append('quality', String(options.quality));
      if (options.formats) formData.append('formats', options.formats.join(','));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload network error'));
      xhr.send(formData);
    });
  }

  /**
   * Upload multiple assets at once
   */
  async uploadMultiple(
    files: File[],
    options: AssetUploadOptions,
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<Asset[]> {
    const results: Asset[] = [];

    for (let i = 0; i < files.length; i++) {
      const asset = await this.upload(
        files[i],
        options,
        (progress) => onProgress?.(i, progress)
      );
      results.push(asset);
    }

    return results;
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string): Promise<Asset> {
    const response = await fetch(`${this.baseUrl}/${assetId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get asset: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List assets for a project
   */
  async listAssets(projectId: string, type?: AssetType): Promise<Asset[]> {
    let url = `${this.baseUrl}?projectId=${projectId}`;
    if (type) url += `&type=${type}`;

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Delete an asset
   */
  async deleteAsset(assetId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${assetId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete asset: ${response.status}`);
    }
  }

  /**
   * Optimize an existing asset
   */
  async optimize(assetId: string, options?: { quality?: number; formats?: string[] }): Promise<Asset> {
    const response = await fetch(`${this.baseUrl}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ assetId, ...options }),
    });

    if (!response.ok) {
      throw new Error(`Optimization failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get asset usage statistics for a project
   */
  async getUsage(projectId: string): Promise<AssetUsage> {
    const response = await fetch(`${this.baseUrl}/usage?projectId=${projectId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return {
        totalAssets: 0,
        totalSize: 0,
        limitSize: 1073741824, // 1GB default
        breakdown: [],
      };
    }

    return response.json();
  }

  /**
   * Get a formatted size string
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }

  /**
   * Detect asset type from file
   */
  detectType(file: File): AssetType {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('font/') || file.name.match(/\.(woff2?|ttf|otf|eot)$/i)) return 'font';
    return 'file';
  }
}

export const assetService = new AssetService();
export default assetService;
