import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import electronService, { WindowStateInfo, ProcessInfo } from '../services/electron';
import wasmTextEngine, { TextBuffer, RenderMetrics } from '../services/wasmTextEngine';
import lspService, { LanguageServer, LanguageCapabilities } from '../services/lspService';
import cliService, { CLITool, CLICommand } from '../services/cliTools';

type TabType = 'electron' | 'wasm' | 'lsp' | 'cli' | 'protocols';

export const TechStackPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('electron');
  const [windowState, setWindowState] = useState<WindowStateInfo>(electronService.getWindowState());
  const [processes, setProcesses] = useState<ProcessInfo[]>(electronService.getProcesses());
  const [renderMetrics, setRenderMetrics] = useState<RenderMetrics | null>(null);
  const [languageServers, setLanguageServers] = useState<LanguageServer[]>(lspService.getServers());
  const [cliTools, setCliTools] = useState<CLITool[]>(cliService.getTools());
  const [selectedServer, setSelectedServer] = useState<LanguageServer | null>(null);
  const [selectedTool, setSelectedTool] = useState<CLITool | null>(null);
  const [commandOutput, setCommandOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const unsubscribeElectron = electronService.on('*', (event) => {
      if (event.type.includes('window')) {
        setWindowState(electronService.getWindowState());
      }
      setProcesses(electronService.getProcesses());
    });

    const unsubscribeLsp = lspService.on('*', () => {
      setLanguageServers([...lspService.getServers()]);
    });

    const unsubscribeCli = cliService.on('*', () => {
      setCliTools([...cliService.getTools()]);
    });

    // Test WASM engine
    testWasmEngine();

    return () => {
      unsubscribeElectron();
      unsubscribeLsp();
      unsubscribeCli();
    };
  }, []);

  const testWasmEngine = async () => {
    const buffer = wasmTextEngine.createBuffer('test-buffer', 'Sample text for performance testing.\nLine 2\nLine 3');
    if (buffer) {
      const metrics = wasmTextEngine.render(buffer.id, { startLine: 0, endLine: 3, viewportWidth: 800 });
      setRenderMetrics(metrics);
    }
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'electron', label: 'Electron', icon: '⚡' },
    { id: 'wasm', label: 'WebAssembly', icon: '🔧' },
    { id: 'lsp', label: 'LSP', icon: '📡' },
    { id: 'cli', label: 'CLI Tools', icon: '💻' },
    { id: 'protocols', label: 'Protocols', icon: '🔌' },
  ];

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'available':
        return 'text-green-400';
      case 'starting':
      case 'connecting':
        return 'text-yellow-400';
      case 'stopped':
      case 'disconnected':
      case 'unavailable':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusDot = (status: string): string => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'available':
        return 'bg-green-500';
      case 'starting':
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  const handleStartServer = async (serverId: string) => {
    await lspService.startServer(serverId);
    setLanguageServers([...lspService.getServers()]);
  };

  const handleStopServer = async (serverId: string) => {
    await lspService.stopServer(serverId);
    setLanguageServers([...lspService.getServers()]);
  };

  const handleExecuteCommand = async (toolId: string, commandId: string) => {
    setIsExecuting(true);
    setCommandOutput('');
    
    try {
      const result = await cliService.executeCommand(toolId, commandId, []);
      setCommandOutput(result.output.join('\n'));
    } catch (error: any) {
      setCommandOutput(`Error: ${error.message}`);
    }
    
    setIsExecuting(false);
  };

  const handleInstallTool = async (toolId: string) => {
    await cliService.installTool(toolId);
    setCliTools([...cliService.getTools()]);
  };

  return (
    <div className="h-full flex flex-col bg-vscode-sidebar text-vscode-text">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛠</span>
          <span className="font-medium text-sm">Tech Stack</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>TypeScript + Rust + WASM</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-vscode-border bg-vscode-panel overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-vscode-text border-b-2 border-vscode-accent bg-vscode-bg'
                : 'text-vscode-textMuted hover:text-vscode-text'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {/* Electron Tab */}
        {activeTab === 'electron' && (
          <div className="p-3 space-y-4">
            {/* Window State */}
            <div className="bg-vscode-panel rounded-lg p-3">
              <h3 className="text-sm font-medium text-vscode-text mb-3 flex items-center gap-2">
                <span>🪟</span> Window State
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-vscode-textMuted">Size</div>
                  <div className="text-vscode-text">{windowState.width} × {windowState.height}</div>
                </div>
                <div>
                  <div className="text-vscode-textMuted">Position</div>
                  <div className="text-vscode-text">({windowState.x}, {windowState.y})</div>
                </div>
                <div>
                  <div className="text-vscode-textMuted">State</div>
                  <div className="text-vscode-text capitalize">
                    {windowState.isMaximized ? 'Maximized' : 
                     windowState.isMinimized ? 'Minimized' : 
                     windowState.isFullScreen ? 'Fullscreen' : 'Normal'}
                  </div>
                </div>
                <div>
                  <div className="text-vscode-textMuted">Focused</div>
                  <div className={windowState.isFocused ? 'text-green-400' : 'text-vscode-textMuted'}>
                    {windowState.isFocused ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => electronService.minimizeWindow()}
                  className="px-2 py-1 bg-vscode-hover hover:bg-vscode-active rounded text-xs"
                >
                  Minimize
                </button>
                <button
                  onClick={() => electronService.maximizeWindow()}
                  className="px-2 py-1 bg-vscode-hover hover:bg-vscode-active rounded text-xs"
                >
                  Maximize
                </button>
                <button
                  onClick={() => electronService.toggleFullScreen()}
                  className="px-2 py-1 bg-vscode-hover hover:bg-vscode-active rounded text-xs"
                >
                  Fullscreen
                </button>
              </div>
            </div>

            {/* Processes */}
            <div className="bg-vscode-panel rounded-lg p-3">
              <h3 className="text-sm font-medium text-vscode-text mb-3 flex items-center gap-2">
                <span>⚙️</span> Processes
              </h3>
              <div className="space-y-2">
                {processes.map(proc => (
                  <div key={proc.pid} className="flex items-center justify-between p-2 bg-vscode-bg rounded">
                    <div>
                      <div className="text-xs text-vscode-text">{proc.type}</div>
                      <div className="text-[10px] text-vscode-textMuted">PID: {proc.pid}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-vscode-textMuted">CPU: {proc.cpu.toFixed(1)}%</div>
                      <div className="text-vscode-textMuted">MEM: {formatBytes(proc.memory)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IPC Stats */}
            <div className="bg-vscode-panel rounded-lg p-3">
              <h3 className="text-sm font-medium text-vscode-text mb-3 flex items-center gap-2">
                <span>📨</span> IPC Communication
              </h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-vscode-bg rounded text-center">
                  <div className="text-xl font-bold text-blue-400">1,247</div>
                  <div className="text-vscode-textMuted">Messages</div>
                </div>
                <div className="p-2 bg-vscode-bg rounded text-center">
                  <div className="text-xl font-bold text-green-400">0.8ms</div>
                  <div className="text-vscode-textMuted">Avg Latency</div>
                </div>
                <div className="p-2 bg-vscode-bg rounded text-center">
                  <div className="text-xl font-bold text-purple-400">12</div>
                  <div className="text-vscode-textMuted">Channels</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WebAssembly Tab */}
        {activeTab === 'wasm' && (
          <div className="p-3 space-y-4">
            {/* WASM Status */}
            <div className="bg-[#252526] rounded-lg p-3">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span>🔧</span> WebAssembly Text Engine
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${wasmTextEngine.isReady() ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                <span className={`text-xs ${wasmTextEngine.isReady() ? 'text-green-400' : 'text-yellow-400'}`}>
                  {wasmTextEngine.isReady() ? 'Ready' : 'Initializing...'}
                </span>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>• Rust-compiled text buffer operations</div>
                <div>• O(log n) line access via rope data structure</div>
                <div>• SIMD-accelerated text search</div>
                <div>• Zero-copy memory sharing with JS</div>
              </div>
            </div>

            {/* Render Metrics */}
            {renderMetrics && (
              <div className="bg-[#252526] rounded-lg p-3">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span>📊</span> Render Performance
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-gray-500">Parse Time</div>
                    <div className="text-white">{renderMetrics.parseTime.toFixed(2)}ms</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Layout Time</div>
                    <div className="text-white">{renderMetrics.layoutTime.toFixed(2)}ms</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Render Time</div>
                    <div className="text-white">{renderMetrics.renderTime.toFixed(2)}ms</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total Time</div>
                    <div className="text-green-400">{renderMetrics.totalTime.toFixed(2)}ms</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Lines Rendered</div>
                    <div className="text-white">{renderMetrics.linesRendered}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Characters</div>
                    <div className="text-white">{renderMetrics.charactersRendered}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Memory Usage */}
            <div className="bg-[#252526] rounded-lg p-3">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span>💾</span> WASM Memory
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Allocated</span>
                  <span className="text-white">16 MB</span>
                </div>
                <div className="h-2 bg-[#3c3c3c] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>5.6 MB used</span>
                  <span>10.4 MB free</span>
                </div>
              </div>
            </div>

            {/* Buffers */}
            <div className="bg-[#252526] rounded-lg p-3">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span>📝</span> Active Buffers
              </h3>
              <div className="space-y-1">
                {wasmTextEngine.getBuffers().map(buffer => (
                  <div key={buffer.id} className="flex items-center justify-between p-2 bg-[#1e1e1e] rounded text-xs">
                    <span className="text-white truncate">{buffer.id}</span>
                    <span className="text-gray-400">{buffer.lineCount} lines</span>
                  </div>
                ))}
                {wasmTextEngine.getBuffers().length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-2">No active buffers</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LSP Tab */}
        {activeTab === 'lsp' && (
          <div className="flex flex-col h-full">
            {/* Server List */}
            <div className="flex-1 overflow-auto">
              <div className="p-2 border-b border-[#3c3c3c] bg-[#252526]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    {languageServers.filter(s => s.status === 'running').length} running
                  </span>
                  <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded">
                    + Add Server
                  </button>
                </div>
              </div>
              <div className="divide-y divide-[#3c3c3c]">
                {languageServers.map(server => (
                  <div
                    key={server.id}
                    onClick={() => setSelectedServer(server)}
                    className={`px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] ${
                      selectedServer?.id === server.id ? 'bg-[#094771]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusDot(server.status)}`} />
                      <div className="flex-1">
                        <div className="text-sm text-white">{server.name}</div>
                        <div className="text-xs text-gray-500">{server.languages.join(', ')}</div>
                      </div>
                      <div className="flex gap-1">
                        {server.status === 'stopped' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartServer(server.id); }}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                          >
                            Start
                          </button>
                        ) : server.status === 'running' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStopServer(server.id); }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                          >
                            Stop
                          </button>
                        ) : (
                          <span className="text-xs text-yellow-400 animate-pulse">Starting...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Server Details */}
            {selectedServer && (
              <div className="h-48 border-t border-[#3c3c3c] bg-[#252526] overflow-auto p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{selectedServer.name}</span>
                  <button onClick={() => setSelectedServer(null)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-500">Command:</span>
                    <span className="text-gray-300 ml-1">{selectedServer.command}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Port:</span>
                    <span className="text-gray-300 ml-1">{selectedServer.port || 'stdio'}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-1">Capabilities:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(selectedServer.capabilities).map(([key, value]) => (
                    value && (
                      <span key={key} className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded text-[10px]">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CLI Tools Tab */}
        {activeTab === 'cli' && (
          <div className="flex flex-col h-full">
            {/* Tools List */}
            <div className="flex-none max-h-48 overflow-auto border-b border-[#3c3c3c]">
              {cliTools.map(tool => (
                <div
                  key={tool.id}
                  onClick={() => setSelectedTool(tool)}
                  className={`px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] border-b border-[#3c3c3c] ${
                    selectedTool?.id === tool.id ? 'bg-[#094771]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(tool.status)}`} />
                    <div className="flex-1">
                      <div className="text-sm text-white">{tool.name}</div>
                      <div className="text-xs text-gray-500">{tool.category} • v{tool.version}</div>
                    </div>
                    {tool.status === 'unavailable' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleInstallTool(tool.id); }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                      >
                        Install
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Commands */}
            {selectedTool && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-2 bg-[#252526] border-b border-[#3c3c3c]">
                  <div className="text-sm font-medium text-white">{selectedTool.name} Commands</div>
                </div>
                <div className="flex-1 overflow-auto">
                  {selectedTool.commands.map(cmd => (
                    <div
                      key={cmd.id}
                      className="px-3 py-2 border-b border-[#3c3c3c] hover:bg-[#2a2d2e]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-white font-mono">{cmd.command}</div>
                          <div className="text-[10px] text-gray-500">{cmd.description}</div>
                        </div>
                        <button
                          onClick={() => handleExecuteCommand(selectedTool.id, cmd.id)}
                          disabled={isExecuting || selectedTool.status !== 'available'}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-xs"
                        >
                          {isExecuting ? '⏳' : '▶'} Run
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Output */}
                {commandOutput && (
                  <div className="h-32 border-t border-[#3c3c3c] bg-[#1a1a1a] overflow-auto">
                    <div className="px-2 py-1 text-xs text-gray-400 border-b border-[#3c3c3c] sticky top-0 bg-[#1a1a1a]">
                      Output
                    </div>
                    <pre className="p-2 text-xs font-mono text-gray-300 whitespace-pre-wrap">
                      {commandOutput}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {!selectedTool && (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Select a tool to view commands
              </div>
            )}
          </div>
        )}

        {/* Protocols Tab */}
        {activeTab === 'protocols' && (
          <div className="p-3 space-y-4">
            {/* LSP Protocol */}
            <div className="bg-[#252526] rounded-lg p-3">
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-blue-400">📡</span> Language Server Protocol (LSP)
              </h3>
              <div className="text-xs text-gray-400 mb-3">
                Standard protocol for language intelligence features
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Completion', 'Hover', 'Go to Definition', 'Find References', 
                  'Rename', 'Diagnostics', 'Code Actions', 'Formatting'].map(feature => (
                  <div key={feature} className="flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DAP Protocol */}
            <div className="bg-[#252526] rounded-lg p-3">
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-orange-400">🐛</span> Debug Adapter Protocol (DAP)
              </h3>
              <div className="text-xs text-gray-400 mb-3">
                Unified debugging interface for all languages
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Breakpoints', 'Step Debugging', 'Variable Inspection', 'Call Stack',
                  'Watch Expressions', 'Conditional Breaks', 'Exception Handling', 'Multi-thread'].map(feature => (
                  <div key={feature} className="flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Build Protocol */}
            <div className="bg-[#252526] rounded-lg p-3">
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-purple-400">🔨</span> Build Server Protocol (BSP)
              </h3>
              <div className="text-xs text-gray-400 mb-3">
                Standardized build tool communication
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Compile', 'Test', 'Run', 'Clean', 
                  'Dependencies', 'Resources', 'Scala Support', 'Java Support'].map(feature => (
                  <div key={feature} className="flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture */}
            <div className="bg-[#252526] rounded-lg p-3">
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <span className="text-cyan-400">🏗️</span> Architecture
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-20 text-gray-500">Frontend</span>
                  <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">React</span>
                  <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">TypeScript</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-gray-500">Runtime</span>
                  <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">Electron</span>
                  <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">Node.js</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-gray-500">Performance</span>
                  <span className="px-2 py-0.5 bg-orange-900/50 text-orange-300 rounded">Rust</span>
                  <span className="px-2 py-0.5 bg-orange-900/50 text-orange-300 rounded">WebAssembly</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-gray-500">Rendering</span>
                  <span className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded">Canvas</span>
                  <span className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded">WebGL</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-t border-[#3c3c3c] text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>⚡ Electron 28.0</span>
          <span>🔧 WASM {wasmTextEngine.isReady() ? 'Ready' : 'Loading'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📡 {languageServers.filter(s => s.status === 'running').length} LSP</span>
        </div>
      </div>
    </div>
  );
};

export default TechStackPanel;
