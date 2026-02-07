/**
 * EditorTabs — Gorgeous tab bar with drag-to-reorder, fiber-smooth animations
 * Shows file icons, dirty indicators, and close buttons
 */
import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileCode, FileText, FileJson, Image, Settings, Pin, PinOff } from 'lucide-react';
import { useEditorSettingsStore, EditorTab } from '../../stores/editorStore';

interface EditorTabsProps {
  onTabSelect?: (path: string) => void;
  onTabClose?: (path: string) => void;
}

const fileIconMap: Record<string, { icon: React.ElementType; color: string }> = {
  tsx: { icon: FileCode, color: 'text-blue-400' },
  ts: { icon: FileCode, color: 'text-blue-400' },
  jsx: { icon: FileCode, color: 'text-yellow-400' },
  js: { icon: FileCode, color: 'text-yellow-400' },
  html: { icon: FileCode, color: 'text-orange-400' },
  css: { icon: FileCode, color: 'text-purple-400' },
  scss: { icon: FileCode, color: 'text-pink-400' },
  json: { icon: FileJson, color: 'text-amber-400' },
  md: { icon: FileText, color: 'text-zinc-400' },
  svg: { icon: Image, color: 'text-emerald-400' },
  png: { icon: Image, color: 'text-emerald-400' },
  config: { icon: Settings, color: 'text-zinc-500' },
};

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return fileIconMap[ext] || { icon: FileText, color: 'text-zinc-500' };
};

const EditorTabs: React.FC<EditorTabsProps> = ({ onTabSelect, onTabClose }) => {
  const tabs = useEditorSettingsStore((s) => s.tabs);
  const activeTabPath = useEditorSettingsStore((s) => s.activeTabPath);
  const setActiveTab = useEditorSettingsStore((s) => s.setActiveTab);
  const closeTab = useEditorSettingsStore((s) => s.closeTab);
  const pinTab = useEditorSettingsStore((s) => s.pinTab);
  const unpinTab = useEditorSettingsStore((s) => s.unpinTab);

  const handleSelect = useCallback((path: string) => {
    setActiveTab(path);
    onTabSelect?.(path);
  }, [setActiveTab, onTabSelect]);

  const handleClose = useCallback((e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    closeTab(path);
    onTabClose?.(path);
  }, [closeTab, onTabClose]);

  const handlePin = useCallback((e: React.MouseEvent, tab: EditorTab) => {
    e.stopPropagation();
    tab.isPinned ? unpinTab(tab.path) : pinTab(tab.path);
  }, [pinTab, unpinTab]);

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center bg-zinc-950 border-b border-zinc-800 overflow-x-auto custom-scrollbar h-[38px] shrink-0">
      <AnimatePresence initial={false}>
        {tabs.map((tab) => {
          const isActive = tab.path === activeTabPath;
          const { icon: FileIcon, color } = getFileIcon(tab.name);

          return (
            <motion.button
              key={tab.path}
              layout
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              onClick={() => handleSelect(tab.path)}
              className={`
                group relative flex items-center gap-1.5 px-3 h-full text-xs font-medium whitespace-nowrap border-r border-zinc-800/50 transition-colors shrink-0
                ${isActive
                  ? 'bg-zinc-900 text-zinc-200'
                  : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                }
              `}
            >
              {/* Active tab top accent */}
              {isActive && (
                <motion.div
                  layoutId="activeTabAccent"
                  className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-blue-500"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Pin indicator */}
              {tab.isPinned && (
                <button onClick={(e) => handlePin(e, tab)} className="p-0.5 text-violet-400 hover:text-violet-300">
                  <Pin className="w-2.5 h-2.5" />
                </button>
              )}

              {/* File icon */}
              <FileIcon className={`w-3.5 h-3.5 ${isActive ? color : 'text-zinc-600'} shrink-0 transition-colors`} />

              {/* File name */}
              <span className="max-w-[120px] truncate">{tab.name}</span>

              {/* Dirty indicator */}
              {tab.isDirty && (
                <div className="w-2 h-2 rounded-full bg-violet-400/80 shrink-0" />
              )}

              {/* Close button */}
              {!tab.isPinned && (
                <button
                  onClick={(e) => handleClose(e, tab.path)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all ml-0.5 shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default EditorTabs;
