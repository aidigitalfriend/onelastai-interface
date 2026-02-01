
import React, { useState } from 'react';

interface UsageRecord {
  id: string;
  type: 'generation' | 'edit' | 'api_call' | 'chat';
  model: string;
  provider: string;
  credits: number;
  timestamp: number;
  description: string;
  app: 'canvas' | 'main';
}

interface BillingRecord {
  id: string;
  amount: number;
  credits: number;
  status: 'completed' | 'pending' | 'failed';
  date: number;
  method: string;
}

interface ProjectHistory {
  id: string;
  name: string;
  type: 'canvas' | 'main';
  createdAt: number;
  lastModified: number;
  status: 'active' | 'archived' | 'deleted';
  creditsUsed: number;
}

interface ChatHistory {
  id: string;
  title: string;
  app: 'canvas' | 'main';
  model: string;
  provider: string;
  messages: number;
  timestamp: number;
  creditsUsed: number;
}

interface ModelUsage {
  model: string;
  provider: string;
  credits: number;
  calls: number;
  color: string;
}

interface DailyActivity {
  day: string;
  date: string;
  canvas: number;
  main: number;
  total: number;
}

interface CanvasNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (action: string) => void;
  isDarkMode: boolean;
}

// LLM Providers with their models
const LLM_PROVIDERS = {
  'OpenAI': {
    icon: '🤖',
    color: '#10b981',
    models: ['GPT-4o', 'GPT-4o Mini', 'GPT-4 Turbo', 'GPT-3.5 Turbo', 'o1-preview', 'o1-mini']
  },
  'Anthropic': {
    icon: '🧠',
    color: '#22d3ee',
    models: ['Claude 3.5 Sonnet', 'Claude 3.5 Haiku', 'Claude 3 Opus', 'Claude 3 Sonnet', 'Claude 3 Haiku']
  },
  'Google': {
    icon: '🔮',
    color: '#8b5cf6',
    models: ['Gemini 2.0 Flash', 'Gemini 1.5 Pro', 'Gemini 1.5 Flash', 'Gemini 1.0 Pro']
  },
  'xAI': {
    icon: '⚡',
    color: '#f59e0b',
    models: ['Grok 3', 'Grok 3 Mini', 'Grok 2', 'Grok 2 Mini']
  },
  'Mistral': {
    icon: '🌀',
    color: '#ec4899',
    models: ['Mistral Large', 'Mistral Medium', 'Mistral Small', 'Codestral', 'Mixtral 8x22B', 'Mixtral 8x7B']
  },
  'Cerebras': {
    icon: '🔥',
    color: '#f97316',
    models: ['Cerebras-GPT 13B', 'Cerebras-GPT 6.7B', 'Cerebras-GPT 2.7B', 'Cerebras-GPT 1.3B']
  },
  'Groq': {
    icon: '🦙',
    color: '#ef4444',
    models: ['Llama 3.3 70B', 'Llama 3.1 70B', 'Llama 3.1 8B', 'Mixtral 8x7B', 'Gemma 2 9B']
  },
  'Cohere': {
    icon: '💫',
    color: '#06b6d4',
    models: ['Command R+', 'Command R', 'Command', 'Command Light']
  },
  'Perplexity': {
    icon: '🔍',
    color: '#6366f1',
    models: ['Sonar Large', 'Sonar Medium', 'Sonar Small']
  },
  'Together AI': {
    icon: '🤝',
    color: '#84cc16',
    models: ['Llama 3.1 405B', 'Qwen 2.5 72B', 'DeepSeek V3', 'DBRX']
  }
};

