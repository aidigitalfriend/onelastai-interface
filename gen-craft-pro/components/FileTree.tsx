/**
 * FileTree Component for Standalone Canvas App
 * Displays project structure and enables file selection
 * 
 * This is the STANDALONE version at /canvas-app/
 */

import React, { useState } from 'react';
import { FileNode, editorBridge } from '../services/editorBridge';
import { Folder, FolderOpen, FileText, FilePlus, FolderPlus, Trash2, Edit2, ChevronRight } from 'lucide-react';

interface FileTreeProps {
  files: FileNode[];
  activeFile: string | null;
  onFileSelect: (path: string) => void;
  onFileCreate?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileRename?: (oldPath: string, newPath: string) => void;
  darkMode?: boolean;
}

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  activeFile: string | null;
  onFileSelect: (path: string) => void;
  onFileCreate?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileRename?: (oldPath: string, newPath: string) => void;
  darkMode: boolean;
}

// Get icon color by language
const getFileIconColor = (language?: string): string => {
  const colors: Record<string, string> = {
    html: 'text-orange-400',
    css: 'text-blue-400',
    scss: 'text-pink-400',
    javascript: 'text-yellow-400',
    typescript: 'text-blue-500',
    json: 'text-green-400',
    markdown: 'text-zinc-400',
    python: 'text-green-500',
    java: 'text-red-400',
    go: 'text-blue-400',
    rust: 'text-orange-500',
  };
  return colors[language || ''] || 'text-zinc-400';
};

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  depth,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  darkMode,
}) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);

  const isActive = activeFile === node.path;
  const hasChildren = node.type === 'folder' && node.children && node.children.length > 0;

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.path);
    }
  };

  const handleRename = () => {
    if (newName && newName !== node.name && onFileRename) {
      const newPath = node.path.replace(node.name, newName);
      onFileRename(node.path, newPath);
    }
    setIsRenaming(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFileDelete && confirm(`Delete "${node.name}"?`)) {
      onFileDelete(node.path);
    }
  };

  const handleCreateFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFileCreate && node.type === 'folder') {
      const fileName = prompt('Enter file name:');
      if (fileName) {
        onFileCreate(`${node.path}/${fileName}`);
      }
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-all rounded-md mx-1 ${
          isActive 
            ? darkMode 
              ? 'bg-blue-500/20 text-blue-400' 
              : 'bg-blue-100 text-blue-700'
            : darkMode
              ? 'text-zinc-400 hover:bg-violet-900/20 hover:text-zinc-200'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/Collapse for folders */}
        {node.type === 'folder' && (
          <ChevronRight 
            className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          />
        )}
        {node.type === 'file' && <span className="w-3" />}

        {/* Icon */}
        {node.type === 'folder' ? (
          isOpen ? (
            <FolderOpen className="h-4 w-4 text-yellow-400" />
          ) : (
            <Folder className="h-4 w-4 text-yellow-400" />
          )
        ) : (
          <FileText className={`h-4 w-4 ${getFileIconColor(node.language)}`} />
        )}

        {/* Name */}
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className={`flex-1 text-xs px-1 py-0.5 rounded outline-none ${
              darkMode ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-800'
            }`}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            aria-label="Rename file"
            title="Enter new file name"
          />
        ) : (
          <span className="flex-1 text-xs font-medium truncate">{node.name}</span>
        )}

        {/* Action buttons */}
        {isHovered && !isRenaming && (
          <div className="flex items-center gap-1">
            {node.type === 'folder' && onFileCreate && (
              <button
                onClick={handleCreateFile}
                className={`p-0.5 rounded ${darkMode ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
                title="New File"
              >
                <FilePlus className="h-3 w-3" />
              </button>
            )}
            {onFileRename && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
                className={`p-0.5 rounded ${darkMode ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
                title="Rename"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            )}
            {onFileDelete && (
              <button
                onClick={handleDelete}
                className={`p-0.5 rounded ${darkMode ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isOpen && (
        <div>
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onFileCreate={onFileCreate}
              onFileDelete={onFileDelete}
              onFileRename={onFileRename}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  darkMode = true,
}) => {
  const handleNewFile = () => {
    const fileName = prompt('Enter file name (e.g., component.html):');
    if (fileName && onFileCreate) {
      onFileCreate(`/${fileName}`);
    }
  };

  const handleNewFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      editorBridge.createFolder(`/${folderName}`);
    }
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewFile}
            className={`p-1.5 rounded transition-all ${darkMode ? 'hover:bg-violet-900/20 text-zinc-500 hover:text-violet-400' : 'hover:bg-zinc-100 text-zinc-400 hover:text-violet-600'}`}
            title="New File"
          >
            <FilePlus className="h-4 w-4" />
          </button>
          <button
            onClick={handleNewFolder}
            className={`p-1.5 rounded transition-all ${darkMode ? 'hover:bg-violet-900/20 text-zinc-500 hover:text-violet-400' : 'hover:bg-zinc-100 text-zinc-400 hover:text-violet-600'}`}
            title="New Folder"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {files.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
            <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No files yet</p>
          </div>
        ) : (
          files.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onFileCreate={onFileCreate}
              onFileDelete={onFileDelete}
              onFileRename={onFileRename}
              darkMode={darkMode}
            />
          ))
        )}
      </div>

      {/* Footer with stats */}
      <div className={`px-4 py-2 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {editorBridge.getAllFilePaths().length} files
          </span>
          {editorBridge.hasUnsavedChanges() && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
              Unsaved
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileTree;
