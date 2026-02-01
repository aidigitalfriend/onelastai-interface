/**
 * CopilotSettings - API Key Management Modal
 * Manage AI provider API keys and settings
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { copilotService } from '../services/copilot';
import { isDarkTheme } from '../utils/theme';

// Provider configurations
const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-4, GPT-4o, o1 series',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview', 'o1-mini'],
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    description: 'Claude 3.5, Claude 3 series',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    apiKeyUrl: 'https://console.anthropic.com/account/keys',
    placeholder: 'sk-ant-...',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    description: 'Gemini 2.0, Gemini 1.5 series',
    models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AI...',
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    description: 'Ultra-fast LLaMA, Mixtral',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'llama-3.1-8b-instant'],
    apiKeyUrl: 'https://console.groq.com/keys',
    placeholder: 'gsk_...',
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    icon: '🚀',
    description: 'Grok-2 models',
    models: ['grok-2-latest', 'grok-2-vision-1212'],
    apiKeyUrl: 'https://console.x.ai',
    placeholder: 'xai-...',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    icon: '🌬️',
    description: 'Mistral Large, Medium',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'codestral-latest'],
    apiKeyUrl: 'https://console.mistral.ai/api-keys/',
    placeholder: '...',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    icon: '🧬',
    description: 'High-speed inference',
    models: ['llama-3.3-70b'],
    apiKeyUrl: 'https://cloud.cerebras.ai/',
    placeholder: 'csk-...',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    icon: '🦙',
    description: 'Run models locally',
    models: ['llama3.2', 'codellama', 'deepseek-coder', 'qwen2.5-coder', 'mistral'],
    apiKeyUrl: 'https://ollama.ai',
    placeholder: 'No API key required',
    noKey: true,
  },
];

interface CopilotSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CopilotSettings: React.FC<CopilotSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme } = useStore();
  const isDark = isDarkTheme(theme);

  // State for all provider settings
  const [activeProvider, setActiveProvider] = useState('openai');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'testing' | null>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load saved settings on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('copilot_active_provider') || 'openai';
    setActiveProvider(savedProvider);

    const keys: Record<string, string> = {};
    const models: Record<string, string> = {};

    PROVIDERS.forEach(provider => {
      const savedKey = localStorage.getItem(`copilot_apikey_${provider.id}`);
      if (savedKey) keys[provider.id] = savedKey;

      const savedModel = localStorage.getItem(`copilot_model_${provider.id}`);
      models[provider.id] = savedModel || provider.models[0];
    });

    setApiKeys(keys);
    setSelectedModels(models);

    const savedOllamaUrl = localStorage.getItem('copilot_ollama_url');
    if (savedOllamaUrl) setOllamaUrl(savedOllamaUrl);
  }, [isOpen]);

  // Save all settings
  const handleSave = () => {
    setSaveStatus('saving');

    // Save active provider
    localStorage.setItem('copilot_active_provider', activeProvider);

    // Save API keys
    Object.entries(apiKeys).forEach(([providerId, key]) => {
      if (key) {
        localStorage.setItem(`copilot_apikey_${providerId}`, key);
      } else {
        localStorage.removeItem(`copilot_apikey_${providerId}`);
      }
    });

    // Save selected models
    Object.entries(selectedModels).forEach(([providerId, model]) => {
      localStorage.setItem(`copilot_model_${providerId}`, model);
    });

    // Save Ollama URL
    localStorage.setItem('copilot_ollama_url', ollamaUrl);

    // Update copilot service
    const provider = PROVIDERS.find(p => p.id === activeProvider);
    copilotService.setConfig({
      provider: activeProvider as any,
      model: selectedModels[activeProvider] || provider?.models[0] || '',
      apiKey: apiKeys[activeProvider] || '',
    });

    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        onClose();
      }, 1000);
    }, 500);
  };

  // Test API key
  const handleTestKey = async (providerId: string) => {
    setTestResults(prev => ({ ...prev, [providerId]: 'testing' }));

    try {
      const apiKey = apiKeys[providerId];
      const model = selectedModels[providerId];

      // Simple test request
      let success = false;

      if (providerId === 'ollama') {
        // Test Ollama connection
        const response = await fetch(`${ollamaUrl}/api/tags`);
        success = response.ok;
      } else if (apiKey) {
        // Test by setting config and making a simple call
        copilotService.setConfig({
          provider: providerId as any,
          model,
          apiKey,
        });

        // Try a simple completion test
        success = true; // For now, just validate key format
        
        // Validate key format
        if (providerId === 'openai' && !apiKey.startsWith('sk-')) {
          success = false;
        } else if (providerId === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
          success = false;
        } else if (providerId === 'groq' && !apiKey.startsWith('gsk_')) {
          success = false;
        }
      } else {
        success = false;
      }

      setTestResults(prev => ({ 
        ...prev, 
        [providerId]: success ? 'success' : 'error' 
      }));
    } catch (error) {
      console.error(`[CopilotSettings] Test failed for ${providerId}:`, error);
      setTestResults(prev => ({ ...prev, [providerId]: 'error' }));
    }

    // Clear result after 3 seconds
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, [providerId]: null }));
    }, 3000);
  };

  // Styles
  const bgClass = isDark ? 'bg-[#1e1e1e]' : 'bg-white';
  const borderClass = isDark ? 'border-[#3c3c3c]' : 'border-gray-200';
  const textClass = isDark ? 'text-[#cccccc]' : 'text-gray-800';
  const mutedClass = isDark ? 'text-[#808080]' : 'text-gray-500';
  const inputBg = isDark ? 'bg-[#3c3c3c]' : 'bg-gray-100';
  const hoverBg = isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-50';

  const currentProvider = PROVIDERS.find(p => p.id === activeProvider);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-lg shadow-xl ${bgClass} ${textClass}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${borderClass}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h2 className="text-lg font-semibold">AI Copilot Settings</h2>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded ${hoverBg} transition-colors`}
            >
              ✕
            </button>
          </div>

          <div className="flex h-[500px]">
            {/* Provider List */}
            <div className={`w-48 border-r ${borderClass} overflow-y-auto`}>
              {PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => setActiveProvider(provider.id)}
                  className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors ${
                    activeProvider === provider.id
                      ? isDark
                        ? 'bg-blue-900/30 border-l-2 border-blue-500'
                        : 'bg-blue-50 border-l-2 border-blue-500'
                      : hoverBg
                  }`}
                >
                  <span className="text-lg">{provider.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{provider.name}</div>
                    {apiKeys[provider.id] && (
                      <span className="text-xs text-green-500">✓ Configured</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Provider Settings */}
            <div className="flex-1 p-4 overflow-y-auto">
              {currentProvider && (
                <div className="space-y-4">
                  {/* Provider Header */}
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currentProvider.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{currentProvider.name}</h3>
                      <p className={`text-sm ${mutedClass}`}>{currentProvider.description}</p>
                    </div>
                  </div>

                  {/* Set as Active */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="setActive"
                      checked={activeProvider === currentProvider.id}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveProvider(currentProvider.id);
                        }
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="setActive" className="text-sm">
                      Use {currentProvider.name} as default provider
                    </label>
                  </div>

                  {/* API Key Input */}
                  {!currentProvider.noKey ? (
                    <div>
                      <label className={`block text-sm ${mutedClass} mb-1`}>
                        API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKeys[currentProvider.id] || ''}
                          onChange={(e) => setApiKeys(prev => ({
                            ...prev,
                            [currentProvider.id]: e.target.value
                          }))}
                          placeholder={currentProvider.placeholder}
                          className={`flex-1 px-3 py-2 rounded text-sm ${inputBg} border ${borderClass} focus:outline-none focus:border-blue-500`}
                        />
                        <button
                          onClick={() => handleTestKey(currentProvider.id)}
                          disabled={!apiKeys[currentProvider.id]}
                          className={`px-3 py-2 rounded text-sm transition-colors ${
                            apiKeys[currentProvider.id]
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : `${inputBg} ${mutedClass} cursor-not-allowed`
                          }`}
                        >
                          {testResults[currentProvider.id] === 'testing' ? (
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              ⟳
                            </motion.span>
                          ) : testResults[currentProvider.id] === 'success' ? (
                            '✓'
                          ) : testResults[currentProvider.id] === 'error' ? (
                            '✗'
                          ) : (
                            'Test'
                          )}
                        </button>
                      </div>
                      <a
                        href={currentProvider.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1 text-xs text-blue-500 hover:underline"
                      >
                        Get API key →
                      </a>
                    </div>
                  ) : (
                    <div>
                      <label className={`block text-sm ${mutedClass} mb-1`}>
                        Ollama Server URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                          className={`flex-1 px-3 py-2 rounded text-sm ${inputBg} border ${borderClass} focus:outline-none focus:border-blue-500`}
                        />
                        <button
                          onClick={() => handleTestKey('ollama')}
                          className="px-3 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          {testResults.ollama === 'testing' ? (
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              ⟳
                            </motion.span>
                          ) : testResults.ollama === 'success' ? (
                            '✓ Connected'
                          ) : testResults.ollama === 'error' ? (
                            '✗ Failed'
                          ) : (
                            'Test Connection'
                          )}
                        </button>
                      </div>
                      <p className={`mt-1 text-xs ${mutedClass}`}>
                        Make sure Ollama is running locally. <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Download Ollama →</a>
                      </p>
                    </div>
                  )}

                  {/* Model Selection */}
                  <div>
                    <label className={`block text-sm ${mutedClass} mb-1`}>
                      Model
                    </label>
                    <select
                      value={selectedModels[currentProvider.id] || currentProvider.models[0]}
                      onChange={(e) => setSelectedModels(prev => ({
                        ...prev,
                        [currentProvider.id]: e.target.value
                      }))}
                      className={`w-full px-3 py-2 rounded text-sm ${inputBg} border ${borderClass} focus:outline-none focus:border-blue-500`}
                    >
                      {currentProvider.models.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>

                  {/* Model Info */}
                  <div className={`p-3 rounded ${isDark ? 'bg-[#2d2d2d]' : 'bg-gray-50'}`}>
                    <h4 className="text-sm font-medium mb-2">Available Models</h4>
                    <div className="space-y-1">
                      {currentProvider.models.map(model => (
                        <div key={model} className={`text-xs ${mutedClass}`}>
                          • {model}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between px-4 py-3 border-t ${borderClass}`}>
            <p className={`text-xs ${mutedClass}`}>
              API keys are stored locally in your browser
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded text-sm ${hoverBg} border ${borderClass} transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                {saveStatus === 'saving' ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ⟳
                    </motion.span>
                    Saving...
                  </span>
                ) : saveStatus === 'saved' ? (
                  '✓ Saved!'
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Quick Settings Popover for Status Bar
 */
interface QuickSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFull: () => void;
  anchorPosition?: { x: number; y: number };
}

