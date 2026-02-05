import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit3,
  FileCode,
  FileJson,
  FileText,
  Image,
  Terminal,
  Database,
  Settings,
  MoreVertical,
  X,
  Check,
  FolderPlus,
  FilePlus,
} from 'lucide-react';
import { ProjectFile } from '../types';

// ============================================================================
// FILE ICONS
// ============================================================================

const getFileIcon = (filename: string, isOpen?: boolean) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const iconProps = { size: 16, className: 'flex-shrink-0' };
  
  // Folders
  if (!ext || filename === ext) {
    return isOpen 
      ? <FolderOpen {...iconProps} className="text-yellow-400" />
      : <Folder {...iconProps} className="text-yellow-400" />;
  }
  
  // File types
  switch (ext) {
    case 'tsx':
    case 'ts':
      return <FileCode {...iconProps} className="text-blue-400" />;
    case 'jsx':
    case 'js':
      return <FileCode {...iconProps} className="text-yellow-400" />;
    case 'html':
      return <FileCode {...iconProps} className="text-orange-400" />;
    case 'css':
    case 'scss':
    case 'sass':
      return <FileCode {...iconProps} className="text-pink-400" />;
    case 'json':
      return <FileJson {...iconProps} className="text-green-400" />;
    case 'md':
    case 'txt':
      return <FileText {...iconProps} className="text-gray-400" />;
    case 'py':
      return <FileCode {...iconProps} className="text-green-400" />;
    case 'sql':
      return <Database {...iconProps} className="text-blue-400" />;
    case 'sh':
    case 'bash':
      return <Terminal {...iconProps} className="text-green-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image {...iconProps} className="text-purple-400" />;
    case 'env':
    case 'config':
      return <Settings {...iconProps} className="text-gray-500" />;
    default:
      return <File {...iconProps} className="text-gray-400" />;
  }
};

// ============================================================================
// TYPES
// ============================================================================

interface ProjectExplorerProps {
  files: ProjectFile[];
  activeFile: string | null;
  onFileSelect: (path: string) => void;
  onFileCreate: (parentPath: string, name: string, type: 'file' | 'folder') => void;
  onFileDelete: (path: string) => void;
  onFileRename: (oldPath: string, newName: string) => void;
  onFolderToggle?: (path: string) => void;
}

interface FileTreeItemProps {
  file: ProjectFile;
  depth: number;
  activeFile: string | null;
  expandedFolders: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
}

// ============================================================================
// FILE TREE ITEM COMPONENT
// ============================================================================

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  file,
  depth,
  activeFile,
  expandedFolders,
  onSelect,
  onToggle,
  onDelete,
  onRename,
  onCreateFile,
  onCreateFolder,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isFolder = file.type === 'folder';
  const isExpanded = expandedFolders.has(file.path);
  const isActive = activeFile === file.path;

  // Focus input when renaming
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      onToggle(file.path);
    } else {
      onSelect(file.path);
    }
  };

  const handleRenameSubmit = () => {
    if (newName.trim() && newName !== file.name) {
      onRename(file.path, newName.trim());
    }
    setIsRenaming(false);
    setNewName(file.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewName(file.name);
    }
  };

  return (
    <>
      <div
        className={`group flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors ${
          isActive
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'hover:bg-gray-800 text-gray-300'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse for folders */}
        {isFolder ? (
          <button className="p-0.5 hover:bg-gray-700 rounded">
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-5" /> // Spacer for alignment
        )}

        {/* File/Folder icon */}
        {getFileIcon(file.name, isFolder && isExpanded)}

        {/* Name or rename input */}
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-gray-800 border border-cyan-500 rounded px-1 py-0.5 text-xs text-white focus:outline-none"
          />
        ) : (
          <span className="flex-1 truncate text-sm">
            {file.name}
            {file.isModified && <span className="text-cyan-400 ml-1">•</span>}
          </span>
        )}

        {/* Actions menu button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded transition"
          >
            <MoreVertical size={14} className="text-gray-500" />
          </button>

          {/* Context menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 z-50 min-w-[140px]">
              {isFolder && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateFile(file.path);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <FilePlus size={14} />
                    New File
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateFolder(file.path);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <FolderPlus size={14} />
                    New Folder
                  </button>
                  <div className="border-t border-gray-700 my-1" />
                </>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
              >
                <Edit3 size={14} />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${file.name}?`)) {
                    onDelete(file.path);
                  }
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-900/30 flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Render children for expanded folders */}
      {isFolder && isExpanded && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeItem
              key={child.path}
              file={child}
              depth={depth + 1}
              activeFile={activeFile}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggle={onToggle}
              onDelete={onDelete}
              onRename={onRename}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>
      )}
    </>
  );
};

