import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import { FileNode, OpenFile, Project, Workspace, RecentProject } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { filesApiService } from '../services/filesApi';

// ============================================================================
// Types
// ============================================================================

interface FileProjectManagerProps {
  className?: string;
  onFileSelect?: (file: FileNode) => void;
}

interface FileTreeNode extends FileNode {
  level: number;
  isExpanded?: boolean;
  isSelected?: boolean;
  isRenaming?: boolean;
  isCut?: boolean;
  isCopied?: boolean;
}

interface DragItem {
  type: 'file' | 'folder';
  id: string;
  path: string;
  name: string;
}

// ============================================================================
// File Icons Configuration
// ============================================================================

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  // Languages
  ts: { icon: 'TS', color: '#3178c6' },
  tsx: { icon: '⚛', color: '#61dafb' },
  js: { icon: 'JS', color: '#f7df1e' },
  jsx: { icon: '⚛', color: '#61dafb' },
  py: { icon: '🐍', color: '#3776ab' },
  rb: { icon: '💎', color: '#cc342d' },
  go: { icon: 'Go', color: '#00add8' },
  rs: { icon: '🦀', color: '#dea584' },
  java: { icon: '☕', color: '#007396' },
  cpp: { icon: 'C++', color: '#00599c' },
  c: { icon: 'C', color: '#a8b9cc' },
  cs: { icon: 'C#', color: '#239120' },
  php: { icon: '🐘', color: '#777bb4' },
  swift: { icon: '🐦', color: '#fa7343' },
  kt: { icon: 'K', color: '#7f52ff' },
  
  // Web
  html: { icon: '<>', color: '#e44d26' },
  htm: { icon: '<>', color: '#e44d26' },
  css: { icon: '#', color: '#1572b6' },
  scss: { icon: 'S', color: '#cc6699' },
  sass: { icon: 'S', color: '#cc6699' },
  less: { icon: 'L', color: '#1d365d' },
  vue: { icon: 'V', color: '#4fc08d' },
  svelte: { icon: 'S', color: '#ff3e00' },
  
  // Data
  json: { icon: '{}', color: '#fbc02d' },
  yaml: { icon: 'Y', color: '#f44336' },
  yml: { icon: 'Y', color: '#f44336' },
  xml: { icon: 'X', color: '#ff6600' },
  csv: { icon: '📊', color: '#217346' },
  sql: { icon: 'DB', color: '#336791' },
  
  // Config
  md: { icon: 'M↓', color: '#42a5f5' },
  mdx: { icon: 'M↓', color: '#42a5f5' },
  txt: { icon: '📄', color: '#90a4ae' },
  env: { icon: '🔐', color: '#ffc107' },
  gitignore: { icon: '', color: '#f54d27' },
  
  // Images
  png: { icon: '🖼', color: '#26a69a' },
  jpg: { icon: '🖼', color: '#26a69a' },
  jpeg: { icon: '🖼', color: '#26a69a' },
  gif: { icon: '🖼', color: '#26a69a' },
  svg: { icon: '◇', color: '#ffb13b' },
  ico: { icon: '🖼', color: '#26a69a' },
  webp: { icon: '🖼', color: '#26a69a' },
  
  // Documents
  pdf: { icon: '📕', color: '#ff0000' },
  doc: { icon: '📘', color: '#2b579a' },
  docx: { icon: '📘', color: '#2b579a' },
  xls: { icon: '📗', color: '#217346' },
  xlsx: { icon: '📗', color: '#217346' },
  ppt: { icon: '📙', color: '#d24726' },
  pptx: { icon: '📙', color: '#d24726' },
  
  // Package/Build
  lock: { icon: '🔒', color: '#78909c' },
  prisma: { icon: '◭', color: '#2d3748' },
  dockerfile: { icon: '🐳', color: '#2496ed' },
};

