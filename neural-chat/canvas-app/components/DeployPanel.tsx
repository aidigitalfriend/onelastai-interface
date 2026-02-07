/**
 * DEPLOY PANEL — Multi-Platform Deployment
 * Deploy to Vercel, Netlify, Railway, Cloudflare, or internal OneLast.AI hosting.
 * Uses stored credentials from CredentialsPanel.
 */

import React, { useState, useEffect, useCallback } from 'react';

interface DeployPanelProps {
  isDarkMode: boolean;
  onClose: () => void;
  projectFiles: { path: string; content: string }[];
  projectName: string;
  onOpenCredentials: () => void;
}

interface Credential {
  id: string;
  provider: string;
  username: string | null;
  isValid: boolean;
}

interface DeployLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface DeployResult {
  success: boolean;
  provider: string;
  url?: string;
  deploymentId?: string;
  error?: string;
  status?: string;
}

const DEPLOY_TARGETS = [
  {
    id: 'INTERNAL',
    name: 'OneLast.AI',
    icon: '🧠',
    description: 'Free hosting on maula.onelastai.co',
    requiresCredentials: false,
    color: 'cyan',
  },
  {
    id: 'VERCEL',
    name: 'Vercel',
    icon: '▲',
    description: 'Edge-optimized global deployment',
    requiresCredentials: true,
    color: 'white',
  },
  {
    id: 'NETLIFY',
    name: 'Netlify',
    icon: '◆',
    description: 'Continuous deployment & serverless',
    requiresCredentials: true,
    color: 'teal',
  },
  {
    id: 'RAILWAY',
    name: 'Railway',
    icon: '🚂',
    description: 'Full-stack apps with databases',
    requiresCredentials: true,
    color: 'violet',
  },
  {
    id: 'CLOUDFLARE',
    name: 'Cloudflare',
    icon: '☁️',
    description: 'Global CDN & Pages deployment',
    requiresCredentials: true,
    color: 'orange',
  },
];

