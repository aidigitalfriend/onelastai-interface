
import React from 'react';
import { Settings, Sliders, Cpu, Save, RefreshCw, Link2, Box, Zap } from 'lucide-react';
import { SettingsState } from '../types';
import { NEURAL_PRESETS, PROVIDER_CONFIG } from '../constants';
import { AI_PROVIDERS } from './NavigationDrawer';

interface SettingsPanelProps {
  settings: SettingsState;
  onChange: (settings: SettingsState) => void;
  onApplyPreset: (type: string) => void;
  onReset: () => void;
  isOpen: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, onApplyPreset, onReset, isOpen }) => {
  // Find current provider from AI_PROVIDERS (the new drawer providers)
  const currentProvider = AI_PROVIDERS.find(p => p.id === settings.provider) || AI_PROVIDERS[0];

  return (
    <aside className={`absolute top-0 right-0 h-full w-[85%] sm:w-72 md:w-80 bg-[#0a0a0a]/98 backdrop-blur-xl border-l border-gray-800/50 p-5 transition-transform duration-500 ease-out z-[55] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center gap-3 mb-6 border-b border-gray-900 pb-4">
        <Settings size={18} className="text-cyan-500" />
        <h2 className="text-cyan-400 font-bold glow-cyan uppercase tracking-tighter text-sm font-mono">
          NEURAL_CONFIG
        </h2>
      </div>
      
      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-8 text-xs font-mono pr-1">
        {/* Active Provider/Model Display - Read Only */}
        <div className={`p-4 bg-gradient-to-r ${currentProvider.color} bg-opacity-10 border border-emerald-500/30 rounded-xl`}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={12} className="text-emerald-400" />
            <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-[9px]">Active Engine</h3>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{currentProvider.icon}</span>
            <div>
              <div className="text-sm font-bold text-white">{settings.model}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wider">{currentProvider.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[8px] text-emerald-500/70">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="uppercase tracking-widest">Connected • Use hamburger menu to switch</span>
          </div>
        </div>

        {/* Runtime Overview */}
        <div className="p-4 bg-cyan-950/10 border border-cyan-500/20 rounded-lg space-y-3">
            <div className="flex items-center gap-2 mb-1">
                <Cpu size={12} className="text-cyan-400" />
                <h3 className="text-cyan-500 font-bold uppercase tracking-widest text-[9px]">Engine State</h3>
            </div>
          <div className="grid grid-cols-2 gap-y-2 text-[9px]">
            <span className="text-gray-600 uppercase">Co-Processor:</span> <span className="text-gray-300">ACTIVE</span>
            <span className="text-gray-600 uppercase">Context:</span> <span className="text-gray-300">{(settings.maxTokens / 1024).toFixed(1)}k PKTS</span>
            <span className="text-gray-600 uppercase">Precision:</span> <span className="text-gray-300">FP16</span>
            <span className="text-gray-600 uppercase">Provider:</span> <span className="text-emerald-400">{currentProvider.name.toUpperCase()}</span>
          </div>
        </div>

        {/* Persona */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-green-500 font-bold uppercase text-[9px] tracking-widest">Directive Alpha</h3>
            <span className="text-[8px] text-gray-700">READ_ONLY: OFF</span>
          </div>
          <textarea 
            value={settings.customPrompt}
            onChange={(e) => onChange({ ...settings, customPrompt: e.target.value })}
            rows={5} 
            className="w-full bg-black/60 border border-gray-800 rounded-lg p-3 text-gray-400 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 resize-none text-[10px] leading-relaxed transition-all"
            placeholder="Input system instructions..."
          />
        </div>

        {/* Neural Presets */}
        <div className="space-y-3">
          <h3 className="text-yellow-500 font-bold uppercase text-[9px] tracking-widest">Core Presets</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(NEURAL_PRESETS).map(t => (
              <button 
                key={t}
                onClick={() => onApplyPreset(t)}
                className="text-[9px] uppercase p-2.5 rounded border border-gray-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-gray-600 hover:text-cyan-300 transition-all font-bold tracking-wider"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Precision Sliders */}
        <div className="space-y-6 pt-2">
          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-gray-500 uppercase text-[9px] tracking-widest flex items-center gap-2">
                    <Sliders size={10} /> Volatility
                </label>
                <span className="text-cyan-400 font-bold tabular-nums">{settings.temperature}</span>
            </div>
            <input 
              type="range" 
              min="0" max="2" step="0.1" 
              value={settings.temperature}
              onChange={(e) => onChange({ ...settings, temperature: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-gray-500 uppercase text-[9px] tracking-widest flex items-center gap-2">
                    <Save size={10} /> Output Budget
                </label>
                <span className="text-cyan-400 font-bold tabular-nums">{settings.maxTokens}</span>
            </div>
            <input 
              type="range" 
              min="256" max="4096" step="128" 
              value={settings.maxTokens}
              onChange={(e) => onChange({ ...settings, maxTokens: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Global Identifiers */}
        <div className="space-y-4 pt-4 border-t border-gray-900">
          <div className="flex flex-col space-y-2">
            <label className="text-gray-700 uppercase text-[9px] tracking-widest">Protocol ID</label>
            <input 
              type="text" 
              value={settings.agentName}
              onChange={(e) => onChange({ ...settings, agentName: e.target.value })}
              className="bg-black border border-gray-800 rounded p-2 text-gray-400 focus:border-green-500/50 outline-none text-[10px] uppercase font-bold tracking-widest"
            />
          </div>
        </div>
      </div>
      
      <button 
        onClick={onReset}
        className="mt-8 w-full p-4 rounded-lg border border-red-900/30 bg-red-950/10 hover:bg-red-900/20 text-red-500 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group"
      >
        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
        Factory Wipe
      </button>
    </aside>
  );
};

export default SettingsPanel;
