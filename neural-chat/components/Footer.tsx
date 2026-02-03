
import React, { useState, useEffect } from 'react';

const Footer: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="bg-[#0a0a0a]/95 backdrop-blur-md border-t border-gray-800/50 px-4 py-1.5 text-[10px] flex justify-between items-center z-50 font-mono">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="" className="w-4 h-4 opacity-60" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <span className="text-gray-500">One Last AI</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-emerald-500/70">Connected</span>
        </span>
        <span className="text-gray-600 tabular-nums">{currentTime}</span>
      </div>
    </footer>
  );
};

export default Footer;
