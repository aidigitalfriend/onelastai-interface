import React, { useState } from 'react';
import { Settings, Sliders, Cpu, Save, RefreshCw, Zap, CreditCard, ChevronDown } from 'lucide-react';
import { SettingsState } from '../types';
import { NEURAL_PRESETS } from '../constants';
import { Providers, getCreditPackages, createCheckout, CreditPackage } from '../services/apiService';

interface SettingsPanelProps {
  settings: SettingsState;
  onChange: (settings: SettingsState) => void;
  onApplyPreset: (type: string) => void;
  onReset: () => void;
  isOpen: boolean;
  providers?: Providers;
  credits?: number;
  onCreditsChange?: (credits: number) => void;
}

// Provider display info (Custom branded names)
const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string }> = {
  anthropic: { name: 'Maula AI', icon: '🧠', color: 'from-orange-500/20 to-orange-900/10' },
  openai: { name: 'One Last AI', icon: '🤖', color: 'from-green-500/20 to-green-900/10' },
  gemini: { name: 'Planner', icon: '✨', color: 'from-blue-500/20 to-blue-900/10' },
  mistral: { name: 'Code Expert', icon: '🌀', color: 'from-purple-500/20 to-purple-900/10' },
  xai: { name: 'Designer', icon: '⚡', color: 'from-cyan-500/20 to-cyan-900/10' },
  groq: { name: 'Speed AI', icon: '🚀', color: 'from-yellow-500/20 to-yellow-900/10' },
  cerebras: { name: 'Neural Core', icon: '🔮', color: 'from-pink-500/20 to-pink-900/10' },
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  settings, 
  onChange, 
  onApplyPreset, 
  onReset, 
  isOpen,
  providers = {},
  credits = 0,
  onCreditsChange
}) => {
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const currentProviderInfo = PROVIDER_INFO[settings.provider] || PROVIDER_INFO.anthropic;
  const availableProviders = Object.keys(providers).filter(p => providers[p as keyof Providers]);
  
  // Get models for current provider
  const currentProviderData = providers[settings.provider as keyof Providers];
  const availableModels = currentProviderData?.models ? Object.keys(currentProviderData.models) : [];

  const handleProviderChange = (provider: string) => {
    const providerData = providers[provider as keyof Providers];
    const firstModel = providerData?.models ? Object.keys(providerData.models)[0] : '';
    onChange({ ...settings, provider, model: firstModel });
  };

  const handleBuyCredits = async () => {
    setLoadingPackages(true);
    const packages = await getCreditPackages();
    setCreditPackages(packages);
    setLoadingPackages(false);
    setShowCreditsModal(true);
  };

  const handlePurchase = async (packageId: string) => {
    const result = await createCheckout(packageId);
    if (result?.url) {
      window.open(result.url, '_blank');
    }
  };

  return (
    <>
      <aside className={`absolute top-0 right-0 h-full w-[85%] sm:w-72 md:w-80 bg-[#0a0a0a]/98 backdrop-blur-xl border-l border-gray-800/50 p-5 transition-transform duration-500 ease-out z-[55] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center gap-3 mb-6 border-b border-gray-900 pb-4">
          <Settings size={18} className="text-cyan-500" />
          <h2 className="text-cyan-400 font-bold glow-cyan uppercase tracking-tighter text-sm font-mono">
            NEURAL_CONFIG
          </h2>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6 text-xs font-mono pr-1">
          
          {/* Credits Display */}
          <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-amber-900/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard size={12} className="text-yellow-400" />
                <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-[9px]">Credits</h3>
              </div>
              <span className="text-2xl font-bold text-yellow-300">{credits}</span>
            </div>
            <button
              onClick={handleBuyCredits}
              className="w-full mt-2 p-2 rounded border border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 text-[9px] font-bold uppercase tracking-wider transition-all"
            >
              Buy Credits
            </button>
          </div>

          {/* Provider Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-emerald-400" />
              <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-[9px]">AI Provider</h3>
            </div>
            <div className="relative">
              <select
                value={settings.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full bg-black/80 border border-gray-800 rounded-lg p-3 text-white appearance-none cursor-pointer focus:border-emerald-500/50 focus:outline-none text-[11px] uppercase font-bold tracking-wider"
              >
                {availableProviders.length > 0 ? (
                  availableProviders.map(provider => (
                    <option key={provider} value={provider}>
                      {PROVIDER_INFO[provider]?.icon} {PROVIDER_INFO[provider]?.name || provider}
                    </option>
                  ))
                ) : (
                  <option value="anthropic">🧠 Anthropic</option>
                )}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cpu size={12} className="text-cyan-400" />
              <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-[9px]">Model</h3>
            </div>
            <div className="relative">
              <select
                value={settings.model}
                onChange={(e) => onChange({ ...settings, model: e.target.value })}
                className="w-full bg-black/80 border border-gray-800 rounded-lg p-3 text-white appearance-none cursor-pointer focus:border-cyan-500/50 focus:outline-none text-[10px] font-mono"
              >
                {availableModels.length > 0 ? (
                  availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))
                ) : (
                  <option value={settings.model}>{settings.model}</option>
                )}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Active Engine Display */}
          <div className={`p-4 bg-gradient-to-r ${currentProviderInfo.color} border border-emerald-500/30 rounded-xl`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{currentProviderInfo.icon}</span>
              <div>
                <div className="text-xs font-bold text-white truncate max-w-[180px]">{settings.model}</div>
                <div className="text-[9px] text-gray-400 uppercase tracking-wider">{currentProviderInfo.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[8px] text-emerald-500/70">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="uppercase tracking-widest">Connected</span>
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-green-500 font-bold uppercase text-[9px] tracking-widest">System Prompt</h3>
            </div>
            <textarea 
              value={settings.customPrompt}
              onChange={(e) => onChange({ ...settings, customPrompt: e.target.value })}
              rows={4} 
              className="w-full bg-black/60 border border-gray-800 rounded-lg p-3 text-gray-400 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 resize-none text-[10px] leading-relaxed transition-all"
              placeholder="Input system instructions..."
            />
          </div>

          {/* Neural Presets */}
          <div className="space-y-3">
            <h3 className="text-yellow-500 font-bold uppercase text-[9px] tracking-widest">Presets</h3>
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
          <div className="space-y-5 pt-2">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-gray-500 uppercase text-[9px] tracking-widest flex items-center gap-2">
                  <Sliders size={10} /> Temperature
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
                  <Save size={10} /> Max Tokens
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

          {/* Protocol ID */}
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
          className="mt-6 w-full p-3 rounded-lg border border-red-900/30 bg-red-950/10 hover:bg-red-900/20 text-red-500 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group"
        >
          <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
          Reset
        </button>
      </aside>

      {/* Credits Modal */}
      {showCreditsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wider">Buy Credits</h2>
              <button
                onClick={() => setShowCreditsModal(false)}
                className="text-gray-500 hover:text-white transition-colors text-2xl"
              >
                &times;
              </button>
            </div>
            
            {loadingPackages ? (
              <div className="text-center py-8 text-gray-500">Loading packages...</div>
            ) : creditPackages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No packages available</div>
            ) : (
              <div className="space-y-4">
                {creditPackages.map(pkg => (
                  <div
                    key={pkg.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-cyan-500/50 ${
                      pkg.popular 
                        ? 'border-yellow-500/50 bg-yellow-500/5' 
                        : 'border-gray-800 bg-gray-900/30'
                    }`}
                    onClick={() => handlePurchase(pkg.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-white font-bold flex items-center gap-2">
                          {pkg.name}
                          {pkg.popular && (
                            <span className="text-[8px] bg-yellow-500 text-black px-2 py-0.5 rounded-full uppercase font-bold">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 text-xs">{pkg.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-400">{pkg.credits}</div>
                        <div className="text-gray-500 text-xs">credits</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-emerald-400 font-bold text-lg">{pkg.priceDisplay}</div>
                      {pkg.savings && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                          {pkg.savings}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPanel;
