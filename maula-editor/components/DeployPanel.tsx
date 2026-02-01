import React, { useState } from 'react';
import { useStore } from '../store/useStore';

type DeployProvider = 'vercel' | 'railway' | 'netlify' | 'render' | 'fly' | 'heroku' | 'aws' | 'digitalocean' | null;

interface ProviderConfig {
  id: DeployProvider;
  name: string;
  icon: string;
  color: string;
  description: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  docsUrl: string;
}

const providers: ProviderConfig[] = [
  {
    id: 'vercel',
    name: 'Vercel',
    icon: '▲',
    color: 'bg-zinc-800',
    description: 'Next.js, React, Frontend',
    tokenLabel: 'Vercel Token',
    tokenPlaceholder: 'Enter Vercel API token',
    docsUrl: 'https://vercel.com/docs/rest-api#authentication',
  },
  {
    id: 'railway',
    name: 'Railway',
    icon: '▣',
    color: 'bg-purple-600',
    description: 'Apps, Databases, Cron',
    tokenLabel: 'Railway Token',
    tokenPlaceholder: 'Enter Railway API token',
    docsUrl: 'https://docs.railway.app/reference/public-api',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    icon: '◆',
    color: 'bg-teal-600',
    description: 'Static Sites, Serverless',
    tokenLabel: 'Netlify Token',
    tokenPlaceholder: 'Enter Netlify token',
    docsUrl: 'https://docs.netlify.com/api/get-started/',
  },
  {
    id: 'render',
    name: 'Render',
    icon: '◉',
    color: 'bg-emerald-600',
    description: 'Fullstack, Managed DB',
    tokenLabel: 'Render API Key',
    tokenPlaceholder: 'Enter Render API key',
    docsUrl: 'https://render.com/docs/api',
  },
  {
    id: 'fly',
    name: 'Fly.io',
    icon: '▶',
    color: 'bg-violet-600',
    description: 'Global Edge Servers',
    tokenLabel: 'Fly Token',
    tokenPlaceholder: 'Enter Fly API token',
    docsUrl: 'https://fly.io/docs/flyctl/auth-token/',
  },
  {
    id: 'heroku',
    name: 'Heroku',
    icon: '⬡',
    color: 'bg-indigo-600',
    description: 'Classic PaaS',
    tokenLabel: 'Heroku API Key',
    tokenPlaceholder: 'Enter Heroku API key',
    docsUrl: 'https://devcenter.heroku.com/articles/authentication',
  },
  {
    id: 'aws',
    name: 'AWS Amplify',
    icon: '☁',
    color: 'bg-orange-600',
    description: 'Full AWS Integration',
    tokenLabel: 'AWS Access Key',
    tokenPlaceholder: 'Enter AWS access key ID',
    docsUrl: 'https://docs.aws.amazon.com/amplify/',
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    icon: '◎',
    color: 'bg-blue-600',
    description: 'Simple Cloud Dev',
    tokenLabel: 'DO Token',
    tokenPlaceholder: 'Enter DigitalOcean API token',
    docsUrl: 'https://docs.digitalocean.com/reference/api/',
  },
];

