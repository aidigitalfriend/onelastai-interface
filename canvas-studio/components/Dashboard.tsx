import React, { useState, useEffect, useRef } from 'react';

// Custom scrollbar styles
const scrollbarStyles = `
  .dashboard-scroll {
    overflow-y: auto !important;
    scrollbar-width: thin;
    scrollbar-color: rgba(34, 211, 238, 0.4) transparent;
  }
  .dashboard-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .dashboard-scroll::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  .dashboard-scroll::-webkit-scrollbar-thumb {
    background: rgba(34, 211, 238, 0.4);
    border-radius: 4px;
  }
  .dashboard-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(34, 211, 238, 0.6);
  }
`;

interface UsageRecord {
  id: string;
  type: 'generation' | 'edit' | 'chat';
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

interface DashboardProps {
  isDarkMode: boolean;
  onClose: () => void;
}

// Canvas App specific mock data
const MOCK_USAGE: UsageRecord[] = [
  { id: '1', type: 'generation', model: 'Claude Sonnet 4', provider: 'Anthropic', credits: 10, tokens: { input: 2500, output: 8500 }, timestamp: Date.now() - 300000, description: 'Generated SaaS landing page', duration: 12400, status: 'completed' },
  { id: '2', type: 'edit', model: 'GPT-4.1', provider: 'OpenAI', credits: 5, tokens: { input: 1200, output: 3200 }, timestamp: Date.now() - 900000, description: 'Added dark mode toggle', duration: 5200, status: 'completed' },
  { id: '3', type: 'generation', model: 'Gemini 2.5 Pro', provider: 'Google', credits: 12, tokens: { input: 3100, output: 9800 }, timestamp: Date.now() - 1800000, description: 'Built analytics dashboard', duration: 18600, status: 'completed' },
  { id: '4', type: 'chat', model: 'Claude Sonnet 4', provider: 'Anthropic', credits: 2, tokens: { input: 450, output: 1200 }, timestamp: Date.now() - 2700000, description: 'UI design discussion', duration: 2100, status: 'completed' },
  { id: '5', type: 'edit', model: 'Mistral Large', provider: 'Mistral', credits: 5, tokens: { input: 1800, output: 4200 }, timestamp: Date.now() - 3600000, description: 'Made layout responsive', duration: 6800, status: 'completed' },
  { id: '6', type: 'generation', model: 'GPT-4.1', provider: 'OpenAI', credits: 8, tokens: { input: 2200, output: 7100 }, timestamp: Date.now() - 7200000, description: 'Created checkout flow', duration: 14200, status: 'completed' },
  { id: '7', type: 'chat', model: 'GPT-4o', provider: 'OpenAI', credits: 3, tokens: { input: 680, output: 1850 }, timestamp: Date.now() - 14400000, description: 'API integration help', duration: 3400, status: 'completed' },
  { id: '8', type: 'edit', model: 'Claude Opus 4', provider: 'Anthropic', credits: 4, tokens: { input: 1100, output: 2800 }, timestamp: Date.now() - 28800000, description: 'Added animations', duration: 4800, status: 'completed' },
  { id: '9', type: 'generation', model: 'Gemini 2.0 Flash', provider: 'Google', credits: 10, tokens: { input: 2800, output: 8200 }, timestamp: Date.now() - 43200000, description: 'Built portfolio site', duration: 11200, status: 'completed' },
  { id: '10', type: 'edit', model: 'Grok 3', provider: 'xAI', credits: 6, tokens: { input: 1500, output: 3900 }, timestamp: Date.now() - 86400000, description: 'Refactored components', duration: 7200, status: 'completed' },
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

type DashboardTab = 'overview' | 'requests' | 'usage' | 'billing' | 'credits';

const TABS: { id: DashboardTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📈' },
  { id: 'requests', label: 'Requests', icon: '🔄' },
  { id: 'usage', label: 'Usage', icon: '⚡' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'credits', label: 'Credits', icon: '🪙' },
];

const Dashboard: React.FC<DashboardProps> = ({ isDarkMode, onClose }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [creditBalance] = useState(247);
  const [usageHistory] = useState<UsageRecord[]>(MOCK_USAGE);
  const [billingHistory] = useState<BillingRecord[]>(MOCK_BILLING);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 120;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(updateScrollButtons, 300);
    }
  };