// Mock data - Combined from both apps
const MOCK_USAGE: UsageRecord[] = [
  // Canvas App Usage
  { id: '1', type: 'generation', model: 'Claude 3.5 Sonnet', provider: 'Anthropic', credits: 10, timestamp: Date.now() - 1800000, description: 'Generated SaaS landing page', app: 'canvas' },
  { id: '2', type: 'edit', model: 'GPT-4o', provider: 'OpenAI', credits: 5, timestamp: Date.now() - 3600000, description: 'Added dark mode toggle', app: 'canvas' },
  { id: '3', type: 'generation', model: 'Gemini 1.5 Pro', provider: 'Google', credits: 12, timestamp: Date.now() - 7200000, description: 'Built analytics dashboard', app: 'canvas' },
  { id: '4', type: 'edit', model: 'Mistral Large', provider: 'Mistral', credits: 5, timestamp: Date.now() - 14400000, description: 'Made layout responsive', app: 'canvas' },
  // Main App Usage
  { id: '5', type: 'chat', model: 'GPT-4o', provider: 'OpenAI', credits: 3, timestamp: Date.now() - 2700000, description: 'Neural chat conversation', app: 'main' },
  { id: '6', type: 'api_call', model: 'Llama 3.3 70B', provider: 'Groq', credits: 2, timestamp: Date.now() - 5400000, description: 'Code completion request', app: 'main' },
  { id: '7', type: 'chat', model: 'Claude 3.5 Sonnet', provider: 'Anthropic', credits: 4, timestamp: Date.now() - 10800000, description: 'Project brainstorming', app: 'main' },
  { id: '8', type: 'generation', model: 'Grok 3', provider: 'xAI', credits: 8, timestamp: Date.now() - 21600000, description: 'Generated API endpoints', app: 'main' },
  { id: '9', type: 'edit', model: 'Gemini 1.5 Flash', provider: 'Google', credits: 3, timestamp: Date.now() - 43200000, description: 'Refactored components', app: 'canvas' },
  { id: '10', type: 'chat', model: 'Mixtral 8x7B', provider: 'Mistral', credits: 2, timestamp: Date.now() - 86400000, description: 'Debugging assistance', app: 'main' },
  { id: '11', type: 'generation', model: 'Claude 3 Opus', provider: 'Anthropic', credits: 15, timestamp: Date.now() - 129600000, description: 'Created e-commerce store', app: 'canvas' },
  { id: '12', type: 'api_call', model: 'Llama 3.1 70B', provider: 'Groq', credits: 1, timestamp: Date.now() - 172800000, description: 'Quick code suggestion', app: 'main' },
  { id: '13', type: 'generation', model: 'Gemini 2.0 Flash', provider: 'Google', credits: 10, timestamp: Date.now() - 259200000, description: 'Built portfolio site', app: 'canvas' },
  { id: '14', type: 'chat', model: 'Grok 2', provider: 'xAI', credits: 5, timestamp: Date.now() - 345600000, description: 'Architecture planning', app: 'main' },
  { id: '15', type: 'edit', model: 'GPT-4 Turbo', provider: 'OpenAI', credits: 4, timestamp: Date.now() - 432000000, description: 'Added animations', app: 'canvas' },
  { id: '16', type: 'generation', model: 'Command R+', provider: 'Cohere', credits: 12, timestamp: Date.now() - 518400000, description: 'Created admin panel', app: 'canvas' },
  { id: '17', type: 'chat', model: 'Codestral', provider: 'Mistral', credits: 3, timestamp: Date.now() - 604800000, description: 'Code review session', app: 'main' },
  { id: '18', type: 'generation', model: 'DeepSeek V3', provider: 'Together AI', credits: 8, timestamp: Date.now() - 650000000, description: 'Built checkout flow', app: 'canvas' },
  { id: '19', type: 'chat', model: 'Sonar Large', provider: 'Perplexity', credits: 4, timestamp: Date.now() - 700000000, description: 'Research assistance', app: 'main' },
];

// Project History
const MOCK_PROJECTS: ProjectHistory[] = [
  { id: 'p1', name: 'SaaS Landing Page', type: 'canvas', createdAt: Date.now() - 1800000, lastModified: Date.now() - 1800000, status: 'active', creditsUsed: 15 },
  { id: 'p2', name: 'Analytics Dashboard', type: 'canvas', createdAt: Date.now() - 86400000, lastModified: Date.now() - 43200000, status: 'active', creditsUsed: 25 },
  { id: 'p3', name: 'E-commerce Store', type: 'canvas', createdAt: Date.now() - 172800000, lastModified: Date.now() - 129600000, status: 'active', creditsUsed: 42 },
  { id: 'p4', name: 'Portfolio Website', type: 'canvas', createdAt: Date.now() - 345600000, lastModified: Date.now() - 259200000, status: 'archived', creditsUsed: 18 },
  { id: 'p5', name: 'Admin Panel', type: 'canvas', createdAt: Date.now() - 604800000, lastModified: Date.now() - 518400000, status: 'active', creditsUsed: 35 },
  { id: 'p6', name: 'Neural Chat Bot', type: 'main', createdAt: Date.now() - 259200000, lastModified: Date.now() - 86400000, status: 'active', creditsUsed: 22 },
  { id: 'p7', name: 'Code Assistant', type: 'main', createdAt: Date.now() - 432000000, lastModified: Date.now() - 172800000, status: 'active', creditsUsed: 15 },
];

