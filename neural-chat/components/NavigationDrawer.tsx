
import React, { useEffect, useState, useRef } from 'react';
import { X, Cpu, Activity, Zap, ChevronRight, Check, TrendingUp, Clock, Server, Gauge, CreditCard, History, Coins } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { NavItem, SettingsState } from '../types';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onModuleSelect: (item: NavItem) => void;
  currentSettings: SettingsState;
  onSettingsChange: (settings: SettingsState) => void;
}

// AI Providers with their models - exported for use in SettingsPanel
export const AI_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', icon: '🅰️', color: 'from-orange-500 to-amber-600', models: ['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3 Haiku'], status: 'active' },
  { id: 'mistral', name: 'Mistral', icon: '🌀', color: 'from-blue-500 to-indigo-600', models: ['Mistral Large', 'Mistral Medium', 'Mixtral 8x7B'], status: 'active' },
  { id: 'xai', name: 'xAI', icon: '✖️', color: 'from-gray-400 to-gray-600', models: ['Grok-2', 'Grok-2 Mini'], status: 'active' },
  { id: 'cerebras', name: 'Cerebras', icon: '🧠', color: 'from-purple-500 to-pink-600', models: ['Cerebras-GPT', 'Cerebras-13B'], status: 'beta' },
  { id: 'groq', name: 'Groq', icon: '⚡', color: 'from-green-500 to-emerald-600', models: ['Llama 3.3 70B', 'Mixtral', 'Gemma 7B'], status: 'active' },
  { id: 'openai', name: 'OpenAI', icon: '🤖', color: 'from-teal-500 to-cyan-600', models: ['GPT-4o', 'GPT-4 Turbo', 'GPT-3.5'], status: 'active' },
  { id: 'gemini', name: 'Gemini', icon: '💎', color: 'from-blue-400 to-violet-600', models: ['Gemini 2.0 Flash', 'Gemini 1.5 Pro', 'Gemini Ultra'], status: 'active' },
];

// Dashboard types and mock data
interface UsageRecord {
  id: string;
  type: 'chat' | 'api_call' | 'voice';
  model: string;
  provider: string;
  credits: number;
  tokens: { input: number; output: number };
  timestamp: number;
  description: string;
  duration: number;
  status: 'completed' | 'streaming' | 'failed';
}

interface BillingRecord {
  id: string;
  amount: number;
  credits: number;
  status: 'completed' | 'pending' | 'failed';
  date: number;
  method: string;
}

const MOCK_USAGE: UsageRecord[] = [
  { id: '1', type: 'chat', model: 'Claude 3.5 Sonnet', provider: 'Anthropic', credits: 3, tokens: { input: 850, output: 2100 }, timestamp: Date.now() - 180000, description: 'Neural chat conversation', duration: 3200, status: 'completed' },
  { id: '2', type: 'chat', model: 'GPT-4o', provider: 'OpenAI', credits: 4, tokens: { input: 1200, output: 2800 }, timestamp: Date.now() - 600000, description: 'Code review discussion', duration: 4100, status: 'completed' },
  { id: '3', type: 'voice', model: 'Gemini 2.0 Flash', provider: 'Gemini', credits: 5, tokens: { input: 500, output: 1500 }, timestamp: Date.now() - 1200000, description: 'Voice assistant query', duration: 2800, status: 'completed' },
  { id: '4', type: 'chat', model: 'Grok-2', provider: 'xAI', credits: 3, tokens: { input: 650, output: 1800 }, timestamp: Date.now() - 2400000, description: 'Architecture planning', duration: 3600, status: 'completed' },
  { id: '5', type: 'api_call', model: 'Llama 3.3 70B', provider: 'Groq', credits: 1, tokens: { input: 200, output: 600 }, timestamp: Date.now() - 3600000, description: 'Quick code completion', duration: 800, status: 'completed' },
  { id: '6', type: 'chat', model: 'Claude 3 Opus', provider: 'Anthropic', credits: 6, tokens: { input: 1500, output: 4200 }, timestamp: Date.now() - 7200000, description: 'Deep research session', duration: 8200, status: 'completed' },
  { id: '7', type: 'chat', model: 'Mistral Large', provider: 'Mistral', credits: 3, tokens: { input: 900, output: 2400 }, timestamp: Date.now() - 14400000, description: 'Debugging assistance', duration: 4500, status: 'completed' },
  { id: '8', type: 'voice', model: 'Gemini 1.5 Pro', provider: 'Gemini', credits: 4, tokens: { input: 400, output: 1200 }, timestamp: Date.now() - 28800000, description: 'Voice brainstorming', duration: 5200, status: 'completed' },
];