  // Calculate stats
  const totalCreditsUsed = usageHistory.reduce((sum, u) => sum + u.credits, 0);
  const totalTokens = usageHistory.reduce((sum, u) => sum + u.tokens.input + u.tokens.output, 0);
  const totalRequests = usageHistory.length;
  const todayRequests = usageHistory.filter(u => Date.now() - u.timestamp < 86400000);
  const todayCredits = todayRequests.reduce((sum, u) => sum + u.credits, 0);

  // Provider breakdown
  const providerStats = Object.entries(
    usageHistory.reduce((acc, u) => {
      if (!acc[u.provider]) acc[u.provider] = { credits: 0, requests: 0, tokens: 0 };
      acc[u.provider].credits += u.credits;
      acc[u.provider].requests += 1;
      acc[u.provider].tokens += u.tokens.input + u.tokens.output;
      return acc;
    }, {} as Record<string, { credits: number; requests: number; tokens: number }>)
  ).sort((a, b) => b[1].credits - a[1].credits);

  // Model breakdown
  const modelStats = Object.entries(
    usageHistory.reduce((acc, u) => {
      if (!acc[u.model]) acc[u.model] = { credits: 0, requests: 0, tokens: 0, provider: u.provider };
      acc[u.model].credits += u.credits;
      acc[u.model].requests += 1;
      acc[u.model].tokens += u.tokens.input + u.tokens.output;
      return acc;
    }, {} as Record<string, { credits: number; requests: number; tokens: number; provider: string }>)
  ).sort((a, b) => b[1].credits - a[1].credits);

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'generation': return '🚀';
      case 'edit': return '✏️';
      case 'chat': return '💬';
      default: return '📊';
    }
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      'Anthropic': '#22d3ee',
      'OpenAI': '#10b981',
      'Google': '#8b5cf6',
      'Mistral': '#ec4899',
      'xAI': '#f59e0b',
      'Groq': '#ef4444',
    };
    return colors[provider] || '#6b7280';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'streaming': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-400';
    }
  };

  const formatDate = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const handlePurchase = (pkg: typeof CREDIT_PACKAGES[0]) => {
    alert(`Redirecting to payment for ${pkg.credits} credits ($${pkg.price})...`);
  };

  return (
    <div className={`flex flex-col ${isDarkMode ? 'bg-[#111]/95' : 'bg-white'}`} style={{ height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
      <style>{scrollbarStyles}</style>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30' : 'bg-cyan-100'}`}>
            <span className="text-lg">📊</span>
          </div>
          <div>
            <h3 className={`text-xs font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} uppercase tracking-widest`}>
              Dashboard
            </h3>
            <p className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-wider`}>
              Canvas App Analytics
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10' : 'text-gray-400 hover:text-cyan-600 hover:bg-cyan-50'} transition-all`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs with horizontal scroll */}
      <div className={`relative border-b ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'} shrink-0`}>
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs('left')}
            className={`absolute left-0 top-0 bottom-0 z-10 px-1 ${isDarkMode ? 'bg-gradient-to-r from-[#111] via-[#111] to-transparent' : 'bg-gradient-to-r from-white via-white to-transparent'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        <div 
          ref={tabsRef}
          onScroll={updateScrollButtons}
          className="flex gap-1 px-3 py-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all text-[10px] font-bold uppercase tracking-wider ${
                activeTab === tab.id
                  ? isDarkMode
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                  : isDarkMode
                    ? 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent'
                    : 'text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 border border-transparent'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scrollTabs('right')}
            className={`absolute right-0 top-0 bottom-0 z-10 px-1 ${isDarkMode ? 'bg-gradient-to-l from-[#111] via-[#111] to-transparent' : 'bg-gradient-to-l from-white via-white to-transparent'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto dashboard-scroll" style={{ minHeight: 0 }}>
        <div className="p-4 space-y-4 pb-8">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gradient-to-br from-cyan-900/20 to-emerald-900/20 border-cyan-500/30' : 'bg-gradient-to-br from-cyan-50 to-emerald-50 border-cyan-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[9px] font-bold ${isDarkMode ? 'text-cyan-400/60' : 'text-cyan-600'} uppercase tracking-widest`}>Credit Balance</span>
                  <span className="text-lg">🪙</span>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-3xl font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{creditBalance}</span>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-1`}>credits</span>
                </div>
                <div className={`h-1.5 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden`}>
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full" style={{ width: `${Math.min((creditBalance / 500) * 100, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>0</span>
                  <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>500</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-[8px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-wider`}>Today</div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{todayCredits}</div>
                  <div className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>credits used</div>
                </div>
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-[8px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-wider`}>Total</div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{totalCreditsUsed}</div>
                  <div className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>credits used</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-[8px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-wider`}>Requests</div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{totalRequests}</div>
                  <div className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>total</div>
                </div>
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-[8px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-wider`}>Tokens</div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatTokens(totalTokens)}</div>
                  <div className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>processed</div>
                </div>
              </div>

              <div>
                <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>Recent Activity</h4>
                <div className="space-y-2">
                  {usageHistory.slice(0, 3).map(record => (
                    <div key={record.id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'} flex items-center gap-2`}>
                      <span className="text-base">{getTypeIcon(record.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} truncate`}>{record.description}</div>
                        <div className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{record.model} • {formatDate(record.timestamp)}</div>
                      </div>
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>-{record.credits}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <>
              <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-[8px] ${isDarkMode ? 'text-cyan-400/60' : 'text-cyan-600'} uppercase tracking-wider`}>Total Requests</div>
                    <div className={`text-xl font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{totalRequests}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[8px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-wider`}>Today</div>
                    <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{todayRequests.length}</div>
                  </div>
                </div>
              </div>

              <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Request Log</h4>
              
              <div className="space-y-2">
                {usageHistory.map(record => (
                  <div key={record.id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800 hover:border-cyan-500/30' : 'bg-gray-50 border-gray-200 hover:border-cyan-300'} transition-all`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-base">{getTypeIcon(record.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{record.description}</div>
                        <div className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} flex items-center gap-2 mt-0.5`}>
                          <span style={{ color: getProviderColor(record.provider) }}>{record.provider}</span>
                          <span>•</span>
                          <span>{record.model}</span>
                        </div>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border ${getStatusColor(record.status)} capitalize`}>{record.status}</span>
                    </div>
                    
                    <div className={`grid grid-cols-4 gap-1 p-2 rounded ${isDarkMode ? 'bg-black/40' : 'bg-gray-100'}`}>
                      <div className="text-center">
                        <div className={`text-[7px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase`}>Credits</div>
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{record.credits}</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-[7px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase`}>In</div>
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatTokens(record.tokens.input)}</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-[7px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase`}>Out</div>
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{formatTokens(record.tokens.output)}</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-[7px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase`}>Time</div>
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDuration(record.duration)}</div>
                      </div>
                    </div>
                    
                    <div className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mt-2 text-right`}>
                      {formatDate(record.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* USAGE TAB */}
          {activeTab === 'usage' && (
            <>
              <div>
                <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>By Provider</h4>
                <div className="space-y-2">
                  {providerStats.map(([provider, data]) => (
                    <div key={provider} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold" style={{ color: getProviderColor(provider) }}>{provider}</span>
                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{data.credits} cr</span>
                      </div>
                      <div className={`h-1.5 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden mb-1`}>
                        <div className="h-full rounded-full" style={{ width: `${(data.credits / totalCreditsUsed) * 100}%`, backgroundColor: getProviderColor(provider) }} />
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{data.requests} req</span>
                        <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{formatTokens(data.tokens)} tok</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>By Model</h4>
                <div className="space-y-2">
                  {modelStats.slice(0, 5).map(([model, data]) => (
                    <div key={model} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{model}</span>
                          <span className="text-[8px] ml-2" style={{ color: getProviderColor(data.provider) }}>{data.provider}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{data.credits} cr</span>
                      </div>
                      <div className="flex gap-3">
                        <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{data.requests} req</span>
                        <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{formatTokens(data.tokens)} tok</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>By Type</h4>
                <div className="space-y-2">
                  {['generation', 'edit', 'chat'].map(type => {
                    const typeData = usageHistory.filter(u => u.type === type);
                    const typeCredits = typeData.reduce((sum, u) => sum + u.credits, 0);
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-base">{getTypeIcon(type)}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} capitalize`}>{type}</span>
                            <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{typeCredits} cr</span>
                          </div>
                          <div className={`h-1.5 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden`}>
                            <div className={`h-full rounded-full ${type === 'generation' ? 'bg-cyan-500' : type === 'edit' ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${(typeCredits / totalCreditsUsed) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <>
              <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>Payment Method</h4>
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <span className="text-base">💳</span>
                  </div>
                  <div className="flex-1">
                    <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Visa •••• 4242</div>
                    <div className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Expires 12/27</div>
                  </div>
                  <button className={`text-[9px] font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} uppercase`}>Change</button>
                </div>
              </div>

              <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Transactions</h4>
              <div className="space-y-2">
                {billingHistory.map(record => (
                  <div key={record.id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                        <span className="text-base">🪙</span>
                      </div>
                      <div className="flex-1">
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{record.credits} Credits</div>
                        <div className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{record.method} • {new Date(record.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>${record.amount.toFixed(2)}</div>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded border ${getStatusColor(record.status)} capitalize`}>{record.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CREDITS TAB */}
          {activeTab === 'credits' && (
            <>
              <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'} flex items-center gap-2`}>
                <span className="text-xl">🪙</span>
                <div>
                  <div className={`text-[8px] ${isDarkMode ? 'text-cyan-400/60' : 'text-cyan-600'} uppercase tracking-wider`}>Balance</div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{creditBalance} credits</div>
                </div>
              </div>

              <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Buy Credits</h4>
              <div className="space-y-2">
                {CREDIT_PACKAGES.map(pkg => (
                  <button
                    key={pkg.credits}
                    onClick={() => handlePurchase(pkg)}
                    className={`w-full p-3 rounded-lg border transition-all text-left relative overflow-hidden ${
                      pkg.popular
                        ? isDarkMode
                          ? 'bg-gradient-to-r from-cyan-900/30 to-emerald-900/30 border-cyan-500/50 hover:border-cyan-400'
                          : 'bg-gradient-to-r from-cyan-50 to-emerald-50 border-cyan-300 hover:border-cyan-400'
                        : isDarkMode
                          ? 'bg-black/30 border-gray-800 hover:border-cyan-500/30'
                          : 'bg-gray-50 border-gray-200 hover:border-cyan-300'
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-[7px] font-bold text-white uppercase rounded-bl-lg">
                        Popular
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🪙</span>
                        <div>
                          <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{pkg.credits} Credits</div>
                          {pkg.savings && <div className={`text-[8px] font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{pkg.savings}</div>}
                        </div>
                      </div>
                      <div className={`text-base font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>${pkg.price}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>Credit Guide</h4>
                <div className="space-y-1.5 text-[9px]">
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>🚀 Generation</span>
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>8-15 cr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>✏️ Edit</span>
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>3-8 cr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>💬 Chat</span>
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>1-5 cr</span>
                  </div>
                </div>
              </div>

              <div className={`text-center py-2 text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} flex items-center justify-center gap-1`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure payment via Stripe
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