// Chat History
const MOCK_CHATS: ChatHistory[] = [
  { id: 'c1', title: 'Neural chat conversation', app: 'main', model: 'GPT-4o', provider: 'OpenAI', messages: 12, timestamp: Date.now() - 2700000, creditsUsed: 3 },
  { id: 'c2', title: 'Project brainstorming', app: 'main', model: 'Claude 3.5 Sonnet', provider: 'Anthropic', messages: 8, timestamp: Date.now() - 10800000, creditsUsed: 4 },
  { id: 'c3', title: 'Debugging assistance', app: 'main', model: 'Mixtral 8x7B', provider: 'Mistral', messages: 15, timestamp: Date.now() - 86400000, creditsUsed: 2 },
  { id: 'c4', title: 'Architecture planning', app: 'main', model: 'Grok 2', provider: 'xAI', messages: 20, timestamp: Date.now() - 345600000, creditsUsed: 5 },
  { id: 'c5', title: 'Code review session', app: 'main', model: 'Codestral', provider: 'Mistral', messages: 6, timestamp: Date.now() - 604800000, creditsUsed: 3 },
  { id: 'c6', title: 'Research assistance', app: 'main', model: 'Sonar Large', provider: 'Perplexity', messages: 10, timestamp: Date.now() - 700000000, creditsUsed: 4 },
  { id: 'c7', title: 'UI Design discussion', app: 'canvas', model: 'Claude 3.5 Sonnet', provider: 'Anthropic', messages: 5, timestamp: Date.now() - 3600000, creditsUsed: 2 },
  { id: 'c8', title: 'API integration help', app: 'canvas', model: 'GPT-4o', provider: 'OpenAI', messages: 18, timestamp: Date.now() - 172800000, creditsUsed: 6 },
];

const MOCK_BILLING: BillingRecord[] = [
  { id: 'b1', amount: 9.99, credits: 100, status: 'completed', date: Date.now() - 604800000, method: 'Visa •••• 4242' },
  { id: 'b2', amount: 29.99, credits: 350, status: 'completed', date: Date.now() - 2592000000, method: 'Visa •••• 4242' },
  { id: 'b3', amount: 49.99, credits: 600, status: 'completed', date: Date.now() - 5184000000, method: 'PayPal' },
  { id: 'b4', amount: 99.99, credits: 1500, status: 'completed', date: Date.now() - 7776000000, method: 'Visa •••• 4242' },
];

const CREDIT_PACKAGES = [
  { id: 'pack-50', credits: 50, price: 5.00, popular: false, savings: null },
  { id: 'pack-100', credits: 100, price: 9.99, popular: false, savings: '5% off' },
  { id: 'pack-350', credits: 350, price: 29.99, popular: true, savings: '15% off' },
  { id: 'pack-600', credits: 600, price: 49.99, popular: false, savings: '20% off' },
  { id: 'pack-1500', credits: 1500, price: 99.99, popular: false, savings: '35% off' },
];

const API_BASE = '/api';

// Model colors for charts
const MODEL_COLORS: Record<string, string> = {
  'Claude 3.5 Sonnet': '#22d3ee',
  'Claude 3 Opus': '#06b6d4',
  'GPT-4o': '#10b981',
  'GPT-4 Turbo': '#059669',
  'Gemini 1.5 Pro': '#8b5cf6',
  'Gemini 1.5 Flash': '#a78bfa',
  'Gemini 2.0 Flash': '#7c3aed',
  'Grok 3': '#f59e0b',
  'Grok 2': '#d97706',
  'Llama 3.3 70B': '#ef4444',
  'Llama 3.1 70B': '#dc2626',
  'Mistral Large': '#ec4899',
  'Mixtral 8x7B': '#db2777',
  'Codestral': '#be185d',
  'Command R+': '#06b6d4',
  'DeepSeek V3': '#84cc16',
  'Sonar Large': '#6366f1',
};

type DashboardTab = 'overview' | 'analytics' | 'history' | 'usage' | 'billing' | 'credits';

