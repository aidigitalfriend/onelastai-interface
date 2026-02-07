/**
 * Modal — Gorgeous glassmorphism modal with framer-motion
 * Supports multiple sizes, custom headers, and smooth animations
 */
import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw] max-h-[90vh]',
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlay = true,
  footer,
  className = '',
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={closeOnOverlay ? onClose : undefined}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`relative w-full ${sizeMap[size]} bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden ${className}`}
          >
            {/* Gradient glow top edge */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  {icon && (
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 rounded-xl flex items-center justify-center text-violet-400">
                      {icon}
                    </div>
                  )}
                  <div>
                    {title && <h2 className="text-base font-bold text-white">{title}</h2>}
                    {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
                  </div>
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-900/30">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Button presets for modal footer
export const ModalButton: React.FC<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}> = ({ variant = 'primary', children, onClick, disabled, loading }) => {
  const base = 'px-5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2';
  const variants = {
    primary: 'bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 shadow-lg shadow-violet-500/20',
    secondary: 'bg-white/5 border border-zinc-800 text-white/70 hover:text-white hover:bg-white/10',
    danger: 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20',
    ghost: 'text-white/50 hover:text-white/80 hover:bg-white/5',
  };

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]}`}>
      {loading && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
};

export default Modal;
