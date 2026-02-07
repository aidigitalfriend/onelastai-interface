/**
 * CREDENTIALS PANEL — Manage Deploy Platform Tokens
 * Users can add/remove/validate their Vercel, Netlify, Railway, Cloudflare, GitHub tokens.
 * Tokens are encrypted server-side (AES-256-GCM) — never visible in frontend.
 */

import React, { useState, useEffect, useCallback } from 'react';

interface Credential {
  id: string;
  provider: string;
  label: string | null;
  username: string | null;
  isValid: boolean;
  extras: any;
  lastValidatedAt: string | null;
  createdAt: string;
}

interface CredentialsPanelProps {
  isDarkMode: boolean;
  onClose: () => void;
}

const PROVIDERS = [
  {
    id: 'VERCEL',
    name: 'Vercel',
    icon: '▲',
    color: '#000',
    bgColor: 'bg-white',
    borderColor: 'border-gray-300',
    glowColor: 'shadow-white/20',
    description: 'Deploy static sites, Next.js, and serverless functions',
    tokenUrl: 'https://vercel.com/account/tokens',
    tokenLabel: 'API Token',
    placeholder: 'Enter your Vercel API token',
  },
  {
    id: 'NETLIFY',
    name: 'Netlify',
    icon: '◆',
    color: '#00C7B7',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-500/30',
    glowColor: 'shadow-teal-500/20',
    description: 'Deploy sites with continuous deployment and serverless',
    tokenUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
    tokenLabel: 'Personal Access Token',
    placeholder: 'Enter your Netlify access token',
  },
  {
    id: 'RAILWAY',
    name: 'Railway',
    icon: '🚂',
    color: '#7B61FF',
    bgColor: 'bg-violet-500/20',
    borderColor: 'border-violet-500/30',
    glowColor: 'shadow-violet-500/20',
    description: 'Deploy full-stack apps with databases and services',
    tokenUrl: 'https://railway.app/account/tokens',
    tokenLabel: 'API Token',
    placeholder: 'Enter your Railway API token',
  },
  {
    id: 'CLOUDFLARE',
    name: 'Cloudflare Pages',
    icon: '☁️',
    color: '#F48120',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    glowColor: 'shadow-orange-500/20',
    description: 'Deploy to Cloudflare Pages with global CDN',
    tokenUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    tokenLabel: 'API Token',
    placeholder: 'Enter your Cloudflare API token',
    needsExtras: true,
    extrasFields: [
      { key: 'accountId', label: 'Account ID', placeholder: 'Your Cloudflare Account ID' },
    ],
  },
  {
    id: 'GITHUB',
    name: 'GitHub',
    icon: '🐙',
    color: '#333',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30',
    glowColor: 'shadow-gray-500/20',
    description: 'Push code to GitHub repos and trigger CI/CD',
    tokenUrl: 'https://github.com/settings/tokens',
    tokenLabel: 'Personal Access Token',
    placeholder: 'Enter your GitHub personal access token (classic)',
  },
];

