
import React, { useState } from 'react';
import { Search, Plus, MoreVertical, Terminal, Share2, Copy, Download, Trash2, X, Archive } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ sessions, onSelect, onCreate, onDelete, isOpen }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleAction = (e: React.MouseEvent, id: string, action: string) => {
    e.stopPropagation();
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    switch (action) {
      case 'share':
        navigator.clipboard.writeText(`NEURAL_UPLINK_PROTOCOL_VERIFY_${id}`);
        alert("Encrypted Uplink ID copied.");
        break;
      case 'copy':
        navigator.clipboard.writeText(JSON.stringify(session, null, 2));
        alert("Session Manifest copied to clipboard.");
        break;
      case 'download':
        // Simulating ZIP by creating a JSON bundle with all assets
        const data = {
          protocol: "NEURAL_LINK_V3",
          session: session,
          timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PROTOCOL_BUNDLE_${session.name.replace(/\s+/g, '_')}.json`;
        a.click();
        break;
      case 'delete':
        if (confirm(`PURGE_AUTHORIZATION: Delete [${session.name}]?`)) {
          onDelete(id);
        }
        break;
    }
    setActiveMenu(null);
  };

  return (
    <aside className={`absolute top-0 left-0 h-full w-[85%] sm:w-64 md:w-72 bg-[#0a0a0a]/98 backdrop-blur-xl border-r border-gray-800/50 p-4 sm:p-6 transition-transform duration-500 ease-out z-[100] flex flex-col shadow-[20px_0_60px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 mb-6">
        <Terminal size={18} className="text-green-500" />
        <h2 className="text-green-400 font-bold glow-green uppercase tracking-tighter text-sm font-mono">
          VAULT_0xFF
        </h2>
      </div>
      
      <div className="flex space-x-2 mb-6">
        <button onClick={onCreate} className="flex-shrink-0 bg-green-500/10 hover:bg-green-500/20 text-green-400 p-2 rounded border border-green-500/30 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]">
          <Plus size={18} />
        </button>
        <div className="relative flex-grow">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="text" placeholder="Search logs..." className="w-full pl-9 pr-3 py-2 text-xs bg-black/60 text-gray-400 border border-gray-800 rounded focus:outline-none focus:border-green-500/50 font-mono transition-all" />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-1 relative">
        {sessions.map(s => (
          <div key={s.id} className="relative group">
            <button
              onClick={() => onSelect(s.id)}
              className={`w-full text-left flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${s.active ? 'bg-green-500/10 border-green-500/40 text-white shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]' : 'border-gray-900 text-gray-600 hover:border-gray-800 hover:bg-gray-800/20 hover:text-gray-400'}`}
            >
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-[11px] font-bold font-mono truncate uppercase tracking-wider">{s.name}</span>
                <span className="text-[8px] opacity-60 uppercase font-mono">{s.messages.length} data pkts</span>
              </div>
              <div onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === s.id ? null : s.id); }} className="p-1 hover:bg-white/5 rounded transition-colors">
                <MoreVertical size={14} className="text-gray-700 hover:text-gray-400" />
              </div>
            </button>

            {activeMenu === s.id && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-[#0d0d0d] border border-gray-800 rounded shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 border-b border-gray-800 flex justify-between items-center bg-black/60">
                  <span className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Protocol Actions</span>
                  <button onClick={() => setActiveMenu(null)} className="text-gray-600 hover:text-white"><X size={10}/></button>
                </div>
                <div className="p-1">
                  <button onClick={(e) => handleAction(e, s.id, 'share')} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400 rounded transition-colors uppercase font-mono">
                    <Share2 size={12} /> Share Uplink
                  </button>
                  <button onClick={(e) => handleAction(e, s.id, 'copy')} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400 rounded transition-colors uppercase font-mono">
                    <Copy size={12} /> Copy Manifest
                  </button>
                  <button onClick={(e) => handleAction(e, s.id, 'download')} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-gray-400 hover:bg-purple-500/10 hover:text-purple-400 rounded transition-colors uppercase font-mono">
                    <Archive size={12} /> Sync Bundle (.JSON)
                  </button>
                  <div className="my-1 border-t border-gray-800/50"></div>
                  <button onClick={(e) => handleAction(e, s.id, 'delete')} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-red-900 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors uppercase font-mono">
                    <Trash2 size={12} /> Purge Session
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-900">
        <div className="flex justify-between items-center opacity-30 text-[8px] font-mono uppercase tracking-widest">
            <span>Sec_Layer_v3</span>
            <span>FS_CRYPT_ACTIVE</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
