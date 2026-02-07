/**
 * DeployStatus — Real-time deployment pipeline progress
 * Shows build steps, logs, and final deployment result
 */
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, CheckCircle, XCircle, Loader2, Clock,
  Package, Shield, Globe, Zap, AlertTriangle,
  ExternalLink, Copy, Check,
} from 'lucide-react';
import { useDeployStore, Deployment } from '../../stores/deployStore';

interface DeployStatusProps {
  deploymentId?: string;
  className?: string;
}

const PIPELINE_STEPS = [
  { id: 'prepare', label: 'Preparing files', icon: Package },
  { id: 'build', label: 'Building project', icon: Zap },
  { id: 'optimize', label: 'Optimizing assets', icon: Shield },
  { id: 'upload', label: 'Uploading to CDN', icon: Globe },
  { id: 'verify', label: 'Verifying deployment', icon: CheckCircle },
];

const DeployStatus: React.FC<DeployStatusProps> = ({ deploymentId, className = '' }) => {
  const { currentDeployment, deployLogs, deployments, isDeploying } = useDeployStore();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  const deployment = deploymentId
    ? deployments.find((d) => d.id === deploymentId)
    : currentDeployment;

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deployLogs]);

  const copyUrl = () => {
    if (deployment?.url) {
      navigator.clipboard.writeText(deployment.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStepStatus = (stepIndex: number): 'pending' | 'active' | 'done' | 'error' => {
    if (!deployment) return 'pending';
    if (deployment.status === 'failed') {
      const completedSteps = Math.min(stepIndex, PIPELINE_STEPS.length - 1);
      if (stepIndex < completedSteps) return 'done';
      if (stepIndex === completedSteps) return 'error';
      return 'pending';
    }
    if (deployment.status === 'live') return 'done';
    // Infer progress from log count
    const progress = Math.floor((deployLogs.length / 12) * PIPELINE_STEPS.length);
    if (stepIndex < progress) return 'done';
    if (stepIndex === progress) return 'active';
    return 'pending';
  };

  const statusColor = (status: Deployment['status'] | undefined) => {
    switch (status) {
      case 'live': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      case 'deploying': return 'text-violet-400';
      case 'queued': return 'text-amber-400';
      case 'rolled-back': return 'text-zinc-400';
      default: return 'text-zinc-500';
    }
  };

  if (!deployment && !isDeploying) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <Rocket className="w-10 h-10 text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-500">No active deployment</p>
        <p className="text-xs text-zinc-600 mt-1">Deploy your project to see status here</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header status */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-3">
          {deployment?.status === 'deploying' || deployment?.status === 'queued' ? (
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          ) : deployment?.status === 'live' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : deployment?.status === 'failed' ? (
            <XCircle className="w-5 h-5 text-red-400" />
          ) : (
            <Clock className="w-5 h-5 text-zinc-500" />
          )}
          <div>
            <h3 className="text-sm font-bold text-zinc-200">
              {deployment?.status === 'live' ? 'Deployed Successfully' :
               deployment?.status === 'failed' ? 'Deployment Failed' :
               deployment?.status === 'deploying' ? 'Deploying...' :
               'Queued'}
            </h3>
            <p className="text-[10px] text-zinc-500">
              v{deployment?.version || 1} · {deployment?.platform || 'maula-s3'}
              {deployment?.duration && ` · ${(deployment.duration / 1000).toFixed(1)}s`}
            </p>
          </div>
        </div>

        {deployment?.status === 'live' && deployment.url && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyUrl}
              className="p-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a
              href={deployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Pipeline steps */}
      <div className="px-4 py-3 space-y-2 border-b border-zinc-800">
        {PIPELINE_STEPS.map((step, i) => {
          const status = getStepStatus(i);
          const Icon = step.icon;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                status === 'done' ? 'bg-emerald-500/20' :
                status === 'active' ? 'bg-violet-500/20' :
                status === 'error' ? 'bg-red-500/20' :
                'bg-zinc-900/50'
              }`}>
                {status === 'done' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : status === 'active' ? (
                  <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                ) : status === 'error' ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-zinc-600" />
                )}
              </div>
              <span className={`text-xs ${
                status === 'done' ? 'text-emerald-400' :
                status === 'active' ? 'text-violet-300' :
                status === 'error' ? 'text-red-400' :
                'text-zinc-600'
              }`}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Live URL */}
      {deployment?.status === 'live' && deployment.url && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-emerald-500/[0.03]">
          <a
            href={deployment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300"
          >
            <Globe className="w-3.5 h-3.5" />
            {deployment.url}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Error display */}
      {deployment?.status === 'failed' && deployment.error && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-red-500/[0.03]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{deployment.error}</p>
          </div>
        </div>
      )}

      {/* Build logs */}
      <div className="flex-1 max-h-[200px] overflow-y-auto custom-scrollbar bg-[#050505]">
        <div className="px-3 py-2 font-mono text-[10px] text-zinc-500 space-y-0.5">
          {deployLogs.map((log, i) => (
            <div key={i} className={`${
              log.includes('error') || log.includes('Error') ? 'text-red-400' :
              log.includes('✓') || log.includes('success') ? 'text-emerald-400' :
              log.includes('warn') ? 'text-amber-400' :
              'text-zinc-500'
            }`}>
              <span className="text-zinc-700 mr-2">{String(i + 1).padStart(2, '0')}</span>
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default DeployStatus;
