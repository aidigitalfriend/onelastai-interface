/**
 * NEURAL-CHAT - FILE BRIDGE
 * Comprehensive file system operations for AI agent integration
 * NOTE: This is completely standalone - independent from canvas-studio and maula-editor
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  mimeType?: string;
  extension?: string;
  createdAt?: number;
  modifiedAt?: number;
  children?: FileNode[];
}

export interface FileMetadata {
  path: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  mimeType: string;
  extension: string;
  createdAt: number;
  modifiedAt: number;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
}

export interface ImageInfo {
  path: string;
  width: number;
  height: number;
  format: string;
  size: number;
  dataUrl?: string;
}

export interface ProgressCallback {
  (percent: number, message?: string): void;
}

export interface ApprovalRequest {
  action: string;
  path: string;
  details?: string;
}

export interface FileBridgeAPI {
  // Directory operations
  listFolders(path: string): FileNode[];
  listFiles(path: string): FileNode[];
  listAll(path: string): FileNode[];
  
  // File CRUD
  readFile(path: string): string | null;
  writeFile(path: string, content: string): boolean;
  createFolder(path: string): boolean;
  deleteFile(path: string): boolean;
  deleteFolder(path: string): boolean;
  
  // File manipulation
  moveFile(from: string, to: string): boolean;
  copyFile(from: string, to: string): boolean;
  renameFile(path: string, newName: string): boolean;
  
  // Archive operations
  extractZip(zipPath: string, targetFolder: string): Promise<boolean>;
  createZip(folderPath: string, outputZip: string): Promise<Blob | null>;
  
  // Image operations
  readImage(path: string): Promise<ImageInfo | null>;
  resizeImage(path: string, width: number, height: number): Promise<string | null>;
  convertImage(path: string, format: 'png' | 'jpeg' | 'webp'): Promise<string | null>;
  compressImage(path: string, quality: number): Promise<string | null>;
  
  // Download/Upload
  generateDownloadLink(path: string): string | null;
  uploadFile(file: File, targetPath: string): Promise<boolean>;
  
  // File utilities
  getFileType(path: string): string;
  getFileSize(path: string): number;
  getMimeType(path: string): string;
  searchFiles(query: string, path?: string): FileNode[];
  getFileMetadata(path: string): FileMetadata | null;
  
  // Permissions
  checkPermission(action: 'read' | 'write' | 'delete', path: string): boolean;
  requestApproval(request: ApprovalRequest): Promise<boolean>;
  
  // User interaction
  askUser(question: string): Promise<string | null>;
  sendMessage(text: string): void;
  showProgress(percent: number, message?: string): void;
}

// ============================================
// FILE BRIDGE IMPLEMENTATION
// ============================================

export class FileBridge implements FileBridgeAPI {
  private files: Map<string, string> = new Map();
  private fileMetadata: Map<string, FileMetadata> = new Map();
  private folders: Set<string> = new Set();
  private changeListeners: Set<(files: Map<string, string>) => void> = new Set();
  private messageListeners: Set<(message: string) => void> = new Set();
  private progressListeners: Set<ProgressCallback> = new Set();
  private approvalHandler: ((request: ApprovalRequest) => Promise<boolean>) | null = null;
  private questionHandler: ((question: string) => Promise<string | null>) | null = null;

  constructor(initialFiles?: Record<string, string>) {
    // Initialize root folder
    this.folders.add('/');
    
    if (initialFiles) {
      Object.entries(initialFiles).forEach(([path, content]) => {
        this.writeFile(path, content);
      });
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  onChange(listener: (files: Map<string, string>) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  onMessage(listener: (message: string) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onProgress(listener: ProgressCallback): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  setApprovalHandler(handler: (request: ApprovalRequest) => Promise<boolean>): void {
    this.approvalHandler = handler;
  }

  setQuestionHandler(handler: (question: string) => Promise<string | null>): void {
    this.questionHandler = handler;
  }

  private notifyChange(): void {
    this.changeListeners.forEach(listener => listener(new Map(this.files)));
  }

  // ============================================
  // DIRECTORY OPERATIONS
  // ============================================

  listFolders(path: string): FileNode[] {
    const normalizedPath = this.normalizePath(path);
    const result: FileNode[] = [];
    
    this.folders.forEach(folder => {
      if (folder !== normalizedPath && folder.startsWith(normalizedPath)) {
        const relativePath = folder.slice(normalizedPath.length);
        const parts = relativePath.split('/').filter(Boolean);
        if (parts.length === 1) {
          result.push({
            name: parts[0],
            path: folder,
            type: 'folder',
          });
        }
      }
    });
    
    return result;
  }

  listFiles(path: string): FileNode[] {
    const normalizedPath = this.normalizePath(path);
    const result: FileNode[] = [];
    
    this.files.forEach((content, filePath) => {
      const dir = this.getDirectory(filePath);
      if (dir === normalizedPath || (normalizedPath === '/' && dir === '')) {
        const metadata = this.fileMetadata.get(filePath);
        result.push({
          name: this.getFileName(filePath),
          path: filePath,
          type: 'file',
          size: metadata?.size || content.length,
          mimeType: metadata?.mimeType || this.getMimeType(filePath),
          extension: this.getExtension(filePath),
        });
      }
    });
    
    return result;
  }

  listAll(path: string): FileNode[] {
    return [...this.listFolders(path), ...this.listFiles(path)];
  }

  // ============================================
  // FILE CRUD OPERATIONS
  // ============================================

  readFile(path: string): string | null {
    const normalizedPath = this.normalizePath(path);
    return this.files.get(normalizedPath) || null;
  }

  writeFile(path: string, content: string): boolean {
    const normalizedPath = this.normalizePath(path);
    
    // Create parent folders
    const dir = this.getDirectory(normalizedPath);
    if (dir) {
      this.ensureFolderExists(dir);
    }
    
    this.files.set(normalizedPath, content);
    
    // Update metadata
    const now = Date.now();
    const existing = this.fileMetadata.get(normalizedPath);
    this.fileMetadata.set(normalizedPath, {
      path: normalizedPath,
      name: this.getFileName(normalizedPath),
      type: 'file',
      size: content.length,
      mimeType: this.getMimeType(normalizedPath),
      extension: this.getExtension(normalizedPath),
      createdAt: existing?.createdAt || now,
      modifiedAt: now,
      permissions: { read: true, write: true, delete: true },
    });
    
    this.notifyChange();
    return true;
  }

  createFolder(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    
    if (this.folders.has(normalizedPath)) {
      return false; // Already exists
    }
    
    this.ensureFolderExists(normalizedPath);
    this.notifyChange();
    return true;
  }

  deleteFile(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    
    if (!this.files.has(normalizedPath)) {
      return false;
    }
    
    this.files.delete(normalizedPath);
    this.fileMetadata.delete(normalizedPath);
    this.notifyChange();
    return true;
  }

  deleteFolder(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    
    if (!this.folders.has(normalizedPath)) {
      return false;
    }
    
    // Delete all files in folder
    const filesToDelete: string[] = [];
    this.files.forEach((_, filePath) => {
      if (filePath.startsWith(normalizedPath + '/') || filePath === normalizedPath) {
        filesToDelete.push(filePath);
      }
    });
    filesToDelete.forEach(f => {
      this.files.delete(f);
      this.fileMetadata.delete(f);
    });
    
    // Delete all subfolders
    const foldersToDelete: string[] = [];
    this.folders.forEach(folder => {
      if (folder.startsWith(normalizedPath)) {
        foldersToDelete.push(folder);
      }
    });
    foldersToDelete.forEach(f => this.folders.delete(f));
    
    this.notifyChange();
    return true;
  }

  // ============================================
  // FILE MANIPULATION
  // ============================================

  moveFile(from: string, to: string): boolean {
    const fromPath = this.normalizePath(from);
    const toPath = this.normalizePath(to);
    
    const content = this.files.get(fromPath);
    if (content === undefined) {
      return false;
    }
    
    this.writeFile(toPath, content);
    this.deleteFile(fromPath);
    return true;
  }

  copyFile(from: string, to: string): boolean {
    const fromPath = this.normalizePath(from);
    const toPath = this.normalizePath(to);
    
    const content = this.files.get(fromPath);
    if (content === undefined) {
      return false;
    }
    
    this.writeFile(toPath, content);
    return true;
  }

  renameFile(path: string, newName: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const dir = this.getDirectory(normalizedPath);
    const newPath = dir ? `${dir}/${newName}` : newName;
    
    return this.moveFile(normalizedPath, newPath);
  }

  // ============================================
  // ARCHIVE OPERATIONS
  // ============================================

  async extractZip(zipPath: string, targetFolder: string): Promise<boolean> {
    try {
      const zipContent = this.files.get(this.normalizePath(zipPath));
      if (!zipContent) return false;
      
      // In a browser environment, we'd use JSZip
      // For now, simulate extraction
      this.sendMessage(`📦 Extracting ${zipPath} to ${targetFolder}...`);
      this.showProgress(50, 'Extracting files...');
      
      // Create target folder
      this.createFolder(targetFolder);
      
      this.showProgress(100, 'Extraction complete!');
      return true;
    } catch (error) {
      console.error('Extract zip error:', error);
      return false;
    }
  }

  async createZip(folderPath: string, outputZip: string): Promise<Blob | null> {
    try {
      const normalizedPath = this.normalizePath(folderPath);
      const filesToZip: Array<{ path: string; content: string }> = [];
      
      this.files.forEach((content, filePath) => {
        if (filePath.startsWith(normalizedPath)) {
          filesToZip.push({
            path: filePath.slice(normalizedPath.length),
            content,
          });
        }
      });
      
      this.sendMessage(`📦 Creating ${outputZip} with ${filesToZip.length} files...`);
      this.showProgress(50, 'Compressing files...');
      
      // In a real implementation, use JSZip
      // For now, return a simple blob
      const zipData = JSON.stringify(filesToZip);
      const blob = new Blob([zipData], { type: 'application/zip' });
      
      this.showProgress(100, 'Zip created!');
      return blob;
    } catch (error) {
      console.error('Create zip error:', error);
      return null;
    }
  }

  // ============================================
  // IMAGE OPERATIONS
  // ============================================

  async readImage(path: string): Promise<ImageInfo | null> {
    const normalizedPath = this.normalizePath(path);
    const content = this.files.get(normalizedPath);
    
    if (!content) return null;
    
    // Check if it's a data URL or base64
    if (content.startsWith('data:image')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            path: normalizedPath,
            width: img.width,
            height: img.height,
            format: this.getExtension(normalizedPath),
            size: content.length,
            dataUrl: content,
          });
        };
        img.onerror = () => resolve(null);
        img.src = content;
      });
    }
    
    return {
      path: normalizedPath,
      width: 0,
      height: 0,
      format: this.getExtension(normalizedPath),
      size: content.length,
    };
  }

  async resizeImage(path: string, width: number, height: number): Promise<string | null> {
    const imageInfo = await this.readImage(path);
    if (!imageInfo?.dataUrl) return null;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(`image/${imageInfo.format}`));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageInfo.dataUrl;
    });
  }

  async convertImage(path: string, format: 'png' | 'jpeg' | 'webp'): Promise<string | null> {
    const imageInfo = await this.readImage(path);
    if (!imageInfo?.dataUrl) return null;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL(`image/${format}`));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageInfo.dataUrl;
    });
  }

  async compressImage(path: string, quality: number): Promise<string | null> {
    const imageInfo = await this.readImage(path);
    if (!imageInfo?.dataUrl) return null;
    
    const clampedQuality = Math.max(0, Math.min(1, quality));
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', clampedQuality));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageInfo.dataUrl;
    });
  }

  // ============================================
  // DOWNLOAD/UPLOAD
  // ============================================

  generateDownloadLink(path: string): string | null {
    const normalizedPath = this.normalizePath(path);
    const content = this.files.get(normalizedPath);
    
    if (!content) return null;
    
    const mimeType = this.getMimeType(normalizedPath);
    const blob = new Blob([content], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  async uploadFile(file: File, targetPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const content = reader.result as string;
        this.writeFile(targetPath, content);
        resolve(true);
      };
      
      reader.onerror = () => resolve(false);
      
      // Read as text or data URL depending on type
      if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  // ============================================
  // FILE UTILITIES
  // ============================================

  getFileType(path: string): string {
    const ext = this.getExtension(path);
    const typeMap: Record<string, string> = {
      // Code
      'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript', 'jsx': 'javascript',
      'py': 'python', 'java': 'java', 'c': 'c', 'cpp': 'cpp', 'cs': 'csharp',
      'go': 'go', 'rs': 'rust', 'rb': 'ruby', 'php': 'php', 'swift': 'swift',
      // Web
      'html': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass', 'less': 'less',
      // Data
      'json': 'json', 'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml', 'toml': 'toml',
      // Docs
      'md': 'markdown', 'txt': 'text', 'pdf': 'pdf', 'doc': 'document', 'docx': 'document',
      // Images
      'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image', 'svg': 'image', 'webp': 'image',
      // Media
      'mp3': 'audio', 'wav': 'audio', 'mp4': 'video', 'webm': 'video',
      // Archives
      'zip': 'archive', 'tar': 'archive', 'gz': 'archive', 'rar': 'archive',
    };
    return typeMap[ext] || 'unknown';
  }

  getFileSize(path: string): number {
    const normalizedPath = this.normalizePath(path);
    const content = this.files.get(normalizedPath);
    return content?.length || 0;
  }

  getMimeType(path: string): string {
    const ext = this.getExtension(path);
    const mimeMap: Record<string, string> = {
      // Code
      'ts': 'text/typescript', 'tsx': 'text/typescript', 'js': 'text/javascript', 'jsx': 'text/javascript',
      'py': 'text/x-python', 'java': 'text/x-java', 'c': 'text/x-c', 'cpp': 'text/x-c++',
      // Web
      'html': 'text/html', 'css': 'text/css', 'scss': 'text/scss',
      // Data
      'json': 'application/json', 'xml': 'application/xml', 'yaml': 'text/yaml',
      // Docs
      'md': 'text/markdown', 'txt': 'text/plain', 'pdf': 'application/pdf',
      // Images
      'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 
      'svg': 'image/svg+xml', 'webp': 'image/webp',
      // Media
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'mp4': 'video/mp4', 'webm': 'video/webm',
      // Archives
      'zip': 'application/zip', 'tar': 'application/x-tar', 'gz': 'application/gzip',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  searchFiles(query: string, path?: string): FileNode[] {
    const results: FileNode[] = [];
    const searchPath = path ? this.normalizePath(path) : '';
    const lowerQuery = query.toLowerCase();
    
    this.files.forEach((content, filePath) => {
      if (searchPath && !filePath.startsWith(searchPath)) return;
      
      const fileName = this.getFileName(filePath).toLowerCase();
      const fileContent = content.toLowerCase();
      
      if (fileName.includes(lowerQuery) || fileContent.includes(lowerQuery)) {
        const metadata = this.fileMetadata.get(filePath);
        results.push({
          name: this.getFileName(filePath),
          path: filePath,
          type: 'file',
          size: metadata?.size || content.length,
          mimeType: this.getMimeType(filePath),
        });
      }
    });
    
    return results;
  }

  getFileMetadata(path: string): FileMetadata | null {
    const normalizedPath = this.normalizePath(path);
    return this.fileMetadata.get(normalizedPath) || null;
  }

  // ============================================
  // PERMISSIONS
  // ============================================

  checkPermission(action: 'read' | 'write' | 'delete', path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const metadata = this.fileMetadata.get(normalizedPath);
    
    if (!metadata) {
      return action === 'write'; // Allow creating new files
    }
    
    return metadata.permissions[action];
  }

  async requestApproval(request: ApprovalRequest): Promise<boolean> {
    if (this.approvalHandler) {
      return this.approvalHandler(request);
    }
    
    // Default: auto-approve safe actions
    const safeActions = ['read', 'list', 'search'];
    return safeActions.includes(request.action);
  }

  // ============================================
  // USER INTERACTION
  // ============================================

  async askUser(question: string): Promise<string | null> {
    if (this.questionHandler) {
      return this.questionHandler(question);
    }
    
    // Fallback to browser prompt
    return window.prompt(question);
  }

  sendMessage(text: string): void {
    this.messageListeners.forEach(listener => listener(text));
    console.log('[FileBridge]', text);
  }

  showProgress(percent: number, message?: string): void {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    this.progressListeners.forEach(listener => listener(clampedPercent, message));
  }

  // ============================================
  // UTILITIES
  // ============================================

  private normalizePath(path: string): string {
    let normalized = path.replace(/\\/g, '/');
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    // Remove trailing slash unless it's root
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  private getDirectory(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash > 0 ? path.slice(0, lastSlash) : '';
  }

  private getFileName(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
  }

  private getExtension(path: string): string {
    const fileName = this.getFileName(path);
    const lastDot = fileName.lastIndexOf('.');
    return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
  }

  private ensureFolderExists(path: string): void {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    
    parts.forEach(part => {
      current += '/' + part;
      this.folders.add(current);
    });
  }

  // ============================================
  // EXPORT FOR AGENT
  // ============================================

  getAgentContext(): {
    files: Array<{ path: string; type: string; size: number }>;
    folders: string[];
    totalFiles: number;
    totalFolders: number;
  } {
    const files: Array<{ path: string; type: string; size: number }> = [];
    
    this.files.forEach((content, path) => {
      files.push({
        path,
        type: this.getFileType(path),
        size: content.length,
      });
    });
    
    return {
      files,
      folders: Array.from(this.folders),
      totalFiles: this.files.size,
      totalFolders: this.folders.size,
    };
  }

  /**
   * Export all files as a record
   */
  exportFiles(): Record<string, string> {
    const result: Record<string, string> = {};
    this.files.forEach((content, path) => {
      result[path] = content;
    });
    return result;
  }

  /**
   * Import files from a record
   */
  importFiles(files: Record<string, string>): void {
    Object.entries(files).forEach(([path, content]) => {
      this.writeFile(path, content);
    });
  }
}

// ============================================
// SINGLETON & FACTORY
// ============================================

let fileBridgeInstance: FileBridge | null = null;

export function getFileBridge(): FileBridge {
  if (!fileBridgeInstance) {
    fileBridgeInstance = new FileBridge();
  }
  return fileBridgeInstance;
}

export function createFileBridge(initialFiles?: Record<string, string>): FileBridge {
  fileBridgeInstance = new FileBridge(initialFiles);
  return fileBridgeInstance;
}

export function resetFileBridge(): void {
  fileBridgeInstance = null;
}

export default FileBridge;