const FOLDER_ICONS: Record<string, { icon: string; color: string }> = {
  src: { icon: '📁', color: '#42a5f5' },
  source: { icon: '📁', color: '#42a5f5' },
  components: { icon: '🧩', color: '#ab47bc' },
  component: { icon: '🧩', color: '#ab47bc' },
  pages: { icon: '📄', color: '#66bb6a' },
  views: { icon: '👁', color: '#66bb6a' },
  node_modules: { icon: '📦', color: '#8bc34a' },
  public: { icon: '🌐', color: '#26a69a' },
  static: { icon: '🌐', color: '#26a69a' },
  assets: { icon: '🎨', color: '#26a69a' },
  images: { icon: '🖼', color: '#26a69a' },
  server: { icon: '🖥', color: '#ff7043' },
  api: { icon: '⚡', color: '#ff7043' },
  backend: { icon: '🖥', color: '#ff7043' },
  config: { icon: '⚙', color: '#78909c' },
  '.vscode': { icon: '⚙', color: '#007acc' },
  '.git': { icon: '', color: '#f54d27' },
  services: { icon: '🔧', color: '#42a5f5' },
  utils: { icon: '🛠', color: '#42a5f5' },
  lib: { icon: '📚', color: '#42a5f5' },
  helpers: { icon: '🤝', color: '#42a5f5' },
  hooks: { icon: '🪝', color: '#61dafb' },
  store: { icon: '💾', color: '#764abc' },
  redux: { icon: '🔮', color: '#764abc' },
  styles: { icon: '🎨', color: '#cc6699' },
  css: { icon: '#', color: '#1572b6' },
  types: { icon: 'T', color: '#3178c6' },
  interfaces: { icon: 'I', color: '#3178c6' },
  models: { icon: '📋', color: '#ffc107' },
  test: { icon: '🧪', color: '#15c213' },
  tests: { icon: '🧪', color: '#15c213' },
  '__tests__': { icon: '🧪', color: '#15c213' },
  spec: { icon: '🧪', color: '#15c213' },
  docs: { icon: '📖', color: '#42a5f5' },
  documentation: { icon: '📖', color: '#42a5f5' },
  prisma: { icon: '◭', color: '#2d3748' },
  database: { icon: '🗃', color: '#336791' },
  db: { icon: '🗃', color: '#336791' },
  migrations: { icon: '🔄', color: '#336791' },
  dist: { icon: '📦', color: '#78909c' },
  build: { icon: '🏗', color: '#78909c' },
  out: { icon: '📤', color: '#78909c' },
  '.next': { icon: '▲', color: '#000000' },
  '.nuxt': { icon: 'N', color: '#00dc82' },
};

// ============================================================================
// Helper Functions
// ============================================================================

const getFileIcon = (name: string): { icon: string; color: string } => {
  const lowerName = name.toLowerCase();
  
  // Special files
  if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile.')) {
    return { icon: '🐳', color: '#2496ed' };
  }
  if (lowerName === '.gitignore') return { icon: '', color: '#f54d27' };
  if (lowerName === '.env' || lowerName.startsWith('.env.')) return { icon: '🔐', color: '#ffc107' };
  if (lowerName.includes('package.json')) return { icon: '📦', color: '#cb3837' };
  if (lowerName.includes('tsconfig')) return { icon: 'TS', color: '#3178c6' };
  if (lowerName.includes('webpack')) return { icon: '📦', color: '#8dd6f9' };
  if (lowerName.includes('vite')) return { icon: '⚡', color: '#646cff' };
  if (lowerName.includes('eslint')) return { icon: '✓', color: '#4b32c3' };
  if (lowerName.includes('prettier')) return { icon: '✨', color: '#f7b93e' };
  if (lowerName.includes('readme')) return { icon: '📖', color: '#42a5f5' };
  if (lowerName.includes('license')) return { icon: '📜', color: '#ffc107' };
  
  const ext = lowerName.split('.').pop() || '';
  return FILE_ICONS[ext] || { icon: '📄', color: '#90a4ae' };
};

const getFolderIcon = (name: string, isOpen: boolean): { icon: string; color: string } => {
  const lowerName = name.toLowerCase();
  const config = FOLDER_ICONS[lowerName];
  
  if (config) {
    return config;
  }
  
  return isOpen 
    ? { icon: '📂', color: '#ffca28' }
    : { icon: '📁', color: '#90a4ae' };
};

// ============================================================================
// Main Component
// ============================================================================

