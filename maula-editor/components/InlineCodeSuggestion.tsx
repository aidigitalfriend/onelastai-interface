/**
 * InlineCodeSuggestion - VS Code-like inline autocomplete
 * Ghost text suggestions while typing
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { copilotService, CodeSuggestion } from '../services/copilot';
import { useStore } from '../store/useStore';

interface InlineSuggestionProps {
  code: string;
  cursorPosition: number;
  language: string;
  filePath: string;
  onAccept: (suggestion: string) => void;
  onPartialAccept: (word: string) => void;
  enabled?: boolean;
}

export const InlineCodeSuggestion: React.FC<InlineSuggestionProps> = ({
  code,
  cursorPosition,
  language,
  filePath,
  onAccept,
  onPartialAccept,
  enabled = true,
}) => {
  const { theme } = useStore();
  const [suggestion, setSuggestion] = useState<CodeSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastPositionRef = useRef<number>(0);

  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // Get suggestion after typing stops
  const fetchSuggestion = useCallback(async () => {
    if (!enabled || !code || cursorPosition <= 0) {
      setSuggestion(null);
      setIsVisible(false);
      return;
    }

    // Don't fetch if nothing changed
    if (code === lastCodeRef.current && cursorPosition === lastPositionRef.current) {
      return;
    }
    
    lastCodeRef.current = code;
    lastPositionRef.current = cursorPosition;

    setIsLoading(true);

    try {
      const result = await copilotService.getInlineSuggestion(
        code,
        cursorPosition,
        language,
        filePath
      );

      if (result && result.text.trim()) {
        setSuggestion(result);
        setIsVisible(true);
      } else {
        setSuggestion(null);
        setIsVisible(false);
      }
    } catch (error) {
      console.error('[InlineSuggestion] Error:', error);
      setSuggestion(null);
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  }, [code, cursorPosition, language, filePath, enabled]);

  // Debounced fetch
  useEffect(() => {
    if (!enabled) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Wait 500ms after typing stops
    debounceRef.current = setTimeout(() => {
      fetchSuggestion();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [code, cursorPosition, fetchSuggestion, enabled]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!suggestion || !isVisible) return;

      // Tab to accept full suggestion
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        onAccept(suggestion.text);
        setSuggestion(null);
        setIsVisible(false);
      }

      // Ctrl+Right Arrow to accept word by word
      if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const words = suggestion.text.split(/(\s+)/);
        if (words.length > 0) {
          const firstWord = words[0];
          onPartialAccept(firstWord);
          
          // Update suggestion to remaining
          const remaining = words.slice(1).join('');
          if (remaining.trim()) {
            setSuggestion({ ...suggestion, text: remaining });
          } else {
            setSuggestion(null);
            setIsVisible(false);
          }
        }
      }

      // Escape to dismiss
      if (e.key === 'Escape') {
        setSuggestion(null);
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestion, isVisible, onAccept, onPartialAccept]);

  // Cancel when cursor moves without typing
  useEffect(() => {
    const handleSelectionChange = () => {
      // If selection changed but code didn't, hide suggestion
      if (code === lastCodeRef.current && cursorPosition !== lastPositionRef.current) {
        setSuggestion(null);
        setIsVisible(false);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [code, cursorPosition]);

  if (!isVisible || !suggestion) return null;

  return (
    <AnimatePresence>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`inline whitespace-pre ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
        style={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontStyle: 'italic',
        }}
        data-suggestion="true"
      >
        {suggestion.text}
      </motion.span>
    </AnimatePresence>
  );
};

/**
 * SuggestionPopup - Dropdown list of code suggestions
 */
interface SuggestionPopupProps {
  suggestions: CodeSuggestion[];
  position: { x: number; y: number };
  onSelect: (suggestion: CodeSuggestion) => void;
  onClose: () => void;
  selectedIndex: number;
  onNavigate: (direction: 'up' | 'down') => void;
}

