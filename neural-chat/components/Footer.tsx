
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
    <footer className="bg-[#111]/95 backdrop-blur-md border-t border-gray-800 p-2 text-[10px] flex justify-between items-center z-50 px-4 font-mono">
      <div className="text-gray-600 tracking-wider uppercase">Node_Protocol_Alpha_v3.4.0</div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span>
          <span className="text-green-500/80 uppercase">Uplink_Synchronized</span>
        </div>
        <span className="text-cyan-600/80 tabular-nums">{currentTime}</span>
      </div>
    </footer>
  );
};

export default Footer;
