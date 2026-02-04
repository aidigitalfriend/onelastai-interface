/**
 * NEURAL-CHAT - Services Index
 * Centralized exports for all services
 */

// API Services
export { callBackendAPI, streamChat, extractFileText } from './apiService';
export { callGeminiAPI } from './geminiService';

// File Bridge - Comprehensive file system operations
export { 
  FileBridge, 
  getFileBridge, 
  createFileBridge, 
  resetFileBridge 
} from './fileBridge';
export type { 
  FileNode, 
  FileMetadata, 
  ImageInfo, 
  ProgressCallback, 
  ApprovalRequest, 
  FileBridgeAPI 
} from './fileBridge';

// File Bridge Hook
export { useFileBridge } from './useFileBridge';
export type { UseFileBridgeOptions, UseFileBridgeReturn } from './useFileBridge';