interface EnvVar {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

export const DeployPanel: React.FC = () => {
  const { theme } = useStore();
  const [selectedProvider, setSelectedProvider] = useState<DeployProvider>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newEnvIsSecret, setNewEnvIsSecret] = useState(false);
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!selectedProvider) return;
    
    const token = tokens[selectedProvider];
    if (!token) {
      alert('Please enter your API token first');
      return;
    }

    setDeploying(true);
    setDeployStatus('idle');

    // Simulate deployment
    setTimeout(() => {
      setDeploying(false);
      setDeployStatus('success');
      setTimeout(() => setDeployStatus('idle'), 3000);
    }, 2000);
  };

  const provider = providers.find(p => p.id === selectedProvider);

  // Provider selection view
  if (!selectedProvider) {
    return (
      <div className="h-full flex flex-col bg-vscode-sidebar">
        {/* Header */}
        <div className="px-4 py-3 border-b border-vscode-border bg-vscode-panel">
          <h2 className="text-sm font-semibold text-white">Deploy</h2>
          <p className="text-xs text-vscode-textMuted mt-1">Select platform to deploy</p>
        </div>

        {/* Provider Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 gap-3">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                className="flex items-center gap-4 p-4 bg-vscode-bg border border-vscode-border hover:border-vscode-accent rounded transition-all text-left group"
              >
                {/* Icon */}
                <div className={`w-12 h-12 ${p.color} flex items-center justify-center text-white text-xl font-semibold rounded shadow-lg`}>
                  {p.icon}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{p.name}</h3>
                    <span className="text-vscode-textMuted opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                  <p className="text-xs text-vscode-textMuted truncate">{p.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-vscode-success/10 border border-vscode-success/30 rounded">
            <div className="flex items-start gap-3">
              <span className="text-2xl text-vscode-success">◎</span>
              <div>
                <h4 className="font-medium text-vscode-success">Tip</h4>
                <p className="text-xs text-vscode-textMuted mt-1">
                  You need an API token from your chosen platform. All have free tiers!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Provider detail view
  return (
    <div className="h-full flex flex-col bg-vscode-sidebar">
      {/* Header with back button */}
      <div className="px-4 py-3 border-b border-vscode-border">
        <button
          onClick={() => {
            setSelectedProvider(null);
            setDeployStatus('idle');
          }}
          className="flex items-center gap-2 text-vscode-textMuted hover:text-white transition-colors mb-2 text-xs font-medium"
        >
          <span>←</span>
          <span>Back to providers</span>
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${provider?.color} flex items-center justify-center text-white text-lg font-semibold rounded`}>
            {provider?.icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{provider?.name}</h2>
            <p className="text-xs text-vscode-textMuted">{provider?.description}</p>
          </div>
        </div>
      </div>

      {/* Deploy Form */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status Messages */}
        {deployStatus === 'success' && (
          <div className="p-4 bg-vscode-success/10 border border-vscode-success/30 rounded flex items-center gap-3">
            <span className="text-2xl text-vscode-success">✓</span>
            <div>
              <h4 className="font-medium text-vscode-success">Deployment Started!</h4>
              <p className="text-xs text-vscode-textMuted">Check dashboard for progress.</p>
            </div>
          </div>
        )}

        {deployStatus === 'error' && (
          <div className="p-4 bg-vscode-error/10 border border-vscode-error/30 rounded flex items-center gap-3">
            <span className="text-2xl text-vscode-error">✕</span>
            <div>
              <h4 className="font-medium text-vscode-error">Deployment Failed</h4>
              <p className="text-xs text-vscode-textMuted">Check token and retry.</p>
            </div>
          </div>
        )}

        {/* Token Input */}
        <div className="p-4 bg-vscode-bg border border-vscode-border rounded">
          <label className="block text-sm font-medium text-white mb-2">
            {provider?.tokenLabel}
          </label>
          <input
            type="password"
            value={tokens[selectedProvider] || ''}
            onChange={(e) => setTokens({ ...tokens, [selectedProvider]: e.target.value })}
            placeholder={provider?.tokenPlaceholder}
            className="w-full px-4 py-3 bg-vscode-sidebar border border-vscode-border text-white focus:outline-none focus:border-vscode-accent rounded transition-all placeholder-vscode-textMuted"
          />
          <a
            href={provider?.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-vscode-accent hover:text-vscode-accentHover mt-2 font-medium"
          >
            <span>How to get token</span>
            <span>↗</span>
          </a>
        </div>

        {/* Project Settings */}
        <div className="p-4 bg-vscode-bg border border-vscode-border rounded">
          <h3 className="font-medium text-white mb-3">Project Settings</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-vscode-textMuted mb-1 font-medium">Project Name</label>
              <input
                type="text"
                defaultValue="ai-digital-friend-zone"
                className="w-full px-3 py-2 bg-vscode-sidebar border border-vscode-border text-white focus:outline-none focus:border-vscode-accent text-sm rounded"
              />
            </div>
            
            <div>
              <label className="block text-xs text-vscode-textMuted mb-1 font-medium">Branch</label>
              <select className="w-full px-3 py-2 bg-vscode-sidebar border border-vscode-border text-white focus:outline-none focus:border-vscode-accent text-sm rounded">
                <option value="main">main</option>
                <option value="develop">develop</option>
                <option value="production">production</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-vscode-textMuted mb-1 font-medium">Build Command</label>
              <input
                type="text"
                defaultValue="npm run build"
                className="w-full px-3 py-2 bg-vscode-sidebar border border-vscode-border text-vscode-success focus:outline-none focus:border-vscode-accent text-sm font-mono rounded"
              />
            </div>

            <div>
              <label className="block text-xs text-vscode-textMuted mb-1 font-medium">Output Directory</label>
              <input
                type="text"
                defaultValue="dist"
                className="w-full px-3 py-2 bg-vscode-sidebar border border-vscode-border text-vscode-success focus:outline-none focus:border-vscode-accent text-sm font-mono rounded"
              />
            </div>
          </div>
        </div>

        {/* Environment Variables */}
        <div className="p-4 bg-vscode-bg border border-vscode-border rounded">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">Environment Variables</h3>
            <button 
              onClick={() => {
                setShowAddEnvModal(true);
                setEditingEnvId(null);
                setNewEnvKey('');
                setNewEnvValue('');
                setNewEnvIsSecret(false);
              }}
              className="text-xs text-vscode-accent hover:text-vscode-accentHover font-medium"
            >
              + Add
            </button>
          </div>
          
          {envVars.length === 0 ? (
            <div className="text-xs text-vscode-textMuted text-center py-4 border border-dashed border-vscode-border rounded">
              No environment variables added
            </div>
          ) : (
            <div className="space-y-2">
              {envVars.map((env) => (
                <div 
                  key={env.id} 
                  className="flex items-center gap-2 p-2 bg-vscode-sidebar border border-vscode-border rounded"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-white">{env.key}</span>
                      {env.isSecret && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-vscode-accent/20 text-vscode-accent border border-vscode-accent/50 rounded font-medium">Secret</span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-vscode-textMuted truncate block">
                      {env.isSecret ? '••••••••' : env.value}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingEnvId(env.id);
                      setNewEnvKey(env.key);
                      setNewEnvValue(env.value);
                      setNewEnvIsSecret(env.isSecret);
                      setShowAddEnvModal(true);
                    }}
                    className="p-1.5 border border-vscode-border hover:border-vscode-accent text-vscode-textMuted hover:text-white transition rounded"
                    title="Edit"
                  >
                    <span className="text-xs">✎</span>
                  </button>
                  <button
                    onClick={() => setEnvVars(envVars.filter(e => e.id !== env.id))}
                    className="p-1.5 border border-vscode-border hover:border-vscode-error text-vscode-textMuted hover:text-vscode-error transition rounded"
                    title="Delete"
                  >
                    <span className="text-xs">✕</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Environment Variable Modal */}
        {showAddEnvModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowAddEnvModal(false)}>
            <div 
              className="w-full max-w-md mx-4 p-5 bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-white mb-4">
                {editingEnvId ? 'Edit Environment Variable' : 'Add Environment Variable'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-vscode-textMuted mb-1 font-medium">Variable Name</label>
                  <input
                    type="text"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    placeholder="API_KEY"
                    className="w-full px-3 py-2 bg-vscode-bg border border-vscode-border text-white focus:outline-none focus:border-vscode-accent text-sm font-mono rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-vscode-textMuted mb-1 font-medium">Value</label>
                  <input
                    type={newEnvIsSecret ? 'password' : 'text'}
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    placeholder="Enter value..."
                    className="w-full px-3 py-2 bg-vscode-bg border border-vscode-border text-white focus:outline-none focus:border-vscode-accent text-sm font-mono rounded"
                  />
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEnvIsSecret}
                    onChange={(e) => setNewEnvIsSecret(e.target.checked)}
                    className="w-4 h-4 border border-vscode-border bg-vscode-bg accent-vscode-accent rounded"
                  />
                  <span className="text-xs text-vscode-textMuted font-medium">Mark as secret</span>
                </label>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddEnvModal(false)}
                  className="flex-1 py-2 bg-vscode-bg border border-vscode-border text-vscode-textMuted hover:text-white hover:border-vscode-accent font-medium transition rounded text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newEnvKey.trim() || !newEnvValue.trim()) return;
                    
                    if (editingEnvId) {
                      setEnvVars(envVars.map(e => 
                        e.id === editingEnvId 
                          ? { ...e, key: newEnvKey, value: newEnvValue, isSecret: newEnvIsSecret }
                          : e
                      ));
                    } else {
                      setEnvVars([...envVars, {
                        id: Date.now().toString(),
                        key: newEnvKey,
                        value: newEnvValue,
                        isSecret: newEnvIsSecret,
                      }]);
                    }
                    
                    setShowAddEnvModal(false);
                    setNewEnvKey('');
                    setNewEnvValue('');
                    setNewEnvIsSecret(false);
                    setEditingEnvId(null);
                  }}
                  disabled={!newEnvKey.trim() || !newEnvValue.trim()}
                  className={`flex-1 py-2 font-medium transition rounded text-sm ${
                    newEnvKey.trim() && newEnvValue.trim()
                      ? 'bg-vscode-accent text-white border border-vscode-accent hover:bg-vscode-accentHover'
                      : 'bg-vscode-border/50 text-vscode-textMuted cursor-not-allowed border border-vscode-border'
                  }`}
                >
                  {editingEnvId ? 'Update' : 'Add Variable'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deploy Button */}
      <div className="p-4 border-t border-vscode-border">
        <button
          onClick={handleDeploy}
          disabled={deploying || !tokens[selectedProvider]}
          className={`w-full py-3 font-medium text-white transition-all flex items-center justify-center gap-2 rounded border
            ${deploying 
              ? 'bg-vscode-border cursor-not-allowed border-vscode-border' 
              : tokens[selectedProvider]
                ? 'bg-vscode-accent hover:bg-vscode-accentHover border-vscode-accent shadow-lg'
                : 'bg-vscode-border cursor-not-allowed border-vscode-border text-vscode-textMuted'
            }`}
        >
          {deploying ? (
            <>
              <span className="animate-spin">◎</span>
              <span>Deploying...</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>Deploy to {provider?.name}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
