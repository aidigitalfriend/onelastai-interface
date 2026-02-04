/**
 * NEURAL-CHAT - USE FILE BRIDGE HOOK
 * React hook for file system operations
 * NOTE: Standalone - independent from canvas-studio and maula-editor
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FileBridge, 
  FileNode, 
  FileMetadata, 
  ImageInfo, 
  ApprovalRequest,
  getFileBridge, 
  createFileBridge 
} from './fileBridge';

export interface UseFileBridgeOptions {
  initialFiles?: Record<string, string>;
  onMessage?: (message: string) => void;
  onProgress?: (percent: number, message?: string) => void;
  onApprovalRequest?: (request: ApprovalRequest) => Promise<boolean>;
  onQuestion?: (question: string) => Promise<string | null>;
}

export interface UseFileBridgeReturn {
  // State
  files: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  progress: { percent: number; message?: string } | null;
  
  // Directory operations
  listFolders: (path: string) => FileNode[];
  listFiles: (path: string) => FileNode[];
  listAll: (path: string) => FileNode[];
  
  // File CRUD
  readFile: (path: string) => string | null;
  writeFile: (path: string, content: string) => boolean;
  createFolder: (path: string) => boolean;
  deleteFile: (path: string) => boolean;
  deleteFolder: (path: string) => boolean;
  
  // File manipulation
  moveFile: (from: string, to: string) => boolean;
  copyFile: (from: string, to: string) => boolean;
  renameFile: (path: string, newName: string) => boolean;
  
  // Archive operations
  extractZip: (zipPath: string, targetFolder: string) => Promise<boolean>;
  createZip: (folderPath: string, outputZip: string) => Promise<Blob | null>;
  
  // Image operations
  readImage: (path: string) => Promise<ImageInfo | null>;
  resizeImage: (path: string, width: number, height: number) => Promise<string | null>;
  convertImage: (path: string, format: 'png' | 'jpeg' | 'webp') => Promise<string | null>;
  compressImage: (path: string, quality: number) => Promise<string | null>;
  
  // Download/Upload
  generateDownloadLink: (path: string) => string | null;
  uploadFile: (file: File, targetPath: string) => Promise<boolean>;
  
  // File utilities
  getFileType: (path: string) => string;
  getFileSize: (path: string) => number;
  getMimeType: (path: string) => string;
  searchFiles: (query: string, path?: string) => FileNode[];
  getFileMetadata: (path: string) => FileMetadata | null;
  
  // Permissions
  checkPermission: (action: 'read' | 'write' | 'delete', path: string) => boolean;
  requestApproval: (request: ApprovalRequest) => Promise<boolean>;
  
  // User interaction
  askUser: (question: string) => Promise<string | null>;
  sendMessage: (text: string) => void;
  showProgress: (percent: number, message?: string) => void;
  
  // Context for AI agent
  getAgentContext: () => {
    files: Array<{ path: string; type: string; size: number }>;
    folders: string[];
    totalFiles: number;
    totalFolders: number;
  };
  
  // Export/Import
  exportFiles: () => Record<string, string>;
  importFiles: (files: Record<string, string>) => void;
  
  // Bridge instance
  bridge: FileBridge;
}

export function useFileBridge(options: UseFileBridgeOptions = {}): UseFileBridgeReturn {
  const {
    initialFiles,
    onMessage,
    onProgress,
    onApprovalRequest,
    onQuestion,
  } = options;

  const bridgeRef = useRef<FileBridge | null>(null);
  const [files, setFiles] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; message?: string } | null>(null);

  // Initialize bridge
  useEffect(() => {
    if (!bridgeRef.current) {
      bridgeRef.current = initialFiles 
        ? createFileBridge(initialFiles)
        : getFileBridge();
    }

    const bridge = bridgeRef.current;

    // Subscribe to file changes
    const unsubscribeChange = bridge.onChange((newFiles) => {
      setFiles(new Map(newFiles));
    });

    // Subscribe to messages
    const unsubscribeMessage = bridge.onMessage((message) => {
      if (onMessage) {
        onMessage(message);
      }
    });

    // Subscribe to progress
    const unsubscribeProgress = bridge.onProgress((percent, message) => {
      setProgress({ percent, message });
      if (onProgress) {
        onProgress(percent, message);
      }
    });

    // Set approval handler
    if (onApprovalRequest) {
      bridge.setApprovalHandler(onApprovalRequest);
    }

    // Set question handler
    if (onQuestion) {
      bridge.setQuestionHandler(onQuestion);
    }

    return () => {
      unsubscribeChange();
      unsubscribeMessage();
      unsubscribeProgress();
    };
  }, [initialFiles, onMessage, onProgress, onApprovalRequest, onQuestion]);

  const getBridge = useCallback((): FileBridge => {
    if (!bridgeRef.current) {
      bridgeRef.current = getFileBridge();
    }
    return bridgeRef.current;
  }, []);

  // ============================================
  // DIRECTORY OPERATIONS
  // ============================================

  const listFolders = useCallback((path: string): FileNode[] => {
    return getBridge().listFolders(path);
  }, [getBridge]);

  const listFiles = useCallback((path: string): FileNode[] => {
    return getBridge().listFiles(path);
  }, [getBridge]);

  const listAll = useCallback((path: string): FileNode[] => {
    return getBridge().listAll(path);
  }, [getBridge]);

  // ============================================
  // FILE CRUD
  // ============================================

  const readFile = useCallback((path: string): string | null => {
    return getBridge().readFile(path);
  }, [getBridge]);

  const writeFile = useCallback((path: string, content: string): boolean => {
    try {
      return getBridge().writeFile(path, content);
    } catch (e) {
      setError(`Failed to write file: ${e}`);
      return false;
    }
  }, [getBridge]);

  const createFolder = useCallback((path: string): boolean => {
    return getBridge().createFolder(path);
  }, [getBridge]);

  const deleteFile = useCallback((path: string): boolean => {
    return getBridge().deleteFile(path);
  }, [getBridge]);

  const deleteFolder = useCallback((path: string): boolean => {
    return getBridge().deleteFolder(path);
  }, [getBridge]);

  // ============================================
  // FILE MANIPULATION
  // ============================================

  const moveFile = useCallback((from: string, to: string): boolean => {
    return getBridge().moveFile(from, to);
  }, [getBridge]);

  const copyFile = useCallback((from: string, to: string): boolean => {
    return getBridge().copyFile(from, to);
  }, [getBridge]);

  const renameFile = useCallback((path: string, newName: string): boolean => {
    return getBridge().renameFile(path, newName);
  }, [getBridge]);

  // ============================================
  // ARCHIVE OPERATIONS
  // ============================================

  const extractZip = useCallback(async (zipPath: string, targetFolder: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await getBridge().extractZip(zipPath, targetFolder);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [getBridge]);

  const createZip = useCallback(async (folderPath: string, outputZip: string): Promise<Blob | null> => {
    setIsLoading(true);
    try {
      return await getBridge().createZip(folderPath, outputZip);
    } finally {
      setIsLoading(false);
    }
  }, [getBridge]);

  // ============================================
  // IMAGE OPERATIONS
  // ============================================

  const readImage = useCallback(async (path: string): Promise<ImageInfo | null> => {
    return getBridge().readImage(path);
  }, [getBridge]);

  const resizeImage = useCallback(async (path: string, width: number, height: number): Promise<string | null> => {
    setIsLoading(true);
    try {
      return await getBridge().resizeImage(path, width, height);
    } finally {
      setIsLoading(false);
    }
  }, [getBridge]);

  const convertImage = useCallback(async (path: string, format: 'png' | 'jpeg' | 'webp'): Promise<string | null> => {
    setIsLoading(true);
    try {
      return await getBridge().convertImage(path, format);
    } finally {
      setIsLoading(false);
    }
  }, [getBridge]);

  const compressImage = useCallback(async (path: string, quality: number): Promise<string | null> => {
    setIsLoading(true);
    try {
      return await getBridge().compressImage(path, quality);
    } finally {
      setIsLoading(false);
    }
  }, [getBridge]);

  // ============================================
  // DOWNLOAD/UPLOAD
  // ============================================

  const generateDownloadLink = useCallback((path: string): string | null => {
    return getBridge().generateDownloadLink(path);
  }, [getBridge]);

  const uploadFile = useCallback(async (file: File, targetPath: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      return await getBridge().uploadFile(file, targetPath);
    } finally {
      setIsLoading(false);
    }
  }, [getBridge]);

  // ============================================
  // FILE UTILITIES
  // ============================================

  const getFileType = useCallback((path: string): string => {
    return getBridge().getFileType(path);
  }, [getBridge]);

  const getFileSize = useCallback((path: string): number => {
    return getBridge().getFileSize(path);
  }, [getBridge]);

  const getMimeType = useCallback((path: string): string => {
    return getBridge().getMimeType(path);
  }, [getBridge]);

  const searchFiles = useCallback((query: string, path?: string): FileNode[] => {
    return getBridge().searchFiles(query, path);
  }, [getBridge]);

  const getFileMetadata = useCallback((path: string): FileMetadata | null => {
    return getBridge().getFileMetadata(path);
  }, [getBridge]);

  // ============================================
  // PERMISSIONS
  // ============================================

  const checkPermission = useCallback((action: 'read' | 'write' | 'delete', path: string): boolean => {
    return getBridge().checkPermission(action, path);
  }, [getBridge]);

  const requestApproval = useCallback(async (request: ApprovalRequest): Promise<boolean> => {
    return getBridge().requestApproval(request);
  }, [getBridge]);

  // ============================================
  // USER INTERACTION
  // ============================================

  const askUser = useCallback(async (question: string): Promise<string | null> => {
    return getBridge().askUser(question);
  }, [getBridge]);

  const sendMessage = useCallback((text: string): void => {
    getBridge().sendMessage(text);
  }, [getBridge]);

  const showProgress = useCallback((percent: number, message?: string): void => {
    getBridge().showProgress(percent, message);
  }, [getBridge]);

  // ============================================
  // CONTEXT & EXPORT
  // ============================================

  const getAgentContext = useCallback(() => {
    return getBridge().getAgentContext();
  }, [getBridge]);

  const exportFiles = useCallback(() => {
    return getBridge().exportFiles();
  }, [getBridge]);

  const importFiles = useCallback((filesToImport: Record<string, string>) => {
    getBridge().importFiles(filesToImport);
  }, [getBridge]);

  return {
    // State
    files,
    isLoading,
    error,
    progress,
    
    // Directory operations
    listFolders,
    listFiles,
    listAll,
    
    // File CRUD
    readFile,
    writeFile,
    createFolder,
    deleteFile,
    deleteFolder,
    
    // File manipulation
    moveFile,
    copyFile,
    renameFile,
    
    // Archive operations
    extractZip,
    createZip,
    
    // Image operations
    readImage,
    resizeImage,
    convertImage,
    compressImage,
    
    // Download/Upload
    generateDownloadLink,
    uploadFile,
    
    // File utilities
    getFileType,
    getFileSize,
    getMimeType,
    searchFiles,
    getFileMetadata,
    
    // Permissions
    checkPermission,
    requestApproval,
    
    // User interaction
    askUser,
    sendMessage,
    showProgress,
    
    // Context & Export
    getAgentContext,
    exportFiles,
    importFiles,
    
    // Bridge instance
    bridge: getBridge(),
  };
}

export default useFileBridge;
