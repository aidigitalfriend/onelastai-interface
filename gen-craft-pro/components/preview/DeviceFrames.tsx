/**
 * DeviceFrames — Desktop/tablet/mobile device frame wrappers
 * Gorgeous realistic device chrome with smooth transitions
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Tablet, Monitor, Wifi, Battery, Signal } from 'lucide-react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceFrameProps {
  device: DeviceType;
  children: React.ReactNode;
  url?: string;
  className?: string;
}

const deviceSizes: Record<DeviceType, { width: string; maxWidth: string; height: string; padding: string }> = {
  desktop: { width: '100%', maxWidth: '100%', height: '100%', padding: '0' },
  tablet: { width: '768px', maxWidth: '768px', height: '100%', padding: '16px' },
  mobile: { width: '375px', maxWidth: '375px', height: '100%', padding: '12px' },
};

const MobileFrame: React.FC<{ children: React.ReactNode; url?: string }> = ({ children, url }) => (
  <div className="relative mx-auto bg-zinc-900 rounded-[3rem] shadow-2xl shadow-black/60 border border-zinc-800 overflow-hidden"
    style={{ width: '390px', maxHeight: '100%' }}>
    {/* Notch */}
    <div className="relative h-12 bg-zinc-950 flex items-center justify-between px-6">
      <span className="text-[10px] text-zinc-500 font-medium">9:41</span>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[25px] bg-black rounded-full flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-700" />
      </div>
      <div className="flex items-center gap-1.5">
        <Signal className="w-3 h-3 text-zinc-500" />
        <Wifi className="w-3 h-3 text-zinc-500" />
        <Battery className="w-3.5 h-3.5 text-zinc-500" />
      </div>
    </div>

    {/* URL bar */}
    {url && (
      <div className="px-4 py-1.5 bg-zinc-900">
        <div className="bg-zinc-800/50 rounded-lg px-3 py-1 text-[10px] text-zinc-500 truncate text-center border border-zinc-800">
          {url}
        </div>
      </div>
    )}

    {/* Content */}
    <div className="bg-white overflow-auto" style={{ height: 'calc(100% - 80px)' }}>
      {children}
    </div>

    {/* Home indicator */}
    <div className="h-8 bg-zinc-950 flex items-center justify-center">
      <div className="w-32 h-1 bg-zinc-600 rounded-full" />
    </div>
  </div>
);

const TabletFrame: React.FC<{ children: React.ReactNode; url?: string }> = ({ children, url }) => (
  <div className="relative mx-auto bg-zinc-900 rounded-[2rem] shadow-2xl shadow-black/60 border border-zinc-800 overflow-hidden"
    style={{ width: '810px', maxHeight: '100%' }}>
    {/* Status bar */}
    <div className="h-8 bg-zinc-950 flex items-center justify-between px-6">
      <span className="text-[10px] text-zinc-500 font-medium">9:41 AM</span>
      <div className="flex items-center gap-2">
        <Wifi className="w-3 h-3 text-zinc-500" />
        <Battery className="w-3.5 h-3.5 text-zinc-500" />
      </div>
    </div>

    {/* URL bar */}
    {url && (
      <div className="px-4 py-1.5 bg-zinc-900 border-b border-zinc-800/50">
        <div className="bg-zinc-800/50 rounded-lg px-3 py-1.5 text-[11px] text-zinc-500 truncate text-center border border-zinc-800 max-w-md mx-auto">
          {url}
        </div>
      </div>
    )}

    {/* Content */}
    <div className="bg-white overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
      {children}
    </div>
  </div>
);

const DesktopFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="h-full w-full overflow-hidden">
    {children}
  </div>
);

const DeviceFrames: React.FC<DeviceFrameProps> = ({ device, children, url, className = '' }) => {
  const sizes = deviceSizes[device];

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`flex items-center justify-center h-full overflow-auto bg-zinc-950 ${className}`}
      style={{ padding: sizes.padding }}
    >
      {device === 'mobile' && <MobileFrame url={url}>{children}</MobileFrame>}
      {device === 'tablet' && <TabletFrame url={url}>{children}</TabletFrame>}
      {device === 'desktop' && <DesktopFrame>{children}</DesktopFrame>}
    </motion.div>
  );
};

export const DeviceIcon: React.FC<{ device: DeviceType; className?: string }> = ({ device, className = '' }) => {
  const icons: Record<DeviceType, React.ElementType> = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone,
  };
  const Icon = icons[device];
  return <Icon className={className} />;
};

export default DeviceFrames;