const DeployPanel: React.FC<DeployPanelProps> = ({
  isDarkMode,
  onClose,
  projectFiles,
  projectName,
  onOpenCredentials,
}) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [selectedTarget, setSelectedTarget] = useState('INTERNAL');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [deployLogs, setDeployLogs] = useState<DeployLog[]>([]);
  const [customProjectName, setCustomProjectName] = useState(projectName || '');

  // Fetch credentials
  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || []);
      }
    } catch (err) {
      console.error('[Deploy] Fetch credentials error:', err);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  useEffect(() => {
    if (projectName) setCustomProjectName(projectName);
  }, [projectName]);

  const addLog = (message: string, type: DeployLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setDeployLogs((prev) => [...prev, { time, message, type }]);
  };

  const hasCredentialFor = (provider: string) =>
    credentials.some((c) => c.provider === provider && c.isValid);

  const deploy = async () => {
    if (projectFiles.length === 0) {
      addLog('No files to deploy. Generate something first!', 'error');
      return;
    }

    setIsDeploying(true);
    setDeployResult(null);
    setDeployLogs([]);

    addLog(`Starting deployment to ${selectedTarget}...`);
    addLog(`Project: ${customProjectName || 'Untitled'}`);
    addLog(`Files: ${projectFiles.length} file(s)`);

    try {
      if (selectedTarget === 'INTERNAL') {
        // Deploy to our internal hosting
        addLog('Deploying to OneLast.AI hosting...', 'info');

        // Use main file content for single-file deploys
        const mainFile = projectFiles.find(
          (f) => f.path === 'main.html' || f.path === 'index.html'
        );
        const code = mainFile?.content || projectFiles[0]?.content || '';

        const res = await fetch('/api/hosting/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            code,
            name: customProjectName || 'Untitled App',
            description: `Deployed from Canvas Studio`,
            language: 'html',
            isPublic: true,
          }),
        });

        const data = await res.json();

        if (data.success && data.app?.url) {
          addLog(`Deployed successfully!`, 'success');
          addLog(`URL: ${data.app.url}`, 'success');
          setDeployResult({
            success: true,
            provider: 'INTERNAL',
            url: data.app.url,
            deploymentId: data.app.id,
          });
        } else {
          throw new Error(data.error || 'Internal deployment failed');
        }
      } else {
        // Deploy to external platform using stored credentials
        if (!hasCredentialFor(selectedTarget)) {
          addLog(`No valid ${selectedTarget} credentials found.`, 'error');
          addLog('Please add your token in the Credentials panel.', 'warning');
          setIsDeploying(false);
          return;
        }

        addLog(`Authenticating with ${selectedTarget}...`, 'info');

        // Build files object for the API
        const filesMap: Record<string, string> = {};
        projectFiles.forEach((f) => {
          filesMap[f.path] = f.content;
        });

        // Ensure index.html exists for static deploys
        if (!filesMap['index.html'] && filesMap['main.html']) {
          filesMap['index.html'] = filesMap['main.html'];
          addLog('Mapped main.html → index.html', 'info');
        }

        addLog(`Uploading ${Object.keys(filesMap).length} files...`, 'info');

        const res = await fetch('/api/credentials/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            provider: selectedTarget,
            projectName: (customProjectName || 'canvas-app').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            files: filesMap,
          }),
        });

        const data = await res.json();

        if (data.success) {
          addLog('Deployment initiated!', 'success');
          if (data.url) addLog(`URL: ${data.url}`, 'success');
          if (data.status) addLog(`Status: ${data.status}`, 'info');

          setDeployResult({
            success: true,
            provider: selectedTarget,
            url: data.url,
            deploymentId: data.deploymentId,
            status: data.status,
          });
        } else {
          throw new Error(data.error || 'Deployment failed');
        }
      }
    } catch (err: any) {
      addLog(err.message || 'Deployment failed', 'error');
      setDeployResult({
        success: false,
        provider: selectedTarget,
        error: err.message,
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const colorMap: Record<string, string> = {
    cyan: 'cyan',
    white: 'gray',
    teal: 'teal',
    violet: 'violet',
    orange: 'orange',
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-[#111]/95' : 'bg-white'}`}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h3 className={`text-xs font-bold ${isDarkMode ? 'text-orange-400/80' : 'text-orange-600'} uppercase tracking-widest`}>
            Deploy
          </h3>
        </div>
        <button onClick={onClose} title="Close" className={`${isDarkMode ? 'text-gray-600 hover:text-cyan-400' : 'text-gray-400 hover:text-cyan-600'} transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {/* Project Name */}
        <div className="mb-4">
          <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-1.5`}>
            Project Name
          </label>
          <input
            type="text"
            value={customProjectName}
            onChange={(e) => setCustomProjectName(e.target.value)}
            placeholder="my-awesome-app"
            className={`w-full px-3 py-2 text-xs rounded-lg border outline-none transition-all ${
              isDarkMode
                ? 'bg-black/50 border-gray-700 text-gray-200 placeholder:text-gray-600 focus:border-cyan-500/50'
                : 'bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-cyan-500'
            }`}
          />
        </div>

        {/* Deploy Targets */}
        <div className="mb-4">
          <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>
            Deploy Target
          </label>
          <div className="space-y-2">
            {DEPLOY_TARGETS.map((target) => {
              const isSelected = selectedTarget === target.id;
              const hasToken = target.requiresCredentials ? hasCredentialFor(target.id) : true;

              return (
                <button
                  key={target.id}
                  onClick={() => setSelectedTarget(target.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                        : 'bg-cyan-50 border-cyan-300'
                      : isDarkMode
                        ? 'bg-black/30 border-gray-800 hover:border-gray-700'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{target.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {target.name}
                      </span>
                      {target.requiresCredentials && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          hasToken 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {hasToken ? '✓ Ready' : 'No Token'}
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} truncate`}>
                      {target.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* No Credentials Warning */}
        {DEPLOY_TARGETS.find((t) => t.id === selectedTarget)?.requiresCredentials &&
          !hasCredentialFor(selectedTarget) && (
            <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className={`text-[10px] ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'} mb-2`}>
                No {selectedTarget} credentials found. Add your token to deploy.
              </p>
              <button
                onClick={onOpenCredentials}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30 transition-all"
              >
                Open Credentials →
              </button>
            </div>
          )}

        {/* File Summary */}
        <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>
              Files to Deploy
            </span>
            <span className={`text-[10px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              {projectFiles.length} file(s)
            </span>
          </div>
          <div className="space-y-0.5">
            {projectFiles.slice(0, 8).map((f) => (
              <div key={f.path} className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                📄 {f.path}
              </div>
            ))}
            {projectFiles.length > 8 && (
              <div className={`text-[10px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} italic`}>
                +{projectFiles.length - 8} more files
              </div>
            )}
            {projectFiles.length === 0 && (
              <div className={`text-[10px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} italic`}>
                No files yet. Generate an app first.
              </div>
            )}
          </div>
        </div>

        {/* Deploy Button */}
        <button
          onClick={deploy}
          disabled={isDeploying || projectFiles.length === 0}
          className={`w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mb-4 ${
            isDeploying
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 cursor-wait'
              : projectFiles.length === 0
                ? isDarkMode
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-600 to-rose-600 text-white hover:from-orange-500 hover:to-rose-500 shadow-lg shadow-orange-900/30'
          }`}
        >
          {isDeploying ? (
            <>
              <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Deploy to {DEPLOY_TARGETS.find((t) => t.id === selectedTarget)?.name}
            </>
          )}
        </button>

        {/* Deploy Logs */}
        {deployLogs.length > 0 && (
          <div className={`mb-4 rounded-lg border overflow-hidden ${isDarkMode ? 'bg-black/50 border-gray-800' : 'bg-gray-900 border-gray-700'}`}>
            <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Deploy Log</span>
              <button
                onClick={() => setDeployLogs([])}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto font-mono text-[10px] space-y-0.5">
              {deployLogs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-600 shrink-0">{log.time}</span>
                  <span
                    className={
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'error'
                          ? 'text-red-400'
                          : log.type === 'warning'
                            ? 'text-yellow-400'
                            : 'text-gray-400'
                    }
                  >
                    {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : log.type === 'warning' ? '⚠' : '→'}{' '}
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deploy Result */}
        {deployResult && deployResult.success && deployResult.url && (
          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                Deployed Successfully!
              </span>
            </div>

            <div className={`p-2 rounded border ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} mb-3`}>
              <a
                href={deployResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 text-xs font-mono break-all"
              >
                {deployResult.url}
              </a>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(deployResult.url!);
                }}
                className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all"
              >
                Copy URL
              </button>
              <a
                href={deployResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all text-center"
              >
                Open Site
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeployPanel;
