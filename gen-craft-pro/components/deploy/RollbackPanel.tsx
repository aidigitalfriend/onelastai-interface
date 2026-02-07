/**
 * RollbackPanel — Deployment version management & rollback
 * View deployment history, compare versions, and rollback to any previous deploy
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw, CheckCircle, XCircle, Clock, Globe,
  ChevronRight, AlertTriangle, Rocket, ExternalLink,
  Copy, Check, History, Loader2,
} from 'lucide-react';
import { useDeployStore, Deployment } from '../../stores/deployStore';

interface RollbackPanelProps {
  projectId: string;
  onRollback?: (deployment: Deployment) => void;
  className?: string;
}

const RollbackPanel: React.FC<RollbackPanelProps> = ({ projectId, onRollback, className = '' }) => {
  const { deployments, rollback } = useDeployStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const projectDeployments = deployments
    .filter((d) => d.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const currentLive = projectDeployments.find((d) => d.status === 'live');

  const handleRollback = useCallback(async (deployment: Deployment) => {
    setRollingBack(deployment.id);
    setConfirmId(null);

    // Simulate rollback process
    await new Promise((r) => setTimeout(r, 2000));

    // Mark current live as rolled-back
    if (currentLive && currentLive.id !== deployment.id) {
      rollback(currentLive.id);
    }

    // In a real app, this would re-deploy the old version
    onRollback?.(deployment);
    setRollingBack(null);
  }, [currentLive, rollback, onRollback]);

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const statusConfig: Record<Deployment['status'], { icon: React.ElementType; color: string; bg: string }> = {
    live: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15' },
    deploying: { icon: Loader2, color: 'text-violet-400', bg: 'bg-violet-500/15' },
    queued: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    'rolled-back': { icon: RotateCcw, color: 'text-zinc-400', bg: 'bg-zinc-900/50' },
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <History className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Deployments</h3>
            <p className="text-[10px] text-zinc-500">
              {projectDeployments.length} version{projectDeployments.length !== 1 ? 's' : ''}
              {currentLive && ` · v${currentLive.version} live`}
            </p>
          </div>
        </div>
      </div>

      {/* Deployment list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {projectDeployments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <Rocket className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No deployments yet</p>
            <p className="text-[10px] mt-1">Deploy your project to see versions here</p>
          </div>
        ) : (
          projectDeployments.map((deployment) => {
            const config = statusConfig[deployment.status];
            const Icon = config.icon;
            const isExpanded = expandedId === deployment.id;
            const isCurrent = deployment.status === 'live';
            const isRollingBack = rollingBack === deployment.id;
            const isConfirming = confirmId === deployment.id;

            return (
              <div key={deployment.id} className={`border-b border-zinc-800/50 ${isCurrent ? 'bg-emerald-500/[0.02]' : ''}`}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : deployment.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left"
                >
                  {/* Status icon */}
                  <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color} ${deployment.status === 'deploying' ? 'animate-spin' : ''}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-200">v{deployment.version}</span>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded font-semibold">LIVE</span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 ${config.bg} ${config.color} rounded`}>
                        {deployment.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500">{formatDate(deployment.createdAt)}</span>
                      <span className="text-[10px] text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-500">{formatDuration(deployment.duration)}</span>
                      {deployment.size && (
                        <>
                          <span className="text-[10px] text-zinc-600">·</span>
                          <span className="text-[10px] text-zinc-500">{(deployment.size / 1024).toFixed(0)} KB</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronRight className={`w-3.5 h-3.5 text-zinc-700 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pl-14 space-y-2">
                        {/* URL */}
                        {deployment.url && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-zinc-500" />
                            <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 truncate flex-1">
                              {deployment.url}
                            </a>
                            <button onClick={() => copyUrl(deployment.url!, deployment.id)} className="p-1 text-zinc-600 hover:text-zinc-300">
                              {copiedUrl === deployment.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="p-1 text-zinc-600 hover:text-zinc-300">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Error */}
                        {deployment.error && (
                          <div className="flex items-start gap-2 p-2 bg-red-500/[0.04] rounded-lg border border-red-500/10">
                            <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                            <span className="text-[10px] text-red-300">{deployment.error}</span>
                          </div>
                        )}

                        {/* Deployment info */}
                        <div className="text-[10px] text-zinc-500 space-y-0.5">
                          <div>Platform: <span className="text-zinc-400">{deployment.platform}</span></div>
                          {deployment.commitHash && (
                            <div>Commit: <span className="text-zinc-400 font-mono">{deployment.commitHash.slice(0, 7)}</span></div>
                          )}
                          {deployment.buildId && (
                            <div>Build: <span className="text-zinc-400 font-mono">{deployment.buildId.slice(0, 8)}</span></div>
                          )}
                        </div>

                        {/* Rollback action */}
                        {!isCurrent && deployment.status !== 'deploying' && deployment.status !== 'queued' && (
                          <div>
                            {isConfirming ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRollback(deployment)}
                                  disabled={isRollingBack}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-[10px] font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-40"
                                >
                                  {isRollingBack ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                  {isRollingBack ? 'Rolling back...' : 'Confirm Rollback'}
                                </button>
                                <button
                                  onClick={() => setConfirmId(null)}
                                  className="px-2 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmId(deployment.id)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Rollback to v{deployment.version}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RollbackPanel;