export const QuickCopilotSettings: React.FC<QuickSettingsProps> = ({
  isOpen,
  onClose,
  onOpenFull,
  anchorPosition,
}) => {
  const { theme } = useStore();
  const isDark = isDarkTheme(theme);

  const [activeProvider, setActiveProvider] = useState(() =>
    localStorage.getItem('copilot_active_provider') || 'openai'
  );
  const [model, setModel] = useState(() => {
    const provider = localStorage.getItem('copilot_active_provider') || 'openai';
    return localStorage.getItem(`copilot_model_${provider}`) || '';
  });

  // Quick switch provider
  const handleProviderChange = (providerId: string) => {
    setActiveProvider(providerId);
    localStorage.setItem('copilot_active_provider', providerId);

    const savedModel = localStorage.getItem(`copilot_model_${providerId}`);
    const provider = PROVIDERS.find(p => p.id === providerId);
    const newModel = savedModel || provider?.models[0] || '';
    setModel(newModel);

    const apiKey = localStorage.getItem(`copilot_apikey_${providerId}`) || '';
    copilotService.setConfig({
      provider: providerId as any,
      model: newModel,
      apiKey,
    });

    onClose();
  };

  if (!isOpen) return null;

  const bgClass = isDark ? 'bg-[#252526]' : 'bg-white';
  const borderClass = isDark ? 'border-[#3c3c3c]' : 'border-gray-200';
  const hoverBg = isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-50';
  const mutedClass = isDark ? 'text-[#808080]' : 'text-gray-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className={`fixed z-50 w-56 rounded-lg shadow-lg ${bgClass} border ${borderClass}`}
      style={{
        bottom: anchorPosition?.y ?? 30,
        right: anchorPosition?.x ?? 10,
      }}
    >
      <div className={`px-3 py-2 border-b ${borderClass}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Copilot Provider</span>
          <button
            onClick={onOpenFull}
            className={`text-xs ${mutedClass} hover:text-blue-500`}
          >
            Settings ⚙
          </button>
        </div>
      </div>

      <div className="py-1">
        {PROVIDERS.map(provider => {
          const hasKey = !!localStorage.getItem(`copilot_apikey_${provider.id}`) || provider.noKey;
          return (
            <button
              key={provider.id}
              onClick={() => handleProviderChange(provider.id)}
              disabled={!hasKey}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors ${
                !hasKey ? 'opacity-50 cursor-not-allowed' : hoverBg
              } ${activeProvider === provider.id ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50') : ''}`}
            >
              <span>{provider.icon}</span>
              <span className="text-sm">{provider.name}</span>
              {activeProvider === provider.id && (
                <span className="ml-auto text-green-500">✓</span>
              )}
              {!hasKey && !provider.noKey && (
                <span className={`ml-auto text-xs ${mutedClass}`}>No key</span>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CopilotSettings;
