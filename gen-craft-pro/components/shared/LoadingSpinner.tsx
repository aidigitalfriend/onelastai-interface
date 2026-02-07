/**
 * LoadingSpinner — Beautiful animated loading states
 * Multiple variants: spin, pulse, dots, orbit, skeleton
 */
import React from 'react';
import { motion } from 'framer-motion';

type SpinnerVariant = 'spin' | 'pulse' | 'dots' | 'orbit' | 'bars';
type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  variant?: SpinnerVariant;
  size?: SpinnerSize;
  label?: string;
  className?: string;
  color?: string;
}

const sizeMap: Record<SpinnerSize, { container: string; text: string; dot: string }> = {
  xs: { container: 'w-4 h-4', text: 'text-[10px]', dot: 'w-1 h-1' },
  sm: { container: 'w-6 h-6', text: 'text-xs', dot: 'w-1.5 h-1.5' },
  md: { container: 'w-10 h-10', text: 'text-sm', dot: 'w-2 h-2' },
  lg: { container: 'w-14 h-14', text: 'text-base', dot: 'w-2.5 h-2.5' },
  xl: { container: 'w-20 h-20', text: 'text-lg', dot: 'w-3 h-3' },
};

// Gradient Spin
const SpinVariant: React.FC<{ size: SpinnerSize }> = ({ size }) => (
  <div className={`${sizeMap[size].container} relative`}>
    <div className={`${sizeMap[size].container} border-2 border-zinc-800 rounded-full`} />
    <div className={`${sizeMap[size].container} absolute inset-0 border-2 border-transparent border-t-violet-400 border-r-blue-400 rounded-full animate-spin`} />
    <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-violet-500/5 to-blue-500/5" />
  </div>
);

// Pulse
const PulseVariant: React.FC<{ size: SpinnerSize }> = ({ size }) => (
  <div className={`${sizeMap[size].container} relative flex items-center justify-center`}>
    <motion.div
      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={`absolute ${sizeMap[size].container} rounded-full bg-violet-500/20`}
    />
    <motion.div
      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.1, 0.7] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      className={`absolute ${sizeMap[size].container} rounded-full bg-blue-500/20`}
    />
    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-400 to-blue-400" />
  </div>
);

// Bouncing Dots
const DotsVariant: React.FC<{ size: SpinnerSize }> = ({ size }) => (
  <div className="flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
        className={`${sizeMap[size].dot} rounded-full bg-gradient-to-r from-violet-400 to-blue-400`}
      />
    ))}
  </div>
);

// Orbit
const OrbitVariant: React.FC<{ size: SpinnerSize }> = ({ size }) => (
  <div className={`${sizeMap[size].container} relative`}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      className={`${sizeMap[size].container} absolute inset-0`}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-400 shadow-lg shadow-violet-500/50" />
    </motion.div>
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
      className={`${sizeMap[size].container} absolute inset-0`}
    >
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-lg shadow-blue-500/50" />
    </motion.div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
    </div>
  </div>
);

// Bars
const BarsVariant: React.FC<{ size: SpinnerSize }> = ({ size }) => (
  <div className="flex items-end gap-0.5 h-6">
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        animate={{ height: ['30%', '100%', '30%'] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
        className="w-1 rounded-full bg-gradient-to-t from-violet-500 to-blue-400"
        style={{ minHeight: 3 }}
      />
    ))}
  </div>
);

const variants: Record<SpinnerVariant, React.FC<{ size: SpinnerSize }>> = {
  spin: SpinVariant,
  pulse: PulseVariant,
  dots: DotsVariant,
  orbit: OrbitVariant,
  bars: BarsVariant,
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'spin',
  size = 'md',
  label,
  className = '',
}) => {
  const VariantComponent = variants[variant];

  return (
    <div className={`inline-flex flex-col items-center gap-3 ${className}`}>
      <VariantComponent size={size} />
      {label && (
        <p className={`${sizeMap[size].text} text-zinc-500 font-medium animate-pulse`}>{label}</p>
      )}
    </div>
  );
};

// Skeleton loader for content placeholders
export const Skeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  rounded?: string;
  className?: string;
}> = ({ width = '100%', height = 16, rounded = 'rounded-lg', className = '' }) => (
  <div
    className={`bg-zinc-900/50 ${rounded} relative overflow-hidden ${className}`}
    style={{ width, height }}
  >
    <motion.div
      animate={{ x: ['-100%', '100%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-500/5 to-transparent"
    />
  </div>
);

export default LoadingSpinner;
