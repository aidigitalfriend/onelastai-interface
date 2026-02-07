/**
 * Tooltip — Silky smooth tooltip with glassmorphism + framer-motion
 * Supports top/bottom/left/right positions and rich content
 */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  shortcut?: string;
  className?: string;
  disabled?: boolean;
}

const positionStyles = {
  top: { className: 'bottom-full left-1/2 -translate-x-1/2 mb-2', origin: 'bottom' },
  bottom: { className: 'top-full left-1/2 -translate-x-1/2 mt-2', origin: 'top' },
  left: { className: 'right-full top-1/2 -translate-y-1/2 mr-2', origin: 'right' },
  right: { className: 'left-full top-1/2 -translate-y-1/2 ml-2', origin: 'left' },
};

const arrowStyles = {
  top: 'absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-zinc-800 rotate-45',
  bottom: 'absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-l border-t border-zinc-800 rotate-45',
  left: 'absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 border-r border-t border-zinc-800 rotate-45',
  right: 'absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 border-l border-b border-zinc-800 rotate-45',
};

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 400,
  shortcut,
  className = '',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pos = positionStyles[position];

  const show = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [delay, disabled]);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(2px)' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{ transformOrigin: pos.origin }}
            className={`absolute ${pos.className} z-[9999] pointer-events-none`}
          >
            <div className="relative bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-lg px-3 py-1.5 shadow-xl shadow-black/30 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-200 font-medium">{content}</span>
                {shortcut && (
                  <span className="text-[10px] text-zinc-500 font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-800">
                    {shortcut}
                  </span>
                )}
              </div>
              <div className={arrowStyles[position]} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