export const FileProjectManager: React.FC<FileProjectManagerProps> = ({
  className = '',
  onFileSelect,
}) => {
  const {
    files,
    openFile,
    activeFileId,
    theme,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    moveNode,
    copyNode,
    projects,
    currentProject,
    setCurrentProject,
    setFiles,
    workspaces,
    recentProjects,
    addRecentProject,
  } = useStore();

  // State
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; type: 'file' | 'folder' } | null>(null);
  const [clipboard, setClipboard] = useState<{ paths: string[]; operation: 'copy' | 'cut' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'explorer' | 'open' | 'recent' | 'workspaces'>('explorer');
  const [showNewItemInput, setShowNewItemInput] = useState<{ type: 'file' | 'folder'; parentPath: string } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newItemInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // ============================================================================
  // Sync Files from Server
  // ============================================================================

  const syncFilesFromServer = useCallback(async () => {
    if (!currentProject?.id || isSyncing) return;
    
    setIsSyncing(true);
    try {
      console.log('[FileManager] Syncing files from server for project:', currentProject.id);
      const projectData = await filesApiService.syncProjectFromDisk(currentProject.id);
      
      if (projectData?.files) {
        // Convert backend file format to FileNode format
        const convertedFiles: FileNode[] = projectData.files.map((f: any) => ({
          id: f.id,
          name: f.name,
          path: f.path,
          type: f.type === 'FOLDER' ? 'folder' : 'file',
          content: f.content || '',
          language: f.language || 'plaintext',
          children: [],
        }));
        
        // Build tree structure from flat list
        const fileTree = buildFileTree(convertedFiles);
        setFiles(fileTree);
        console.log('[FileManager] Synced', convertedFiles.length, 'files from server');
      }
    } catch (error) {
      console.error('[FileManager] Failed to sync files:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [currentProject?.id, isSyncing, setFiles]);

  // Build a tree structure from a flat list of files
  const buildFileTree = (flatFiles: FileNode[]): FileNode[] => {
    const root: FileNode[] = [];
    const pathMap = new Map<string, FileNode>();
    
    // Sort by path depth (shorter paths first)
    const sorted = [...flatFiles].sort((a, b) => 
      (a.path.match(/\//g) || []).length - (b.path.match(/\//g) || []).length
    );
    
    for (const file of sorted) {
      const pathParts = file.path.split('/').filter(p => p);
      const parentPath = '/' + pathParts.slice(0, -1).join('/');
      
      // Create file node with children array
      const node: FileNode = { ...file, children: file.type === 'folder' ? [] : undefined };
      pathMap.set(file.path, node);
      
      if (parentPath === '/' || parentPath === '') {
        root.push(node);
      } else {
        const parent = pathMap.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(node);
        } else {
          // Parent not found, add to root
          root.push(node);
        }
      }
    }
    
    return root;
  };

  // ============================================================================
  // Flatten Files for Display
  // ============================================================================

  const flattenedFiles = useMemo(() => {
    const result: FileTreeNode[] = [];
    
    const traverse = (nodes: FileNode[], level: number, parentPath: string) => {
      // Sort: folders first, then files, alphabetically
      const sorted = [...nodes].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      for (const node of sorted) {
        const isExpanded = expandedFolders.has(node.path);
        const isSelected = selectedPaths.has(node.path);
        const isCut = clipboard?.operation === 'cut' && clipboard.paths.includes(node.path);
        const isCopied = clipboard?.operation === 'copy' && clipboard.paths.includes(node.path);
        
        // Apply search filter
        if (searchQuery) {
          const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
          const hasMatchingChildren = node.type === 'folder' && node.children?.some(
            child => child.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (!matchesSearch && !hasMatchingChildren) continue;
        }
        
        result.push({
          ...node,
          level,
          isExpanded,
          isSelected,
          isRenaming: renamingPath === node.path,
          isCut,
          isCopied,
        });

        if (node.type === 'folder' && isExpanded && node.children) {
          traverse(node.children, level + 1, node.path);
        }
      }
    };

    traverse(files, 0, '/');
    return result;
  }, [files, expandedFolders, selectedPaths, searchQuery, renamingPath, clipboard]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((path: string, event: React.MouseEvent) => {
    setFocusedPath(path);
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      setSelectedPaths(prev => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });
    } else if (event.shiftKey && focusedPath) {
      // Range select
      const startIdx = flattenedFiles.findIndex(f => f.path === focusedPath);
      const endIdx = flattenedFiles.findIndex(f => f.path === path);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangePaths = flattenedFiles.slice(from, to + 1).map(f => f.path);
        setSelectedPaths(new Set(rangePaths));
      }
    } else {
      setSelectedPaths(new Set([path]));
      
      // Single click on a file - open it in editor and set as active
      const node = flattenedFiles.find(f => f.path === path);
      if (node && node.type === 'file') {
        const fileData: OpenFile = {
          id: node.id,
          name: node.name,
          path: node.path,
          content: node.content || '',
          language: node.language || 'plaintext',
          isDirty: false,
        };
        openFile(fileData);
        onFileSelect?.(node);
      }
    }
  }, [focusedPath, flattenedFiles, openFile, onFileSelect]);

  const handleDoubleClick = useCallback((node: FileTreeNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.path);
    } else {
      const fileData: OpenFile = {
        id: node.id,
        name: node.name,
        path: node.path,
        content: node.content || '',
        language: node.language || 'plaintext',
        isDirty: false,
      };
      openFile(fileData);
      onFileSelect?.(node);
    }
  }, [toggleFolder, openFile, onFileSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path: node.path,
      type: node.type,
    });
    if (!selectedPaths.has(node.path)) {
      setSelectedPaths(new Set([node.path]));
    }
  }, [selectedPaths]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // File Operations
  const handleNewFile = useCallback((parentPath: string) => {
    setShowNewItemInput({ type: 'file', parentPath });
    setNewItemName('');
    setContextMenu(null);
    setExpandedFolders(prev => new Set(prev).add(parentPath));
  }, []);

  const handleNewFolder = useCallback((parentPath: string) => {
    setShowNewItemInput({ type: 'folder', parentPath });
    setNewItemName('');
    setContextMenu(null);
    setExpandedFolders(prev => new Set(prev).add(parentPath));
  }, []);

  const handleCreateNewItem = useCallback(() => {
    if (!showNewItemInput || !newItemName.trim()) return;
    
    if (showNewItemInput.type === 'file') {
      createFile(showNewItemInput.parentPath, newItemName.trim());
    } else {
      createFolder(showNewItemInput.parentPath, newItemName.trim());
    }
    
    setShowNewItemInput(null);
    setNewItemName('');
  }, [showNewItemInput, newItemName, createFile, createFolder]);

  const handleDelete = useCallback(() => {
    const pathsToDelete = Array.from(selectedPaths);
    if (pathsToDelete.length === 0) return;
    
    const message = pathsToDelete.length === 1
      ? `Delete "${pathsToDelete[0].split('/').pop()}"?`
      : `Delete ${pathsToDelete.length} items?`;
    
    if (confirm(message)) {
      pathsToDelete.forEach(path => deleteNode(path));
      setSelectedPaths(new Set());
    }
    setContextMenu(null);
  }, [selectedPaths, deleteNode]);

  const handleRename = useCallback((path: string) => {
    setRenamingPath(path);
    const name = path.split('/').pop() || '';
    setRenameValue(name);
    setContextMenu(null);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null);
      return;
    }
    
    const currentName = renamingPath.split('/').pop();
    if (renameValue.trim() !== currentName) {
      renameNode(renamingPath, renameValue.trim());
    }
    
    setRenamingPath(null);
    setRenameValue('');
  }, [renamingPath, renameValue, renameNode]);

  const handleCopy = useCallback(() => {
    setClipboard({
      paths: Array.from(selectedPaths),
      operation: 'copy',
    });
    setContextMenu(null);
  }, [selectedPaths]);

  const handleCut = useCallback(() => {
    setClipboard({
      paths: Array.from(selectedPaths),
      operation: 'cut',
    });
    setContextMenu(null);
  }, [selectedPaths]);

  const handlePaste = useCallback((targetPath: string) => {
    if (!clipboard) return;
    
    clipboard.paths.forEach(sourcePath => {
      if (clipboard.operation === 'copy') {
        copyNode(sourcePath, targetPath);
      } else {
        moveNode(sourcePath, targetPath);
      }
    });
    
    if (clipboard.operation === 'cut') {
      setClipboard(null);
    }
    setContextMenu(null);
  }, [clipboard, copyNode, moveNode]);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const expandAll = useCallback(() => {
    const allFolderPaths = new Set<string>();
    const collectFolders = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'folder') {
          allFolderPaths.add(node.path);
          if (node.children) collectFolders(node.children);
        }
      });
    };
    collectFolders(files);
    setExpandedFolders(allFolderPaths);
  }, [files]);

  // ============================================================================
  // Drag and Drop
  // ============================================================================

  const handleDragStart = useCallback((e: React.DragEvent, node: FileTreeNode) => {
    setDraggedItem({
      type: node.type,
      id: node.id,
      path: node.path,
      name: node.name,
    });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.path);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) return;
    if (draggedItem.path === targetPath) return;
    if (targetPath.startsWith(draggedItem.path + '/')) return; // Can't drop parent into child
    
    setDropTarget(targetPath);
    e.dataTransfer.dropEffect = 'move';
  }, [draggedItem]);

  const handleDrop = useCallback((e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) return;
    if (draggedItem.path === targetPath) return;
    
    moveNode(draggedItem.path, targetPath);
    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, moveNode]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDropTarget(null);
  }, []);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      // Delete
      if (e.key === 'Delete' && selectedPaths.size > 0) {
        e.preventDefault();
        handleDelete();
      }
      
      // Rename (F2)
      if (e.key === 'F2' && selectedPaths.size === 1) {
        e.preventDefault();
        handleRename(Array.from(selectedPaths)[0]);
      }
      
      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedPaths.size > 0) {
        e.preventDefault();
        handleCopy();
      }
      
      // Cut (Ctrl+X)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedPaths.size > 0) {
        e.preventDefault();
        handleCut();
      }
      
      // Paste (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard && focusedPath) {
        e.preventDefault();
        const targetNode = flattenedFiles.find(f => f.path === focusedPath);
        if (targetNode) {
          const targetPath = targetNode.type === 'folder' ? targetNode.path : targetNode.path.replace(`/${targetNode.name}`, '');
          handlePaste(targetPath);
        }
      }
      
      // Search (Ctrl+F)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      
      // Escape
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
        setRenamingPath(null);
        setShowNewItemInput(null);
      }
      
      // Enter on focused item
      if (e.key === 'Enter' && focusedPath) {
        const node = flattenedFiles.find(f => f.path === focusedPath);
        if (node) {
          handleDoubleClick(node);
        }
      }
      
      // Arrow navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = flattenedFiles.findIndex(f => f.path === focusedPath);
        const nextIdx = e.key === 'ArrowDown' 
          ? Math.min(currentIdx + 1, flattenedFiles.length - 1)
          : Math.max(currentIdx - 1, 0);
        
        if (flattenedFiles[nextIdx]) {
          setFocusedPath(flattenedFiles[nextIdx].path);
          if (!e.shiftKey) {
            setSelectedPaths(new Set([flattenedFiles[nextIdx].path]));
          }
        }
      }
      
      // Arrow left/right for expand/collapse
      if (e.key === 'ArrowLeft' && focusedPath) {
        const node = flattenedFiles.find(f => f.path === focusedPath);
        if (node?.type === 'folder' && expandedFolders.has(node.path)) {
          toggleFolder(node.path);
        }
      }
      if (e.key === 'ArrowRight' && focusedPath) {
        const node = flattenedFiles.find(f => f.path === focusedPath);
        if (node?.type === 'folder' && !expandedFolders.has(node.path)) {
          toggleFolder(node.path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPaths, focusedPath, clipboard, flattenedFiles, expandedFolders]);

  // Focus input when renaming
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingPath]);

  // Focus input for new item
  useEffect(() => {
    if (showNewItemInput && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [showNewItemInput]);

  // Close context menu on outside click
  useEffect(() => {
    if (contextMenu) {
      const handler = () => closeContextMenu();
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [contextMenu, closeContextMenu]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderFileNode = (node: FileTreeNode) => {
    const iconInfo = node.type === 'folder' 
      ? getFolderIcon(node.name, node.isExpanded || false)
      : getFileIcon(node.name);
    
    const isDropTarget = dropTarget === node.path;
    const isFocused = focusedPath === node.path;
    
    return (
      <div
        key={node.id}
        className={`
          flex items-center h-[22px] cursor-pointer select-none group transition-colors
          ${node.isSelected ? (isDark ? 'bg-vscode-listActive' : 'bg-blue-100') : ''}
          ${isFocused && !node.isSelected ? (isDark ? 'bg-vscode-listHover' : 'bg-gray-100') : ''}
          ${isDropTarget ? (isDark ? 'bg-blue-500/30' : 'bg-blue-200') : ''}
          ${node.isCut ? 'opacity-50' : ''}
          ${isDark ? 'hover:bg-vscode-listHover' : 'hover:bg-gray-50'}
        `}
        style={{ paddingLeft: `${node.level * 12 + 4}px` }}
        onClick={(e) => handleSelect(node.path, e)}
        onDoubleClick={() => handleDoubleClick(node)}
        onContextMenu={(e) => handleContextMenu(e, node)}
        draggable
        onDragStart={(e) => handleDragStart(e, node)}
        onDragOver={(e) => node.type === 'folder' && handleDragOver(e, node.path)}
        onDrop={(e) => node.type === 'folder' && handleDrop(e, node.path)}
        onDragEnd={handleDragEnd}
      >
        {/* Expand/Collapse Icon */}
        <span 
          className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${node.type === 'folder' ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            if (node.type === 'folder') {
              e.stopPropagation();
              toggleFolder(node.path);
            }
          }}
        >
          {node.type === 'folder' && (
            <svg 
              className={`w-3 h-3 transition-transform ${node.isExpanded ? 'rotate-90' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          )}
        </span>

        {/* Icon */}
        <span 
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center mr-1 text-[10px] font-bold"
          style={{ color: iconInfo.color }}
        >
          {iconInfo.icon}
        </span>

        {/* Name */}
        {node.isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') {
                setRenamingPath(null);
                setRenameValue('');
              }
            }}
            className={`flex-1 text-xs px-1 outline-none rounded ${
              isDark 
                ? 'bg-vscode-input text-white border border-vscode-inputBorder' 
                : 'bg-white text-gray-900 border border-blue-500'
            }`}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-xs truncate ${isDark ? 'text-vscode-text' : 'text-gray-700'}`}>
            {node.name}
          </span>
        )}

        {/* Badge for copied/modified */}
        {node.isCopied && (
          <span className={`text-[9px] px-1 mr-1 rounded ${isDark ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-600'}`}>
            Copied
          </span>
        )}
      </div>
    );
  };

  // ============================================================================
  // Theme Classes
  // ============================================================================

  const bgColor = isDark ? 'bg-vscode-sidebar' : 'bg-white';
  const borderColor = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textColor = isDark ? 'text-vscode-text' : 'text-gray-700';
  const textMuted = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100';
  const headerBg = isDark ? 'bg-vscode-bg' : 'bg-gray-50';

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col h-full ${bgColor} ${className}`}
      tabIndex={0}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${headerBg} border-b ${borderColor}`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handleNewFile('/')}
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            title="New File"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => handleNewFolder('/')}
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            title="New Folder"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 rounded ${showSearch ? (isDark ? 'bg-vscode-accent' : 'bg-blue-500') + ' text-white' : textMuted + ' ' + hoverBg}`}
            title="Search Files (Ctrl+F)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={syncFilesFromServer}
            disabled={isSyncing || !currentProject?.id}
            className={`p-1 rounded ${textMuted} ${hoverBg} ${isSyncing ? 'animate-spin' : ''} ${!currentProject?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Refresh from Server (Sync terminal changes)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={collapseAll}
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            title="Collapse All"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-2 py-2 border-b ${borderColor} overflow-hidden`}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className={`w-full px-2 py-1 text-xs rounded border ${
                isDark 
                  ? 'bg-vscode-input border-vscode-inputBorder text-white placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:border-vscode-accent`}
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className={`flex border-b ${borderColor}`}>
        {(['explorer', 'open', 'recent', 'workspaces'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-[10px] uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? `${isDark ? 'bg-vscode-bg text-white' : 'bg-white text-gray-900'} border-b-2 border-vscode-accent`
                : `${textMuted} ${hoverBg}`
            }`}
          >
            {tab === 'open' ? 'Open' : tab === 'recent' ? 'Recent' : tab === 'workspaces' ? 'Spaces' : 'Files'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'explorer' && (
          <>
            {/* Project Name */}
            {currentProject && (
              <div className={`flex items-center gap-2 px-3 py-2 ${headerBg} border-b ${borderColor}`}>
                <span className="text-lg">📁</span>
                <span className={`text-xs font-medium ${textColor}`}>{currentProject.name}</span>
                <span className={`text-[10px] ${textMuted}`}>({files.length} items)</span>
              </div>
            )}

            {/* File Tree */}
            <div className="py-1">
              {flattenedFiles.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-8 ${textMuted}`}>
                  <span className="text-3xl mb-2">📂</span>
                  <span className="text-xs">No files found</span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`mt-2 text-xs ${isDark ? 'text-vscode-accent' : 'text-blue-500'}`}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {flattenedFiles.map(renderFileNode)}
                  
                  {/* New Item Input */}
                  {showNewItemInput && (
                    <div 
                      className="flex items-center h-[22px] px-2"
                      style={{ paddingLeft: '16px' }}
                    >
                      <span className="w-4 h-4 flex items-center justify-center mr-1 text-[10px]">
                        {showNewItemInput.type === 'folder' ? '📁' : '📄'}
                      </span>
                      <input
                        ref={newItemInputRef}
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onBlur={handleCreateNewItem}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateNewItem();
                          if (e.key === 'Escape') {
                            setShowNewItemInput(null);
                            setNewItemName('');
                          }
                        }}
                        placeholder={showNewItemInput.type === 'folder' ? 'Folder name...' : 'File name...'}
                        className={`flex-1 text-xs px-1 outline-none rounded ${
                          isDark 
                            ? 'bg-vscode-input text-white border border-vscode-inputBorder' 
                            : 'bg-white text-gray-900 border border-blue-500'
                        }`}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'open' && (
          <OpenFilesTab isDark={isDark} textColor={textColor} textMuted={textMuted} hoverBg={hoverBg} />
        )}

        {activeTab === 'recent' && (
          <RecentProjectsTab isDark={isDark} textColor={textColor} textMuted={textMuted} hoverBg={hoverBg} />
        )}

        {activeTab === 'workspaces' && (
          <WorkspacesTab isDark={isDark} textColor={textColor} textMuted={textMuted} hoverBg={hoverBg} />
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenuPortal
            x={contextMenu.x}
            y={contextMenu.y}
            isDark={isDark}
            onClose={closeContextMenu}
          >
            {contextMenu.type === 'folder' && (
              <>
                <ContextMenuItem icon="📄" label="New File" onClick={() => handleNewFile(contextMenu.path)} />
                <ContextMenuItem icon="📁" label="New Folder" onClick={() => handleNewFolder(contextMenu.path)} />
                <ContextMenuDivider />
              </>
            )}
            <ContextMenuItem icon="✂️" label="Cut" shortcut="Ctrl+X" onClick={handleCut} />
            <ContextMenuItem icon="📋" label="Copy" shortcut="Ctrl+C" onClick={handleCopy} />
            {clipboard && contextMenu.type === 'folder' && (
              <ContextMenuItem icon="📥" label="Paste" shortcut="Ctrl+V" onClick={() => handlePaste(contextMenu.path)} />
            )}
            <ContextMenuDivider />
            <ContextMenuItem icon="✏️" label="Rename" shortcut="F2" onClick={() => handleRename(contextMenu.path)} />
            <ContextMenuItem icon="🗑️" label="Delete" shortcut="Del" onClick={handleDelete} danger />
          </ContextMenuPortal>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

const OpenFilesTab: React.FC<{
  isDark: boolean;
  textColor: string;
  textMuted: string;
  hoverBg: string;
}> = ({ isDark, textColor, textMuted, hoverBg }) => {
  const { openFiles, activeFileId, setActiveFile, closeFile } = useStore();

  if (openFiles.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${textMuted}`}>
        <span className="text-3xl mb-2">📝</span>
        <span className="text-xs">No files open</span>
      </div>
    );
  }

  return (
    <div className="py-1">
      {openFiles.map((file) => (
        <div
          key={file.id}
          className={`flex items-center justify-between px-3 py-1.5 cursor-pointer group ${
            activeFileId === file.id ? (isDark ? 'bg-vscode-listActive' : 'bg-blue-100') : hoverBg
          }`}
          onClick={() => setActiveFile(file.id)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs">{getFileIcon(file.name).icon}</span>
            <span className={`text-xs truncate ${file.isDirty ? 'italic' : ''} ${textColor}`}>
              {file.name}
              {file.isDirty && <span className={`ml-1 ${textMuted}`}>●</span>}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeFile(file.id);
            }}
            className={`p-0.5 rounded opacity-0 group-hover:opacity-100 ${hoverBg}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

const RecentProjectsTab: React.FC<{
  isDark: boolean;
  textColor: string;
  textMuted: string;
  hoverBg: string;
}> = ({ isDark, textColor, textMuted, hoverBg }) => {
  const { projects, setCurrentProject, setFiles, clearRecentProjects } = useStore();
  
  const recentProjects = useMemo(() => 
    [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10),
    [projects]
  );

  if (recentProjects.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${textMuted}`}>
        <span className="text-3xl mb-2">🕐</span>
        <span className="text-xs">No recent projects</span>
      </div>
    );
  }

  return (
    <div className="py-1">
      <div className="flex items-center justify-between px-3 py-1 mb-1">
        <span className={`text-[10px] uppercase tracking-wide ${textMuted}`}>Recent Projects</span>
        <button
          onClick={clearRecentProjects}
          className={`text-[10px] ${textMuted} hover:underline`}
        >
          Clear
        </button>
      </div>
      {recentProjects.map((project) => (
        <div
          key={project.id}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${hoverBg}`}
          onClick={() => {
            setCurrentProject(project);
            setFiles(project.files);
          }}
        >
          <span className="text-lg">📂</span>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-medium truncate ${textColor}`}>{project.name}</div>
            <div className={`text-[10px] ${textMuted}`}>
              {project.template} • {new Date(project.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const WorkspacesTab: React.FC<{
  isDark: boolean;
  textColor: string;
  textMuted: string;
  hoverBg: string;
}> = ({ isDark, textColor, textMuted, hoverBg }) => {
  const { workspaces, createWorkspace, setActiveWorkspace, activeWorkspaceId } = useStore();
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      createWorkspace(newName.trim());
      setNewName('');
      setShowNewInput(false);
    }
  };

  return (
    <div className="py-1">
      <div className="flex items-center justify-between px-3 py-1 mb-1">
        <span className={`text-[10px] uppercase tracking-wide ${textMuted}`}>Workspaces</span>
        <button
          onClick={() => setShowNewInput(true)}
          className={`p-1 rounded ${textMuted} ${hoverBg}`}
          title="New Workspace"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {showNewInput && (
        <div className="px-3 py-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setShowNewInput(false);
            }}
            placeholder="Workspace name..."
            className={`w-full px-2 py-1 text-xs rounded border ${
              isDark 
                ? 'bg-vscode-input border-vscode-inputBorder text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:border-vscode-accent`}
            autoFocus
          />
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-8 ${textMuted}`}>
          <span className="text-3xl mb-2">🗂️</span>
          <span className="text-xs">No workspaces</span>
          <button
            onClick={() => setShowNewInput(true)}
            className={`mt-2 text-xs ${isDark ? 'text-vscode-accent' : 'text-blue-500'}`}
          >
            Create one
          </button>
        </div>
      ) : (
        workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
              activeWorkspaceId === workspace.id ? (isDark ? 'bg-vscode-listActive' : 'bg-blue-100') : hoverBg
            }`}
            onClick={() => setActiveWorkspace(workspace.id)}
          >
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: workspace.color || '#3b82f6' }}
            />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${textColor}`}>{workspace.name}</div>
              <div className={`text-[10px] ${textMuted}`}>
                {workspace.projectIds.length} projects
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// Context Menu Components
const ContextMenuPortal: React.FC<{
  x: number;
  y: number;
  isDark: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ x, y, isDark, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }
      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className={`fixed z-[1000] py-1 rounded-md shadow-lg min-w-[160px] ${
        isDark ? 'bg-vscode-panel border border-vscode-border' : 'bg-white border border-gray-200'
      }`}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  );
};

const ContextMenuItem: React.FC<{
  icon: string;
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, shortcut, onClick, danger }) => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${
        danger ? 'text-red-500' : isDark ? 'text-vscode-text' : 'text-gray-700'
      } ${isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100'} transition-colors`}
    >
      <span className="w-4 text-center">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{shortcut}</span>
      )}
    </button>
  );
};

const ContextMenuDivider: React.FC = () => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';
  
  return <div className={`my-1 border-t ${isDark ? 'border-vscode-border' : 'border-gray-200'}`} />;
};

export default FileProjectManager;
