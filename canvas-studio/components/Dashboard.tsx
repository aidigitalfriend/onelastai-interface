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
  type: 'generation' | 'edit' | 'chat' | 'canvas' | 'image' | 'audio' | 'code';
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

interface DashboardData {
  user: {
    id: string;
    email: string;
    name: string;
  };
  credits: {
    balance: number;
    lifetimeSpent: number;
  };
  stats: {
    creditsUsedToday: number;
    creditsUsedWeek: number;
    creditsUsedMonth: number;
    requestsToday: number;
    requestsWeek: number;
    requestsMonth: number;
    weeklyChange: number;
  };
  apps: {
    active: number;
    total: number;
    usage: Record<string, { credits: number; requests: number; percent: number }>;
  };
  recentActivity: Array<{
    id: string;
    app: string;
    icon: string;
    action: string;
    credits: number;
    time: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
}

interface DashboardProps {
  isDarkMode: boolean;
  onClose: () => void;
}

const CREDIT_PACKAGES = [
  { credits: 50, price: 5.00, popular: false, savings: null },
  { credits: 100, price: 9.99, popular: false, savings: '5% off' },
  { credits: 350, price: 29.99, popular: true, savings: '15% off' },
  { credits: 600, price: 49.99, popular: false, savings: '20% off' },
  { credits: 1500, price: 99.99, popular: false, savings: '35% off' },
];

type DashboardTab = 'overview' | 'usage' | 'billing' | 'credits';

const TABS: { id: DashboardTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'S', icon: '📈' },
  { id: 'usage', label: 'Usage', icon: '⚡' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'credits', label: 'Credits', icon: '🪙' },
];

// Map internal app names to user-friendly OneLast AI feature names
const getFeatureName = (endpoint: string): string => {
  const mapping: Record<string, string> = {
    'chat': 'Neural Chat',
    'canvas': 'Canvas Studio',
    'image': 'Image Generation',
    'audio': 'Voice Assistant',
    'code': 'Code Editor',
    'neural-chat': 'Neural Chat',
    'canvas-studio': 'Canvas Studio',
    'maula-editor': 'Code Editor',
  };
  return mapping[endpoint] || 'OneLast AI';
};

// Map model names to user-friendly names
const getModelDisplayName = (model: string): string => {
  // Hide actual model names, show as OneLast AI variants
  if (model.toLowerCase().includes('claude') || model.toLowerCase().includes('anthropic')) {
    return 'OneLast Pro';
  }
  if (model.toLowerCase().includes('gpt') || model.toLowerCase().includes('openai')) {
    return 'OneLast Turbo';
  }
  if (model.toLowerCase().includes('gemini') || model.toLowerCase().includes('google')) {
    return 'OneLast Flash';
  }
  if (model.toLowerCase().includes('grok') || model.toLowerCase().includes('xai')) {
    return 'OneLast X';
  }
  if (model.toLowerCase().includes('mistral')) {
    return 'OneLast Swift';
  }
  if (model.toLowerCase().includes('groq')) {
    return 'OneLast Speed';
  }
  return 'OneLast AI';
};