const MOCK_BILLING: BillingRecord[] = [
  { id: 'b1', amount: 9.99, credits: 100, status: 'completed', date: Date.now() - 604800000, method: 'Visa •••• 4242' },
  { id: 'b2', amount: 29.99, credits: 350, status: 'completed', date: Date.now() - 2592000000, method: 'Visa •••• 4242' },
  { id: 'b3', amount: 49.99, credits: 600, status: 'completed', date: Date.now() - 5184000000, method: 'PayPal' },
];

const CREDIT_PACKAGES = [
  { credits: 50, price: 5.00, popular: false, savings: null },
  { credits: 100, price: 9.99, popular: false, savings: '5% off' },
  { credits: 350, price: 29.99, popular: true, savings: '15% off' },
  { credits: 600, price: 49.99, popular: false, savings: '20% off' },
  { credits: 1500, price: 99.99, popular: false, savings: '35% off' },
];

type DashboardTab = 'providers' | 'requests' | 'usage' | 'billing' | 'credits';

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ isOpen, onClose, onModuleSelect, currentSettings, onSettingsChange }) => {
  const [renderNodes, setRenderNodes] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('providers');
  const tabContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize from currentSettings
  const [selectedProvider, setSelectedProvider] = useState(currentSettings?.provider || 'anthropic');
  const [selectedModel, setSelectedModel] = useState(currentSettings?.model || 'Claude 3.5 Sonnet');
  
  // Credits state
  const [credits, setCredits] = useState({ available: 127, used: 373, total: 500 });
  
  // Live stats simulation
  const [stats, setStats] = useState({
    tokensUsed: 124500,
    tokensLimit: 500000,
    successRate: 98.5,
    avgLatency: 245,
    requestsToday: 1247,
    activeConnections: 3,
    uptime: 99.9,
    costToday: 12.45
  });

  // Tab definitions
  const tabs: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { id: 'providers', label: 'Providers', icon: <Cpu size={14} /> },
    { id: 'requests', label: 'Requests', icon: <History size={14} /> },
    { id: 'usage', label: 'Usage', icon: <Activity size={14} /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard size={14} /> },
    { id: 'credits', label: 'Credits', icon: <Coins size={14} /> },
  ];

  // Helper functions
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Calculate provider stats
  const providerStats = AI_PROVIDERS.map(p => ({
    ...p,
    requests: MOCK_USAGE.filter(u => u.provider === p.name).length,
    credits: MOCK_USAGE.filter(u => u.provider === p.name).reduce((sum, u) => sum + u.credits, 0),
    tokens: MOCK_USAGE.filter(u => u.provider === p.name).reduce((sum, u) => sum + u.tokens.input + u.tokens.output, 0),
  }));

  // Sync with external settings when drawer opens
  useEffect(() => {
    if (isOpen && currentSettings) {
      setSelectedProvider(currentSettings.provider || 'anthropic');
      setSelectedModel(currentSettings.model || 'Claude 3.5 Sonnet');
    }
  }, [isOpen, currentSettings]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setRenderNodes(true), 200);
      return () => clearTimeout(timer);
    } else {
      setRenderNodes(false);
    }
  }, [isOpen]);

  // Update settings when provider/model changes
  const handleProviderChange = (providerId: string, model?: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      const newModel = model || provider.models[0];
      setSelectedProvider(providerId);
      setSelectedModel(newModel);
      onSettingsChange({
        ...currentSettings,
        provider: providerId,
        model: newModel
      });
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    onSettingsChange({
      ...currentSettings,
      model: model
    });
  };

  // Simulate live updates
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        tokensUsed: prev.tokensUsed + Math.floor(Math.random() * 100),
        avgLatency: 200 + Math.floor(Math.random() * 100),
        requestsToday: prev.requestsToday + Math.floor(Math.random() * 3),
        successRate: 97 + Math.random() * 3
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const currentProvider = AI_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div 
      className={`fixed inset-0 bg-[#050505]/98 backdrop-blur-3xl z-[200] transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col shadow-[0_-30px_100px_rgba(0,0,0,0.9)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* Decorative Matrix Scan Line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="w-full h-full bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[length:100%_4px] animate-[pulse_3s_infinite]"></div>
      </div>

      {/* Compact Header with Tabs */}
      <div className="flex-shrink-0 relative z-10 border-b border-gray-800/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Cpu size={20} className="text-emerald-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-emerald-400 font-bold text-lg tracking-[0.2em] font-mono leading-none">
                AI_DASHBOARD
              </h3>
              <p className="text-[9px] text-emerald-600/60 uppercase font-mono tracking-[0.3em] mt-1">
                STATUS: <span className="text-emerald-400">ONLINE</span> | CREDITS: <span className="text-cyan-400">{credits.available}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-red-500 p-2 hover:bg-red-500/5 rounded-full border border-gray-800 hover:border-red-500/20 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Horizontal Scrollable Tabs */}
        <div 
          ref={tabContainerRef}
          className="flex items-center gap-2 px-6 pb-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          style={{ scrollbarWidth: 'thin' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-gray-900/50 text-gray-500 border border-gray-800 hover:border-cyan-500/30 hover:text-gray-400'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Content Area - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 relative z-10 custom-scrollbar">
        
        {/* PROVIDERS TAB */}
        {activeTab === 'providers' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Provider Selection Grid */}
            <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Select Provider</span>
                <span className="text-[10px] text-emerald-500/70 font-mono">7 PROVIDERS AVAILABLE</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {AI_PROVIDERS.map((provider, idx) => (
                  <button 
                    key={provider.id}
                    onClick={() => handleProviderChange(provider.id)}
                    style={{ animationDelay: `${idx * 50}ms`, display: renderNodes ? 'flex' : 'none' }}
                    className={`stagger-node relative group p-3 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                      selectedProvider === provider.id
                        ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                        : 'border-gray-800/50 bg-black/40 hover:border-emerald-500/30 hover:bg-emerald-500/5'
                    }`}
                  >
                    {selectedProvider === provider.id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check size={10} className="text-black" />
                      </div>
                    )}
                    <span className="text-2xl">{provider.icon}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${selectedProvider === provider.id ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {provider.name}
                    </span>
                    {provider.status === 'beta' && (
                      <span className="absolute top-1 left-1 text-[7px] px-1 bg-purple-500/30 text-purple-400 rounded">BETA</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Model Selection */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mr-2">Models:</span>
                {currentProvider?.models.map((model) => (
                  <button
                    key={model}
                    onClick={() => handleModelChange(model)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${
                      selectedModel === model
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        : 'bg-gray-900/50 text-gray-500 border border-gray-800 hover:border-emerald-500/30 hover:text-gray-400'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Model Info Banner */}
            <div className={`p-4 rounded-xl bg-gradient-to-r ${currentProvider?.color} bg-opacity-10 border border-emerald-500/20`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{currentProvider?.icon}</span>
                  <div>
                    <div className="text-lg font-bold text-white">{selectedModel}</div>
                    <div className="text-[10px] text-gray-300 uppercase tracking-widest">{currentProvider?.name} • Active Session</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs text-emerald-400 font-mono">LIVE</span>
                </div>
              </div>
            </div>

            {/* Gauge Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Token Usage */}
              <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Tokens Used</span>
                  <Gauge size={14} className="text-cyan-500" />
                </div>
                <div className="relative h-24 flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#1f2937" strokeWidth="6" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#06b6d4" strokeWidth="6"
                      strokeDasharray={`${(stats.tokensUsed / stats.tokensLimit) * 220} 220`}
                      strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-lg font-bold text-cyan-400">{Math.round((stats.tokensUsed / stats.tokensLimit) * 100)}%</div>
                    <div className="text-[8px] text-gray-500 uppercase">Used</div>
                  </div>
                </div>
                <div className="text-center text-[10px] text-gray-400 font-mono mt-2">
                  {(stats.tokensUsed / 1000).toFixed(1)}K / {(stats.tokensLimit / 1000).toFixed(0)}K
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Success Rate</span>
                  <TrendingUp size={14} className="text-emerald-500" />
                </div>
                <div className="relative h-24 flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#1f2937" strokeWidth="6" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#10b981" strokeWidth="6"
                      strokeDasharray={`${(stats.successRate / 100) * 220} 220`}
                      strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-lg font-bold text-emerald-400">{stats.successRate.toFixed(1)}%</div>
                    <div className="text-[8px] text-gray-500 uppercase">Rate</div>
                  </div>
                </div>
                <div className="text-center text-[10px] text-gray-400 font-mono mt-2">
                  {stats.requestsToday} requests today
                </div>
              </div>

              {/* Latency */}
              <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4 hover:border-yellow-500/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Avg Latency</span>
                  <Clock size={14} className="text-yellow-500" />
                </div>
                <div className="relative h-24 flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#1f2937" strokeWidth="6" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#eab308" strokeWidth="6"
                      strokeDasharray={`${Math.min((stats.avgLatency / 500) * 220, 220)} 220`}
                      strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-lg font-bold text-yellow-400">{stats.avgLatency}</div>
                    <div className="text-[8px] text-gray-500 uppercase">MS</div>
                  </div>
                </div>
                <div className="text-center text-[10px] text-gray-400 font-mono mt-2">Target: &lt;300ms</div>
              </div>

              {/* Uptime */}
              <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4 hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Uptime</span>
                  <Server size={14} className="text-purple-500" />
                </div>
                <div className="relative h-24 flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#1f2937" strokeWidth="6" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#a855f7" strokeWidth="6"
                      strokeDasharray={`${(stats.uptime / 100) * 220} 220`}
                      strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-lg font-bold text-purple-400">{stats.uptime}%</div>
                    <div className="text-[8px] text-gray-500 uppercase">UP</div>
                  </div>
                </div>
                <div className="text-center text-[10px] text-gray-400 font-mono mt-2">Last 30 days</div>
              </div>
            </div>

            {/* Live Activity Chart */}
            <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Live Request Activity</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] text-gray-500">Success</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[9px] text-gray-500">Failed</span>
                  </div>
                </div>
              </div>
              <div className="h-32 flex items-end gap-1">
                {[...Array(48)].map((_, i) => {
                  const height = 20 + Math.random() * 80;
                  const isFailed = Math.random() > 0.95;
                  return (
                    <div key={i} className={`flex-1 rounded-t transition-all ${isFailed ? 'bg-red-500/60' : 'bg-emerald-500/40 hover:bg-emerald-500/60'}`}
                      style={{ height: `${height}%` }}></div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[8px] text-gray-600 font-mono">
                <span>24h ago</span>
                <span>12h ago</span>
                <span>Now</span>
              </div>
            </div>
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Recent Requests</span>
              <span className="text-[10px] text-cyan-500/70 font-mono">{MOCK_USAGE.length} TOTAL</span>
            </div>
            {MOCK_USAGE.map((record) => (
              <div key={record.id} className="bg-black/40 border border-gray-800/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      record.type === 'chat' ? 'bg-cyan-500/10 text-cyan-400' :
                      record.type === 'voice' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {record.type === 'chat' ? '💬' : record.type === 'voice' ? '🎙️' : '⚡'}
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">{record.description}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-1">
                        {record.provider} • {record.model}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-cyan-400 font-bold">-{record.credits} credits</div>
                    <div className="text-[9px] text-gray-600 mt-1">{formatTime(record.timestamp)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                    <span>IN: {record.tokens.input.toLocaleString()}</span>
                    <span>OUT: {record.tokens.output.toLocaleString()}</span>
                    <span>{(record.duration / 1000).toFixed(1)}s</span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded ${
                    record.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    record.status === 'streaming' ? 'bg-cyan-500/20 text-cyan-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {record.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* USAGE TAB */}
        {activeTab === 'usage' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Usage Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-all">
                <div className="text-2xl font-bold text-cyan-400">{MOCK_USAGE.length}</div>
                <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mt-1">Total Requests</div>
              </div>
              <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4 text-center hover:border-emerald-500/30 transition-all">
                <div className="text-2xl font-bold text-emerald-400">
                  {MOCK_USAGE.reduce((sum, u) => sum + u.tokens.input + u.tokens.output, 0).toLocaleString()}
                </div>
                <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mt-1">Total Tokens</div>
              </div>
              <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4 text-center hover:border-purple-500/30 transition-all">
                <div className="text-2xl font-bold text-purple-400">
                  {MOCK_USAGE.reduce((sum, u) => sum + u.credits, 0)}
                </div>
                <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mt-1">Credits Used</div>
              </div>
            </div>

            {/* Provider Breakdown */}
            <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Usage by Provider</span>
              </div>
              <div className="space-y-3">
                {providerStats.filter(p => p.requests > 0).map((provider) => (
                  <div key={provider.id} className="flex items-center gap-3">
                    <span className="text-xl">{provider.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-300">{provider.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{provider.requests} requests</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${provider.color} rounded-full`}
                          style={{ width: `${(provider.tokens / 20000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono w-16 text-right">{provider.tokens.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Billing Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-all">
                <div className="text-2xl font-bold text-cyan-400">
                  ${MOCK_BILLING.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}
                </div>
                <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mt-1">Total Spent</div>
              </div>
              <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4 text-center hover:border-emerald-500/30 transition-all">
                <div className="text-2xl font-bold text-emerald-400">
                  {MOCK_BILLING.reduce((sum, b) => sum + b.credits, 0)}
                </div>
                <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mt-1">Credits Purchased</div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-black/40 border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Transaction History</span>
              </div>
              <div className="space-y-3">
                {MOCK_BILLING.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <CreditCard size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm text-white">{record.credits} Credits</div>
                        <div className="text-[10px] text-gray-500">{record.method}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-emerald-400 font-bold">${record.amount.toFixed(2)}</div>
                      <div className="text-[9px] text-gray-600">{formatDate(record.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CREDITS TAB */}
        {activeTab === 'credits' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Credit Balance */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Available Credits</div>
                  <div className="text-4xl font-bold text-cyan-400 mt-1">{credits.available}</div>
                </div>
                <div className="p-4 bg-cyan-500/10 rounded-full border border-cyan-500/30">
                  <Coins size={32} className="text-cyan-400" />
                </div>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${(credits.available / credits.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                <span>{credits.used} used</span>
                <span>{credits.total} total</span>
              </div>
            </div>

            {/* Purchase Packages */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Purchase Credits</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {CREDIT_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.credits}
                    className={`relative p-4 rounded-xl border transition-all text-left ${
                      pkg.popular
                        ? 'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20'
                        : 'border-gray-800 bg-gray-900/50 hover:border-cyan-500/30'
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-2 right-2 px-2 py-0.5 bg-cyan-500 text-black text-[9px] font-bold rounded uppercase">
                        Popular
                      </div>
                    )}
                    <div className="text-xl font-bold text-white">{pkg.credits}</div>
                    <div className="text-[10px] text-gray-500 font-mono uppercase">Credits</div>
                    <div className="mt-2 text-lg font-bold text-cyan-400">${pkg.price.toFixed(2)}</div>
                    {pkg.savings && (
                      <div className="text-[9px] text-emerald-400 mt-1">{pkg.savings}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 bg-[#080808]/50 flex justify-between items-center border-t border-gray-800/50">
        <div className="flex items-center gap-3">
          <Activity size={14} className="text-emerald-600 animate-pulse" />
          <span className="text-[10px] text-emerald-500/70 font-mono uppercase tracking-widest">
            NEURAL_SYNC: {selectedModel.toUpperCase().replace(/ /g, '_')}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
            <Coins size={12} className="text-cyan-500" />
            <span>{credits.available} credits</span>
          </div>
          <div className="flex gap-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`w-1 h-3 ${i < 6 ? 'bg-emerald-500/30' : 'bg-gray-800'} animate-pulse`} style={{ animationDelay: `${i * 100}ms` }}></div>
            ))}
          </div>
          <Zap size={14} className="text-emerald-900/50" />
        </div>
      </div>

      <style>{`
        @keyframes stagger-in {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .stagger-node { animation: stagger-in 0.3s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.5); }
      `}</style>
    </div>
  );
};

export default NavigationDrawer;
