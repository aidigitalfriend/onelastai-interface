/**
 * Toast Notification System — Gorgeous animated toast with glassmorphism
 * Fiber-optimized with Zustand + framer-motion
 */
import React, { useEffect } from 'react';
import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }].slice(-5) }));
    return id;
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearAll: () => set({ toasts: [] }),
}));

// Convenience functions
export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'success', title, message, duration }),
  error: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'error', title, message, duration }),
  warning: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'warning', title, message, duration }),
  info: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'info', title, message, duration }),
};

const iconMap: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap: Record<ToastType, { bg: string; border: string; icon: string; glow: string }> = {
  success: { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20', icon: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
  error: { bg: 'from-red-500/10 to-red-600/5', border: 'border-red-500/20', icon: 'text-red-400', glow: 'shadow-red-500/10' },
  warning: { bg: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/20', icon: 'text-amber-400', glow: 'shadow-amber-500/10' },
  info: { bg: 'from-violet-500/10 to-blue-500/5', border: 'border-violet-500/20', icon: 'text-violet-400', glow: 'shadow-violet-500/10' },
};

const SingleToast: React.FC<{ item: ToastItem }> = ({ item }) => {
  const removeToast = useToastStore((s) => s.removeToast);
  const Icon = iconMap[item.type];
  const colors = colorMap[item.type];

  useEffect(() => {
    const timer = setTimeout(() => removeToast(item.id), item.duration || 4000);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, removeToast]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 80, scale: 0.9, filter: 'blur(4px)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative overflow-hidden bg-gradient-to-r ${colors.bg} backdrop-blur-xl border ${colors.border} rounded-2xl p-4 shadow-2xl ${colors.glow} min-w-[320px] max-w-[420px]`}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 3s ease-in-out infinite',
      }} />

      <div className="flex items-start gap-3 relative z-10">
        <div className={`w-9 h-9 rounded-xl bg-white/5 border border-zinc-800 flex items-center justify-center shrink-0 ${colors.icon}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white/90 leading-tight">{item.title}</h4>
          {item.message && (
            <p className="text-xs text-white/50 mt-1 leading-relaxed">{item.message}</p>
          )}
          {item.action && (
            <button
              onClick={item.action.onClick}
              className="mt-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              {item.action.label} →
            </button>
          )}
        </div>
        <button
          onClick={() => removeToast(item.id)}
          className="p-1 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: (item.duration || 4000) / 1000, ease: 'linear' }}
          className={`h-full bg-gradient-to-r ${
            item.type === 'success' ? 'from-emerald-400 to-blue-400' :
            item.type === 'error' ? 'from-red-400 to-pink-400' :
            item.type === 'warning' ? 'from-amber-400 to-orange-400' :
            'from-violet-400 to-blue-400'
          } rounded-full`}
        />
      </div>
    </motion.div>
  );
};

const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <SingleToast item={item} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
