import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import debuggingService, {
  DebugSession,
  Breakpoint,
  StackFrame,
  Variable,
  Scope,
  WatchExpression,
  DebugConsoleMessage,
  DebugAdapter,
  DebugConfiguration,
  ExceptionBreakpoint,
} from '../services/debugging';

type DebugTab = 'variables' | 'watch' | 'callstack' | 'breakpoints' | 'console';

export const DebugPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DebugTab>('variables');
  const [session, setSession] = useState<DebugSession | undefined>(debuggingService.getActiveSession());
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(debuggingService.getBreakpoints());
  const [exceptionBreakpoints, setExceptionBreakpoints] = useState<ExceptionBreakpoint[]>(debuggingService.getExceptionBreakpoints());
  const [expandedVars, setExpandedVars] = useState<Set<number>>(new Set());
  const [expandedWatches, setExpandedWatches] = useState<Set<string>>(new Set());
  const [newWatchExpr, setNewWatchExpr] = useState('');
  const [consoleInput, setConsoleInput] = useState('');
  const [showConfigurations, setShowConfigurations] = useState(false);
  const [selectedAdapter, setSelectedAdapter] = useState<DebugAdapter | null>(null);
  const [isConnected, setIsConnected] = useState(debuggingService.isConnected());
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to debug events
    const unsubscribe = debuggingService.on('*', () => {
      setSession({ ...debuggingService.getActiveSession()! });
      setBreakpoints([...debuggingService.getBreakpoints()]);
    });

    // Check connection status periodically
    const interval = setInterval(() => {
      setIsConnected(debuggingService.isConnected());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Auto-scroll console
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.consoleMessages.length]);

  const tabs: { id: DebugTab; label: string; icon: string }[] = [
    { id: 'variables', label: 'Variables', icon: '📦' },
    { id: 'watch', label: 'Watch', icon: '👁️' },
    { id: 'callstack', label: 'Call Stack', icon: '📚' },
    { id: 'breakpoints', label: 'Breakpoints', icon: '🔴' },
    { id: 'console', label: 'Console', icon: '💻' },
  ];

  const handleStartDebug = async (config: DebugConfiguration) => {
    try {
      await debuggingService.createSession(config);
      setSession(debuggingService.getActiveSession());
      setShowConfigurations(false);
    } catch (error: any) {
      console.error('Failed to start debug session:', error);
    }
  };

  const handleStopDebug = async () => {
    if (session) {
      await debuggingService.terminateSession(session.id);
      setSession(undefined);
    }
  };

  const handleContinue = () => debuggingService.continue();
  const handlePause = () => debuggingService.pause();
  const handleStepOver = () => debuggingService.stepOver();
  const handleStepInto = () => debuggingService.stepInto();
  const handleStepOut = () => debuggingService.stepOut();
  const handleRestart = () => debuggingService.restart();

  const handleAddWatch = () => {
    if (newWatchExpr.trim()) {
      debuggingService.addWatchExpression(newWatchExpr.trim());
      setNewWatchExpr('');
      setSession({ ...debuggingService.getActiveSession()! });
    }
  };

  const handleRemoveWatch = (id: string) => {
    debuggingService.removeWatchExpression(id);
    setSession({ ...debuggingService.getActiveSession()! });
  };

  const handleConsoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleInput.trim() || !session) return;

    try {
      await debuggingService.evaluateInConsole(session.id, consoleInput.trim());
      setConsoleInput('');
      setSession({ ...debuggingService.getActiveSession()! });
    } catch (error) {
      // Error already logged to console
    }
  };

  const handleToggleBreakpoint = (id: string) => {
    debuggingService.toggleBreakpoint(id);
    setBreakpoints([...debuggingService.getBreakpoints()]);
  };

  const handleRemoveBreakpoint = (id: string) => {
    debuggingService.removeBreakpoint(id);
    setBreakpoints([...debuggingService.getBreakpoints()]);
  };

  const handleToggleExceptionBreakpoint = (filter: string) => {
    debuggingService.toggleExceptionBreakpoint(filter);
    setExceptionBreakpoints([...debuggingService.getExceptionBreakpoints()]);
  };

  const toggleVarExpand = async (ref: number) => {
    const newExpanded = new Set(expandedVars);
    if (newExpanded.has(ref)) {
      newExpanded.delete(ref);
    } else {
      newExpanded.add(ref);
      // Fetch children if needed
      await debuggingService.getVariables(ref);
    }
    setExpandedVars(newExpanded);
  };

  const toggleWatchExpand = (id: string) => {
    const newExpanded = new Set(expandedWatches);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedWatches(newExpanded);
  };

  const renderVariable = (variable: Variable, depth: number = 0): React.ReactNode => {
    const hasChildren = variable.variablesReference > 0;
    const isExpanded = expandedVars.has(variable.variablesReference);

    return (
      <div key={`${variable.name}-${depth}`}>
        <div
          className={`flex items-center gap-1 py-0.5 px-2 hover:bg-[#2a2d2e] cursor-pointer text-xs`}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => hasChildren && toggleVarExpand(variable.variablesReference)}
        >
          {hasChildren ? (
            <span className="text-gray-400 w-3">
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="w-3" />
          )}
          <span className="text-[#9cdcfe]">{variable.name}</span>
          <span className="text-gray-500">:</span>
          <span className={getValueColor(variable.type)}>{variable.value}</span>
          {variable.type && (
            <span className="text-gray-600 ml-1 text-[10px]">{variable.type}</span>
          )}
        </div>
        {isExpanded && variable.children && (
          <div>
            {variable.children.map(child => renderVariable(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const getValueColor = (type?: string): string => {
    switch (type) {
      case 'string': return 'text-[#ce9178]';
      case 'number': return 'text-[#b5cea8]';
      case 'boolean': return 'text-[#569cd6]';
      case 'null':
      case 'undefined': return 'text-[#808080]';
      case 'function': return 'text-[#dcdcaa]';
      default: return 'text-[#4fc1ff]';
    }
  };

  const renderScope = (scope: Scope): React.ReactNode => (
    <div key={scope.name} className="mb-2">
      <div className="flex items-center gap-2 px-2 py-1 bg-[#2d2d2d] text-xs font-medium text-gray-300">
        <span>📁</span>
        <span>{scope.name}</span>
        {scope.expensive && <span className="text-yellow-500 text-[10px]">(expensive)</span>}
      </div>
      <div>
        {scope.variables?.map(v => renderVariable(v, 0))}
      </div>
    </div>
  );

  const renderWatchExpression = (watch: WatchExpression): React.ReactNode => {
    const hasChildren = watch.children && watch.children.length > 0;
    const isExpanded = expandedWatches.has(watch.id);

    return (
      <div key={watch.id} className="border-b border-[#3c3c3c]">
        <div className="flex items-center gap-1 py-1 px-2 hover:bg-[#2a2d2e] group">
          {hasChildren ? (
            <button
              onClick={() => toggleWatchExpand(watch.id)}
              className="text-gray-400 w-3 text-xs"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-3" />
          )}
          <span className="text-[#dcdcaa] text-xs">{watch.expression}</span>
          <span className="text-gray-500 text-xs">=</span>
          {watch.error ? (
            <span className="text-red-400 text-xs">{watch.error}</span>
          ) : (
            <span className={`text-xs ${getValueColor(watch.type)}`}>{watch.value || 'undefined'}</span>
          )}
          <button
            onClick={() => handleRemoveWatch(watch.id)}
            className="ml-auto opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs"
          >
            ✕
          </button>
        </div>
        {isExpanded && watch.children && (
          <div className="pl-4">
            {watch.children.map(v => renderVariable(v, 1))}
          </div>
        )}
      </div>
    );
  };

  const renderStackFrame = (frame: StackFrame, isActive: boolean): React.ReactNode => (
    <div
      key={frame.id}
      className={`flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-[#2a2d2e] ${
        isActive ? 'bg-[#094771] hover:bg-[#094771]' : ''
      }`}
    >
      <span className={isActive ? 'text-yellow-400' : 'text-gray-500'}>→</span>
      <span className="text-[#dcdcaa]">{frame.name}</span>
      <span className="text-gray-500">@</span>
      <span className="text-[#4fc1ff]">{frame.source.name}</span>
      <span className="text-gray-600">:{frame.line}</span>
    </div>
  );

  const renderBreakpoint = (bp: Breakpoint): React.ReactNode => (
    <div
      key={bp.id}
      className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-[#2a2d2e] group"
    >
      <button
        onClick={() => handleToggleBreakpoint(bp.id)}
        className={`w-3 h-3 rounded-full ${
          bp.enabled ? 'bg-red-500' : 'bg-gray-600'
        } ${!bp.verified ? 'opacity-50' : ''}`}
      />
      <span className="text-[#4fc1ff]">{bp.file.split('/').pop()}</span>
      <span className="text-gray-600">:{bp.line}</span>
      {bp.condition && (
        <span className="text-yellow-500 text-[10px]">({bp.condition})</span>
      )}
      {bp.logMessage && (
        <span className="text-purple-400 text-[10px]">📝</span>
      )}
      {bp.hitCount > 0 && (
        <span className="text-gray-500 text-[10px]">×{bp.hitCount}</span>
      )}
      <button
        onClick={() => handleRemoveBreakpoint(bp.id)}
        className="ml-auto opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );

  const renderConsoleMessage = (msg: DebugConsoleMessage): React.ReactNode => {
    const typeStyles: Record<string, string> = {
      input: 'text-blue-400 before:content-[">"] before:mr-2',
      output: 'text-gray-300',
      error: 'text-red-400',
      warning: 'text-yellow-400',
      info: 'text-blue-300',
      debug: 'text-gray-500',
    };

    return (
      <div
        key={msg.id}
        className={`px-2 py-0.5 text-xs font-mono ${typeStyles[msg.type]} hover:bg-[#2a2d2e]`}
      >
        {msg.source && (
          <span className="text-gray-600 mr-2">
            {msg.source.split('/').pop()}:{msg.line}
          </span>
        )}
        <span>{msg.message}</span>
      </div>
    );
  };

  const renderConfigurationSelector = (): React.ReactNode => {
    const adapters = debuggingService.getAdapters();

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-full left-0 right-0 z-50 bg-[#252526] border border-[#3c3c3c] rounded-b-lg shadow-xl max-h-96 overflow-auto"
      >
        <div className="p-3">
          <h3 className="text-sm font-medium text-white mb-3">Select Debug Configuration</h3>
          
          {/* Adapter Selection */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {adapters.map(adapter => (
              <button
                key={adapter.id}
                onClick={() => setSelectedAdapter(adapter)}
                className={`flex flex-col items-center gap-1 p-2 rounded text-xs transition-colors ${
                  selectedAdapter?.id === adapter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#3c3c3c] text-gray-300 hover:bg-[#4c4c4c]'
                }`}
              >
                <span className="text-lg">{adapter.icon}</span>
                <span className="truncate w-full text-center">{adapter.language}</span>
              </button>
            ))}
          </div>

          {/* Configurations for selected adapter */}
          {selectedAdapter && (
            <div>
              <h4 className="text-xs text-gray-400 mb-2">Configurations for {selectedAdapter.name}</h4>
              <div className="space-y-1">
                {debuggingService.getDefaultConfigurations(selectedAdapter.language).map((config, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStartDebug(config)}
                    className="w-full flex items-center gap-2 p-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-xs text-left"
                  >
                    <span className="text-green-400">▶</span>
                    <span className="text-white">{config.name}</span>
                    <span className="text-gray-500 ml-auto">{config.request}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Adapter capabilities */}
          {selectedAdapter && (
            <div className="mt-3 pt-3 border-t border-[#3c3c3c]">
              <h4 className="text-xs text-gray-400 mb-2">Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {selectedAdapter.supportsBreakpoints && (
                  <span className="px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-[10px]">Breakpoints</span>
                )}
                {selectedAdapter.supportsConditionalBreakpoints && (
                  <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded text-[10px]">Conditional</span>
                )}
                {selectedAdapter.supportsLogPoints && (
                  <span className="px-2 py-0.5 bg-purple-900/50 text-purple-400 rounded text-[10px]">Log Points</span>
                )}
                {selectedAdapter.supportsHitCount && (
                  <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 rounded text-[10px]">Hit Count</span>
                )}
                {selectedAdapter.supportsExceptionBreakpoints && (
                  <span className="px-2 py-0.5 bg-red-900/50 text-red-400 rounded text-[10px]">Exceptions</span>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white">
      {/* Debug Controls Header */}
      <div className="relative flex items-center gap-1 px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        {/* Connection status indicator */}
        <div className="flex items-center gap-1 mr-2" title={isConnected ? 'Connected to debug server' : 'Using simulation mode'}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-orange-400'}`} />
          <span className="text-[10px] text-gray-500">{isConnected ? 'Live' : 'Sim'}</span>
        </div>
        
        {/* Session selector / Start button */}
        {session ? (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              session.status === 'running' ? 'bg-green-500 animate-pulse' :
              session.status === 'paused' ? 'bg-yellow-500' :
              session.status === 'initializing' ? 'bg-blue-500 animate-pulse' :
              'bg-gray-500'
            }`} />
            <span className="text-xs text-gray-300">{session.name}</span>
            <span className="text-[10px] text-gray-500">({session.adapter.icon} {session.adapter.language})</span>
          </div>
        ) : (
          <button
            onClick={() => setShowConfigurations(!showConfigurations)}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium"
          >
            <span>▶</span>
            <span>Start Debugging</span>
          </button>
        )}

        {/* Debug control buttons */}
        {session && (
          <div className="flex items-center gap-1 ml-auto">
            {session.status === 'paused' ? (
              <button
                onClick={handleContinue}
                className="p-1.5 hover:bg-[#3c3c3c] rounded text-green-400"
                title="Continue (F5)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="p-1.5 hover:bg-[#3c3c3c] rounded text-yellow-400"
                title="Pause (F6)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </button>
            )}

            <button
              onClick={handleStepOver}
              disabled={session.status !== 'paused'}
              className="p-1.5 hover:bg-[#3c3c3c] rounded text-blue-400 disabled:opacity-30"
              title="Step Over (F10)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="18" r="3" />
                <path d="M5 6h14M19 6l-4 4M19 6l-4-4" />
              </svg>
            </button>

            <button
              onClick={handleStepInto}
              disabled={session.status !== 'paused'}
              className="p-1.5 hover:bg-[#3c3c3c] rounded text-blue-400 disabled:opacity-30"
              title="Step Into (F11)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="18" r="3" />
                <path d="M12 3v9M12 12l-4-4M12 12l4-4" />
              </svg>
            </button>

            <button
              onClick={handleStepOut}
              disabled={session.status !== 'paused'}
              className="p-1.5 hover:bg-[#3c3c3c] rounded text-blue-400 disabled:opacity-30"
              title="Step Out (Shift+F11)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="6" r="3" />
                <path d="M12 21v-9M12 12l-4 4M12 12l4 4" />
              </svg>
            </button>

            <div className="w-px h-4 bg-[#3c3c3c] mx-1" />

            <button
              onClick={handleRestart}
              className="p-1.5 hover:bg-[#3c3c3c] rounded text-green-400"
              title="Restart (Ctrl+Shift+F5)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            </button>

            <button
              onClick={handleStopDebug}
              className="p-1.5 hover:bg-[#3c3c3c] rounded text-red-400"
              title="Stop (Shift+F5)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          </div>
        )}

        {/* Configuration dropdown */}
        <AnimatePresence>
          {showConfigurations && renderConfigurationSelector()}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#3c3c3c] bg-[#252526]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {/* Variables tab */}
        {activeTab === 'variables' && (
          <div className="p-0">
            {session && session.status === 'paused' ? (
              session.scopes.length > 0 ? (
                session.scopes.map(scope => renderScope(scope))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No variables in current scope
                </div>
              )
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                {session ? 'Pause execution to inspect variables' : 'Start a debug session to inspect variables'}
              </div>
            )}
          </div>
        )}

        {/* Watch tab */}
        {activeTab === 'watch' && (
          <div>
            {/* Add watch input */}
            <div className="flex items-center gap-2 p-2 border-b border-[#3c3c3c]">
              <input
                type="text"
                value={newWatchExpr}
                onChange={(e) => setNewWatchExpr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWatch()}
                placeholder="Add expression to watch..."
                className="flex-1 bg-[#3c3c3c] text-white text-xs px-2 py-1 rounded outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleAddWatch}
                disabled={!newWatchExpr.trim()}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs"
              >
                Add
              </button>
            </div>

            {/* Watch expressions */}
            <div>
              {session?.watchExpressions.map(watch => renderWatchExpression(watch))}
              {(!session?.watchExpressions || session.watchExpressions.length === 0) && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No watch expressions. Add an expression above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Call Stack tab */}
        {activeTab === 'callstack' && (
          <div>
            {session && session.status === 'paused' && session.callStack.length > 0 ? (
              <>
                {/* Threads */}
                {session.threads.map(thread => (
                  <div key={thread.id}>
                    <div className="flex items-center gap-2 px-2 py-1 bg-[#2d2d2d] text-xs">
                      <span className={`w-2 h-2 rounded-full ${
                        thread.status === 'running' ? 'bg-green-500' :
                        thread.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                      <span className="text-white font-medium">{thread.name}</span>
                      <span className="text-gray-500">(ID: {thread.id})</span>
                    </div>
                    {session.callStack.map(frame => 
                      renderStackFrame(frame, frame.id === session.activeFrameId)
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                {session ? 'Pause execution to see call stack' : 'Start a debug session to see call stack'}
              </div>
            )}
          </div>
        )}

        {/* Breakpoints tab */}
        {activeTab === 'breakpoints' && (
          <div>
            {/* Exception breakpoints */}
            <div className="border-b border-[#3c3c3c]">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[#2d2d2d] text-xs font-medium text-gray-300">
                <span>⚠️</span>
                <span>Exception Breakpoints</span>
              </div>
              {exceptionBreakpoints.map(eb => (
                <div
                  key={eb.filter}
                  className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-[#2a2d2e] cursor-pointer"
                  onClick={() => handleToggleExceptionBreakpoint(eb.filter)}
                >
                  <input
                    type="checkbox"
                    checked={eb.enabled}
                    onChange={() => {}}
                    className="w-3 h-3 rounded"
                  />
                  <span className="text-gray-300">{eb.label}</span>
                </div>
              ))}
            </div>

            {/* Regular breakpoints */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[#2d2d2d] text-xs font-medium text-gray-300">
                <span>🔴</span>
                <span>Breakpoints ({breakpoints.length})</span>
                {breakpoints.length > 0 && (
                  <button
                    onClick={() => debuggingService.clearAllBreakpoints()}
                    className="ml-auto text-gray-500 hover:text-red-400"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {breakpoints.length > 0 ? (
                breakpoints.map(bp => renderBreakpoint(bp))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No breakpoints set. Click in the editor gutter to add one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Console tab */}
        {activeTab === 'console' && (
          <div className="h-full flex flex-col">
            {/* Console messages */}
            <div className="flex-1 overflow-auto font-mono">
              {session?.consoleMessages.map(msg => renderConsoleMessage(msg))}
              {(!session?.consoleMessages || session.consoleMessages.length === 0) && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Debug console is empty
                </div>
              )}
              <div ref={consoleEndRef} />
            </div>

            {/* Console input */}
            <form onSubmit={handleConsoleSubmit} className="border-t border-[#3c3c3c]">
              <div className="flex items-center">
                <span className="px-2 text-blue-400 text-xs">&gt;</span>
                <input
                  type="text"
                  value={consoleInput}
                  onChange={(e) => setConsoleInput(e.target.value)}
                  placeholder={session?.status === 'paused' ? 'Evaluate expression...' : 'Start debugging to use console'}
                  disabled={!session || session.status !== 'paused'}
                  className="flex-1 bg-transparent text-white text-xs py-2 outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => debuggingService.clearConsole()}
                  className="px-2 text-gray-500 hover:text-white text-xs"
                  title="Clear console"
                >
                  🗑️
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Status bar */}
      {session && (
        <div className="flex items-center justify-between px-3 py-1 bg-[#007acc] text-white text-xs">
          <div className="flex items-center gap-2">
            <span>{session.adapter.icon}</span>
            <span>{session.adapter.name}</span>
            <span className="opacity-70">|</span>
            <span className="capitalize">{session.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Breakpoints: {breakpoints.filter(b => b.enabled).length}</span>
            <span className="opacity-70">|</span>
            <span>Threads: {session.threads.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
