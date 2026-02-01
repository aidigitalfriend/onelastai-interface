/**
 * AI Extension Panel Component
 * 
 * UI for interacting with the AI Extension layer.
 * Shows action plans, history, and allows user control.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { 
  aiExtension, 
  AIActionPlan, 
  AIAction, 
  PlanExecutionResult,
  AI_TOOLS 
} from '../services/aiExtension';
import { extensionEvents } from '../services/extensions';

interface AIExtensionPanelProps {
  className?: string;
  onClose?: () => void;
}

type ViewMode = 'chat' | 'tools' | 'history';

export const AIExtensionPanel: React.FC<AIExtensionPanelProps> = ({ className = '', onClose }) => {
  const { theme } = useStore();
  const isDark = theme !== 'light';
  
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<AIActionPlan | null>(null);
  const [lastResult, setLastResult] = useState<PlanExecutionResult | null>(null);
  const [history, setHistory] = useState<Array<{ request: string; plan: AIActionPlan; result?: PlanExecutionResult }>>([]);
  const [permissionLevel, setPermissionLevel] = useState<'readonly' | 'edit' | 'full'>('edit');
  
  // Update permission level
  useEffect(() => {
    aiExtension.setPermissionLevel(permissionLevel);
  }, [permissionLevel]);
  
  // Listen for plan events
  useEffect(() => {
    const handlePlanReady = (plan: AIActionPlan) => {
      setCurrentPlan(plan);
      setIsProcessing(false);
    };
    
    const handlePlanExecuted = (result: PlanExecutionResult) => {
      setLastResult(result);
      if (currentPlan) {
        setHistory(prev => [...prev, { 
          request: input, 
          plan: currentPlan, 
          result 
        }]);
      }
      setCurrentPlan(null);
    };
    
    extensionEvents.on('ai:planReady', handlePlanReady);
    extensionEvents.on('ai:planExecuted', handlePlanExecuted);
    
    return () => {
      extensionEvents.off('ai:planReady', handlePlanReady);
      extensionEvents.off('ai:planExecuted', handlePlanExecuted);
    };
  }, [currentPlan, input]);
  
  // Submit request to AI
  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setCurrentPlan(null);
    setLastResult(null);
    
    try {
      const plan = await aiExtension.processRequest(input.trim());
      if (plan) {
        setCurrentPlan(plan);
      } else {
        // AI couldn't generate a valid plan
        setLastResult({
          planId: 'error',
          success: false,
          results: [{ actionId: 'parse', success: false, error: 'Failed to generate action plan' }],
          undoAvailable: false,
        });
      }
    } catch (error: any) {
      setLastResult({
        planId: 'error',
        success: false,
        results: [{ actionId: 'error', success: false, error: error.message }],
        undoAvailable: false,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Execute the current plan
  const handleExecute = async () => {
    if (!currentPlan) return;
    
    setIsProcessing(true);
    try {
      const result = await aiExtension.executePlan(currentPlan);
      setLastResult(result);
      setHistory(prev => [...prev, { request: input, plan: currentPlan, result }]);
      setCurrentPlan(null);
      setInput('');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Reject the current plan
  const handleReject = () => {
    setCurrentPlan(null);
    setLastResult({
      planId: currentPlan?.planId || 'rejected',
      success: false,
      results: [{ actionId: 'user', success: false, error: 'Plan rejected by user' }],
      undoAvailable: false,
    });
  };
  
  // Undo last plan
  const handleUndo = async () => {
    const success = await aiExtension.undoLastPlan();
    if (success) {
      setHistory(prev => prev.slice(0, -1));
    }
  };
  
  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-vscode-sidebar text-vscode-text' : 'bg-white text-gray-900'} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-vscode-border bg-vscode-sidebar' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="font-medium">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Permission selector */}
          <select
            value={permissionLevel}
            onChange={(e) => setPermissionLevel(e.target.value as any)}
            className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-[#141414] border-[#252525] text-[#a0a0a0]' : 'bg-gray-100 border-gray-200'} border outline-none`}
          >
            <option value="readonly">Read Only</option>
            <option value="edit">Edit</option>
            <option value="full">Full Access</option>
          </select>
          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
          )}
        </div>
      </div>
      
      {/* View tabs */}
      <div className={`flex border-b ${isDark ? 'border-[#1c1c1c] bg-[#0a0a0a]' : 'border-gray-200'}`}>
        {(['chat', 'tools', 'history'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              viewMode === mode
                ? isDark ? 'bg-transparent text-[#00c8e0] border-b-2 border-[#00c8e0]' : 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : isDark ? 'text-[#505050] hover:text-[#808080]' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {mode === 'chat' ? '💬 Chat' : mode === 'tools' ? '🔧 Tools' : '📜 History'}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === 'chat' && (
          <>
            {/* Chat area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Current plan preview */}
              {currentPlan && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#0d0d0d] border border-[#1c1c1c]' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-500">⚡</span>
                    <span className="font-medium text-sm">Action Plan Ready</span>
                  </div>
                  <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {currentPlan.description}
                  </p>
                  
                  {/* Actions list */}
                  <div className="space-y-2 mb-3">
                    {currentPlan.actions.map((action, idx) => (
                      <ActionPreview key={action.id} action={action} index={idx} isDark={isDark} />
                    ))}
                  </div>
                  
                  {/* Impact badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      currentPlan.estimatedImpact === 'high' ? 'bg-red-500/20 text-red-400' :
                      currentPlan.estimatedImpact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {currentPlan.estimatedImpact.toUpperCase()} IMPACT
                    </span>
                    {currentPlan.requiresConfirmation && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                        REQUIRES CONFIRMATION
                      </span>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleExecute}
                      disabled={isProcessing}
                      className="flex-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? '⏳ Executing...' : '✅ Execute Plan'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className={`px-3 py-1.5 text-xs rounded transition-colors ${
                        isDark ? 'bg-[#1a1a1a] hover:bg-[#252525] text-[#a0a0a0]' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              )}
              
              {/* Last result */}
              {lastResult && !currentPlan && (
                <div className={`p-3 rounded-lg ${
                  lastResult.success 
                    ? isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
                    : isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{lastResult.success ? '✅' : '❌'}</span>
                    <span className="font-medium text-sm">
                      {lastResult.success ? 'Plan Executed Successfully' : 'Plan Failed'}
                    </span>
                  </div>
                  
                  {/* Results */}
                  <div className="space-y-1">
                    {lastResult.results.map(result => (
                      <div key={result.actionId} className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {result.success ? '✓' : '✗'} {result.actionId}
                        {result.error && <span className="text-red-400 ml-2">({result.error})</span>}
                      </div>
                    ))}
                  </div>
                  
                  {/* Undo button */}
                  {lastResult.undoAvailable && (
                    <button
                      onClick={handleUndo}
                      className={`mt-2 px-3 py-1 text-xs rounded ${
                        isDark ? 'bg-[#1a1a1a] hover:bg-[#252525] text-[#a0a0a0]' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      ↩ Undo
                    </button>
                  )}
                </div>
              )}
              
              {/* Empty state */}
              {!currentPlan && !lastResult && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <span className="text-4xl mb-3">🤖</span>
                  <h3 className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    AI Assistant
                  </h3>
                  <p className={`text-xs max-w-[250px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Tell me what you want to do. I'll create an action plan for you to review before executing.
                  </p>
                  <div className="mt-4 space-y-1 text-[10px] text-gray-500">
                    <p>Try: "Add error handling to this function"</p>
                    <p>Try: "Create a new test file"</p>
                    <p>Try: "Refactor this code"</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Input area */}
            <div className={`p-3 border-t ${isDark ? 'border-[#1c1c1c] bg-[#0a0a0a]' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                  placeholder="What would you like me to do?"
                  disabled={isProcessing}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg outline-none ${
                    isDark 
                      ? 'bg-[#0d0d0d] border-[#252525] text-[#a0a0a0] placeholder-[#505050] focus:border-[#00c8e0]' 
                      : 'bg-gray-100 border-gray-200 focus:border-blue-500'
                  } border`}
                />
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing || !input.trim()}
                  className="px-4 py-2 text-sm bg-[#00c8e0] text-black font-semibold rounded-lg hover:bg-[#00d4ff] disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? '⏳' : '→'}
                </button>
              </div>
            </div>
          </>
        )}
        
        {viewMode === 'tools' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {AI_TOOLS.map(tool => (
                <div 
                  key={tool.name}
                  className={`p-3 rounded-lg ${isDark ? 'bg-[#0d0d0d] border border-[#1c1c1c]' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-[#00c8e0]">{tool.name}</span>
                    {tool.dangerous && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">DANGEROUS</span>
                    )}
                    {tool.requiresConfirmation && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">CONFIRM</span>
                    )}
                  </div>
                  <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {tool.description}
                  </p>
                  {tool.parameters.length > 0 && (
                    <div className="space-y-1">
                      {tool.parameters.map(param => (
                        <div key={param.name} className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          <span className="font-mono">{param.name}</span>
                          <span className="mx-1">({param.type}{param.required ? ', required' : ''})</span>
                          <span className="opacity-75">- {param.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {viewMode === 'history' && (
          <div className="flex-1 overflow-y-auto p-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-2xl block mb-2">📜</span>
                <p className="text-sm">No action history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg ${isDark ? 'bg-[#0d0d0d] border border-[#1c1c1c]' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{item.result?.success ? '✅' : '❌'}</span>
                      <span className="text-xs font-medium truncate flex-1">{item.request}</span>
                      <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {item.plan.actions.length} actions
                      </span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.plan.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Action preview component
const ActionPreview: React.FC<{ action: AIAction; index: number; isDark: boolean }> = ({ action, index, isDark }) => {
  const tool = AI_TOOLS.find(t => t.name === action.action);
  
  return (
    <div className={`p-2 rounded ${isDark ? 'bg-[#0a0a0a] border border-[#1c1c1c]' : 'bg-white'}`}>
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full ${
          isDark ? 'bg-[#1a1a1a] text-[#808080]' : 'bg-gray-200'
        }`}>
          {index + 1}
        </span>
        <span className="font-mono text-xs text-[#00c8e0]">{action.action}</span>
        {tool?.dangerous && <span className="text-red-400 text-[10px]">⚠</span>}
      </div>
      {action.reasoning && (
        <p className={`text-[10px] mt-1 ml-7 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {action.reasoning}
        </p>
      )}
      {Object.keys(action.args).length > 0 && (
        <div className={`text-[10px] mt-1 ml-7 font-mono ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          {Object.entries(action.args).map(([key, value]) => (
            <div key={key} className="truncate">
              {key}: {typeof value === 'string' ? `"${value.slice(0, 50)}${value.length > 50 ? '...' : ''}"` : JSON.stringify(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIExtensionPanel;