const CanvasNavDrawer: React.FC<CanvasNavDrawerProps> = ({ isOpen, onClose, onNavigate, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [historyTab, setHistoryTab] = useState<'projects' | 'chats'>('projects');
  const [creditBalance] = useState(247);
  const [usageHistory] = useState<UsageRecord[]>(MOCK_USAGE);
  const [billingHistory] = useState<BillingRecord[]>(MOCK_BILLING);
  const [projectHistory] = useState<ProjectHistory[]>(MOCK_PROJECTS);
  const [chatHistory] = useState<ChatHistory[]>(MOCK_CHATS);

  // Calculate usage stats
  const totalUsedToday = usageHistory
    .filter(u => Date.now() - u.timestamp < 86400000)
    .reduce((sum, u) => sum + u.credits, 0);
  
  const totalUsedThisMonth = usageHistory.reduce((sum, u) => sum + u.credits, 0);

  // App-specific stats
  const canvasUsage = usageHistory.filter(u => u.app === 'canvas');
  const mainAppUsage = usageHistory.filter(u => u.app === 'main');
  const canvasCredits = canvasUsage.reduce((sum, u) => sum + u.credits, 0);
  const mainCredits = mainAppUsage.reduce((sum, u) => sum + u.credits, 0);

  // Provider usage breakdown
  const providerUsage = Object.entries(
    usageHistory.reduce((acc, u) => {
      if (!acc[u.provider]) {
        acc[u.provider] = { credits: 0, calls: 0 };
      }
      acc[u.provider].credits += u.credits;
      acc[u.provider].calls += 1;
      return acc;
    }, {} as Record<string, { credits: number; calls: number }>)
  ).map(([provider, data]) => ({
    provider,
    ...data,
    ...(LLM_PROVIDERS[provider as keyof typeof LLM_PROVIDERS] || { icon: '🤖', color: '#6b7280', models: [] })
  })).sort((a, b) => b.credits - a.credits);

  // Model usage breakdown
  const modelUsage: ModelUsage[] = Object.entries(
    usageHistory.reduce((acc, u) => {
      if (!acc[u.model]) {
        acc[u.model] = { credits: 0, calls: 0, provider: u.provider };
      }
      acc[u.model].credits += u.credits;
      acc[u.model].calls += 1;
      return acc;
    }, {} as Record<string, { credits: number; calls: number; provider: string }>)
  ).map(([model, data]) => ({
    model,
    provider: data.provider,
    credits: data.credits,
    calls: data.calls,
    color: MODEL_COLORS[model] || '#6b7280',
  })).sort((a, b) => b.credits - a.credits);

  // 7-day activity
  const getLast7Days = (): DailyActivity[] => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();
      
      const canvasCreditsDay = usageHistory
        .filter(u => u.app === 'canvas' && u.timestamp >= dayStart && u.timestamp <= dayEnd)
        .reduce((sum, u) => sum + u.credits, 0);
      
      const mainCreditsDay = usageHistory
        .filter(u => u.app === 'main' && u.timestamp >= dayStart && u.timestamp <= dayEnd)
        .reduce((sum, u) => sum + u.credits, 0);

      days.push({
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dayStart).getDay()],
        date: new Date(dayStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        canvas: canvasCreditsDay,
        main: mainCreditsDay,
        total: canvasCreditsDay + mainCreditsDay,
      });
    }
    return days;
  };

  const last7Days = getLast7Days();
  const maxDailyCredits = Math.max(...last7Days.map(d => d.total), 1);

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'generation': return '🚀';
      case 'edit': return '✏️';
      case 'api_call': return '⚡';
      case 'chat': return '💬';
      default: return '📊';
    }
  };

  const getAppIcon = (app: string) => {
    return app === 'canvas' ? '🎨' : '🧠';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-400';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handlePurchase = async (pkg: typeof CREDIT_PACKAGES[0]) => {
    try {
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Payment error. Please try again.');
    }
  };

  return (
    <div 
      className={`fixed inset-0 bg-[#050505]/98 backdrop-blur-3xl z-[200] transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
    >
      {/* Decorative Scan Lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="w-full h-full bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[length:100%_4px] animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 relative z-10 border-b border-gray-800/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            <span className="text-2xl sm:text-3xl">📊</span>
          </div>
          <div>
            <h3 className="text-cyan-400 font-bold text-lg sm:text-2xl tracking-[0.15em] font-mono leading-none">
              NEURAL_DASHBOARD
            </h3>
            <p className="text-[9px] sm:text-xs text-cyan-600/60 uppercase font-mono tracking-[0.2em] mt-1 font-bold flex items-center gap-2 sm:gap-4">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE
              </span>
              <span className="text-gray-800">|</span> 
              PLAN: <span className="text-cyan-400">PRO</span>
            </p>
          </div>
        </div>

        {/* Connected Apps + Credits */}
        <div className="hidden md:flex items-center gap-4">
          {/* Connected Apps */}
          <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-400 text-xs font-bold">🎨 Canvas</span>
              </div>
              <div className="w-px h-4 bg-gray-700"></div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-400 text-xs font-bold">🧠 Main</span>
              </div>
            </div>
          </div>

          {/* Credit Balance */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-cyan-900/30 to-emerald-900/30 border border-cyan-500/30 rounded-lg">
            <span className="text-xl">🪙</span>
            <div>
              <div className="text-[8px] text-cyan-400/60 uppercase tracking-widest font-bold">Credits</div>
              <div className="text-lg font-black text-cyan-400">{creditBalance.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-800/50 relative z-10 overflow-x-auto">
        <div className="flex gap-1 sm:gap-2 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: '📈', desc: 'Summary' },
            { id: 'analytics', label: 'Analytics', icon: '📊', desc: 'Charts & Graphs' },
            { id: 'history', label: 'History', icon: '📁', desc: 'Projects & Chats' },
            { id: 'usage', label: 'Usage', icon: '⚡', desc: 'Logs' },
            { id: 'billing', label: 'Billing', icon: '💳', desc: 'Transactions' },
            { id: 'credits', label: 'Buy Credits', icon: '🪙', desc: 'Top Up' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              className={`group relative px-3 sm:px-5 py-2 sm:py-3 rounded-lg transition-all flex items-center gap-2 border ${
                activeTab === tab.id
                  ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                  : 'border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/5'
              }`}
            >
              <span className={`text-lg sm:text-xl transition-transform ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'}`}>{tab.icon}</span>
              <div className="text-left">
                <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${activeTab === tab.id ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-400'} transition-colors`}>
                  {tab.label}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 sm:py-6 relative z-10">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
            {/* Connected Apps Status */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-cyan-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎨</span>
                    <span className="text-sm font-bold text-white">Canvas App</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">Connected</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-black text-cyan-400">{canvasCredits}</div>
                    <div className="text-[10px] text-gray-500">credits used</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{canvasUsage.length}</div>
                    <div className="text-[10px] text-gray-500">requests</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧠</span>
                    <span className="text-sm font-bold text-white">Main App</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">Connected</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-black text-purple-400">{mainCredits}</div>
                    <div className="text-[10px] text-gray-500">credits used</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{mainAppUsage.length}</div>
                    <div className="text-[10px] text-gray-500">requests</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl border border-gray-800/50 bg-black/30 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🪙</span>
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Balance</span>
                </div>
                <div className="text-2xl font-black text-cyan-400">{creditBalance}</div>
                <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full" style={{ width: `${Math.min((creditBalance / 500) * 100, 100)}%` }}></div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-800/50 bg-black/30 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📅</span>
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Today</span>
                </div>
                <div className="text-2xl font-black text-white">{totalUsedToday}</div>
                <div className="text-[10px] text-gray-600">credits used</div>
              </div>

              <div className="p-4 rounded-xl border border-gray-800/50 bg-black/30 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🚀</span>
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Generations</span>
                </div>
                <div className="text-2xl font-black text-white">{usageHistory.filter(u => u.type === 'generation').length}</div>
                <div className="text-[10px] text-gray-600">apps created</div>
              </div>

              <div className="p-4 rounded-xl border border-gray-800/50 bg-black/30 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤖</span>
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Models</span>
                </div>
                <div className="text-2xl font-black text-white">{modelUsage.length}</div>
                <div className="text-[10px] text-gray-600">AI models used</div>
              </div>
            </div>

            {/* 7-Day Activity Chart */}
            <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>📊</span> 7-Day Activity
              </h4>
              <div className="flex items-end justify-between gap-2 h-32">
                {last7Days.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end h-24 gap-0.5">
                      {/* Canvas portion */}
                      <div 
                        className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t transition-all hover:from-cyan-500 hover:to-cyan-300"
                        style={{ height: `${(day.canvas / maxDailyCredits) * 100}%`, minHeight: day.canvas > 0 ? '4px' : '0' }}
                        title={`Canvas: ${day.canvas} credits`}
                      ></div>
                      {/* Main App portion */}
                      <div 
                        className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-b transition-all hover:from-purple-500 hover:to-purple-300"
                        style={{ height: `${(day.main / maxDailyCredits) * 100}%`, minHeight: day.main > 0 ? '4px' : '0' }}
                        title={`Main: ${day.main} credits`}
                      ></div>
                    </div>
                    <div className="text-[9px] text-gray-500 font-bold">{day.day}</div>
                    <div className="text-[8px] text-gray-600">{day.total}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-cyan-600 to-cyan-400"></div>
                  <span className="text-[10px] text-gray-500">Canvas App</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-600 to-purple-400"></div>
                  <span className="text-[10px] text-gray-500">Main App</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>⚡</span> Recent Activity
              </h4>
              <div className="space-y-2">
                {usageHistory.slice(0, 5).map(record => (
                  <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-gray-800/50 hover:border-cyan-500/20 transition-all">
                    <span className="text-lg">{getAppIcon(record.app)}</span>
                    <span className="text-lg">{getTypeIcon(record.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-300 truncate">{record.description}</div>
                      <div className="text-[10px] text-gray-600">{record.model} • {formatDate(record.timestamp)}</div>
                    </div>
                    <span className="text-sm font-bold text-cyan-400 whitespace-nowrap">-{record.credits}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
            {/* Provider Usage Grid */}
            <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>🏢</span> Provider Usage (API-Connected LLMs)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(LLM_PROVIDERS).map(([provider, info]) => {
                  const usage = providerUsage.find(p => p.provider === provider);
                  return (
                    <div key={provider} className="p-3 rounded-lg bg-black/40 border border-gray-800/50 hover:border-cyan-500/30 transition-all group">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{info.icon}</span>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">{provider}</span>
                      </div>
                      <div className="text-lg font-black" style={{ color: info.color }}>{usage?.credits || 0}</div>
                      <div className="text-[9px] text-gray-600">{usage?.calls || 0} calls</div>
                      <div className="mt-2 text-[8px] text-gray-700 truncate" title={info.models.join(', ')}>
                        {info.models.slice(0, 2).join(', ')}...
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Model Usage Chart */}
            <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>🤖</span> Model Usage Breakdown
              </h4>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="space-y-3">
                  {modelUsage.slice(0, 8).map(model => {
                    const percentage = (model.credits / totalUsedThisMonth) * 100;
                    const providerInfo = LLM_PROVIDERS[model.provider as keyof typeof LLM_PROVIDERS];
                    return (
                      <div key={model.model}>
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: model.color }}></div>
                            <span className="text-xs font-bold text-gray-300">{model.model}</span>
                            <span className="text-[9px] text-gray-600 px-1.5 py-0.5 bg-gray-800 rounded flex items-center gap-1">
                              {providerInfo?.icon} {model.provider}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{model.credits} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percentage}%`, backgroundColor: model.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pie Chart Visualization */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {(() => {
                        let cumulativePercent = 0;
                        return modelUsage.slice(0, 8).map((model, i) => {
                          const percent = (model.credits / totalUsedThisMonth) * 100;
                          const dashArray = `${percent} ${100 - percent}`;
                          const dashOffset = -cumulativePercent;
                          cumulativePercent += percent;
                          return (
                            <circle
                              key={model.model}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={model.color}
                              strokeWidth="20"
                              strokeDasharray={dashArray}
                              strokeDashoffset={dashOffset}
                              className="transition-all duration-500"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-2xl font-black text-white">{totalUsedThisMonth}</div>
                      <div className="text-[10px] text-gray-500">Total Credits</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {modelUsage.slice(0, 4).map(model => (
                      <div key={model.model} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: model.color }}></div>
                        <span className="text-[9px] text-gray-500 truncate">{model.model.split(' ').slice(-1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* App Comparison */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
                <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>📱</span> App Usage Comparison
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-gray-300 flex items-center gap-2">🎨 Canvas App</span>
                      <span className="text-sm text-cyan-400">{canvasCredits} credits ({((canvasCredits / totalUsedThisMonth) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: `${(canvasCredits / totalUsedThisMonth) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-gray-300 flex items-center gap-2">🧠 Main App</span>
                      <span className="text-sm text-purple-400">{mainCredits} credits ({((mainCredits / totalUsedThisMonth) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: `${(mainCredits / totalUsedThisMonth) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
                <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>🎯</span> Request Types
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {['generation', 'edit', 'chat', 'api_call'].map(type => {
                    const count = usageHistory.filter(u => u.type === type).length;
                    const credits = usageHistory.filter(u => u.type === type).reduce((sum, u) => sum + u.credits, 0);
                    return (
                      <div key={type} className="p-3 rounded-lg bg-black/40 border border-gray-800/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getTypeIcon(type)}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{type.replace('_', ' ')}</span>
                        </div>
                        <div className="text-lg font-black text-white">{count}</div>
                        <div className="text-[9px] text-gray-600">{credits} credits</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 7-Day Trend */}
            <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>📈</span> 7-Day Usage Trend
              </h4>
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-40">
                {last7Days.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center justify-end h-32 relative group">
                      {/* Stacked bar */}
                      <div className="w-full flex flex-col justify-end h-full">
                        <div 
                          className="w-full bg-gradient-to-t from-cyan-600/80 to-cyan-400/80 rounded-t-sm transition-all"
                          style={{ height: `${(day.canvas / maxDailyCredits) * 100}%`, minHeight: day.canvas > 0 ? '2px' : '0' }}
                        ></div>
                        <div 
                          className="w-full bg-gradient-to-t from-purple-600/80 to-purple-400/80 transition-all"
                          style={{ height: `${(day.main / maxDailyCredits) * 100}%`, minHeight: day.main > 0 ? '2px' : '0' }}
                        ></div>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <div className="text-[9px] text-cyan-400">Canvas: {day.canvas}</div>
                        <div className="text-[9px] text-purple-400">Main: {day.main}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-400 font-bold">{day.day}</div>
                      <div className="text-[9px] text-gray-600">{day.date}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded bg-gradient-to-r from-cyan-600 to-cyan-400"></div>
                  <span className="text-xs text-gray-400">Canvas App</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded bg-gradient-to-r from-purple-600 to-purple-400"></div>
                  <span className="text-xs text-gray-400">Main App</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              <button 
                onClick={() => setHistoryTab('projects')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center gap-2 ${
                  historyTab === 'projects' 
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                    : 'text-gray-500 border-transparent hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30'
                }`}
              >
                <span>📁</span> Project History
              </button>
              <button 
                onClick={() => setHistoryTab('chats')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center gap-2 ${
                  historyTab === 'chats' 
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                    : 'text-gray-500 border-transparent hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30'
                }`}
              >
                <span>💬</span> Chat History
              </button>
            </div>

            {/* Project History */}
            {historyTab === 'projects' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest flex items-center gap-2">
                    <span>📁</span> Project History Logs
                  </h4>
                  <span className="text-[10px] text-gray-600">{projectHistory.length} projects</span>
                </div>
                {projectHistory.map(project => (
                  <div key={project.id} className="p-4 rounded-xl border border-gray-800/50 bg-black/30 hover:border-cyan-500/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${project.type === 'canvas' ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-purple-500/10 border border-purple-500/30'}`}>
                        <span className="text-2xl">{project.type === 'canvas' ? '🎨' : '🧠'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-300">{project.name}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                            project.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            project.status === 'archived' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>{project.status}</span>
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1 flex items-center gap-3">
                          <span>📅 Created: {formatDate(project.createdAt)}</span>
                          <span>🔄 Modified: {formatDate(project.lastModified)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-cyan-400">{project.creditsUsed}</div>
                        <div className="text-[9px] text-gray-600">credits used</div>
                      </div>
                      <button className="p-2 rounded-lg hover:bg-cyan-500/10 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chat History */}
            {historyTab === 'chats' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest flex items-center gap-2">
                    <span>💬</span> Chat History Logs
                  </h4>
                  <span className="text-[10px] text-gray-600">{chatHistory.length} conversations</span>
                </div>
                {chatHistory.map(chat => {
                  const providerInfo = LLM_PROVIDERS[chat.provider as keyof typeof LLM_PROVIDERS];
                  return (
                    <div key={chat.id} className="p-4 rounded-xl border border-gray-800/50 bg-black/30 hover:border-cyan-500/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${chat.app === 'canvas' ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-purple-500/10 border border-purple-500/30'}`}>
                          <span className="text-2xl">💬</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-300">{chat.title}</div>
                          <div className="text-[10px] text-gray-600 mt-1 flex flex-wrap items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded ${chat.app === 'canvas' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'}`}>
                              {chat.app === 'canvas' ? '🎨 Canvas' : '🧠 Main'}
                            </span>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-800 rounded">
                              {providerInfo?.icon} {chat.model}
                            </span>
                            <span>💬 {chat.messages} messages</span>
                            <span>🕐 {formatDate(chat.timestamp)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-cyan-400">{chat.creditsUsed}</div>
                          <div className="text-[9px] text-gray-600">credits</div>
                        </div>
                        <button className="p-2 rounded-lg hover:bg-cyan-500/10 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* USAGE TAB */}
        {activeTab === 'usage' && (
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
            {/* Filter by App */}
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                All Apps
              </button>
              <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-all">
                🎨 Canvas
              </button>
              <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-all">
                🧠 Main
              </button>
            </div>

            {/* Usage Logs Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest flex items-center gap-2">
                <span>📋</span> Complete Usage Logs
              </h4>
              <span className="text-[10px] text-gray-600">{usageHistory.length} records</span>
            </div>

            {/* Usage History List */}
            <div className="space-y-2">
              {usageHistory.map(record => {
                const providerInfo = LLM_PROVIDERS[record.provider as keyof typeof LLM_PROVIDERS];
                return (
                  <div key={record.id} className="p-3 sm:p-4 rounded-xl border border-gray-800/50 bg-black/30 hover:border-cyan-500/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-lg">{getAppIcon(record.app)}</span>
                        <span className="text-xl">{getTypeIcon(record.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-300">{record.description}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-800 rounded">
                            {providerInfo?.icon} {record.model}
                          </span>
                          <span className="flex items-center gap-1">🕐 {formatDate(record.timestamp)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${record.app === 'canvas' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {record.app === 'canvas' ? 'Canvas' : 'Main'}
                          </span>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                        <span className="text-sm font-bold text-cyan-400">-{record.credits}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
            {/* Payment Method */}
            <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4">Payment Method</h4>
              <div className="flex items-center gap-4">
                <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700">
                  <span className="text-2xl sm:text-3xl">💳</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-300">Visa •••• 4242</div>
                  <div className="text-[10px] text-gray-600">Expires 12/27</div>
                </div>
                <button className="px-3 sm:px-4 py-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-all">
                  Change
                </button>
              </div>
            </div>

            {/* Transaction History */}
            <div>
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4">Transaction History</h4>
              <div className="space-y-2 sm:space-y-3">
                {billingHistory.map(record => (
                  <div key={record.id} className="p-3 sm:p-4 rounded-xl border border-gray-800/50 bg-black/30 hover:border-cyan-500/20 transition-all">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-xl sm:text-2xl">🪙</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-300">{record.credits.toLocaleString()} Credits</div>
                        <div className="text-[10px] text-gray-600">{record.method} • {new Date(record.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">${record.amount.toFixed(2)}</div>
                        <span className={`text-[9px] px-2 py-0.5 rounded border ${getStatusColor(record.status)} capitalize`}>{record.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Download Invoices */}
            <button className="w-full p-4 rounded-xl border border-gray-800/50 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Download All Invoices</span>
            </button>
          </div>
        )}

        {/* BUY CREDITS TAB */}
        {activeTab === 'credits' && (
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
            {/* Current Balance */}
            <div className="p-4 sm:p-5 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-emerald-900/20 flex items-center gap-4">
              <span className="text-3xl sm:text-4xl">🪙</span>
              <div>
                <div className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-bold">Current Balance</div>
                <div className="text-xl sm:text-2xl font-black text-cyan-400">{creditBalance} credits</div>
              </div>
            </div>

            {/* Credit Packages */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest">Select Package</h4>
                <span className="text-[10px] text-gray-600">Minimum: $5.00</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {CREDIT_PACKAGES.map(pkg => (
                  <button
                    key={pkg.credits}
                    onClick={() => handlePurchase(pkg)}
                    className={`p-4 sm:p-5 rounded-xl border transition-all text-left relative overflow-hidden group ${
                      pkg.popular
                        ? 'bg-gradient-to-br from-cyan-900/30 to-emerald-900/30 border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                        : 'bg-black/30 border-gray-800/50 hover:border-cyan-500/30 hover:bg-cyan-500/5'
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute top-0 right-0 px-2 sm:px-3 py-1 bg-gradient-to-r from-cyan-500 to-emerald-500 text-[8px] sm:text-[9px] font-bold text-white uppercase tracking-wider rounded-bl-lg">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 sm:p-3 rounded-xl ${pkg.popular ? 'bg-cyan-500/20' : 'bg-gray-800'}`}>
                          <span className="text-xl sm:text-2xl">🪙</span>
                        </div>
                        <div>
                          <div className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{pkg.credits.toLocaleString()} Credits</div>
                          {pkg.savings && (
                            <div className="text-[10px] font-bold text-emerald-400">{pkg.savings}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-cyan-400">${pkg.price.toFixed(2)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Supported LLM Providers */}
            <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>🤖</span> Supported AI Providers & Models
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(LLM_PROVIDERS).map(([provider, info]) => (
                  <div key={provider} className="p-3 rounded-lg bg-black/40 border border-gray-800/50 hover:border-cyan-500/30 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="text-xs font-bold" style={{ color: info.color }}>{provider}</span>
                    </div>
                    <div className="text-[9px] text-gray-500 leading-relaxed">
                      {info.models.slice(0, 3).map((model, i) => (
                        <span key={model}>
                          {model}{i < Math.min(info.models.length - 1, 2) ? ', ' : ''}
                        </span>
                      ))}
                      {info.models.length > 3 && <span className="text-gray-600"> +{info.models.length - 3} more</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit Guide */}
            <div className="p-4 sm:p-5 rounded-xl border border-gray-800/50 bg-black/30">
              <h4 className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest mb-4">Credit Usage Guide</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-black/30 border border-gray-800/50">
                  <span className="text-xl sm:text-2xl mb-2 block">🚀</span>
                  <div className="text-xs sm:text-sm font-bold text-gray-300">Generation</div>
                  <div className="text-lg sm:text-xl font-black text-cyan-400 mt-1">8-15</div>
                  <div className="text-[9px] text-gray-600">per app</div>
                </div>
                <div className="p-3 rounded-lg bg-black/30 border border-gray-800/50">
                  <span className="text-xl sm:text-2xl mb-2 block">✏️</span>
                  <div className="text-xs sm:text-sm font-bold text-gray-300">Edit</div>
                  <div className="text-lg sm:text-xl font-black text-cyan-400 mt-1">3-8</div>
                  <div className="text-[9px] text-gray-600">per edit</div>
                </div>
                <div className="p-3 rounded-lg bg-black/30 border border-gray-800/50">
                  <span className="text-xl sm:text-2xl mb-2 block">💬</span>
                  <div className="text-xs sm:text-sm font-bold text-gray-300">Chat</div>
                  <div className="text-lg sm:text-xl font-black text-cyan-400 mt-1">2-5</div>
                  <div className="text-[9px] text-gray-600">per chat</div>
                </div>
                <div className="p-3 rounded-lg bg-black/30 border border-gray-800/50">
                  <span className="text-xl sm:text-2xl mb-2 block">⚡</span>
                  <div className="text-xs sm:text-sm font-bold text-gray-300">API</div>
                  <div className="text-lg sm:text-xl font-black text-cyan-400 mt-1">1-3</div>
                  <div className="text-[9px] text-gray-600">per call</div>
                </div>
              </div>
            </div>

            {/* Secure Payment */}
            <div className="text-center py-4 text-[10px] text-gray-600 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure payment powered by Stripe
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 sm:p-4 bg-[#080808]/80 border-t border-gray-800/50 flex justify-between items-center relative z-10">
        <div className="flex gap-4 items-center">
          <div className="hidden sm:flex items-center gap-2 text-[9px] text-gray-600">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 🎨 Canvas</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 🧠 Main</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onClose();
              window.parent.postMessage('close-canvas-drawer', '*');
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-orange-600/20 hover:from-red-600/40 hover:to-orange-600/40 border border-red-500/50 hover:border-red-400 rounded-lg flex items-center gap-2 text-red-400 hover:text-red-300 transition-all group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider">Exit</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.4); }
      `}</style>
    </div>
  );
};

export default CanvasNavDrawer;
