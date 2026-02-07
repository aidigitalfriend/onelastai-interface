/**
 * Dropdown — Gorgeous glassmorphism dropdown with framer-motion
 * Supports icons, dividers, nested groups, and keyboard nav
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  checked?: boolean;
  onClick?: () => void;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: number | string;
  className?: string;
  onSelect?: (item: DropdownItem) => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  width = 220,
  className = '',
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    const selectableItems = items.filter((i) => !i.divider && !i.disabled);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, selectableItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && selectableItems[focusedIndex]) {
          selectableItems[focusedIndex].onClick?.();
          onSelect?.(selectableItems[focusedIndex]);
          close();
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  }, [isOpen, items, focusedIndex, onSelect, close]);

  let selectableIndex = -1;

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -6, scale: 0.97, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, scale: 0.97, filter: 'blur(2px)' }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className={`absolute top-full mt-1.5 ${align === 'right' ? 'right-0' : 'left-0'} z-[100]`}
            style={{ width }}
          >
            <div className="bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Top glow */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

              <div className="p-1 max-h-[320px] overflow-y-auto custom-scrollbar">
                {items.map((item, i) => {
                  if (item.divider) {
                    return <div key={`div-${i}`} className="my-1 mx-2 h-[1px] bg-zinc-800" />;
                  }

                  selectableIndex++;
                  const isCurrentFocused = selectableIndex === focusedIndex;

                  return (
                    <button
                      key={item.id}
                      disabled={item.disabled}
                      onClick={() => {
                        if (item.disabled) return;
                        item.onClick?.();
                        onSelect?.(item);
                        close();
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-xs group
                        ${isCurrentFocused ? 'bg-violet-500/15 text-violet-300' : ''}
                        ${item.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-zinc-800'}
                        ${item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-zinc-300'}
                      `}
                    >
                      {item.icon && (
                        <span className={`w-4 h-4 shrink-0 ${item.danger ? 'text-red-400' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`}>
                          {item.icon}
                        </span>
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.checked && <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                      {item.shortcut && (
                        <span className="text-[10px] text-zinc-600 font-mono shrink-0">{item.shortcut}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;
