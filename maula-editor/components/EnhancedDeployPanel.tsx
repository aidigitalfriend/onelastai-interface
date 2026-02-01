import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { 
  cloudDeployService, 
  cloudProviders, 
  CloudProvider, 
  ProviderConfig,
  Deployment,
  DeploymentLog,
  EnvironmentVariable,
  BuildTask,
  DeploymentStatus,
} from '../services/cloudDeploy';

type DeployTab = 'providers' | 'deploy' | 'deployments' | 'logs' | 'env' | 'tasks';

export const EnhancedDeployPanel: React.FC = () => {
  const { theme, files } = useStore();
  
  // State
  const [activeTab, setActiveTab] = useState<DeployTab>('providers');
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [validatedUsers, setValidatedUsers] = useState<Record<string, string>>({});
  const [deploying, setDeploying] = useState(false);
  const [currentDeployment, setCurrentDeployment] = useState<Deployment | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([]);
  const [buildTasks, setBuildTasks] = useState<BuildTask[]>([]);
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [providerCategory, setProviderCategory] = useState<'all' | 'frontend' | 'fullstack' | 'cloud'>('all');
  
  // Form state
  const [projectName, setProjectName] = useState('my-project');
  const [branch, setBranch] = useState('main');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [outputDir, setOutputDir] = useState('dist');
  const [installCommand, setInstallCommand] = useState('npm install');
  
  // Env var form
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newEnvIsSecret, setNewEnvIsSecret] = useState(false);
  const [newEnvTargets, setNewEnvTargets] = useState<('production' | 'preview' | 'development')[]>(['production', 'preview']);
  
  const logsRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Validate token when entered
  const validateToken = async (provider: CloudProvider, token: string) => {
    const result = await cloudDeployService.validateToken(token, provider);
    if (result.valid && result.user) {
      setValidatedUsers(prev => ({ ...prev, [provider]: result.user! }));
    } else {
      setValidatedUsers(prev => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
    }
  };

  // Load deployments when provider selected
  const loadDeployments = async () => {
    if (!selectedProvider || !tokens[selectedProvider]) return;
    
    try {
      const deps = await cloudDeployService.listDeployments(
        tokens[selectedProvider],
        selectedProvider,
        projectName
      );
      setDeployments(deps);
    } catch (error) {
      console.error('Failed to load deployments:', error);
    }
  };

  // Load logs for a deployment
  const loadLogs = async (deploymentId: string) => {
    if (!selectedProvider || !tokens[selectedProvider]) return;
    
    try {
      const deployLogs = await cloudDeployService.getLogs(
        deploymentId,
        tokens[selectedProvider],
        selectedProvider
      );
      setLogs(deployLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  // Poll deployment status
  const pollDeploymentStatus = async (deploymentId: string) => {
    if (!selectedProvider || !tokens[selectedProvider]) return;

    pollingRef.current = setInterval(async () => {
      try {
        const status = await cloudDeployService.getStatus(
          deploymentId,
          tokens[selectedProvider],
          selectedProvider
        );
        
        setCurrentDeployment(status);
        
        // Load logs
        await loadLogs(deploymentId);

        // Stop polling if deployment is done
        if (status.status === 'ready' || status.status === 'error' || status.status === 'cancelled') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setDeploying(false);
          await loadDeployments();
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    }, 3000);
  };

  // Deploy
  const handleDeploy = async () => {
    if (!selectedProvider || !tokens[selectedProvider]) return;

    setDeploying(true);
    setLogs([]);
    setActiveTab('logs');

    // Add initial log
    const initialLog: DeploymentLog = {
      id: 'init',
      timestamp: new Date(),
      level: 'info',
      message: `Starting deployment to ${cloudDeployService.getProvider(selectedProvider)?.name}...`,
    };
    setLogs([initialLog]);

    try {
      // Prepare files
      const preparedFiles = cloudDeployService.prepareFiles(files as Record<string, string>);
      
      setLogs(prev => [...prev, {
        id: 'files',
        timestamp: new Date(),
        level: 'info',
        message: `Prepared ${Object.keys(preparedFiles).length} files for deployment`,
      }]);

      // Start deployment
      const deployment = await cloudDeployService.deploy(preparedFiles, {
        provider: selectedProvider,
        projectName,
        token: tokens[selectedProvider],
        branch,
        buildCommand,
        outputDir,
        installCommand,
        envVars,
      });

      setCurrentDeployment(deployment);
      
      setLogs(prev => [...prev, {
        id: 'started',
        timestamp: new Date(),
        level: 'success',
        message: `Deployment ${deployment.id} created successfully`,
      }]);

      // Start polling for status
      pollDeploymentStatus(deployment.id);

    } catch (error) {
      setLogs(prev => [...prev, {
        id: 'error',
        timestamp: new Date(),
        level: 'error',
        message: `Deployment failed: ${error instanceof Error ? error.message : String(error)}`,
      }]);
      setDeploying(false);
    }
  };

  // Rollback
  const handleRollback = async (deployment: Deployment) => {
    if (!selectedProvider || !tokens[selectedProvider]) return;

    try {
      setLogs([{
        id: 'rollback-start',
        timestamp: new Date(),
        level: 'info',
        message: `Rolling back to deployment ${deployment.id.slice(0, 8)}...`,
      }]);
      setActiveTab('logs');

      await cloudDeployService.rollback(
        deployment.id,
        tokens[selectedProvider],
        selectedProvider
      );

      setLogs(prev => [...prev, {
        id: 'rollback-success',
        timestamp: new Date(),
        level: 'success',
        message: 'Rollback completed successfully!',
      }]);

      await loadDeployments();
    } catch (error) {
      setLogs(prev => [...prev, {
        id: 'rollback-error',
        timestamp: new Date(),
        level: 'error',
        message: `Rollback failed: ${error instanceof Error ? error.message : String(error)}`,
      }]);
    }
  };

  // Run build task
  const runBuildTask = async (taskType: 'build' | 'test' | 'lint') => {
    const commands: Record<string, string> = {
      build: buildCommand,
      test: 'npm test',
      lint: 'npm run lint',
    };

    const task: BuildTask = {
      id: `task-${Date.now()}`,
      name: taskType.charAt(0).toUpperCase() + taskType.slice(1),
      command: commands[taskType],
      status: 'running',
    };

    setBuildTasks(prev => [...prev, task]);

    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    setBuildTasks(prev => prev.map(t => 
      t.id === task.id 
        ? { ...t, status: 'success', duration: Date.now() - parseInt(task.id.split('-')[1]), output: `✓ ${task.name} completed` }
        : t
    ));
  };

  // Filter providers
  const filteredProviders = providerCategory === 'all' 
    ? cloudProviders 
    : cloudProviders.filter(p => p.category === providerCategory);

  const provider = selectedProvider ? cloudDeployService.getProvider(selectedProvider) : null;

  // Status badge
  const StatusBadge: React.FC<{ status: DeploymentStatus }> = ({ status }) => {
    const colors: Record<DeploymentStatus, string> = {
      queued: 'bg-gray-500',
      building: 'bg-yellow-500',
      deploying: 'bg-blue-500',
      ready: 'bg-green-500',
      error: 'bg-red-500',
      cancelled: 'bg-gray-500',
      'rolled-back': 'bg-purple-500',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Provider selection
  if (!selectedProvider) {
    return (
      <div className={`h-full flex flex-col ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b ${isDark ? 'border-[#1c1c1c] bg-[#0d0d0d]' : 'border-gray-200 bg-white'}`}>
          <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ☁️ One-Click Deploy
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Deploy to any cloud provider
          </p>
        </div>

        {/* Category Filter */}
        <div className={`px-4 py-2 border-b ${isDark ? 'border-[#1c1c1c]' : 'border-gray-200'}`}>
          <div className="flex gap-1">
            {(['all', 'frontend', 'fullstack', 'cloud'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setProviderCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  providerCategory === cat
                    ? 'bg-blue-500 text-white'
                    : isDark
                      ? 'bg-[#2d2d2d] text-gray-300 hover:bg-[#1a1a1a]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Provider Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 gap-3">
            {filteredProviders.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProvider(p.id);
                  setActiveTab('deploy');
                }}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all text-left group ${
                  isDark
                    ? 'bg-[#0d0d0d] border-[#1c1c1c] hover:border-blue-500'
                    : 'bg-white border-gray-200 hover:border-blue-400'
                }`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 ${p.color} flex items-center justify-center text-white text-xl font-bold rounded-lg shadow-lg flex-shrink-0`}>
                  {p.icon}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.name}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      isDark ? 'bg-[#1a1a1a] text-gray-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.category}
                    </span>
                    <span className={`opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>→</span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{p.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.features.slice(0, 3).map(f => (
                      <span key={f} className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isDark ? 'bg-[#1a1a1a] text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Provider detail view with tabs
  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDark ? 'border-[#1c1c1c]' : 'border-gray-200'}`}>
        <button
          onClick={() => {
            setSelectedProvider(null);
            setCurrentDeployment(null);
            setLogs([]);
          }}
          className={`flex items-center gap-1 text-xs mb-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <span>←</span> Back to providers
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${provider?.color} flex items-center justify-center text-white text-lg font-bold rounded-lg`}>
            {provider?.icon}
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{provider?.name}</h2>
            {validatedUsers[selectedProvider] && (
              <p className="text-xs text-green-500">✓ Connected as {validatedUsers[selectedProvider]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-[#1c1c1c]' : 'border-gray-200'}`}>
        {[
          { id: 'deploy', label: 'Deploy', icon: '▶' },
          { id: 'deployments', label: 'History', icon: '📋' },
          { id: 'logs', label: 'Logs', icon: '📄' },
          { id: 'env', label: 'Env Vars', icon: '🔐' },
          { id: 'tasks', label: 'Tasks', icon: '⚡' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as DeployTab);
              if (tab.id === 'deployments') loadDeployments();
            }}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? isDark
                  ? 'text-white border-b-2 border-blue-500 bg-[#0d0d0d]'
                  : 'text-blue-600 border-b-2 border-blue-500 bg-white'
                : isDark
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {/* Deploy Tab */}
        {activeTab === 'deploy' && (
          <div className="p-4 space-y-4">
            {/* Token Input */}
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {provider?.tokenLabel}
              </label>
              <input
                type="password"
                value={tokens[selectedProvider] || ''}
                onChange={(e) => {
                  setTokens(prev => ({ ...prev, [selectedProvider]: e.target.value }));
                  if (e.target.value.length > 10) {
                    validateToken(selectedProvider, e.target.value);
                  }
                }}
                placeholder={provider?.tokenPlaceholder}
                className={`w-full px-3 py-2 rounded border text-sm ${
                  isDark
                    ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
              <a
                href={provider?.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline mt-2 inline-block"
              >
                How to get token ↗
              </a>
            </div>

            {/* Project Settings */}
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}>
              <h3 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Project Settings</h3>
              
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      isDark
                        ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Branch</label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className={`w-full px-3 py-2 rounded border text-sm ${
                        isDark
                          ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="main">main</option>
                      <option value="master">master</option>
                      <option value="develop">develop</option>
                      <option value="staging">staging</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Output Dir</label>
                    <input
                      type="text"
                      value={outputDir}
                      onChange={(e) => setOutputDir(e.target.value)}
                      className={`w-full px-3 py-2 rounded border text-sm font-mono ${
                        isDark
                          ? 'bg-[#0a0a0a] border-[#1c1c1c] text-green-400'
                          : 'bg-gray-50 border-gray-200 text-green-600'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Build Command</label>
                  <input
                    type="text"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    className={`w-full px-3 py-2 rounded border text-sm font-mono ${
                      isDark
                        ? 'bg-[#0a0a0a] border-[#1c1c1c] text-green-400'
                        : 'bg-gray-50 border-gray-200 text-green-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Install Command</label>
                  <input
                    type="text"
                    value={installCommand}
                    onChange={(e) => setInstallCommand(e.target.value)}
                    className={`w-full px-3 py-2 rounded border text-sm font-mono ${
                      isDark
                        ? 'bg-[#0a0a0a] border-[#1c1c1c] text-green-400'
                        : 'bg-gray-50 border-gray-200 text-green-600'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Current Deployment Status */}
            {currentDeployment && (
              <div className={`p-4 rounded-lg border ${
                currentDeployment.status === 'ready'
                  ? 'border-green-500 bg-green-500/10'
                  : currentDeployment.status === 'error'
                    ? 'border-red-500 bg-red-500/10'
                    : isDark ? 'border-[#1c1c1c] bg-[#0d0d0d]' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Current Deployment</h3>
                  <StatusBadge status={currentDeployment.status} />
                </div>
                {currentDeployment.url && (
                  <a
                    href={currentDeployment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                  >
                    🔗 {currentDeployment.url}
                  </a>
                )}
                {currentDeployment.previewUrl && currentDeployment.previewUrl !== currentDeployment.url && (
                  <a
                    href={currentDeployment.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-500 hover:underline flex items-center gap-1 mt-1"
                  >
                    👁️ Preview: {currentDeployment.previewUrl}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Deployments History Tab */}
        {activeTab === 'deployments' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Deployment History</h3>
              <button
                onClick={loadDeployments}
                className="text-xs text-blue-500 hover:underline"
              >
                ↻ Refresh
              </button>
            </div>

            {deployments.length === 0 ? (
              <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm">No deployments yet</p>
              </div>
            ) : (
              deployments.map(dep => (
                <div
                  key={dep.id}
                  className={`p-3 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {dep.id.slice(0, 8)}
                      </span>
                      <StatusBadge status={dep.status} />
                    </div>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(dep.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {dep.commit && (
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      📝 {dep.commit} {dep.commitMessage && `- ${dep.commitMessage.slice(0, 50)}`}
                    </p>
                  )}

                  {dep.url && (
                    <a
                      href={dep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline block mt-1"
                    >
                      🔗 {dep.url}
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-2 border-t border-dashed border-gray-600">
                    <button
                      onClick={() => {
                        loadLogs(dep.id);
                        setActiveTab('logs');
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        isDark ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#4c4c4c]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📄 Logs
                    </button>
                    {provider?.supportsRollback && dep.status === 'ready' && (
                      <button
                        onClick={() => handleRollback(dep)}
                        className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                      >
                        ↩️ Rollback
                      </button>
                    )}
                    {dep.previewUrl && (
                      <a
                        href={dep.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                      >
                        👁️ Preview
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="h-full flex flex-col">
            <div
              ref={logsRef}
              className={`flex-1 p-4 font-mono text-xs overflow-auto ${isDark ? 'bg-[#0d0d0d]' : 'bg-gray-900'}`}
            >
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <p>No logs yet. Deploy to see build logs.</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-2 mb-1">
                    <span className="text-gray-600 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'success' ? 'text-green-400' :
                      'text-gray-300'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              {deploying && (
                <div className="flex gap-2 text-blue-400 animate-pulse">
                  <span className="text-gray-600">{new Date().toLocaleTimeString()}</span>
                  <span>⏳ Building...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Environment Variables Tab */}
        {activeTab === 'env' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Environment Variables</h3>
              <button
                onClick={() => {
                  setShowAddEnvModal(true);
                  setEditingEnvId(null);
                  setNewEnvKey('');
                  setNewEnvValue('');
                  setNewEnvIsSecret(false);
                  setNewEnvTargets(['production', 'preview']);
                }}
                className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                + Add Variable
              </button>
            </div>

            {envVars.length === 0 ? (
              <div className={`text-center py-8 border-2 border-dashed rounded-lg ${isDark ? 'border-[#1c1c1c] text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                <p className="text-2xl mb-2">🔐</p>
                <p className="text-sm">No environment variables</p>
                <p className="text-xs mt-1">Add variables to configure your deployment</p>
              </div>
            ) : (
              <div className="space-y-2">
                {envVars.map(env => (
                  <div
                    key={env.id}
                    className={`p-3 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {env.key}
                        </span>
                        {env.isSecret && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">
                            🔒 Secret
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingEnvId(env.id);
                            setNewEnvKey(env.key);
                            setNewEnvValue(env.value);
                            setNewEnvIsSecret(env.isSecret);
                            setNewEnvTargets(env.target);
                            setShowAddEnvModal(true);
                          }}
                          className={`p-1 rounded ${isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-100'}`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setEnvVars(envVars.filter(e => e.id !== env.id))}
                          className={`p-1 rounded hover:bg-red-500/20 text-red-400`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className={`font-mono text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {env.isSecret ? '••••••••••••' : env.value}
                    </p>
                    <div className="flex gap-1 mt-2">
                      {env.target.map(t => (
                        <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded ${
                          t === 'production' ? 'bg-green-500/20 text-green-400' :
                          t === 'preview' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Common env vars presets */}
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}>
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Quick Add:</p>
              <div className="flex flex-wrap gap-2">
                {['NODE_ENV', 'API_URL', 'DATABASE_URL', 'JWT_SECRET', 'NEXT_PUBLIC_API'].map(key => (
                  <button
                    key={key}
                    onClick={() => {
                      setNewEnvKey(key);
                      setNewEnvValue('');
                      setNewEnvIsSecret(key.includes('SECRET') || key.includes('KEY') || key.includes('DATABASE'));
                      setShowAddEnvModal(true);
                    }}
                    className={`text-[10px] px-2 py-1 rounded border ${
                      isDark
                        ? 'border-[#1c1c1c] text-gray-400 hover:border-blue-500 hover:text-blue-400'
                        : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500'
                    }`}
                  >
                    + {key}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Build Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="p-4 space-y-4">
            <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Build & Run Tasks</h3>

            {/* Task buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => runBuildTask('build')}
                disabled={buildTasks.some(t => t.status === 'running')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  isDark
                    ? 'bg-[#0d0d0d] border-[#1c1c1c] hover:border-blue-500'
                    : 'bg-white border-gray-200 hover:border-blue-400'
                } ${buildTasks.some(t => t.status === 'running') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-2xl">🔨</span>
                <p className={`text-xs mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Build</p>
              </button>
              <button
                onClick={() => runBuildTask('test')}
                disabled={buildTasks.some(t => t.status === 'running')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  isDark
                    ? 'bg-[#0d0d0d] border-[#1c1c1c] hover:border-green-500'
                    : 'bg-white border-gray-200 hover:border-green-400'
                } ${buildTasks.some(t => t.status === 'running') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-2xl">🧪</span>
                <p className={`text-xs mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Test</p>
              </button>
              <button
                onClick={() => runBuildTask('lint')}
                disabled={buildTasks.some(t => t.status === 'running')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  isDark
                    ? 'bg-[#0d0d0d] border-[#1c1c1c] hover:border-yellow-500'
                    : 'bg-white border-gray-200 hover:border-yellow-400'
                } ${buildTasks.some(t => t.status === 'running') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-2xl">✨</span>
                <p className={`text-xs mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Lint</p>
              </button>
            </div>

            {/* Task history */}
            {buildTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Task History</h4>
                {buildTasks.slice().reverse().map(task => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={
                          task.status === 'running' ? 'animate-spin' :
                          task.status === 'success' ? 'text-green-500' :
                          task.status === 'error' ? 'text-red-500' :
                          'text-gray-500'
                        }>
                          {task.status === 'running' ? '⏳' :
                           task.status === 'success' ? '✓' :
                           task.status === 'error' ? '✕' : '○'}
                        </span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.name}</span>
                      </div>
                      {task.duration && (
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {(task.duration / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <p className={`font-mono text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      $ {task.command}
                    </p>
                    {task.output && (
                      <p className={`text-xs mt-1 ${
                        task.status === 'success' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {task.output}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Custom command */}
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}>
              <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Custom Command
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="npm run custom-script"
                  className={`flex-1 px-3 py-2 rounded border text-sm font-mono ${
                    isDark
                      ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <button className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                  Run
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deploy Button (fixed at bottom) */}
      {activeTab !== 'logs' && (
        <div className={`p-4 border-t ${isDark ? 'border-[#1c1c1c]' : 'border-gray-200'}`}>
          <button
            onClick={handleDeploy}
            disabled={deploying || !tokens[selectedProvider]}
            className={`w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all ${
              deploying
                ? 'bg-gray-600 cursor-not-allowed'
                : tokens[selectedProvider]
                  ? 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25'
                  : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {deploying ? (
              <>
                <span className="animate-spin">⏳</span>
                Deploying...
              </>
            ) : (
              <>
                <span>🚀</span>
                Deploy to {provider?.name}
              </>
            )}
          </button>
        </div>
      )}

      {/* Add/Edit Env Modal */}
      {showAddEnvModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowAddEnvModal(false)}>
          <div
            className={`w-full max-w-md mx-4 p-5 rounded-lg ${isDark ? 'bg-[#0d0d0d]' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}
          >
            <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {editingEnvId ? 'Edit Variable' : 'Add Variable'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Name</label>
                <input
                  type="text"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  placeholder="API_KEY"
                  className={`w-full px-3 py-2 rounded border text-sm font-mono ${
                    isDark
                      ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Value</label>
                <input
                  type={newEnvIsSecret ? 'password' : 'text'}
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  placeholder="Enter value..."
                  className={`w-full px-3 py-2 rounded border text-sm font-mono ${
                    isDark
                      ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newEnvIsSecret}
                  onChange={(e) => setNewEnvIsSecret(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mark as secret</span>
              </label>

              <div>
                <label className={`block text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Environments</label>
                <div className="flex gap-2">
                  {(['production', 'preview', 'development'] as const).map(target => (
                    <label key={target} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newEnvTargets.includes(target)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewEnvTargets([...newEnvTargets, target]);
                          } else {
                            setNewEnvTargets(newEnvTargets.filter(t => t !== target));
                          }
                        }}
                        className="w-3 h-3"
                      />
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{target}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddEnvModal(false)}
                className={`flex-1 py-2 rounded text-sm font-medium ${
                  isDark
                    ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#4c4c4c]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newEnvKey.trim() || !newEnvValue.trim()) return;

                  if (editingEnvId) {
                    setEnvVars(envVars.map(e =>
                      e.id === editingEnvId
                        ? { ...e, key: newEnvKey, value: newEnvValue, isSecret: newEnvIsSecret, target: newEnvTargets }
                        : e
                    ));
                  } else {
                    setEnvVars([...envVars, {
                      id: Date.now().toString(),
                      key: newEnvKey,
                      value: newEnvValue,
                      isSecret: newEnvIsSecret,
                      target: newEnvTargets,
                    }]);
                  }

                  setShowAddEnvModal(false);
                }}
                disabled={!newEnvKey.trim() || !newEnvValue.trim()}
                className={`flex-1 py-2 rounded text-sm font-medium ${
                  newEnvKey.trim() && newEnvValue.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {editingEnvId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDeployPanel;
