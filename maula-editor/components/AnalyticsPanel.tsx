import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import analyticsService, {
  AnalyticsDashboard,
  ErrorReport,
  CrashLog,
  ExtensionAnalytics,
  PerformanceMetric,
  UsageInsight,
  RefactoringAnalysis,
  RefactoringSuggestion,
} from '../services/analytics';

type TabType = 'overview' | 'errors' | 'crashes' | 'extensions' | 'performance' | 'refactoring';

export const AnalyticsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dashboard, setDashboard] = useState<AnalyticsDashboard>(analyticsService.getDashboard());
  const [errors, setErrors] = useState<ErrorReport[]>(analyticsService.getErrors());
  const [crashes, setCrashes] = useState<CrashLog[]>(analyticsService.getCrashes());
  const [extensionAnalytics, setExtensionAnalytics] = useState<ExtensionAnalytics[]>(analyticsService.getExtensionAnalytics());
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>(analyticsService.getPerformanceMetrics());
  const [refactoringAnalysis, setRefactoringAnalysis] = useState<RefactoringAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [consentGiven, setConsentGiven] = useState(analyticsService.getConsent());
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const [selectedCrash, setSelectedCrash] = useState<CrashLog | null>(null);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    const unsubscribe = analyticsService.on('*', (event) => {
      switch (event.type) {
        case 'error':
        case 'errorUpdated':
          setErrors([...analyticsService.getErrors()]);
          break;
        case 'crash':
          setCrashes([...analyticsService.getCrashes()]);
          break;
        case 'extensionAnalytics':
          setExtensionAnalytics([...analyticsService.getExtensionAnalytics()]);
          break;
      }
      setDashboard(analyticsService.getDashboard());
    });

    return unsubscribe;
  }, []);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'errors', label: 'Errors', icon: '🔴' },
    { id: 'crashes', label: 'Crashes', icon: '💥' },
    { id: 'extensions', label: 'Extensions', icon: '🧩' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'refactoring', label: 'AI Refactor', icon: '🔧' },
  ];

  const handleAnalyzeCode = async () => {
    setIsAnalyzing(true);
    // Sample code for analysis
    const sampleCode = `
function processData(items) {
  console.log('Processing', items.length, 'items');
  let result = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].status === 1) {
      result.push({
        id: items[i].id,
        name: items[i].name,
        value: items[i].value * 1.15
      });
    }
  }
  for (let i = 0; i < items.length; i++) {
    if (items[i].status === 2) {
      result.push({
        id: items[i].id,
        name: items[i].name,
        value: items[i].value * 1.25
      });
    }
  }
  return result;
}
    `.trim();

    const analysis = await analyticsService.analyzeCodeForRefactoring(
      sampleCode,
      'typescript',
      'src/utils/process.ts'
    );
    setRefactoringAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 60) {
      const hours = Math.floor(mins / 60);
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      default: return 'text-green-400 bg-green-900/30';
    }
  };

  const renderMiniChart = (data: { date: string; count?: number; value?: number }[], color: string) => {
    const values = data.map(d => d.count ?? d.value ?? 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return (
      <div className="flex items-end gap-1 h-12">
        {values.map((value, i) => (
          <div
            key={i}
            className={`w-2 rounded-t ${color}`}
            style={{ height: `${((value - min) / range) * 100}%`, minHeight: '4px' }}
            title={`${data[i].date}: ${value}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="font-medium text-sm">Analytics & Telemetry</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as any)}
            className="bg-[#3c3c3c] text-white text-xs px-2 py-1 rounded"
          >
            <option value="day">Last 24h</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Consent Banner */}
      {!consentGiven && (
        <div className="bg-blue-900/30 border-b border-blue-500/30 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-300">
              🔒 Help improve the IDE by sharing anonymous usage data
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { analyticsService.setConsent(true); setConsentGiven(true); }}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 rounded text-xs"
              >
                Accept
              </button>
              <button
                onClick={() => setConsentGiven(true)}
                className="px-2 py-0.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-xs"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#3c3c3c] bg-[#252526] overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'errors' && errors.filter(e => !e.resolved).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-600 rounded-full text-[10px]">
                {errors.filter(e => !e.resolved).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-3 space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#252526] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Active Users</div>
                <div className="text-2xl font-bold text-white">{formatNumber(dashboard.overview.activeUsers)}</div>
                <div className="text-xs text-green-400">↑ 12% from last period</div>
              </div>
              <div className="bg-[#252526] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Sessions</div>
                <div className="text-2xl font-bold text-white">{formatNumber(dashboard.overview.totalSessions)}</div>
                {renderMiniChart(dashboard.trends.sessions, 'bg-blue-500')}
              </div>
              <div className="bg-[#252526] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Avg Session</div>
                <div className="text-2xl font-bold text-white">{formatDuration(dashboard.overview.avgSessionDuration)}</div>
                <div className="text-xs text-gray-500">Per user</div>
              </div>
              <div className="bg-[#252526] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Crash-Free Rate</div>
                <div className="text-2xl font-bold text-green-400">{dashboard.overview.crashFreeRate.toFixed(1)}%</div>
                <div className="h-1.5 bg-[#3c3c3c] rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${dashboard.overview.crashFreeRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Error Rate */}
            <div className="bg-[#252526] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Error Rate</span>
                <span className={`text-sm ${dashboard.overview.errorRate > 5 ? 'text-red-400' : 'text-green-400'}`}>
                  {dashboard.overview.errorRate.toFixed(2)}%
                </span>
              </div>
              {renderMiniChart(dashboard.trends.errors, 'bg-red-500')}
            </div>

            {/* Top Features */}
            <div className="bg-[#252526] rounded-lg p-3">
              <div className="text-sm font-medium text-white mb-2">Top Features</div>
              <div className="space-y-2">
                {dashboard.topFeatures.slice(0, 5).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-300">{feature.feature}</div>
                      <div className="h-1.5 bg-[#3c3c3c] rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(feature.usage / dashboard.topFeatures[0].usage) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{feature.usage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div className="flex flex-col h-full">
            <div className="p-2 border-b border-[#3c3c3c] bg-[#252526]">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-400">{errors.filter(e => !e.resolved).length} unresolved</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{errors.length} total</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {errors.length > 0 ? (
                <div className="divide-y divide-[#3c3c3c]">
                  {errors.map(error => (
                    <div
                      key={error.id}
                      onClick={() => setSelectedError(error)}
                      className={`px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] ${
                        selectedError?.id === error.id ? 'bg-[#094771]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 w-2 h-2 rounded-full ${error.resolved ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{error.message}</div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{error.type}</span>
                            <span>•</span>
                            <span>{error.occurrences}x</span>
                            <span>•</span>
                            <span>{error.affectedUsers} users</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  🎉 No errors recorded
                </div>
              )}
            </div>

            {/* Error Details */}
            {selectedError && (
              <div className="h-48 border-t border-[#3c3c3c] bg-[#252526] overflow-auto">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{selectedError.type}</span>
                    <button
                      onClick={() => setSelectedError(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-xs text-red-400 mb-2">{selectedError.message}</div>
                  {selectedError.stack && (
                    <pre className="text-xs text-gray-500 font-mono bg-[#1e1e1e] p-2 rounded overflow-auto max-h-24">
                      {selectedError.stack}
                    </pre>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>First: {selectedError.firstOccurrence.toLocaleString()}</span>
                    <span>Last: {selectedError.lastOccurrence.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Crashes Tab */}
        {activeTab === 'crashes' && (
          <div className="flex flex-col h-full">
            <div className="p-2 border-b border-[#3c3c3c] bg-[#252526]">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-yellow-400">💥 {crashes.length} crash logs</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {crashes.length > 0 ? (
                <div className="divide-y divide-[#3c3c3c]">
                  {crashes.map(crash => (
                    <div
                      key={crash.id}
                      onClick={() => setSelectedCrash(crash)}
                      className={`px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] ${
                        selectedCrash?.id === crash.id ? 'bg-[#094771]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${getSeverityColor(crash.severity)}`}>
                          {crash.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white">{crash.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{crash.type}</div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {crash.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  ✨ No crashes recorded
                </div>
              )}
            </div>

            {/* Crash Details */}
            {selectedCrash && (
              <div className="h-56 border-t border-[#3c3c3c] bg-[#252526] overflow-auto">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{selectedCrash.title}</span>
                    <button
                      onClick={() => setSelectedCrash(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{selectedCrash.description}</div>
                  
                  {selectedCrash.memoryUsage && (
                    <div className="mb-2 p-2 bg-[#1e1e1e] rounded">
                      <div className="text-xs text-gray-500 mb-1">Memory Usage</div>
                      <div className="text-xs text-white">
                        {formatBytes(selectedCrash.memoryUsage.usedJSHeapSize)} / {formatBytes(selectedCrash.memoryUsage.jsHeapSizeLimit)}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-1">Breadcrumbs</div>
                  <div className="space-y-1 max-h-20 overflow-auto">
                    {selectedCrash.breadcrumbs.slice(-5).map((bc, i) => (
                      <div key={i} className="text-xs flex items-center gap-2">
                        <span className="text-gray-600">{bc.timestamp.toLocaleTimeString()}</span>
                        <span className={bc.level === 'error' ? 'text-red-400' : 'text-gray-400'}>
                          [{bc.category}] {bc.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extensions Tab */}
        {activeTab === 'extensions' && (
          <div className="p-3 space-y-2">
            {extensionAnalytics.map(ext => (
              <div key={ext.extensionId} className="bg-[#252526] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-white">{ext.name}</div>
                    <div className="text-xs text-gray-500">v{ext.version}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">{ext.activations} activations</div>
                    <div className="flex items-center gap-1 text-xs">
                      {'⭐'.repeat(Math.round(ext.rating))}
                      <span className="text-gray-500">{ext.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">Load Time</div>
                    <div className="text-white">{ext.loadTime.toFixed(0)}ms</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Memory</div>
                    <div className="text-white">{ext.memoryUsage.toFixed(1)}MB</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Errors</div>
                    <div className={ext.errors > 0 ? 'text-red-400' : 'text-green-400'}>{ext.errors}</div>
                  </div>
                </div>

                {Object.keys(ext.commands).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#3c3c3c]">
                    <div className="text-xs text-gray-500 mb-1">Commands</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(ext.commands).map(([cmd, count]) => (
                        <span key={cmd} className="px-1.5 py-0.5 bg-[#3c3c3c] rounded text-[10px]">
                          {cmd}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="p-3 space-y-4">
            <div className="bg-[#252526] rounded-lg p-3">
              <div className="text-sm font-medium text-white mb-2">Response Time</div>
              {renderMiniChart(dashboard.trends.performance, 'bg-green-500')}
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Avg: 245ms</span>
                <span>p95: 890ms</span>
                <span>p99: 1.2s</span>
              </div>
            </div>

            <div className="bg-[#252526] rounded-lg p-3">
              <div className="text-sm font-medium text-white mb-2">Core Web Vitals</div>
              <div className="space-y-2">
                {[
                  { name: 'LCP', value: 2.4, unit: 's', threshold: 2.5, good: true },
                  { name: 'FID', value: 85, unit: 'ms', threshold: 100, good: true },
                  { name: 'CLS', value: 0.08, unit: '', threshold: 0.1, good: true },
                  { name: 'TTFB', value: 420, unit: 'ms', threshold: 500, good: true },
                ].map(metric => (
                  <div key={metric.name} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${metric.good ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs text-gray-400 w-12">{metric.name}</span>
                    <div className="flex-1 h-1.5 bg-[#3c3c3c] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${metric.good ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, (metric.value / metric.threshold) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-white w-16 text-right">
                      {metric.value}{metric.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#252526] rounded-lg p-3">
              <div className="text-sm font-medium text-white mb-2">Memory Usage</div>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke="#3c3c3c"
                      strokeWidth="8"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeDasharray={`${65 * 2.2} ${100 * 2.2}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">65%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Used</span>
                    <span className="text-white">1.2 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Free</span>
                    <span className="text-white">650 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total</span>
                    <span className="text-white">1.85 GB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Refactoring Tab */}
        {activeTab === 'refactoring' && (
          <div className="p-3 space-y-4">
            <div className="bg-[#252526] rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-white">AI Code Analysis</div>
                  <div className="text-xs text-gray-500">Powered by machine learning</div>
                </div>
                <button
                  onClick={handleAnalyzeCode}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs font-medium flex items-center gap-1"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Analyzing...
                    </>
                  ) : (
                    <>🔍 Analyze Code</>
                  )}
                </button>
              </div>

              {refactoringAnalysis && (
                <div className="space-y-3">
                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-[#1e1e1e] rounded">
                      <div className="text-xs text-gray-500">Code Quality</div>
                      <div className={`text-lg font-bold ${
                        refactoringAnalysis.codeQualityScore >= 70 ? 'text-green-400' :
                        refactoringAnalysis.codeQualityScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {refactoringAnalysis.codeQualityScore}%
                      </div>
                    </div>
                    <div className="p-2 bg-[#1e1e1e] rounded">
                      <div className="text-xs text-gray-500">Technical Debt</div>
                      <div className="text-lg font-bold text-orange-400">
                        {refactoringAnalysis.technicalDebt}m
                      </div>
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">
                      {refactoringAnalysis.suggestions.length} suggestions found
                    </div>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {refactoringAnalysis.suggestions.map(suggestion => (
                        <div key={suggestion.id} className="p-2 bg-[#1e1e1e] rounded">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white">{suggestion.title}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${getImpactColor(suggestion.impact)}`}>
                                  {suggestion.impact}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {suggestion.description}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              L{suggestion.startLine}
                            </div>
                          </div>
                          <div className="mt-2 p-1.5 bg-[#252526] rounded text-[10px] font-mono text-gray-400 overflow-x-auto">
                            {suggestion.originalCode.slice(0, 100)}...
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-blue-400">{suggestion.category}</span>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-gray-500">Confidence:</span>
                              <span className="text-green-400">{(suggestion.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!refactoringAnalysis && !isAnalyzing && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Click "Analyze Code" to get AI-powered refactoring suggestions
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-t border-[#3c3c3c] text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Session: {analyticsService.getSession().id.slice(0, 12)}...</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => analyticsService.clearData()}
            className="hover:text-white"
          >
            Clear Data
          </button>
          <span>•</span>
          <button
            onClick={() => {
              const data = analyticsService.exportData();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'analytics-export.json';
              a.click();
            }}
            className="hover:text-white"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
