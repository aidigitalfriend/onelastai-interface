/**
 * DeployPanel - Maula.ai Subdomain Hosting
 * Deploy projects to {your-site}.maula.ai — free SSL, CDN, instant shareable links
 * 
 * This is the canvas-app version (maula.ai/canvas-studio) — Maula hosting ONLY.
 * For 3rd-party deploys (Vercel, Railway, etc.), see frontend/.../canvas-studio/
 */

import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  X,
  Clock,
  Settings,
  AlertTriangle,
  Wrench,
  Shield,
  Zap,
  Wifi,
} from 'lucide-react';
import {
  DeploymentStatus,
  DeploymentConfig,
} from '../types';
import deploymentService, {
  DeploymentHistoryEntry,
} from '../services/deploymentService';

interface DeployPanelProps {
  darkMode?: boolean;
  projectName: string;
  files: Record<string, string>;
  onClose: () => void;
  onDeployComplete?: (url: string, platform: 'maula') => void;
  onFixBuildError?: (error: string, buildLogs: string[]) => void;
}

type TabId = 'deploy' | 'history';

const DeployPanel: React.FC<DeployPanelProps> = ({
  projectName,
  files,
  onClose,
  onDeployComplete,
  onFixBuildError,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('deploy');
  const [deployStatus, setDeployStatus] = useState<DeploymentStatus>({ state: 'idle', message: '', logs: [] });
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<DeploymentHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(deploymentService.getDeploymentHistory());
  }, []);

  const handleDeploy = async () => {
    setDeployUrl(null);
    setDeployStatus({ state: 'preparing', message: 'Preparing...', logs: [] });

    const config: DeploymentConfig = {
      platform: 'maula',
      projectName: projectName || 'canvas-project',
      framework: 'static',
    };

    const deployFiles = deploymentService.prepareDeploymentFiles(files, config);

    const result = await deploymentService.deployProject(config, deployFiles, (status) => {
      setDeployStatus(status);
      if (status.url) {
        setDeployUrl(status.url);
      }
    });

    if (result.success && result.url) {
      setDeployUrl(result.url);
      onDeployComplete?.(result.url, 'maula');
    }
    setHistory(deploymentService.getDeploymentHistory());
  };

  const handleCopyUrl = () => {
    if (deployUrl) {
      navigator.clipboard.writeText(deployUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFixErrors = () => {
    if (deployStatus.error && deployStatus.logs && onFixBuildError) {
      onFixBuildError(deployStatus.error, deployStatus.logs);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-zinc-950 rounded-3xl shadow-2xl w-full max-w-lg relative border border-purple-900/30 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl">
              <Rocket className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-200">Deploy to Maula.ai</h2>
              <p className="text-xs text-zinc-500 truncate max-w-[200px]">{projectName || 'Untitled'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-purple-500/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-900/20 px-6">
          {([
            { id: 'deploy' as TabId, label: 'Deploy', icon: Rocket },
            { id: 'history' as TabId, label: 'History', icon: Clock },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-400 text-purple-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* DEPLOY TAB */}
          {activeTab === 'deploy' && (
            <div className="space-y-4">
              {/* Ready to Deploy */}
              {deployStatus.state === 'idle' && !deployUrl && (
                <>
                  {/* Hero Card */}
                  <div className="p-5 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-blue-500/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5" />
                    <div className="relative">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/10">
                          🚀
                        </div>
                        <div>
                          <p className="text-lg font-bold text-zinc-200">Publish Your App</p>
                          <p className="text-xs text-zinc-400">
                            Get a live link at <span className="text-purple-400 font-semibold">{(projectName || 'my-app').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}.maula.ai</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Features */}
                      <div className="grid grid-cols-3 gap-2 mb-5">
                        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-black/30 rounded-xl border border-purple-500/10">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] text-zinc-400 font-medium">Free SSL</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-black/30 rounded-xl border border-purple-500/10">
                          <Wifi className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-[10px] text-zinc-400 font-medium">Global CDN</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-black/30 rounded-xl border border-purple-500/10">
                          <Zap className="w-3.5 h-3.5 text-yellow-400" />
                          <span className="text-[10px] text-zinc-400 font-medium">Instant</span>
                        </div>
                      </div>

                      <button
                        onClick={handleDeploy}
                        className="w-full py-3.5 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/20"
                      >
                        <Rocket className="w-4 h-4" />
                        🚀 Deploy Now — Get Shareable Link
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-600 text-center">
                    No tokens or API keys needed • Deploys in seconds • Free forever
                  </p>
                </>
              )}

              {/* Deploy Progress */}
              {deployStatus.state !== 'idle' && deployStatus.state !== 'ready' && deployStatus.state !== 'error' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <div>
                      <p className="text-sm font-bold text-zinc-200">{deployStatus.message}</p>
                      <p className="text-xs text-zinc-500">Publishing to Maula.ai</p>
                    </div>
                  </div>
                  {deployStatus.progress !== undefined && (
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${deployStatus.progress}%` }}
                      />
                    </div>
                  )}
                  <div className="bg-zinc-900 rounded-xl p-3 max-h-32 overflow-y-auto">
                    {deployStatus.logs.map((log, i) => (
                      <p key={i} className="text-[11px] text-zinc-400 font-mono leading-relaxed">{log}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Deploy Success */}
              {(deployStatus.state === 'ready' || deployUrl) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-bold text-emerald-400">Deployed Successfully! 🎉</p>
                      <p className="text-[10px] text-emerald-400/70 mt-0.5">Your site is live on Maula.ai with free SSL & CDN</p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900 rounded-2xl p-4 border border-purple-900/30">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-purple-400 shrink-0" />
                      <span className="text-sm font-medium text-zinc-300 truncate flex-1">{deployUrl}</span>
                      <button onClick={handleCopyUrl} className="p-1.5 hover:bg-purple-500/10 rounded-lg transition-colors">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-500" />}
                      </button>
                      <a href={deployUrl!} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-purple-500/10 rounded-lg transition-colors">
                        <ExternalLink className="w-4 h-4 text-zinc-500" />
                      </a>
                    </div>
                  </div>

                  <a
                    href="/dashboard/deployed-sites"
                    target="_top"
                    className="w-full py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Manage on Dashboard
                  </a>

                  <button
                    onClick={() => { setDeployStatus({ state: 'idle', message: '', logs: [] }); setDeployUrl(null); }}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-purple-500/10 border border-purple-900/30 text-zinc-400 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Deploy Again
                  </button>
                </div>
              )}

              {/* Deploy Error */}
              {deployStatus.state === 'error' && !deployUrl && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-sm font-bold text-red-400">Deployment Failed</p>
                      <p className="text-xs text-red-400/70 mt-1">{deployStatus.error}</p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900 rounded-xl p-3 max-h-32 overflow-y-auto">
                    {deployStatus.logs.map((log, i) => (
                      <p key={i} className="text-[11px] text-zinc-400 font-mono leading-relaxed">{log}</p>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleFixErrors}
                      className="flex-1 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Ask AI to Fix
                    </button>
                    <button
                      onClick={() => { setDeployStatus({ state: 'idle', message: '', logs: [] }); }}
                      className="flex-1 py-2.5 bg-zinc-900 hover:bg-purple-500/10 border border-purple-900/30 text-zinc-400 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-xs">No deployments yet</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Deploy your first app to see it here</p>
                </div>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-zinc-900 rounded-xl p-3 border border-purple-900/20 flex items-center gap-3"
                  >
                    <span className="text-sm">🚀</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{entry.projectName}</p>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(entry.timestamp).toLocaleDateString()} · Maula.ai
                      </p>
                    </div>
                    {entry.status === 'success' ? (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {entry.url && (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-zinc-500 hover:text-purple-400"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-[10px] text-red-400">Failed</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeployPanel;