// ============================================================================
// PROJECT EXPLORER COMPONENT
// ============================================================================

const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  files,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  onFolderToggle,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'components']));
  const [showNewFileInput, setShowNewFileInput] = useState<{ parentPath: string; type: 'file' | 'folder' } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const newItemInputRef = useRef<HTMLInputElement>(null);

  // Focus new item input
  useEffect(() => {
    if (showNewFileInput && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [showNewFileInput]);

  const handleToggle = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
    onFolderToggle?.(path);
  }, [onFolderToggle]);

  const handleCreateFile = useCallback((parentPath: string) => {
    setShowNewFileInput({ parentPath, type: 'file' });
    setNewItemName('');
    // Expand parent folder
    setExpandedFolders((prev) => new Set([...prev, parentPath]));
  }, []);

  const handleCreateFolder = useCallback((parentPath: string) => {
    setShowNewFileInput({ parentPath, type: 'folder' });
    setNewItemName('');
    // Expand parent folder
    setExpandedFolders((prev) => new Set([...prev, parentPath]));
  }, []);

  const handleNewItemSubmit = () => {
    if (showNewFileInput && newItemName.trim()) {
      onFileCreate(showNewFileInput.parentPath, newItemName.trim(), showNewFileInput.type);
    }
    setShowNewFileInput(null);
    setNewItemName('');
  };

  const handleNewItemKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNewItemSubmit();
    } else if (e.key === 'Escape') {
      setShowNewFileInput(null);
      setNewItemName('');
    }
  };

  // Recursively build tree from flat files if needed
  const buildTree = (files: ProjectFile[]): ProjectFile[] => {
    // If files already have proper tree structure, return as is
    return files;
  };

  const fileTree = buildTree(files);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleCreateFile('')}
            className="p-1 hover:bg-gray-800 rounded transition"
            title="New File"
          >
            <FilePlus size={14} className="text-gray-500 hover:text-gray-300" />
          </button>
          <button
            onClick={() => handleCreateFolder('')}
            className="p-1 hover:bg-gray-800 rounded transition"
            title="New Folder"
          >
            <FolderPlus size={14} className="text-gray-500 hover:text-gray-300" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <Folder size={32} className="mx-auto mb-2 opacity-50" />
            <p>No files yet</p>
            <button
              onClick={() => handleCreateFile('')}
              className="mt-2 text-cyan-400 hover:text-cyan-300 text-xs"
            >
              Create a file →
            </button>
          </div>
        ) : (
          <>
            {/* New item input at root level */}
            {showNewFileInput && showNewFileInput.parentPath === '' && (
              <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: '8px' }}>
                <div className="w-5" />
                {showNewFileInput.type === 'folder' ? (
                  <Folder size={16} className="text-yellow-400" />
                ) : (
                  <File size={16} className="text-gray-400" />
                )}
                <input
                  ref={newItemInputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onBlur={handleNewItemSubmit}
                  onKeyDown={handleNewItemKeyDown}
                  placeholder={showNewFileInput.type === 'folder' ? 'folder name' : 'filename.ext'}
                  className="flex-1 bg-gray-800 border border-cyan-500 rounded px-1 py-0.5 text-xs text-white focus:outline-none"
                />
              </div>
            )}

            {fileTree.map((file) => (
              <React.Fragment key={file.path}>
                <FileTreeItem
                  file={file}
                  depth={0}
                  activeFile={activeFile}
                  expandedFolders={expandedFolders}
                  onSelect={onFileSelect}
                  onToggle={handleToggle}
                  onDelete={onFileDelete}
                  onRename={onFileRename}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                />
                
                {/* New item input for this folder */}
                {showNewFileInput && showNewFileInput.parentPath === file.path && (
                  <div
                    className="flex items-center gap-1 px-2 py-1"
                    style={{ paddingLeft: `${1 * 12 + 8}px` }}
                  >
                    <div className="w-5" />
                    {showNewFileInput.type === 'folder' ? (
                      <Folder size={16} className="text-yellow-400" />
                    ) : (
                      <File size={16} className="text-gray-400" />
                    )}
                    <input
                      ref={newItemInputRef}
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onBlur={handleNewItemSubmit}
                      onKeyDown={handleNewItemKeyDown}
                      placeholder={showNewFileInput.type === 'folder' ? 'folder name' : 'filename.ext'}
                      className="flex-1 bg-gray-800 border border-cyan-500 rounded px-1 py-0.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-800 text-xs text-gray-500">
        {files.length} {files.length === 1 ? 'item' : 'items'}
      </div>
    </div>
  );
};

export default ProjectExplorer;