const CredentialsPanel: React.FC<CredentialsPanelProps> = ({ isDarkMode, onClose }) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProvider, setAddingProvider] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [extrasInput, setExtrasInput] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch credentials on mount
  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || []);
      }
    } catch (err) {
      console.error('[Credentials] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Clear messages after 4s
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(null); setSuccess(null); }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const saveCredential = async (providerId: string) => {
    if (!tokenInput.trim()) {
      setError('Please enter your token');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body: any = { provider: providerId, token: tokenInput.trim() };

      // Add extras for providers that need them (e.g. Cloudflare Account ID)
      if (Object.keys(extrasInput).length > 0) {
        body.extras = extrasInput;
      }

      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message || `${providerId} connected!`);
        setTokenInput('');
        setExtrasInput({});
        setAddingProvider(null);
        await fetchCredentials();
      } else {
        setError(data.error || 'Failed to save credentials');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCredential = async (providerId: string) => {
    if (!confirm(`Remove ${providerId} credentials? You'll need to re-add them to deploy.`)) return;

    try {
      const res = await fetch(`/api/credentials/${providerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setSuccess(`${providerId} credentials removed`);
        await fetchCredentials();
      }
    } catch (err) {
      setError('Failed to remove credentials');
    }
  };

  const revalidate = async (providerId: string) => {
    setValidating(providerId);

    try {
      const res = await fetch(`/api/credentials/${providerId}/validate`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();
      if (data.valid) {
        setSuccess(`${providerId} token is valid ✓`);
      } else {
        setError(`${providerId} token is invalid. Please update it.`);
      }
      await fetchCredentials();
    } catch (err) {
      setError('Validation failed');
    } finally {
      setValidating(null);
    }
  };

  const getCredentialForProvider = (providerId: string) =>
    credentials.find((c) => c.provider === providerId);

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-[#111]/95' : 'bg-white'}`}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <h3 className={`text-xs font-bold ${isDarkMode ? 'text-cyan-500/80' : 'text-cyan-600'} uppercase tracking-widest`}>
            Deploy Credentials
          </h3>
        </div>
        <button onClick={onClose} title="Close" className={`${isDarkMode ? 'text-gray-600 hover:text-cyan-400' : 'text-gray-400 hover:text-cyan-600'} transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Status Messages */}
      {(error || success) && (
        <div className={`mx-6 mb-2 px-3 py-2 rounded-lg text-xs font-medium ${
          error 
            ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
        }`}>
          {error || success}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map((provider) => {
              const cred = getCredentialForProvider(provider.id);
              const isAdding = addingProvider === provider.id;

              return (
                <div
                  key={provider.id}
                  className={`rounded-lg border transition-all ${
                    cred
                      ? isDarkMode
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-emerald-50 border-emerald-200'
                      : isDarkMode
                        ? 'bg-black/30 border-gray-800 hover:border-gray-700'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Provider Row */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{provider.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {provider.name}
                            </span>
                            {cred && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                cred.isValid 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {cred.isValid ? 'Connected' : 'Invalid'}
                              </span>
                            )}
                          </div>
                          <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>
                            {cred ? `Connected as ${cred.username}` : provider.description}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {cred ? (
                          <>
                            <button
                              onClick={() => revalidate(provider.id)}
                              disabled={validating === provider.id}
                              className={`p-1.5 rounded-md text-[10px] ${
                                isDarkMode
                                  ? 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10'
                                  : 'text-gray-400 hover:text-cyan-600 hover:bg-cyan-50'
                              } transition-all`}
                              title="Re-validate"
                            >
                              {validating === provider.id ? (
                                <div className="w-3.5 h-3.5 border border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => { setAddingProvider(provider.id); setTokenInput(''); }}
                              className={`p-1.5 rounded-md text-[10px] ${
                                isDarkMode
                                  ? 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10'
                                  : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                              } transition-all`}
                              title="Update token"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteCredential(provider.id)}
                              className={`p-1.5 rounded-md text-[10px] ${
                                isDarkMode
                                  ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              } transition-all`}
                              title="Remove"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setAddingProvider(isAdding ? null : provider.id); setTokenInput(''); setExtrasInput({}); }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                              isAdding
                                ? isDarkMode
                                  ? 'bg-gray-800 text-gray-400'
                                  : 'bg-gray-200 text-gray-500'
                                : isDarkMode
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20'
                                  : 'bg-cyan-50 text-cyan-600 border border-cyan-200 hover:bg-cyan-100'
                            }`}
                          >
                            {isAdding ? 'Cancel' : 'Connect'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Token Input (expanded when adding) */}
                    {isAdding && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-1.5`}>
                            {provider.tokenLabel}
                          </label>
                          <input
                            type="password"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            placeholder={provider.placeholder}
                            className={`w-full px-3 py-2.5 text-xs rounded-lg border outline-none transition-all ${
                              isDarkMode
                                ? 'bg-black/50 border-gray-700 text-gray-200 placeholder:text-gray-600 focus:border-cyan-500/50'
                                : 'bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-cyan-500'
                            }`}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveCredential(provider.id); }}
                          />
                        </div>

                        {/* Extra fields (e.g. Cloudflare Account ID) */}
                        {provider.needsExtras && provider.extrasFields?.map((field) => (
                          <div key={field.key}>
                            <label className={`block text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-1.5`}>
                              {field.label}
                            </label>
                            <input
                              type="text"
                              value={extrasInput[field.key] || ''}
                              onChange={(e) => setExtrasInput((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className={`w-full px-3 py-2.5 text-xs rounded-lg border outline-none transition-all ${
                                isDarkMode
                                  ? 'bg-black/50 border-gray-700 text-gray-200 placeholder:text-gray-600 focus:border-cyan-500/50'
                                  : 'bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-cyan-500'
                              }`}
                            />
                          </div>
                        ))}

                        <div className="flex items-center justify-between">
                          <a
                            href={provider.tokenUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-[10px] ${isDarkMode ? 'text-cyan-500 hover:text-cyan-400' : 'text-cyan-600 hover:text-cyan-500'} underline transition-colors`}
                          >
                            Get token →
                          </a>
                          <button
                            onClick={() => saveCredential(provider.id)}
                            disabled={saving || !tokenInput.trim()}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 transition-all uppercase tracking-wider"
                          >
                            {saving ? 'Validating...' : 'Save & Validate'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Footer */}
        <div className={`mt-6 p-4 rounded-lg border ${isDarkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-start gap-2">
            <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className={`text-[10px] ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} font-bold mb-1`}>
                Secure Token Storage
              </p>
              <p className={`text-[10px] ${isDarkMode ? 'text-blue-400/60' : 'text-blue-500'} leading-relaxed`}>
                Your tokens are encrypted with AES-256-GCM and stored securely. We never expose or log your credentials. Tokens are validated with each platform before saving.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialsPanel;
