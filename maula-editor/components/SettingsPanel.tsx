import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { ShellType } from '../types';

// AI Provider Configuration (from App.tsx)
const AI_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
  },
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  mistral: {
    name: 'Mistral AI',
    icon: '🌀',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
  },
  groq: {
    name: 'Groq',
    icon: '⚡',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  },
  xai: {
    name: 'xAI',
    icon: '🅧',
    models: ['grok-2', 'grok-2-mini', 'grok-beta'],
  },
  cerebras: {
    name: 'Cerebras',
    icon: '🔮',
    models: ['llama-3.3-70b', 'llama-3.1-8b', 'llama-3.1-70b'],
  },
  huggingface: {
    name: 'Hugging Face',
    icon: '🤗',
    models: ['meta-llama/Llama-3.2-3B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3'],
  },
  ollama: {
    name: 'Ollama (Local)',
    icon: '🦙',
    models: ['llama3.2', 'mistral', 'codellama', 'deepseek-coder', 'qwen2.5-coder'],
  },
};

type AIProviderKey = keyof typeof AI_PROVIDERS;

import debuggingService, { DebugServerConfig } from '../services/debugging';
import taskRunnerService, { TaskServerConfig } from '../services/taskRunner';

interface SettingsPanelProps {
  theme: string;
  setTheme: (theme: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ theme, setTheme }) => {
  const { editorSettings, setEditorSettings, aiConfig, setAiConfig, uiLayout, setUILayout } = useStore();
  const [activeTab, setActiveTab] = useState<'appearance' | 'editor' | 'fonts' | 'terminal' | 'layout' | 'ai' | 'debug' | 'tasks'>('appearance');
  
  // Debugging and Task Runner server configuration state
  const [debugConfig, setDebugConfig] = useState<DebugServerConfig>(debuggingService.getServerConfig());
  const [taskConfig, setTaskConfig] = useState<TaskServerConfig>(taskRunnerService.getServerConfig());
  const [debugConnected, setDebugConnected] = useState(debuggingService.isConnected());
  const [taskConnected, setTaskConnected] = useState(taskRunnerService.isConnected());
  
  // Check if current theme is a dark variant
  const isDarkTheme = theme !== 'light';
  const isHighContrast = theme === 'high-contrast';
  
  const bgCard = isDarkTheme
    ? isHighContrast
      ? 'bg-black border-2 border-white rounded-md'
      : 'bg-vscode-sidebar border border-vscode-border rounded-md'
    : 'bg-gray-100 border border-gray-300 rounded-md';
      
  const textPrimary = isDarkTheme ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkTheme 
    ? isHighContrast ? 'text-gray-200' : 'text-vscode-text' 
    : 'text-gray-700';
  const textMuted = isDarkTheme 
    ? isHighContrast ? 'text-gray-300' : 'text-vscode-textMuted' 
    : 'text-gray-600';
  const borderColor = isDarkTheme 
    ? isHighContrast ? 'border-white' : 'border-vscode-border' 
    : 'border-gray-300';
  const inputBg = isDarkTheme
    ? isHighContrast 
      ? 'bg-black border-2 border-white text-white rounded' 
      : 'bg-vscode-bg border border-vscode-border text-white rounded'
    : 'bg-white border border-gray-400 text-gray-900 rounded';
  
  // Select/dropdown specific styling with solid background
  const selectBg = isDarkTheme
    ? isHighContrast
      ? 'bg-black border-2 border-white text-white rounded'
      : 'bg-[#1e1e1e] border border-[#3c3c3c] text-white rounded'
    : 'bg-white border border-gray-400 text-gray-900 rounded';
  
  // Style object for select options (native selects need inline styles)
  const selectStyle = isDarkTheme
    ? { backgroundColor: '#1e1e1e', color: '#ffffff' }
    : { backgroundColor: '#ffffff', color: '#111827' };

  const currentProvider = AI_PROVIDERS[aiConfig.provider as AIProviderKey] || AI_PROVIDERS.openai;
  
  const fontOptions = [
    "'JetBrains Mono', monospace",
    "'Fira Code', monospace",
    "'Cascadia Code', monospace",
    "'Source Code Pro', monospace",
    "'IBM Plex Mono', monospace",
    "'Consolas', monospace",
    "'Monaco', monospace",
    "'Menlo', monospace",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className={`flex border-b ${borderColor} ${isDarkTheme ? 'bg-vscode-sidebar' : 'bg-gray-100'} overflow-x-auto`}>
        {(['appearance', 'editor', 'fonts', 'terminal', 'layout', 'ai', 'debug', 'tasks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? `${textPrimary} border-b-2 border-vscode-accent bg-vscode-accent/10`
                : `${textMuted} hover:${textSecondary}`
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="flex-1 p-4 space-y-6 overflow-auto">
        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <>
            <div>
              <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>Color Theme</h3>
              <div className="space-y-2">
                <div className={`p-3 ${bgCard}`}>
                  <label className={`text-sm ${textSecondary} block mb-2`}>Application Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'dark', label: '🌙 Dark', desc: 'VS Code Dark' },
                      { value: 'light', label: '☀️ Light', desc: 'VS Code Light' },
                      { value: 'high-contrast', label: '🔲 High Contrast', desc: 'Maximum visibility' },
                      { value: 'github-dark', label: '🐙 GitHub Dark', desc: 'GitHub style' },
                      { value: 'dracula', label: '🧛 Dracula', desc: 'Purple dark theme' },
                      { value: 'nord', label: '❄️ Nord', desc: 'Arctic blue theme' },
                      { value: 'monokai', label: '🎨 Monokai', desc: 'Classic colorful' },
                      { value: 'solarized-dark', label: '🌅 Solarized', desc: 'Warm dark theme' },
                      { value: 'one-dark', label: '💜 One Dark', desc: 'Atom inspired' },
                      { value: 'steel', label: '⚙️ Steel', desc: 'Metallic industrial' },
                    ].map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`p-3 text-left border-2 rounded-lg transition-all ${
                          theme === t.value
                            ? 'border-vscode-accent bg-vscode-accent/10'
                            : `${borderColor.replace('border-', 'border-')} hover:border-vscode-accent/50`
                        }`}
                      >
                        <div className={`text-sm font-medium ${textPrimary}`}>{t.label}</div>
                        <div className={`text-xs ${textMuted} mt-1`}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                  <span className={`text-sm ${textSecondary}`}>Icon Theme</span>
                  <select
                    value={editorSettings.iconTheme || 'material'}
                    onChange={(e) => setEditorSettings({ iconTheme: e.target.value as any })}
                    className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                    style={selectStyle}
                  >
                    <option style={selectStyle} value="default">📁 Default</option>
                    <option style={selectStyle} value="material">🎨 Material Icons</option>
                    <option style={selectStyle} value="seti">📂 Seti</option>
                    <option style={selectStyle} value="minimal">▫️ Minimal</option>
                    <option style={selectStyle} value="vscode">💙 VS Code</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>Editor Color Scheme</h3>
              <div className="space-y-2">
                <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                  <span className={`text-sm ${textSecondary}`}>Editor Theme</span>
                  <select
                    value={editorSettings.theme}
                    onChange={(e) => setEditorSettings({ theme: e.target.value as any })}
                    className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                    style={selectStyle}
                  >
                    <option style={selectStyle} value="vs-dark">VS Dark</option>
                    <option style={selectStyle} value="vs-light">VS Light</option>
                    <option style={selectStyle} value="hc-black">High Contrast Black</option>
                    <option style={selectStyle} value="hc-light">High Contrast Light</option>
                    <option style={selectStyle} value="monokai">Monokai</option>
                    <option style={selectStyle} value="dracula">Dracula</option>
                    <option style={selectStyle} value="github-dark">GitHub Dark</option>
                    <option style={selectStyle} value="one-dark-pro">One Dark Pro</option>
                    <option style={selectStyle} value="nord">Nord</option>
                    <option style={selectStyle} value="solarized-dark">Solarized Dark</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Fonts Tab */}
        {activeTab === 'fonts' && (
          <div>
            <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>Font Configuration</h3>
            <div className="space-y-2">
              <div className={`p-3 ${bgCard} space-y-2`}>
                <label className={`text-sm ${textSecondary} block`}>Font Family</label>
                <select
                  value={editorSettings.fontFamily}
                  onChange={(e) => setEditorSettings({ fontFamily: e.target.value })}
                  className={`w-full ${selectBg} text-sm px-3 py-2 focus:outline-none focus:border-vscode-accent font-mono`}
                >
                  {fontOptions.map(font => (
                    <option key={font} value={font}>{font.split("'")[1]}</option>
                  ))}
                </select>
                <p className={`text-xs ${textMuted}`}>Choose your preferred monospace font</p>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Font Size</span>
                <select
                  value={editorSettings.fontSize}
                  onChange={(e) => setEditorSettings({ fontSize: Number(e.target.value) })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  {[10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32].map(size => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Line Height</span>
                <select
                  value={editorSettings.lineHeight || 1.6}
                  onChange={(e) => setEditorSettings({ lineHeight: Number(e.target.value) })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  {[1.2, 1.4, 1.5, 1.6, 1.8, 2.0, 2.2].map(height => (
                    <option key={height} value={height}>{height}</option>
                  ))}
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Letter Spacing</span>
                <select
                  value={editorSettings.letterSpacing || 0}
                  onChange={(e) => setEditorSettings({ letterSpacing: Number(e.target.value) })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  {[-0.5, 0, 0.5, 1, 1.5, 2].map(spacing => (
                    <option key={spacing} value={spacing}>{spacing}px</option>
                  ))}
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <div>
                  <div className={`text-sm ${textSecondary}`}>Font Ligatures</div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>Enable programming ligatures (→ ≠ ≤)</div>
                </div>
                <button
                  onClick={() => setEditorSettings({ fontLigatures: !editorSettings.fontLigatures })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    editorSettings.fontLigatures
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {editorSettings.fontLigatures ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div>
            <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>
              <span className="mr-2">🖥️</span>Integrated Terminal
            </h3>
            <div className="space-y-2">
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <div>
                  <div className={`text-sm ${textSecondary}`}>Default Shell</div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>Shell to open new terminals with</div>
                </div>
                <select
                  value={editorSettings.terminal?.defaultShell || 'bash'}
                  onChange={(e) => setEditorSettings({ 
                    terminal: { ...editorSettings.terminal, defaultShell: e.target.value as ShellType } 
                  })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  <option value="bash">🐚 Bash</option>
                  <option value="zsh">⚡ Zsh</option>
                  <option value="sh">💲 Shell (sh)</option>
                  <option value="powershell">🔵 PowerShell</option>
                  <option value="cmd">⬛ CMD</option>
                  <option value="fish">🐟 Fish</option>
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Font Size</span>
                <select
                  value={editorSettings.terminal?.fontSize || 13}
                  onChange={(e) => setEditorSettings({ 
                    terminal: { ...editorSettings.terminal, fontSize: Number(e.target.value) } 
                  })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  {[10, 11, 12, 13, 14, 15, 16, 18, 20].map(size => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Cursor Style</span>
                <select
                  value={editorSettings.terminal?.cursorStyle || 'bar'}
                  onChange={(e) => setEditorSettings({ 
                    terminal: { ...editorSettings.terminal, cursorStyle: e.target.value as 'block' | 'underline' | 'bar' } 
                  })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  <option value="bar">▏ Bar</option>
                  <option value="block">█ Block</option>
                  <option value="underline">_ Underline</option>
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <div>
                  <div className={`text-sm ${textSecondary}`}>Cursor Blink</div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>Animate cursor</div>
                </div>
                <button
                  onClick={() => setEditorSettings({ 
                    terminal: { ...editorSettings.terminal, cursorBlink: !editorSettings.terminal?.cursorBlink } 
                  })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    editorSettings.terminal?.cursorBlink !== false
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {editorSettings.terminal?.cursorBlink !== false ? 'On' : 'Off'}
                </button>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Line Height</span>
                <select
                  value={editorSettings.terminal?.lineHeight || 1.4}
                  onChange={(e) => setEditorSettings({ 
                    terminal: { ...editorSettings.terminal, lineHeight: Number(e.target.value) } 
                  })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  {[1.0, 1.2, 1.4, 1.5, 1.6, 1.8, 2.0].map(height => (
                    <option key={height} value={height}>{height}</option>
                  ))}
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <div>
                  <div className={`text-sm ${textSecondary}`}>Scrollback Buffer</div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>Lines to keep in buffer</div>
                </div>
                <select
                  value={editorSettings.terminal?.scrollback || 10000}
                  onChange={(e) => setEditorSettings({ 
                    terminal: { ...editorSettings.terminal, scrollback: Number(e.target.value) } 
                  })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  <option value={1000}>1,000</option>
                  <option value={5000}>5,000</option>
                  <option value={10000}>10,000</option>
                  <option value={20000}>20,000</option>
                  <option value={50000}>50,000</option>
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <div>
                  <div className={`text-sm ${textSecondary}`}>Copy on Select</div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>Auto-copy selected text</div>
                </div>
                <button
                  onClick={() => setEditorSettings({ 
                    terminal: { ...editorSettings.terminal, copyOnSelect: !editorSettings.terminal?.copyOnSelect } 
                  })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    editorSettings.terminal?.copyOnSelect
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {editorSettings.terminal?.copyOnSelect ? 'On' : 'Off'}
                </button>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <div>
                  <div className={`text-sm ${textSecondary}`}>Terminal Bell</div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>Play audio on bell character</div>
                </div>
                <button
                  onClick={() => setEditorSettings({ 
                    terminal: { ...editorSettings.terminal, enableBell: !editorSettings.terminal?.enableBell } 
                  })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    editorSettings.terminal?.enableBell
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {editorSettings.terminal?.enableBell ? 'On' : 'Off'}
                </button>
              </div>
            </div>
            
            <h3 className={`text-xs font-semibold ${textPrimary} mb-3 mt-6 uppercase tracking-wide border-b ${borderColor} pb-2`}>
              <span className="mr-2">⌨️</span>Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              <div className={`p-3 ${bgCard}`}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center justify-between ${textMuted}`}>
                    <span>New Terminal</span>
                    <kbd className={`px-2 py-0.5 rounded ${isDarkTheme(theme) ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+Shift+`</kbd>
                  </div>
                  <div className={`flex items-center justify-between ${textMuted}`}>
                    <span>Toggle Terminal</span>
                    <kbd className={`px-2 py-0.5 rounded ${isDarkTheme(theme) ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+`</kbd>
                  </div>
                  <div className={`flex items-center justify-between ${textMuted}`}>
                    <span>Split Horizontal</span>
                    <kbd className={`px-2 py-0.5 rounded ${isDarkTheme(theme) ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+Shift+5</kbd>
                  </div>
                  <div className={`flex items-center justify-between ${textMuted}`}>
                    <span>Close Terminal</span>
                    <kbd className={`px-2 py-0.5 rounded ${isDarkTheme(theme) ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+W</kbd>
                  </div>
                  <div className={`flex items-center justify-between ${textMuted}`}>
                    <span>Previous Tab</span>
                    <kbd className={`px-2 py-0.5 rounded ${isDarkTheme(theme) ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+PageUp</kbd>
                  </div>
                  <div className={`flex items-center justify-between ${textMuted}`}>
                    <span>Next Tab</span>
                    <kbd className={`px-2 py-0.5 rounded ${isDarkTheme(theme) ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+PageDown</kbd>
                  </div>
                  <div className={`flex items-center justify-between ${textMuted}`}>
                    <span>Find in Terminal</span>
                    <kbd className={`px-2 py-0.5 rounded ${isDarkTheme(theme) ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+Shift+F</kbd>
                  </div>
                  <div className={`flex items-center justify-between ${textMuted}`}>
                    <span>Clear Terminal</span>
                    <kbd className={`px-2 py-0.5 rounded ${isDarkTheme(theme) ? 'bg-vscode-hover' : 'bg-gray-200'}`}>Ctrl+L</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Layout Tab */}
        {activeTab === 'layout' && (
          <div>
            <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>UI Layout Configuration</h3>
            <div className="space-y-2">
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <div>
                  <div className={`text-sm ${textSecondary}`}>Sidebar Position</div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>Choose sidebar location</div>
                </div>
                <select
                  value={uiLayout?.sidebarPosition || 'left'}
                  onChange={(e) => setUILayout({ sidebarPosition: e.target.value as any })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  <option value="left">← Left</option>
                  <option value="right">Right →</option>
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <div>
                  <div className={`text-sm ${textSecondary}`}>Panel Position</div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>Terminal & output panel location</div>
                </div>
                <select
                  value={uiLayout?.panelPosition || 'bottom'}
                  onChange={(e) => setUILayout({ panelPosition: e.target.value as any })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  <option value="bottom">↓ Bottom</option>
                  <option value="right">Right →</option>
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <div>
                  <div className={`text-sm ${textSecondary}`}>Compact Mode</div>
                  <div className={`text-xs ${textMuted} mt-0.5`}>Reduce padding and spacing</div>
                </div>
                <button
                  onClick={() => setUILayout({ compactMode: !uiLayout?.compactMode })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    uiLayout?.compactMode
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {uiLayout?.compactMode ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div>
            <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>Editor Behavior</h3>
            <div className="space-y-2">
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Tab Size</span>
                <select
                  value={editorSettings.tabSize}
                  onChange={(e) => setEditorSettings({ tabSize: Number(e.target.value) })}
                  className={`${selectBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value={8}>8 spaces</option>
                </select>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Word Wrap</span>
                <button
                  onClick={() => setEditorSettings({ wordWrap: !editorSettings.wordWrap })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    editorSettings.wordWrap
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {editorSettings.wordWrap ? 'On' : 'Off'}
                </button>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Minimap</span>
                <button
                  onClick={() => setEditorSettings({ minimap: !editorSettings.minimap })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    editorSettings.minimap
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {editorSettings.minimap ? 'On' : 'Off'}
                </button>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Line Numbers</span>
                <button
                  onClick={() => setEditorSettings({ lineNumbers: !editorSettings.lineNumbers })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    editorSettings.lineNumbers
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {editorSettings.lineNumbers ? 'On' : 'Off'}
                </button>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Auto Save</span>
                <button
                  onClick={() => setEditorSettings({ autoSave: !editorSettings.autoSave })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    editorSettings.autoSave
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {editorSettings.autoSave ? 'On' : 'Off'}
                </button>
              </div>
              
              <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                <span className={`text-sm ${textSecondary}`}>Bracket Pair Colorization</span>
                <button
                  onClick={() => setEditorSettings({ bracketPairColorization: !editorSettings.bracketPairColorization })}
                  className={`text-sm px-4 py-1.5 font-medium rounded transition-colors ${
                    editorSettings.bracketPairColorization
                      ? 'bg-vscode-accent text-white'
                      : `${isDarkTheme(theme) ? 'bg-vscode-bg border border-vscode-border' : theme === 'high-contrast' ? 'bg-black border-2 border-white' : 'bg-gray-100 border border-gray-300'} ${textMuted}`
                  }`}
                >
                  {editorSettings.bracketPairColorization ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* AI Tab */}
        {activeTab === 'ai' && (
          <div>
            <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>AI Configuration</h3>
            <div className="space-y-2">
              <div className={`p-3 ${bgCard} space-y-2`}>
                <label className={`text-sm ${textSecondary} block mb-2`}>AI Provider</label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const provider = e.target.value as AIProviderKey;
                    const models = AI_PROVIDERS[provider]?.models || [];
                    setAiConfig({ 
                      provider: provider as any, 
                      model: models[0] || '' 
                    });
                  }}
                  className={`w-full ${selectBg} text-sm px-3 py-2 focus:outline-none focus:border-vscode-accent`}
                >
                  {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                    <option key={key} value={key}>
                      {provider.icon} {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={`p-3 ${bgCard} space-y-2`}>
                <label className={`text-sm ${textSecondary} block mb-2`}>Model</label>
                <select
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ model: e.target.value })}
                  className={`w-full ${selectBg} text-sm px-3 py-2 focus:outline-none focus:border-vscode-accent font-mono`}
                >
                  {currentProvider.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`p-3 ${bgCard} space-y-2`}>
                <div className="flex items-center justify-between">
                  <label className={`text-sm ${textSecondary}`}>Temperature</label>
                  <span className={`text-sm ${isDarkTheme(theme) ? 'text-vscode-accent' : theme === 'high-contrast' ? 'text-white' : 'text-blue-600'} font-mono`}>
                    {aiConfig.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={aiConfig.temperature}
                  onChange={(e) => setAiConfig({ temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className={`text-xs ${textMuted}`}>Controls randomness (0 = focused, 2 = creative)</p>
              </div>

              <div className={`p-3 ${bgCard} space-y-2`}>
                <div className="flex items-center justify-between">
                  <label className={`text-sm ${textSecondary}`}>Max Tokens</label>
                  <span className={`text-sm ${isDarkTheme(theme) ? 'text-vscode-accent' : theme === 'high-contrast' ? 'text-white' : 'text-blue-600'} font-mono`}>
                    {aiConfig.maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
                  value={aiConfig.maxTokens}
                  onChange={(e) => setAiConfig({ maxTokens: parseInt(e.target.value) })}
                  className="w-full"
                />
                <p className={`text-xs ${textMuted}`}>Maximum response length</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Debug Tab */}
        {activeTab === 'debug' && (
          <div className="space-y-6">
            <div>
              <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>Debug Server</h3>
              <div className="space-y-2">
                <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${debugConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className={`text-sm ${textSecondary}`}>Server Status</span>
                  </div>
                  <span className={`text-sm font-medium ${debugConnected ? 'text-green-400' : textMuted}`}>
                    {debugConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                <div className={`p-3 ${bgCard}`}>
                  <label className={`text-sm ${textSecondary} block mb-2`}>Server URL</label>
                  <input
                    type="text"
                    value={debugConfig.url}
                    onChange={(e) => setDebugConfig({ ...debugConfig, url: e.target.value })}
                    className={`w-full ${inputBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                    placeholder="http://localhost:4002"
                  />
                </div>
                
                <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                  <span className={`text-sm ${textSecondary}`}>Enable Real-time Debugging</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debugConfig.enabled}
                      onChange={(e) => {
                        const newConfig = { ...debugConfig, enabled: e.target.checked };
                        setDebugConfig(newConfig);
                        debuggingService.updateServerConfig(newConfig);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vscode-accent"></div>
                  </label>
                </div>
                
                <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                  <span className={`text-sm ${textSecondary}`}>Auto-connect on startup</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debugConfig.autoConnect}
                      onChange={(e) => {
                        const newConfig = { ...debugConfig, autoConnect: e.target.checked };
                        setDebugConfig(newConfig);
                        debuggingService.updateServerConfig(newConfig);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vscode-accent"></div>
                  </label>
                </div>
                
                <div className={`flex gap-2 p-3 ${bgCard}`}>
                  <button
                    onClick={() => {
                      debuggingService.updateServerConfig(debugConfig);
                      debuggingService.connectToServer();
                      setTimeout(() => setDebugConnected(debuggingService.isConnected()), 1000);
                    }}
                    disabled={debugConnected}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded ${
                      debugConnected 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    Connect
                  </button>
                  <button
                    onClick={() => {
                      debuggingService.disconnectFromServer();
                      setDebugConnected(false);
                    }}
                    disabled={!debugConnected}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded ${
                      !debugConnected 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>Debug Preferences</h3>
              <div className="space-y-2">
                <div className={`p-3 ${bgCard}`}>
                  <label className={`text-sm ${textSecondary} block mb-2`}>Reconnect Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={debugConfig.reconnectAttempts}
                    onChange={(e) => setDebugConfig({ ...debugConfig, reconnectAttempts: parseInt(e.target.value) || 5 })}
                    className={`w-full ${inputBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                  />
                </div>
                
                <div className={`p-3 ${bgCard}`}>
                  <label className={`text-sm ${textSecondary} block mb-2`}>Reconnect Delay (ms)</label>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    step="100"
                    value={debugConfig.reconnectDelay}
                    onChange={(e) => setDebugConfig({ ...debugConfig, reconnectDelay: parseInt(e.target.value) || 1000 })}
                    className={`w-full ${inputBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                  />
                </div>
              </div>
            </div>
            
            <div className={`p-4 ${bgCard} rounded-lg`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🐛</span>
                <h4 className={`font-medium ${textPrimary}`}>About Debug Server</h4>
              </div>
              <p className={`text-sm ${textMuted} mb-2`}>
                The debug server enables real-time debugging with support for multiple languages including JavaScript, TypeScript, Python, and Go.
              </p>
              <p className={`text-xs ${textMuted}`}>
                Start the debug server: <code className="bg-gray-800 px-2 py-0.5 rounded">node server/debug-server.js</code>
              </p>
            </div>
          </div>
        )}
        
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div>
              <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>Task Runner Server</h3>
              <div className="space-y-2">
                <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${taskConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className={`text-sm ${textSecondary}`}>Server Status</span>
                  </div>
                  <span className={`text-sm font-medium ${taskConnected ? 'text-green-400' : textMuted}`}>
                    {taskConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                <div className={`p-3 ${bgCard}`}>
                  <label className={`text-sm ${textSecondary} block mb-2`}>Server URL</label>
                  <input
                    type="text"
                    value={taskConfig.url}
                    onChange={(e) => setTaskConfig({ ...taskConfig, url: e.target.value })}
                    className={`w-full ${inputBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                    placeholder="http://localhost:4003"
                  />
                </div>
                
                <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                  <span className={`text-sm ${textSecondary}`}>Enable Real-time Task Execution</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskConfig.enabled}
                      onChange={(e) => {
                        const newConfig = { ...taskConfig, enabled: e.target.checked };
                        setTaskConfig(newConfig);
                        taskRunnerService.updateServerConfig(newConfig);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vscode-accent"></div>
                  </label>
                </div>
                
                <div className={`flex items-center justify-between p-3 ${bgCard}`}>
                  <span className={`text-sm ${textSecondary}`}>Auto-connect on startup</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskConfig.autoConnect}
                      onChange={(e) => {
                        const newConfig = { ...taskConfig, autoConnect: e.target.checked };
                        setTaskConfig(newConfig);
                        taskRunnerService.updateServerConfig(newConfig);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vscode-accent"></div>
                  </label>
                </div>
                
                <div className={`flex gap-2 p-3 ${bgCard}`}>
                  <button
                    onClick={() => {
                      taskRunnerService.updateServerConfig(taskConfig);
                      taskRunnerService.connectToServer();
                      setTimeout(() => setTaskConnected(taskRunnerService.isConnected()), 1000);
                    }}
                    disabled={taskConnected}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded ${
                      taskConnected 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    Connect
                  </button>
                  <button
                    onClick={() => {
                      taskRunnerService.disconnectFromServer();
                      setTaskConnected(false);
                    }}
                    disabled={!taskConnected}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded ${
                      !taskConnected 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className={`text-xs font-semibold ${textPrimary} mb-3 uppercase tracking-wide border-b ${borderColor} pb-2`}>Task Preferences</h3>
              <div className="space-y-2">
                <div className={`p-3 ${bgCard}`}>
                  <label className={`text-sm ${textSecondary} block mb-2`}>Reconnect Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={taskConfig.reconnectAttempts}
                    onChange={(e) => setTaskConfig({ ...taskConfig, reconnectAttempts: parseInt(e.target.value) || 5 })}
                    className={`w-full ${inputBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                  />
                </div>
                
                <div className={`p-3 ${bgCard}`}>
                  <label className={`text-sm ${textSecondary} block mb-2`}>Reconnect Delay (ms)</label>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    step="100"
                    value={taskConfig.reconnectDelay}
                    onChange={(e) => setTaskConfig({ ...taskConfig, reconnectDelay: parseInt(e.target.value) || 1000 })}
                    className={`w-full ${inputBg} text-sm px-3 py-1.5 focus:outline-none focus:border-vscode-accent`}
                  />
                </div>
              </div>
            </div>
            
            <div className={`p-4 ${bgCard} rounded-lg`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🚀</span>
                <h4 className={`font-medium ${textPrimary}`}>About Task Runner Server</h4>
              </div>
              <p className={`text-sm ${textMuted} mb-2`}>
                The task runner server enables real-time task execution with support for npm, yarn, pnpm, build tools, test frameworks, and linters.
              </p>
              <p className={`text-xs ${textMuted}`}>
                Start the task server: <code className="bg-gray-800 px-2 py-0.5 rounded">node server/task-runner-server.js</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
