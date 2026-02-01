import React from 'react';
import { Columns, Menu, Trash2, Lock, ChevronRight, Coins } from 'lucide-react';

interface HeaderProps {
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleNav: () => void;
  onToggleCanvas: () => void;
  onClear: () => void;
  onLock: () => void;
  leftOpen: boolean;
  rightOpen: boolean;
  credits?: number;
  user?: any;
}

const Header: React.FC<HeaderProps> = ({
  onToggleLeft, 
  onToggleRight, 
  onToggleNav, 
  onToggleCanvas,
  onClear, 
  onLock,
  leftOpen,
  rightOpen,
  credits = 0,
  user
}) => {
  return (
    <header className="bg-[#111]/90 backdrop-blur-md border-b border-gray-700 p-3 flex items-center justify-between flex-shrink-0 z-50">
      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={onToggleLeft}
          className={`text-gray-400 hover:text-white hover-glow p-1 transition-colors ${leftOpen ? 'text-green-400' : ''}`}
        >
          <Columns size={20} />
        </button>

        <button 
          onClick={onToggleNav}
          className="text-green-400 hover:text-white p-1 transition-colors"
        >
          <Menu size={24} />
        </button>

        <button 
          onClick={onClear}
          className="text-red-400 hover:text-red-300 p-1 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Credits Display */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-3 py-1">
          <Coins size={14} className="text-yellow-400" />
          <span className="text-yellow-300 font-bold text-sm font-mono">{credits}</span>
        </div>
        
        {user && (
          <div className="hidden md:block text-[10px] text-gray-500 uppercase tracking-wider truncate max-w-[100px]">
            {user.email?.split('@')[0]}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile Credits */}
        <div className="flex sm:hidden items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-1">
          <Coins size={12} className="text-yellow-400" />
          <span className="text-yellow-300 font-bold text-xs font-mono">{credits}</span>
        </div>

        <button 
          onClick={onToggleCanvas}
          className="text-cyan-400 hover:text-emerald-400 font-mono text-sm px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] active:scale-95"
          title="Open Canvas Studio"
        >
          &lt;/&gt;
        </button>
        
        <button 
          onClick={onLock}
          className="bg-gray-800/80 hover:bg-gray-700/80 text-red-400 p-2 rounded-full transition-colors"
        >
          <Lock size={18} />
        </button>

        <button 
          onClick={onToggleRight}
          className={`text-gray-400 hover:text-white hover-glow p-1 transition-colors ${rightOpen ? 'text-cyan-400' : ''}`}
        >
          <ChevronRight size={24} className={rightOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>
    </header>
  );
};

export default Header;