export const SuggestionPopup: React.FC<SuggestionPopupProps> = ({
  suggestions,
  position,
  onSelect,
  onClose,
  selectedIndex,
  onNavigate,
}) => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';
  const listRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          onNavigate('down');
          break;
        case 'ArrowUp':
          e.preventDefault();
          onNavigate('up');
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onClose, onNavigate]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement;
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={`fixed z-50 min-w-[200px] max-w-[400px] max-h-[200px] overflow-auto rounded shadow-lg ${
        isDark ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white border border-gray-200'
      }`}
      style={{
        left: position.x,
        top: position.y,
      }}
      ref={listRef}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          onClick={() => onSelect(suggestion)}
          className={`px-3 py-1.5 cursor-pointer text-sm ${
            index === selectedIndex
              ? isDark
                ? 'bg-blue-600/30 text-white'
                : 'bg-blue-100 text-blue-900'
              : isDark
              ? 'text-[#cccccc] hover:bg-[#2a2d2e]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-50">
              {getCompletionIcon(suggestion.type)}
            </span>
            <code className="font-mono truncate">
              {suggestion.displayText || suggestion.text.slice(0, 50)}
            </code>
          </div>
          {suggestion.documentation && (
            <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-[#808080]' : 'text-gray-500'}`}>
              {suggestion.documentation}
            </p>
          )}
        </div>
      ))}
    </motion.div>
  );
};

// Helper to get icon for completion type
function getCompletionIcon(type?: string): string {
  switch (type) {
    case 'function':
    case 'method':
      return 'ƒ';
    case 'variable':
      return '𝑥';
    case 'class':
      return '◇';
    case 'interface':
      return '◆';
    case 'property':
      return '●';
    case 'keyword':
      return '🔑';
    case 'snippet':
      return '📝';
    default:
      return '⬛';
  }
}

/**
 * CodeActionMenu - Quick fixes and refactorings
 */
interface CodeActionMenuProps {
  actions: Array<{
    title: string;
    kind: string;
    execute: () => void;
  }>;
  position: { x: number; y: number };
  onClose: () => void;
}

export const CodeActionMenu: React.FC<CodeActionMenuProps> = ({
  actions,
  position,
  onClose,
}) => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, actions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (actions[selectedIndex]) {
            actions[selectedIndex].execute();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, selectedIndex, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-code-action-menu]')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (actions.length === 0) return null;

  return (
    <motion.div
      data-code-action-menu
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed z-50 min-w-[200px] max-w-[350px] rounded shadow-lg ${
        isDark ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white border border-gray-200'
      }`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className={`px-2 py-1.5 text-xs font-medium ${isDark ? 'text-[#808080] border-b border-[#3c3c3c]' : 'text-gray-500 border-b border-gray-200'}`}>
        Quick Actions
      </div>
      {actions.map((action, index) => (
        <div
          key={index}
          onClick={() => {
            action.execute();
            onClose();
          }}
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 ${
            index === selectedIndex
              ? isDark
                ? 'bg-blue-600/30 text-white'
                : 'bg-blue-100 text-blue-900'
              : isDark
              ? 'text-[#cccccc] hover:bg-[#2a2d2e]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="text-yellow-500">💡</span>
          <span>{action.title}</span>
        </div>
      ))}
    </motion.div>
  );
};

/**
 * Copilot Status Bar Item
 */
interface CopilotStatusProps {
  isActive: boolean;
  isLoading: boolean;
  provider: string;
  onToggle: () => void;
  onSettings: () => void;
}

export const CopilotStatusBar: React.FC<CopilotStatusProps> = ({
  isActive,
  isLoading,
  provider,
  onToggle,
  onSettings,
}) => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer hover:${
        isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'
      } transition-colors rounded`}
      onClick={onToggle}
      title={isActive ? 'Copilot Active - Click to disable' : 'Copilot Disabled - Click to enable'}
    >
      {isLoading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-yellow-500"
        >
          ⟳
        </motion.span>
      ) : (
        <span className={isActive ? 'text-green-500' : 'text-gray-500'}>
          {isActive ? '⚡' : '○'}
        </span>
      )}
      <span className={isDark ? 'text-[#cccccc]' : 'text-gray-700'}>
        Copilot {isActive ? `(${provider})` : '(off)'}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSettings();
        }}
        className={`ml-1 p-0.5 rounded hover:${isDark ? 'bg-[#4c4c4c]' : 'bg-gray-300'}`}
        title="Copilot Settings"
      >
        ⚙
      </button>
    </div>
  );
};

/**
 * Hook for managing Copilot state
 */
export function useCopilot() {
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem('copilot_enabled') !== 'false';
  });
  const [provider, setProvider] = useState(() => {
    return localStorage.getItem('copilot_provider') || 'openai';
  });
  const [isLoading, setIsLoading] = useState(false);

  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('copilot_enabled', String(newValue));
      return newValue;
    });
  }, []);

  const updateProvider = useCallback((newProvider: string) => {
    setProvider(newProvider);
    localStorage.setItem('copilot_provider', newProvider);
  }, []);

  return {
    isEnabled,
    toggleEnabled,
    provider,
    updateProvider,
    isLoading,
    setIsLoading,
  };
}

export default InlineCodeSuggestion;