const Dashboard: React.FC<DashboardProps> = ({ isDarkMode, onClose }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('usage');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/dashboard', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        if (data.success) {
          setDashboardData(data.dashboard);
        } else {
          throw new Error(data.error || 'Failed to load dashboard');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboard();
  }, []);

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

  // Calculate stats from real data
  const creditBalance = dashboardData?.credits?.balance ?? 0;
  const totalCreditsUsed = dashboardData?.stats?.creditsUsedMonth ?? 0;
  const totalTokens = 0; // Not tracked in current API
  const totalRequests = dashboardData?.stats?.requestsMonth ?? 0;

  // Feature/App breakdown from apps.usage
  const featureStats = dashboardData?.apps?.usage 
    ? Object.entries(dashboardData.apps.usage).map(([appId, data]) => ({
        name: getFeatureName(appId),
        credits: data.credits,
        requests: data.requests,
        tokens: 0,
      }))
    : [];

  // Model breakdown - not available in current API, use empty array
  const modelStats: Array<{ name: string; credits: number; requests: number; tokens: number }> = [];

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'canvas': return '🎨';
      case 'chat': return '💬';
      case 'image': return '🖼️';
      case 'audio': return '🎙️';
      case 'code': return '💻';
      case 'generation': return '🚀';
      case 'edit': return '✏️';
      default: return '📊';
    }
  };

  const getFeatureColor = (feature: string) => {
    const colors: Record<string, string> = {
      'Neural Chat': '#22d3ee',
      'Canvas Studio': '#8b5cf6',
      'Image Generation': '#10b981',
      'Voice Assistant': '#f59e0b',
      'Code Editor': '#ec4899',
      'OneLast AI': '#6b7280',
    };
    return colors[feature] || '#22d3ee';
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

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${isDarkMode ? 'bg-[#111]/95' : 'bg-white'}`}>
        <div className="w-10 h-10 border-3 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-4" />
        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading dashboard...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${isDarkMode ? 'bg-[#111]/95' : 'bg-white'} p-4`}>
        <span className="text-3xl mb-4">⚠️</span>
        <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'} text-center`}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className={`mt-4 px-4 py-2 text-xs font-bold rounded-lg ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-700'}`}
        >
          Retry
        </button>
      </div>
    );
  }

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
                  <span className={`text-3xl font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{typeof creditBalance === 'number' ? creditBalance.toFixed(2) : creditBalance}</span>
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
                  <div className={`text-[8px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-wider`}>Total Used</div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{typeof totalCreditsUsed === 'number' ? totalCreditsUsed.toFixed(2) : totalCreditsUsed}</div>
                  <div className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>credits</div>
                </div>
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-[8px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-wider`}>Requests</div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{totalRequests}</div>
                  <div className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>total</div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-[8px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-wider`}>Tokens Processed</div>
                <div className={`text-lg font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatTokens(totalTokens)}</div>
              </div>

              {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
                <div>
                  <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>Recent Activity</h4>
                  <div className="space-y-2">
                    {dashboardData.recentActivity.slice(0, 3).map(record => (
                      <div key={record.id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'} flex items-center gap-2`}>
                        <span className="text-base">{record.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} truncate`}>{record.app}</div>
                          <div className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{record.action} • {formatDate(new Date(record.time).getTime())}</div>
                        </div>
                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>-{record.credits.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* USAGE TAB */}
          {activeTab === 'usage' && (
            <>
              <div>
                <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>By Feature</h4>
                <div className="space-y-2">
                  {featureStats.length > 0 ? featureStats.map((feature) => (
                    <div key={feature.name} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold" style={{ color: getFeatureColor(feature.name) }}>{feature.name}</span>
                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{feature.credits} cr</span>
                      </div>
                      <div className={`h-1.5 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden mb-1`}>
                        <div className="h-full rounded-full" style={{ width: `${totalCreditsUsed > 0 ? (feature.credits / totalCreditsUsed) * 100 : 0}%`, backgroundColor: getFeatureColor(feature.name) }} />
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{feature.requests} req</span>
                        <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{formatTokens(feature.tokens)} tok</span>
                      </div>
                    </div>
                  )) : (
                    <div className={`p-4 text-center ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} text-xs`}>
                      No usage data yet
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>By Model</h4>
                <div className="space-y-2">
                  {modelStats.length > 0 ? modelStats.slice(0, 5).map((model) => (
                    <div key={model.name} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{model.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{model.credits} cr</span>
                      </div>
                      <div className="flex gap-3">
                        <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{model.requests} req</span>
                        <span className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{formatTokens(model.tokens)} tok</span>
                      </div>
                    </div>
                  )) : (
                    <div className={`p-4 text-center ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} text-xs`}>
                      No model data yet
                    </div>
                  )}
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
                    <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No payment method</div>
                    <div className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Add a card to purchase credits</div>
                  </div>
                  <button className={`text-[9px] font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} uppercase`}>Add</button>
                </div>
              </div>

              <h4 className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Transactions</h4>
              <div className={`p-4 text-center ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} text-xs rounded-lg border ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                No transactions yet
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
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{typeof creditBalance === 'number' ? creditBalance.toFixed(2) : creditBalance} credits</div>
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
