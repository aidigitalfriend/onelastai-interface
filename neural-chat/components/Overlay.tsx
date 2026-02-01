
import React from 'react';

interface OverlayProps {
  active: boolean;
  onActivate: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ active, onActivate }) => {
  return (
    <div 
      className={`fixed inset-0 bg-[#080808] z-[150] flex flex-col items-center justify-center p-4 transition-transform duration-[1200ms] will-change-transform cubic-bezier(0.7, 0, 0.3, 1) ${
        active ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {/* Visual shutter bottom edge shadow/glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/20 shadow-[0_5px_15px_rgba(16,185,129,0.3)]"></div>
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(16,185,129,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.2)_1px,transparent_1px)] bg-[length:40px_40px]"></div>

      <div className="max-w-md w-full flex flex-col items-center relative z-10">
        <pre className="text-green-400 text-[10px] sm:text-xs md:text-sm leading-tight glow-green text-center font-mono mb-8 select-none">
          {`▖  ▖    ▜     ▄▖▄▖
▛▖▞▌▀▌▌▌▐ ▀▌  ▌▌▐ 
▌▝ ▌█▌▙▌▐▖█▌  ▛▌▟▖
--- NEURAL INTERFACE ---`}
        </pre>
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-200 text-center tracking-tighter">
          <span className="text-green-400 glow-green">Neural</span> 
          <span className="text-cyan-400 glow-cyan ml-2">Link</span>
        </h1>
        <p className="text-gray-500 mt-6 italic font-mono text-xs sm:text-sm uppercase tracking-[0.3em] animate-pulse">
          Standby for Core Initialization
        </p>
        
        <div className="mt-12 relative">
          <button 
            onClick={onActivate}
            className="relative group bg-black/40 overflow-hidden border border-emerald-500/50 px-12 py-5 rounded-sm transition-all hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] active:scale-95"
          >
            <div className="absolute inset-0 bg-emerald-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative text-emerald-400 font-bold tracking-[0.4em] group-hover:text-white transition-colors text-sm">
              ACTIVATE SYSTEM
            </span>
          </button>
          
          {/* Decorative bracket lines for button */}
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-900/40"></div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-900/40"></div>
        </div>
        
        <div className="mt-20 grid grid-cols-3 gap-12 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
          <div className="text-center group">
            <div className="text-emerald-900 group-hover:text-emerald-500 transition-colors mb-1">SECURE_LINK</div>
            <div className="font-bold">[OK]</div>
          </div>
          <div className="text-center group">
            <div className="text-emerald-900 group-hover:text-emerald-500 transition-colors mb-1">CORE_LOAD</div>
            <div className="font-bold">[READY]</div>
          </div>
          <div className="text-center group">
            <div className="text-emerald-900 group-hover:text-emerald-500 transition-colors mb-1">UPLINK_UP</div>
            <div className="font-bold text-cyan-500">[ACTIVE]</div>
          </div>
        </div>
      </div>
      
      {/* Sub-labeling at the bottom */}
      <div className="absolute bottom-8 text-[8px] text-gray-800 font-mono uppercase tracking-[1em] opacity-30">
        Authorized Access Only // Terminal ID: 0xFF2A
      </div>
    </div>
  );
};

export default Overlay;
