import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import usageCreditsService, {
  CreditBalance,
  UsageStats,
  UsageRecord,
  ModelPricing,
  CreditPackage,
  MODEL_PRICING,
} from '../services/usageCredits';
import { isDarkTheme } from '../utils/theme';
import { useStore } from '../store/useStore';

type TabType = 'overview' | 'usage' | 'models' | 'credits' | 'history';

export const UsageDashboard: React.FC = () => {
  const { theme } = useStore();
  const isDark = isDarkTheme(theme);
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [credits, setCredits] = useState<CreditBalance>(usageCreditsService.getCredits());
  const [stats, setStats] = useState<UsageStats>(usageCreditsService.getUsageStats());
  const [recentUsage, setRecentUsage] = useState<UsageRecord[]>(usageCreditsService.getRecentUsage());
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  // Theme classes
  const bgClass = isDark ? 'bg-vscode-sidebar' : 'bg-gray-50';
  const cardBgClass = isDark ? 'bg-vscode-bg' : 'bg-white';
  const borderClass = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textClass = isDark ? 'text-vscode-text' : 'text-gray-900';
  const mutedTextClass = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const accentClass = isDark ? 'text-vscode-accent' : 'text-blue-600';

  useEffect(() => {
    const unsubscribe = usageCreditsService.subscribe((event, data) => {
      setCredits(usageCreditsService.getCredits());
      setStats(usageCreditsService.getUsageStats());
      setRecentUsage(usageCreditsService.getRecentUsage());
    });
    return unsubscribe;
  }, []);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'usage', label: 'Usage Charts', icon: '📈' },
    { id: 'models', label: 'Models & Pricing', icon: '🤖' },
    { id: 'credits', label: 'Add Credits', icon: '💳' },
    { id: 'history', label: 'History', icon: '📋' },
  ];

  const creditPackages = usageCreditsService.getCreditPackages();
  const usageByProvider = usageCreditsService.getUsageByProvider();
  const usageByModel = usageCreditsService.getUsageByModel();

  // Calculate credit percentage
  const creditPercentage = credits.totalCredits > 0 
    ? Math.round((credits.remainingCredits / credits.totalCredits) * 100)
    : 0;

  // Get chart data based on time range
  const chartData = timeRange === 'week' ? stats.thisWeek : stats.thisMonth;

  // Max values for chart scaling
  const maxTokens = Math.max(...chartData.map(d => d.totalTokens), 1);
  const maxCredits = Math.max(...chartData.map(d => d.totalCredits), 1);

  const handleAddCredits = (packageId: string) => {
    const pkg = creditPackages.find(p => p.id === packageId);
    if (pkg) {
      // In production, this would trigger a payment flow
      usageCreditsService.addCredits(pkg.credits + pkg.bonus, 'purchase');
      setSelectedPackage(null);
    }
  };

  const handleAddDemoData = () => {
    usageCreditsService.addDemoData();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getProviderColor = (provider: string): string => {
    const colors: Record<string, string> = {
      gemini: '#4285f4',
      openai: '#10a37f',
      anthropic: '#d4a574',
      mistral: '#ff6b35',
      groq: '#f97316',
      xai: '#1da1f2',
      cerebras: '#8b5cf6',
      huggingface: '#ffd21e',
      ollama: '#ffffff',
    };
    return colors[provider] || '#6b7280';
  };

  const getTierBadgeClass = (tier: ModelPricing['tier']): string => {
    switch (tier) {
      case 'free': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'standard': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'premium': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'enterprise': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className={`flex flex-col h-full ${bgClass} overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${borderClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h2 className={`font-semibold ${textClass}`}>Usage Dashboard</h2>
        </div>
        <button
          onClick={handleAddDemoData}
          className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-vscode-hover text-vscode-textMuted hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Add Demo Data
        </button>
      </div>

      {/* Credit Summary Bar */}
      <div className={`px-4 py-3 border-b ${borderClass} ${cardBgClass}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${textClass}`}>Credit Balance</span>
          <span className={`text-lg font-bold ${accentClass}`}>
            {formatNumber(credits.remainingCredits)} credits
          </span>
        </div>
        <div className={`w-full h-2 rounded-full ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'}`}>
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              creditPercentage > 50 ? 'bg-green-500' : 
              creditPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${creditPercentage}%` }}
          />
        </div>
        <div className={`flex justify-between mt-1 text-xs ${mutedTextClass}`}>
          <span>Used: {formatNumber(credits.usedCredits)}</span>
          <span>Total: {formatNumber(credits.totalCredits)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${borderClass} px-2 overflow-x-auto`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? `${accentClass} border-current`
                : `${mutedTextClass} border-transparent hover:${textClass}`
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border ${borderClass} ${cardBgClass}`}>
                  <div className={`text-xs ${mutedTextClass} mb-1`}>Today's Usage</div>
                  <div className={`text-xl font-bold ${textClass}`}>{formatNumber(stats.today.totalTokens)}</div>
                  <div className={`text-xs ${mutedTextClass}`}>tokens</div>
                </div>
                <div className={`p-3 rounded-lg border ${borderClass} ${cardBgClass}`}>
                  <div className={`text-xs ${mutedTextClass} mb-1`}>Today's Cost</div>
                  <div className={`text-xl font-bold ${accentClass}`}>{stats.today.totalCredits}</div>
                  <div className={`text-xs ${mutedTextClass}`}>credits</div>
                </div>
                <div className={`p-3 rounded-lg border ${borderClass} ${cardBgClass}`}>
                  <div className={`text-xs ${mutedTextClass} mb-1`}>Total Requests</div>
                  <div className={`text-xl font-bold ${textClass}`}>{stats.allTime.totalRequests}</div>
                  <div className={`text-xs ${mutedTextClass}`}>all time</div>
                </div>
                <div className={`p-3 rounded-lg border ${borderClass} ${cardBgClass}`}>
                  <div className={`text-xs ${mutedTextClass} mb-1`}>Success Rate</div>
                  <div className={`text-xl font-bold text-green-500`}>{stats.allTime.successRate}%</div>
                  <div className={`text-xs ${mutedTextClass}`}>avg: {stats.allTime.averageResponseTime}ms</div>
                </div>
              </div>

              {/* Provider Usage */}
              <div className={`p-4 rounded-lg border ${borderClass} ${cardBgClass}`}>
                <h3 className={`text-sm font-medium ${textClass} mb-3`}>Usage by Provider</h3>
                <div className="space-y-2">
                  {Object.entries(usageByProvider).map(([provider, data]) => {
                    const total = Object.values(usageByProvider).reduce((sum, d) => sum + d.credits, 0);
                    const percentage = total > 0 ? (data.credits / total) * 100 : 0;
                    return (
                      <div key={provider} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getProviderColor(provider) }}
                        />
                        <span className={`text-sm ${textClass} capitalize flex-1`}>{provider}</span>
                        <span className={`text-xs ${mutedTextClass}`}>{data.requests} req</span>
                        <span className={`text-sm font-medium ${textClass}`}>{data.credits} cr</span>
                        <div className={`w-16 h-1.5 rounded-full ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'}`}>
                          <div 
                            className="h-full rounded-full"
                            style={{ width: `${percentage}%`, backgroundColor: getProviderColor(provider) }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(usageByProvider).length === 0 && (
                    <p className={`text-sm ${mutedTextClass} text-center py-4`}>No usage data yet</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('credits')}
                  className="flex-1 py-2 px-4 bg-vscode-accent text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  💳 Add Credits
                </button>
                <button
                  onClick={() => setActiveTab('models')}
                  className={`flex-1 py-2 px-4 border ${borderClass} rounded-lg font-medium text-sm ${textClass} hover:bg-opacity-80 transition-colors`}
                >
                  🤖 View Models
                </button>
              </div>
            </motion.div>
          )}

          {/* Usage Charts Tab */}
          {activeTab === 'usage' && (
            <motion.div
              key="usage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Time Range Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeRange('week')}
                  className={`px-3 py-1 text-sm rounded ${
                    timeRange === 'week' 
                      ? 'bg-vscode-accent text-white' 
                      : `${isDark ? 'bg-vscode-hover text-vscode-textMuted' : 'bg-gray-100 text-gray-600'}`
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setTimeRange('month')}
                  className={`px-3 py-1 text-sm rounded ${
                    timeRange === 'month' 
                      ? 'bg-vscode-accent text-white' 
                      : `${isDark ? 'bg-vscode-hover text-vscode-textMuted' : 'bg-gray-100 text-gray-600'}`
                  }`}
                >
                  Last 30 Days
                </button>
              </div>

              {/* Token Usage Chart */}
              <div className={`p-4 rounded-lg border ${borderClass} ${cardBgClass}`}>
                <h3 className={`text-sm font-medium ${textClass} mb-3`}>Token Usage</h3>
                <div className="h-40 flex items-end gap-1">
                  {chartData.map((day, i) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-400"
                        style={{ 
                          height: `${maxTokens > 0 ? (day.totalTokens / maxTokens) * 100 : 0}%`,
                          minHeight: day.totalTokens > 0 ? '4px' : '0'
                        }}
                        title={`${formatNumber(day.totalTokens)} tokens`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className={`text-[10px] ${mutedTextClass}`}>{formatDate(chartData[0]?.date || '')}</span>
                  <span className={`text-[10px] ${mutedTextClass}`}>{formatDate(chartData[chartData.length - 1]?.date || '')}</span>
                </div>
              </div>

              {/* Credits Usage Chart */}
              <div className={`p-4 rounded-lg border ${borderClass} ${cardBgClass}`}>
                <h3 className={`text-sm font-medium ${textClass} mb-3`}>Credits Spent</h3>
                <div className="h-40 flex items-end gap-1">
                  {chartData.map((day, i) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-400"
                        style={{ 
                          height: `${maxCredits > 0 ? (day.totalCredits / maxCredits) * 100 : 0}%`,
                          minHeight: day.totalCredits > 0 ? '4px' : '0'
                        }}
                        title={`${day.totalCredits} credits`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className={`text-[10px] ${mutedTextClass}`}>{formatDate(chartData[0]?.date || '')}</span>
                  <span className={`text-[10px] ${mutedTextClass}`}>{formatDate(chartData[chartData.length - 1]?.date || '')}</span>
                </div>
              </div>

              {/* Model Distribution */}
              <div className={`p-4 rounded-lg border ${borderClass} ${cardBgClass}`}>
                <h3 className={`text-sm font-medium ${textClass} mb-3`}>Model Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(usageByModel).slice(0, 5).map(([model, data]) => {
                    const total = Object.values(usageByModel).reduce((sum, d) => sum + d.requests, 0);
                    const percentage = total > 0 ? (data.requests / total) * 100 : 0;
                    return (
                      <div key={model}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={textClass}>{model}</span>
                          <span className={mutedTextClass}>{data.requests} requests</span>
                        </div>
                        <div className={`w-full h-2 rounded-full ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'}`}>
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${percentage}%`, 
                              backgroundColor: getProviderColor(data.provider) 
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(usageByModel).length === 0 && (
                    <p className={`text-sm ${mutedTextClass} text-center py-4`}>No model usage data yet</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Models & Pricing Tab */}
          {activeTab === 'models' && (
            <motion.div
              key="models"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {MODEL_PRICING.map(model => (
                <div 
                  key={`${model.provider}-${model.model}`}
                  className={`p-3 rounded-lg border ${borderClass} ${cardBgClass}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getProviderColor(model.provider) }}
                      />
                      <span className={`font-medium ${textClass}`}>{model.displayName}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${getTierBadgeClass(model.tier)}`}>
                      {model.tier}
                    </span>
                  </div>
                  <p className={`text-xs ${mutedTextClass} mb-2`}>{model.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {model.capabilities.map(cap => (
                      <span 
                        key={cap}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-vscode-hover' : 'bg-gray-100'} ${mutedTextClass}`}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={mutedTextClass}>
                      Input: <span className={textClass}>{model.inputCostPer1K} cr/1K</span>
                    </span>
                    <span className={mutedTextClass}>
                      Output: <span className={textClass}>{model.outputCostPer1K} cr/1K</span>
                    </span>
                    <span className={mutedTextClass}>
                      Max: <span className={textClass}>{formatNumber(model.maxTokens)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Add Credits Tab */}
          {activeTab === 'credits' && (
            <motion.div
              key="credits"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className={`p-4 rounded-lg border ${borderClass} ${cardBgClass} text-center`}>
                <div className={`text-3xl font-bold ${accentClass} mb-1`}>
                  {formatNumber(credits.remainingCredits)}
                </div>
                <div className={`text-sm ${mutedTextClass}`}>credits remaining</div>
              </div>

              <h3 className={`text-sm font-medium ${textClass}`}>Purchase Credits</h3>
              
              <div className="grid grid-cols-1 gap-3">
                {creditPackages.map(pkg => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedPackage === pkg.id
                        ? 'border-vscode-accent bg-vscode-accent/10'
                        : `border-transparent ${cardBgClass} border ${borderClass} hover:border-vscode-accent/50`
                    } ${pkg.popular ? 'ring-2 ring-vscode-accent ring-offset-2 ring-offset-transparent' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${textClass}`}>{pkg.name}</span>
                      {pkg.popular && (
                        <span className="text-[10px] px-2 py-0.5 bg-vscode-accent text-white rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={`text-2xl font-bold ${textClass}`}>${pkg.price}</span>
                      <span className={`text-sm ${mutedTextClass}`}>USD</span>
                    </div>
                    <div className={`text-sm ${mutedTextClass}`}>
                      {formatNumber(pkg.credits)} credits
                      {pkg.bonus > 0 && (
                        <span className="text-green-500 ml-1">+{formatNumber(pkg.bonus)} bonus</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedPackage && (
                <button
                  onClick={() => handleAddCredits(selectedPackage)}
                  className="w-full py-3 bg-vscode-accent text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Purchase Now
                </button>
              )}

              <p className={`text-xs ${mutedTextClass} text-center`}>
                Credits never expire. Secure payment via Stripe.
              </p>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {recentUsage.length === 0 ? (
                <div className={`text-center py-8 ${mutedTextClass}`}>
                  <p className="text-4xl mb-2">📋</p>
                  <p>No usage history yet</p>
                </div>
              ) : (
                recentUsage.map(record => (
                  <div
                    key={record.id}
                    className={`p-3 rounded-lg border ${borderClass} ${cardBgClass}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getProviderColor(record.provider) }}
                        />
                        <span className={`text-sm font-medium ${textClass}`}>{record.model}</span>
                      </div>
                      <span className={`text-xs ${record.success ? 'text-green-500' : 'text-red-500'}`}>
                        {record.success ? '✓' : '✗'} {record.creditsUsed} cr
                      </span>
                    </div>
                    <div className={`flex justify-between text-xs ${mutedTextClass}`}>
                      <span>
                        {record.promptTokens} → {record.completionTokens} tokens
                      </span>
                      <span>{record.responseTime}ms</span>
                    </div>
                    <div className={`text-[10px] ${mutedTextClass} mt-1`}>
                      {new Date(record.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UsageDashboard;
