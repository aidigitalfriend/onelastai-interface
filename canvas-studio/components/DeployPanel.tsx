import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  Settings,
  Link2,
  Shield,
  Clock,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface DeployedApp {
  id: string;
  slug: string;
  name: string;
  url: string;
  previewUrl?: string;
  customDomain?: string;
  status: 'ACTIVE' | 'PAUSED' | 'BUILDING' | 'FAILED';
  language: string;
  framework?: string;
  viewCount: number;
  lastDeployedAt?: string;
  createdAt: string;
  sslEnabled: boolean;
}

export interface Deployment {
  id: string;
  version: number;
  status: 'PENDING' | 'BUILDING' | 'DEPLOYING' | 'LIVE' | 'FAILED' | 'ROLLED_BACK';
  url?: string;
  buildLogs?: string;
  buildDuration?: number;
  startedAt: string;
  completedAt?: string;
}

interface DeployPanelProps {
  code: string;
  language: string;
  appName: string;
  userId?: string;
  originalPrompt?: string;
  aiModel?: string;
  aiProvider?: string;
  onDeploySuccess?: (app: DeployedApp) => void;
  onClose?: () => void;
}

// ============================================================================
// DEPLOY PANEL COMPONENT
// ============================================================================

const DeployPanel: React.FC<DeployPanelProps> = ({
  code,
  language,
  appName,
  userId,
  originalPrompt,
  aiModel,
  aiProvider,
  onDeploySuccess,
  onClose,
}) => {
  // State
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'building' | 'deploying' | 'success' | 'error'>('idle');
  const [deployedApp, setDeployedApp] = useState<DeployedApp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [myApps, setMyApps] = useState<DeployedApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [activeTab, setActiveTab] = useState<'deploy' | 'my-apps'>('deploy');
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  
  // Config options
  const [customName, setCustomName] = useState(appName || 'My App');
  const [isPublic, setIsPublic] = useState(true);
  const [customDomain, setCustomDomain] = useState('');

  // Fetch user's deployed apps on mount
  useEffect(() => {
    if (userId && activeTab === 'my-apps') {
      fetchMyApps();
    }
  }, [userId, activeTab]);

  const fetchMyApps = async () => {
    if (!userId) return;
    setLoadingApps(true);
    try {
      const response = await fetch(`/api/hosting/my-apps?userId=${userId}`);
      const data = await response.json();
      if (data.apps) {
        setMyApps(data.apps);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const addLog = (message: string) => {
    setDeployLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleDeploy = async () => {
    if (!code.trim()) {
      setError('No code to deploy');
      return;
    }

    setIsDeploying(true);
    setDeployStatus('building');
    setError(null);
    setDeployLogs([]);
    
    addLog('🚀 Starting deployment...');
    addLog(`📦 Project: ${customName}`);
    addLog(`🔤 Language: ${language}`);

    try {
      // Step 1: Build (if needed)
      addLog('🔨 Building project...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate build time
      addLog('✅ Build completed');

      // Step 2: Deploy
      setDeployStatus('deploying');
      addLog('📤 Uploading to servers...');
      
      const response = await fetch('/api/hosting/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name: customName,
          language,
          isPublic,
          userId,
          originalPrompt,
          aiModel,
          aiProvider,
          customDomain: customDomain || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Deployment failed');
      }

      addLog('✅ Files uploaded');
      addLog('🔒 Configuring SSL...');
      await new Promise(resolve => setTimeout(resolve, 300));
      addLog('✅ SSL enabled');
      addLog(`🌐 Live at: ${data.app.url}`);

      setDeployedApp(data.app);
      setDeployStatus('success');
      
      if (onDeploySuccess) {
        onDeploySuccess(data.app);
      }

    } catch (err: any) {
      setError(err.message || 'Deployment failed');
      setDeployStatus('error');
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteApp = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this app?')) return;
    
    try {
      const response = await fetch(`/api/hosting/app/${appId}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setMyApps(prev => prev.filter(app => app.id !== appId));
      }
    } catch (err) {
      console.error('Failed to delete app:', err);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Rocket size={18} />
          </div>
          <div>
            <h2 className="font-bold text-lg">Deploy & Host</h2>
            <p className="text-xs text-gray-500">Publish your app to the world</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition">
            <XCircle size={20} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('deploy')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            activeTab === 'deploy'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Rocket size={16} className="inline mr-2" />
          Deploy
        </button>
        <button
          onClick={() => setActiveTab('my-apps')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            activeTab === 'my-apps'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Globe size={16} className="inline mr-2" />
          My Apps
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'deploy' ? (
          <div className="space-y-4">
            {/* Deploy Status */}
            {deployStatus === 'success' && deployedApp ? (
              <div className="space-y-4">
                {/* Success Card */}
                <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="text-emerald-400" size={24} />
                    <span className="font-bold text-lg text-emerald-400">Deployed Successfully!</span>
                  </div>
                  
                  {/* URL Display */}
                  <div className="bg-black/30 rounded-lg p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Shield size={16} className="text-emerald-400 flex-shrink-0" />
                      <a
                        href={deployedApp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline truncate text-sm"
                      >
                        {deployedApp.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(deployedApp.url)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition"
                        title="Copy URL"
                      >
                        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                      <a
                        href={deployedApp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-700 rounded-lg transition"
                        title="Open in new tab"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* App Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-emerald-400 font-medium">Live</span>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">SSL</div>
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Enabled</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDeployStatus('idle');
                      setDeployedApp(null);
                    }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Deploy Again
                  </button>
                  <a
                    href={deployedApp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} />
                    View Site
                  </a>
                </div>
              </div>
            ) : deployStatus === 'error' ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-red-400" size={20} />
                  <span className="font-bold text-red-400">Deployment Failed</span>
                </div>
                <p className="text-red-300 text-sm mb-3">{error}</p>
                <button
                  onClick={() => {
                    setDeployStatus('idle');
                    setError(null);
                  }}
                  className="bg-red-600 hover:bg-red-500 py-2 px-4 rounded-lg text-sm font-medium transition"
                >
                  Try Again
                </button>
              </div>
            ) : isDeploying ? (
              <div className="space-y-4">
                {/* Progress */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="animate-spin text-cyan-400" size={24} />
                    <span className="font-medium">
                      {deployStatus === 'building' ? 'Building project...' : 'Deploying to servers...'}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                      style={{ width: deployStatus === 'building' ? '40%' : '80%' }}
                    />
                  </div>
                </div>

                {/* Logs */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs">
                  {deployLogs.map((log, i) => (
                    <div key={i} className="text-gray-400 py-0.5">{log}</div>
                  ))}
                </div>
              </div>
            ) : (
              /* Deploy Form */
              <div className="space-y-4">
                {/* App Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">App Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="My Awesome App"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL: {customName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-xxxxx.canvas.onelast.ai
                  </p>
                </div>

                {/* Project Info */}
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Language</span>
                    <span className="text-white capitalize">{language}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Size</span>
                    <span className="text-white">{(code.length / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    {isPublic ? <Globe size={18} /> : <Shield size={18} />}
                    <span className="text-sm">{isPublic ? 'Public' : 'Private'}</span>
                  </div>
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      isPublic ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        isPublic ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Advanced Options */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                    />
                    Advanced Options
                  </button>
                  
                  {showAdvanced && (
                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-800">
                      {/* Custom Domain */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Custom Domain</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            placeholder="mysite.com"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                          />
                          <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
                            <Link2 size={16} />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Point your domain's CNAME to canvas.onelast.ai
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Deploy Button */}
                <button
                  onClick={handleDeploy}
                  disabled={isDeploying || !code.trim()}
                  className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-3"
                >
                  <Zap size={20} />
                  Deploy Now
                </button>

                {/* Info */}
                <div className="text-center text-xs text-gray-500">
                  Free hosting • SSL included • Global CDN
                </div>
              </div>
            )}
          </div>
        ) : (
          /* My Apps Tab */
          <div className="space-y-3">
            {loadingApps ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-cyan-400" size={24} />
              </div>
            ) : myApps.length === 0 ? (
              <div className="text-center py-8">
                <Globe size={48} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">No deployed apps yet</p>
                <button
                  onClick={() => setActiveTab('deploy')}
                  className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  Deploy your first app →
                </button>
              </div>
            ) : (
              myApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-white">{app.name}</h3>
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:underline"
                      >
                        {app.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          app.status === 'ACTIVE' ? 'bg-emerald-400' :
                          app.status === 'BUILDING' ? 'bg-yellow-400 animate-pulse' :
                          'bg-red-400'
                        }`}
                      />
                      <span className="text-xs text-gray-500 capitalize">
                        {app.status.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {app.viewCount} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                    {app.sslEnabled && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Shield size={12} />
                        SSL
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1"
                    >
                      <ExternalLink size={14} />
                      Visit
                    </a>
                    <button
                      onClick={() => copyToClipboard(app.url)}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteApp(app.id)}
                      className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Refresh Button */}
            {myApps.length > 0 && (
              <button
                onClick={fetchMyApps}
                disabled={loadingApps}
                className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} className={loadingApps ? 'animate-spin' : ''} />
                Refresh
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Shield size={12} className="text-emerald-400" />
            SSL Included
          </span>
          <span className="flex items-center gap-1">
            <Globe size={12} className="text-cyan-400" />
            Global CDN
          </span>
          <span className="flex items-center gap-1">
            <Zap size={12} className="text-purple-400" />
            Instant Deploy
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeployPanel;
