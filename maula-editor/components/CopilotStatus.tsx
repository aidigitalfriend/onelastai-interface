/**
 * AI Copilot Status Indicator Component
 * 
 * Shows realtime status of AI Copilot in the editor status bar
 */

import React, { useState, useEffect } from 'react';
import { aiCopilot, CopilotState } from '../services/aiCopilotExtension';

interface CopilotStatusProps {
  className?: string;
}

export const CopilotStatus: React.FC<CopilotStatusProps> = ({ className = '' }) => {
  const [state, setState] = useState<CopilotState>(aiCopilot.getState());
  
  useEffect(() => {
    const unsubscribe = aiCopilot.onStatusChange(setState);
    return unsubscribe;
  }, []);
  
  const getStatusIcon = () => {
    switch (state.status) {
      case 'thinking':
        return (
          <svg className="w-3 h-3 ai-copilot-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        );
      case 'suggesting':
        return <span className="text-xs">✨</span>;
      case 'error':
        return <span className="text-xs">⚠</span>;
      default:
        return <span className="text-xs">🤖</span>;
    }
  };
  
  const getStatusText = () => {
    switch (state.status) {
      case 'thinking':
        return 'Thinking...';
      case 'suggesting':
        return 'Tab to accept';
      case 'error':
        return state.errorMessage || 'Error';
      default:
        return state.enabled ? 'Ready' : 'Disabled';
    }
  };
  
  const getStatusClass = () => {
    switch (state.status) {
      case 'thinking':
        return 'text-yellow-400';
      case 'suggesting':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return state.enabled ? 'text-gray-400' : 'text-gray-600';
    }
  };
  
  const toggleEnabled = () => {
    aiCopilot.setEnabled(!state.enabled);
  };
  
  return (
    <button
      onClick={toggleEnabled}
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px]
        hover:bg-white/10 transition-colors cursor-pointer
        ${getStatusClass()}
        ${className}
      `}
      title={`AI Copilot: ${getStatusText()}. Click to ${state.enabled ? 'disable' : 'enable'}`}
    >
      {getStatusIcon()}
      <span>Copilot</span>
      {state.status === 'suggesting' && (
        <span className="text-[10px] opacity-60">Tab↵</span>
      )}
    </button>
  );
};

/**
 * AI Copilot Floating Suggestion Panel
 * Shows the full suggestion when hovering
 */
export const CopilotSuggestionPanel: React.FC = () => {
  const [state, setState] = useState<CopilotState>(aiCopilot.getState());
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const unsubscribe = aiCopilot.onStatusChange((newState) => {
      setState(newState);
      setVisible(newState.status === 'suggesting' && !!newState.currentSuggestion);
    });
    return unsubscribe;
  }, []);
  
  if (!visible || !state.currentSuggestion) return null;
  
  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-md">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <span>✨</span>
            AI Suggestion
          </span>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span className="px-1.5 py-0.5 bg-[#3c3c3c] rounded">Tab</span>
            <span>to accept</span>
            <span className="px-1.5 py-0.5 bg-[#3c3c3c] rounded">Esc</span>
            <span>to dismiss</span>
          </div>
        </div>
        <pre className="p-3 text-xs text-gray-300 max-h-40 overflow-auto font-mono whitespace-pre-wrap">
          {state.currentSuggestion.text}
        </pre>
      </div>
    </div>
  );
};

/**
 * Full Copilot Control Panel
 * Settings and controls for AI Copilot
 */
export const CopilotControlPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [state, setState] = useState<CopilotState>(aiCopilot.getState());
  const [debounceMs, setDebounceMs] = useState(300);
  
  useEffect(() => {
    const unsubscribe = aiCopilot.onStatusChange(setState);
    return unsubscribe;
  }, []);
  
  return (
    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-xl p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <span>🤖</span>
          AI Copilot Settings
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        )}
      </div>
      
      {/* Enable/Disable */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">Enable Copilot</span>
        <button
          onClick={() => aiCopilot.setEnabled(!state.enabled)}
          className={`w-10 h-5 rounded-full transition-colors ${
            state.enabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
            state.enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      {/* Status */}
      <div className="mb-4">
        <span className="text-xs text-gray-400">Status</span>
        <div className={`mt-1 text-sm ${
          state.status === 'thinking' ? 'text-yellow-400' :
          state.status === 'suggesting' ? 'text-green-400' :
          state.status === 'error' ? 'text-red-400' :
          'text-gray-300'
        }`}>
          {state.status === 'thinking' ? '⏳ Thinking...' :
           state.status === 'suggesting' ? '✨ Suggestion ready' :
           state.status === 'error' ? `⚠ ${state.errorMessage}` :
           '● Idle'}
        </div>
      </div>
      
      {/* Debounce Delay */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Trigger Delay</span>
          <span className="text-xs text-gray-500">{debounceMs}ms</span>
        </div>
        <input
          type="range"
          min="100"
          max="1000"
          step="50"
          value={debounceMs}
          onChange={(e) => {
            const ms = parseInt(e.target.value);
            setDebounceMs(ms);
            aiCopilot.setDebounceMs(ms);
          }}
          className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>Fast (100ms)</span>
          <span>Slow (1000ms)</span>
        </div>
      </div>
      
      {/* Keyboard Shortcuts */}
      <div className="border-t border-[#3c3c3c] pt-3">
        <span className="text-xs text-gray-400 block mb-2">Keyboard Shortcuts</span>
        <div className="space-y-1 text-[11px] text-gray-500">
          <div className="flex justify-between">
            <span>Accept suggestion</span>
            <kbd className="px-1.5 py-0.5 bg-[#3c3c3c] rounded">Tab</kbd>
          </div>
          <div className="flex justify-between">
            <span>Dismiss suggestion</span>
            <kbd className="px-1.5 py-0.5 bg-[#3c3c3c] rounded">Esc</kbd>
          </div>
          <div className="flex justify-between">
            <span>Trigger manually</span>
            <kbd className="px-1.5 py-0.5 bg-[#3c3c3c] rounded">Ctrl+Space</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopilotStatus;
