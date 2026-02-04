import React, { useEffect, useState } from 'react';

interface CanvasAppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CanvasAppDrawer: React.FC<CanvasAppDrawerProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Use neural-chat's own canvas-build (inside neural-chat folder)
  const canvasAppUrl = '/neural-chat/canvas-build/';

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Give iframe time to load
      const timer = setTimeout(() => setIsLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Communicate with iframe to handle close
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'close-canvas-drawer') {
        onClose();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  return (
    <div 
      className={`fixed inset-0 z-[300] transition-transform duration-700 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {isLoading && (
        <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center absolute inset-0 z-10">
          <div className="text-center">
            <div className="flex items-center gap-2 text-cyan-400 mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-gray-400 text-sm">Loading Canvas App...</p>
          </div>
        </div>
      )}
      
      {/* Iframe containing neural-chat's canvas app */}
      <iframe
        src={canvasAppUrl}
        className="w-full h-full border-0 bg-[#0a0a0a]"
        title="Canvas App"
        allow="camera; microphone; clipboard-write"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

export default CanvasAppDrawer;
