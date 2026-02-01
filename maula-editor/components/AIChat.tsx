import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChatMessage, AIProvider } from '../types';
import { voiceInput, voiceOutput, speechSupport } from '../services/speech';
import { aiService } from '../services/ai';
import { isDarkTheme } from '../utils/theme';
import usageCreditsService, { MODEL_PRICING, ModelPricing } from '../services/usageCredits';

interface AIChatProps {
  voiceEnabled?: boolean;
}

export const AIChat: React.FC<AIChatProps> = ({ voiceEnabled: externalVoiceEnabled = false }) => {
  const { 
    chatHistory, 
    addMessage, 
    clearChat, 
    aiConfig,
    setAiConfig,
    isAiLoading,
    setAiLoading,
    openFiles,
    activeFileId,
    theme
  } = useStore();
  
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [credits, setCredits] = useState(usageCreditsService.getCredits());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeFile = openFiles.find(f => f.id === activeFileId);
  
  // Get available models grouped by provider
  const modelsByProvider = MODEL_PRICING.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelPricing[]>);
  
  // Current model info
  const currentModel = MODEL_PRICING.find(
    m => m.provider === aiConfig.provider && m.model === aiConfig.model
  ) || MODEL_PRICING[0];
  
  // Theme classes - supports all dark themes including charcoal-aurora
  const isDark = isDarkTheme(theme);
  const bgClass = isDark ? 'bg-vscode-sidebar' : 'bg-gray-50';
  const borderClass = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textClass = isDark ? 'text-vscode-text' : 'text-gray-900';
  const mutedTextClass = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const inputBgClass = isDark ? 'bg-vscode-input border-vscode-border' : 'bg-white border-gray-300';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Subscribe to credit updates
  useEffect(() => {
    const unsubscribe = usageCreditsService.subscribe(() => {
      setCredits(usageCreditsService.getCredits());
    });
    return unsubscribe;
  }, []);

  // Get provider color
  const getProviderColor = (provider: string): string => {
    const colors: Record<string, string> = {
      gemini: '#4285f4',
      openai: '#10a37f',
      anthropic: '#d4a574',
      mistral: '#ff6b35',
      groq: '#f97316',
      xai: '#1da1f2',
      cerebras: '#8b5cf6',
    };
    return colors[provider] || '#6b7280';
  };

  const getTierBadgeClass = (tier: string): string => {
    switch (tier) {
      case 'free': return 'bg-green-500/20 text-green-400';
      case 'standard': return 'bg-blue-500/20 text-blue-400';
      case 'premium': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Handle model selection
  const handleSelectModel = (model: ModelPricing) => {
    setAiConfig({ 
      provider: model.provider, 
      model: model.model 
    });
    setShowModelSelector(false);
  };

  // Voice input handler
  const handleVoiceInput = async () => {
    if (!speechSupport.recognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      voiceInput.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    voiceInput.start({
      onResult: (result) => {
        setInput(prev => result.isFinal ? result.transcript : prev);
      },
      onError: (error) => {
        console.error('Voice input error:', error);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    }, { continuous: true, interimResults: true });
  };

  // Speak response handler - only speaks if voice is enabled
  const handleSpeak = (text: string) => {
    if (!externalVoiceEnabled || !speechSupport.synthesis) return;
    
    // Clean text for speech (remove code blocks, etc)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`[^`]+`/g, '')
      .slice(0, 500); // Limit to first 500 chars
    
    voiceOutput.speak(cleanText, {
      rate: 1,
      pitch: 1,
      onEnd: () => {},
      onError: () => {},
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isAiLoading) return;

    // Build attachments
    const attachments: ChatMessage['attachments'] = [];
    
    if (activeFile) {
      attachments.push({
        type: 'code',
        name: activeFile.name,
        content: activeFile.content,
      });
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    addMessage(userMessage);
    setInput('');
    setAiLoading(true);

    try {
      // Prepare message with context
      let fullMessage = input;
      if (activeFile) {
        fullMessage += `\n\n[Current file: ${activeFile.name}]\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\``;
      }

      // Vision analysis - prepared for future use with vision-capable APIs
      // Currently not used in the basic sendMessage call
      // let imageData;
      // if (capturedImage) {
      //   const prepared = await visionAnalysis.prepareForAI(capturedImage);
      //   imageData = { base64: prepared.base64, mimeType: prepared.mimeType };
      // }

      // Build message for AI
      const userMsgForAI: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: fullMessage,
        timestamp: Date.now(),
      };
      
      // Use the AI service with internal API key
      const aiResponse = await aiService.sendMessage(aiConfig, [...chatHistory, userMsgForAI], fullMessage);
      
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: Date.now(),
      };
      addMessage(assistantMessage);
      
      // Auto-speak if enabled
      if (externalVoiceEnabled && speechSupport.synthesis) {
        handleSpeak(aiResponse.content);
      }
    } catch (error) {
      console.error('AI error:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
      };
      addMessage(errorMessage);
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  const quickActions = [
    { label: '✨ Generate', prompt: 'Generate code for: ' },
    { label: '🔧 Fix Error', prompt: 'Fix this error: ' },
    { label: '📝 Explain', prompt: 'Explain this code: ' },
    { label: '🔄 Refactor', prompt: 'Refactor this code to: ' },
    { label: '🧪 Add Tests', prompt: 'Write tests for: ' },
    { label: '📖 Document', prompt: 'Add documentation to: ' },
  ];

  return (
    <div className={`flex flex-col h-full ${bgClass}`}>
      {/* Credits Bar */}
      <div className={`px-4 py-2 border-b ${borderClass} ${isDark ? 'bg-vscode-bg' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${mutedTextClass}`}>Credits</span>
          <span className={`text-sm font-medium ${credits.remainingCredits < 100 ? 'text-red-500' : isDark ? 'text-green-400' : 'text-green-600'}`}>
            {credits.remainingCredits.toLocaleString()} remaining
          </span>
        </div>
        <div className={`w-full h-1 rounded-full mt-1 ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'}`}>
          <div 
            className={`h-full rounded-full transition-all ${
              credits.remainingCredits > credits.totalCredits * 0.5 ? 'bg-green-500' :
              credits.remainingCredits > credits.totalCredits * 0.2 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min((credits.remainingCredits / Math.max(credits.totalCredits, 1)) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Model Selector */}
      <div className={`px-4 py-2 border-b ${borderClass}`}>
        <div className="relative">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${borderClass} ${isDark ? 'bg-vscode-input hover:bg-vscode-hover' : 'bg-white hover:bg-gray-50'} transition-colors`}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getProviderColor(currentModel.provider) }}
              />
              <span className={`text-sm font-medium ${textClass}`}>{currentModel.displayName}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${getTierBadgeClass(currentModel.tier)}`}>
                {currentModel.tier}
              </span>
            </div>
            <svg className={`w-4 h-4 ${mutedTextClass} transition-transform ${showModelSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Model Dropdown */}
          {showModelSelector && (
            <div className={`absolute left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-lg border shadow-xl z-50 ${borderClass} ${isDark ? 'bg-vscode-sidebar' : 'bg-white'}`}>
              {Object.entries(modelsByProvider).map(([provider, models]) => (
                <div key={provider}>
                  <div className={`px-3 py-2 text-xs font-medium uppercase tracking-wider ${mutedTextClass} ${isDark ? 'bg-vscode-bg' : 'bg-gray-50'} sticky top-0`}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getProviderColor(provider) }}
                      />
                      {provider}
                    </div>
                  </div>
                  {models.map(model => (
                    <button
                      key={model.model}
                      onClick={() => handleSelectModel(model)}
                      className={`w-full px-3 py-2 text-left transition-colors ${
                        aiConfig.model === model.model 
                          ? isDark ? 'bg-vscode-accent/20' : 'bg-blue-50'
                          : isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${textClass}`}>{model.displayName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getTierBadgeClass(model.tier)}`}>
                          {model.tier}
                        </span>
                      </div>
                      <div className={`text-xs ${mutedTextClass} mt-0.5`}>{model.description}</div>
                      <div className={`flex gap-3 text-[10px] ${mutedTextClass} mt-1`}>
                        <span>In: {model.inputCostPer1K} cr/1K</span>
                        <span>Out: {model.outputCostPer1K} cr/1K</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Header with Actions Dropdown */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className={`font-semibold ${textClass}`}>AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${mutedTextClass} hover:bg-slate-700 hover:text-white`}
              title="Quick Actions"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showActionsDropdown && (
              <div className={`absolute right-0 mt-1 w-48 rounded-lg shadow-xl z-50 py-1 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
                {quickActions.map((action) => (
                  <button
                    key={`action-${action.label}`}
                    onClick={() => {
                      setInput(action.prompt);
                      setShowActionsDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Clear Chat */}
          <button
            onClick={clearChat}
            className={`p-2 rounded-lg transition-colors ${mutedTextClass} hover:bg-slate-700 hover:text-white`}
            title="Clear Chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className={`text-center py-12 ${mutedTextClass}`}>
            <div className="text-5xl mb-4">🤖</div>
            <p className="text-base font-medium">Start a conversation with AI</p>
            <p className="text-sm mt-2 opacity-70">Ask me to generate, explain, or fix code</p>
          </div>
        ) : (
          chatHistory.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm
                ${message.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5
                ${message.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-sm' 
                  : isDark ? 'bg-slate-700 text-slate-100 rounded-bl-sm' : 'bg-gray-200 text-gray-800 rounded-bl-sm'}`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <span className="text-xs opacity-70">
                      📎 {message.attachments.map(a => a.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isAiLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm">
              🤖
            </div>
            <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-200'} rounded-2xl rounded-bl-sm px-4 py-3`}>
              <div className="flex gap-1">
                <div className={`w-2 h-2 ${isDark ? 'bg-slate-400' : 'bg-gray-400'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
                <div className={`w-2 h-2 ${isDark ? 'bg-slate-400' : 'bg-gray-400'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
                <div className={`w-2 h-2 ${isDark ? 'bg-slate-400' : 'bg-gray-400'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context indicator */}
      {activeFile && (
        <div className={`px-4 py-2 ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-gray-100 border-gray-200'} border-t`}>
          <div className={`flex items-center gap-3 text-xs ${mutedTextClass}`}>
            <span className="flex items-center gap-1">
              <span>📎</span>
              <span className="text-indigo-500 font-medium">{activeFile.name}</span>
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`p-4 border-t ${borderClass}`}>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "🎤 Listening..." : "Ask AI anything... (Shift+Enter for new line)"}
              rows={3}
              className={`w-full px-4 py-3 ${inputBgClass} border ${borderClass} rounded-xl ${textClass} text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${isListening ? 'border-red-500 animate-pulse' : ''}`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSend}
              disabled={!input.trim() || isAiLoading}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              title="Send"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
            <button
              onClick={handleVoiceInput}
              className={`p-3 rounded-xl transition-colors ${isListening ? 'bg-red-600 text-white animate-pulse' : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
              title={isListening ? "Stop Listening" : "Voice Input"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
