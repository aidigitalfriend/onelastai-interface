import { useCallback } from 'react';
import {
  GeneratedApp,
  ViewMode,
  GenerationState,
  ChatMessage,
  ModelOption,
} from '../types';
import { getAvailableTools, runTool, ToolResult } from '../services/toolRegistry';
import { trackCanvasUsage } from '../components/CanvasNavDrawer';
import { MODELS } from '../constants';

// 🔍 Auto-detect language from code content (React patterns override HTML)
const detectLanguageFromCode = (code: string, providedLang: string = 'html'): string => {
  if (!code) return providedLang;
  
  const hasReactPatterns = 
    code.includes('import React') ||
    code.includes("from 'react'") ||
    code.includes('from "react"') ||
    code.includes('useState') ||
    code.includes('useEffect') ||
    code.includes('useCallback') ||
    code.includes('useMemo') ||
    code.includes('useRef') ||
    code.includes('useContext') ||
    code.includes('export default function') ||
    code.includes('export default class') ||
    (code.includes('const ') && code.includes('return (') && code.includes('<') && code.includes('/>'));
  
  if (hasReactPatterns) return 'react';
  
  // Java detection (before TypeScript — both use 'interface' but Java has 'package')
  if ((code.includes('public class ') || code.includes('public interface ') || code.includes('public record ')) &&
      (code.includes('package ') || code.includes('System.out') || code.includes('@Override') || code.includes('public static void main'))) {
    return 'java';
  }
  
  // C# detection
  if ((code.includes('namespace ') || code.includes('using System')) &&
      (code.includes('public class ') || code.includes('public record ') || code.includes('async Task'))) {
    return 'csharp';
  }
  
  // Go detection
  if (code.includes('package main') || code.includes('func main()') ||
      (code.includes('func ') && code.includes(':='))) {
    return 'go';
  }
  
  // Rust detection
  if (code.includes('fn main()') || code.includes('use std::') || code.includes('#[derive(')) {
    return 'rust';
  }
  
  // PHP detection
  if (code.includes('<?php') || (code.includes('function ') && code.includes('$') && code.includes('->'))) {
    return 'php';
  }
  
  // Ruby detection
  if ((code.includes('def ') && code.includes('end') && !code.includes('{')) ||
      code.includes('attr_reader') || code.includes('attr_accessor')) {
    return 'ruby';
  }
  
  // Swift detection
  if (code.includes('import SwiftUI') || code.includes('import Foundation') ||
      (code.includes('struct ') && code.includes(': View'))) {
    return 'swift';
  }
  
  // Kotlin detection
  if (code.includes('fun main') || code.includes('data class ') ||
      code.includes('suspend fun ') || code.includes('import kotlinx.')) {
    return 'kotlin';
  }
  
  // C++ detection
  if (code.includes('#include <') || code.includes('std::') ||
      (code.includes('int main(') && code.includes('#include'))) {
    return 'cpp';
  }
  
  // SQL detection
  const lowerCode = code.toLowerCase();
  if (lowerCode.includes('create table ') || (lowerCode.includes('select ') && lowerCode.includes(' from ')) ||
      lowerCode.includes('insert into ')) {
    return 'sql';
  }
  
  // Shell detection
  if (code.includes('#!/bin/bash') || code.includes('#!/usr/bin/env bash') || code.includes('#!/bin/sh')) {
    return 'shell';
  }
  
  // TypeScript detection
  if (code.includes(': React.FC') || 
      code.includes(': string') || 
      code.includes(': number') || 
      code.includes(': boolean') ||
      code.includes('interface ') ||
      code.includes('type ')) {
    return 'typescript';
  }
  
  // Python detection
  if (code.includes('def ') || 
      code.includes('import ') && code.includes('flask') ||
      code.includes('class ') && code.includes('self') ||
      code.includes('print(')) {
    return 'python';
  }
  
  return providedLang;
};

type ActivePanel = 'workspace' | 'assistant' | 'dashboard' | 'files' | 'tools' | 'settings' | 'history' | 'templates' | 'deploy' | null;

export interface UseAgentDeps {
  genState: GenerationState;
  setGenState: React.Dispatch<React.SetStateAction<GenerationState>>;
  selectedModel: ModelOption;
  conversationHistory: ChatMessage[];
  setConversationHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentApp: GeneratedApp | null;
  setCurrentApp: React.Dispatch<React.SetStateAction<GeneratedApp | null>>;
  history: GeneratedApp[];
  saveHistory: (h: GeneratedApp[]) => void;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  editorBridge: any; // EditorBridge type from useEditorBridge
  setActivePanel: React.Dispatch<React.SetStateAction<ActivePanel>>;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
}

export function useAgent(deps: UseAgentDeps) {
  const {
    genState,
    setGenState,
    selectedModel,
    conversationHistory,
    setConversationHistory,
    currentApp,
    setCurrentApp,
    history,
    saveHistory,
    setViewMode,
    editorBridge,
    setActivePanel,
    setPrompt,
  } = deps;

  const handleAgentMessage = useCallback(async (message: string) => {
    if (!message.trim() || genState.isGenerating) return;
    
    // Add user message to conversation history
    const userMsg: ChatMessage = {
      role: 'user',
      text: message,
      timestamp: Date.now(),
    };
    setConversationHistory(prev => [...prev, userMsg]);
    
    // Show loading state
    setGenState({
      isGenerating: true,
      error: null,
      progressMessage: `Thinking with ${selectedModel.name}...`,
    });

    try {
      // Get editor context for the agent
      const editorContext = editorBridge.getAgentContext();
      
      // Get available tools from registry
      const availableTools = getAvailableTools();
      
      // Send to unified agent endpoint with full context
      const response = await fetch('/api/canvas/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message,
          currentCode: currentApp?.code || null,
          currentLanguage: currentApp?.language || 'html',
          currentProvider: selectedModel.provider,
          currentModel: selectedModel.id,
          conversationHistory: conversationHistory,
          provider: selectedModel.provider,
          modelId: selectedModel.id,
          appState: {
            hasCode: !!currentApp?.code,
            viewMode: deps.viewMode,
          },
          editorContext: editorContext,
          availableTools: availableTools,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Agent request failed');
      }

      console.log('[Agent] Action:', data.action);

      // Helper to add AI message to chat
      const addAIMessage = (text: string) => {
        const aiMsg: ChatMessage = {
          role: 'model',
          text,
          timestamp: Date.now(),
        };
        setConversationHistory(prev => [...prev, aiMsg]);
      };

      // Handle agent's action
      const action = data.action;

      switch (action) {
        case 'chat':
          addAIMessage(data.message);
          setActivePanel('assistant');
          break;

        case 'build': {
          const detectedLanguage = detectLanguageFromCode(data.code, data.language || 'html');
          console.log('[Canvas Build] Backend language:', data.language, '→ Detected:', detectedLanguage);
          console.log('[Canvas Build] Code snippet:', data.code?.substring(0, 200));
          const newApp: GeneratedApp = {
            id: Date.now().toString(),
            name: 'Canvas App',
            code: data.code,
            language: detectedLanguage,
            prompt: message,
            timestamp: Date.now(),
            history: [],
          };
          setCurrentApp(newApp);
          saveHistory([newApp, ...history].slice(0, 10));
          setViewMode(ViewMode.PREVIEW);
          addAIMessage(data.message || '✨ Done! Your app is ready - check out the preview!');
          
          trackCanvasUsage({
            type: 'generation',
            model: selectedModel.name,
            provider: selectedModel.provider,
            credits: selectedModel.costPer1k || 1,
            description: 'Build new app'
          });
          break;
        }

        case 'build_project': {
          if (data.files && Array.isArray(data.files)) {
            console.log('[Canvas Agent] Creating multi-file project with', data.files.length, 'files');
            
            data.files.forEach((file: { path: string; content: string; language?: string }) => {
              editorBridge.createFile(file.path, file.content, file.language);
            });
            
            const mainFile = data.mainFile || data.files[0]?.path;
            if (mainFile) {
              editorBridge.setActiveFile(mainFile);
              
              const mainFileData = data.files.find((f: { path: string }) => f.path === mainFile);
              if (mainFileData) {
                const newApp: GeneratedApp = {
                  id: Date.now().toString(),
                  name: mainFile.split('/').pop() || 'Project',
                  code: mainFileData.content,
                  language: mainFileData.language || 'html',
                  prompt: message,
                  timestamp: Date.now(),
                  history: [],
                };
                setCurrentApp(newApp);
                saveHistory([newApp, ...history].slice(0, 10));
              }
            }
            
            setViewMode(ViewMode.CODE);
            setActivePanel('files');
            addAIMessage(data.message || `✨ Created project with ${data.files.length} files! Check the Files panel.`);
            
            trackCanvasUsage({
              type: 'generation',
              model: selectedModel.name,
              provider: selectedModel.provider,
              credits: selectedModel.costPer1k || 1,
              description: `Build multi-file project (${data.files.length} files)`
            });
          }
          break;
        }

        case 'edit': {
          if (currentApp) {
            const detectedLanguage = detectLanguageFromCode(data.code, data.language || currentApp.language);
            const updatedApp: GeneratedApp = {
              ...currentApp,
              code: data.code,
              language: detectedLanguage,
              history: [...currentApp.history],
            };
            setCurrentApp(updatedApp);
            saveHistory(history.map(a => a.id === updatedApp.id ? updatedApp : a));
            setViewMode(ViewMode.PREVIEW);
            addAIMessage(data.message || '✅ Changes applied! Check the preview.');
            
            trackCanvasUsage({
              type: 'edit',
              model: selectedModel.name,
              provider: selectedModel.provider,
              credits: selectedModel.costPer1k || 1,
              description: 'Edit code'
            });
          }
          break;
        }

        case 'preview':
          setViewMode(ViewMode.PREVIEW);
          addAIMessage(data.message || '👀 Opening preview...');
          break;

        case 'deploy':
          setActivePanel('workspace');
          addAIMessage(data.message || '🚀 Opening deploy panel...');
          break;

        case 'save':
          addAIMessage(data.message || '💾 Saved!');
          break;

        case 'open_panel': {
          const panelMap: Record<string, ActivePanel> = {
            'dashboard': 'dashboard',
            'settings': 'settings',
            'files': 'files',
            'templates': 'templates',
            'history': 'history',
            'workspace': 'workspace',
            'assistant': 'assistant',
          };
          const panel = panelMap[data.panel] || 'dashboard';
          setActivePanel(panel);
          addAIMessage(data.message || `Opening ${data.panel}...`);
          break;
        }

        case 'copy_code':
          if (currentApp?.code) {
            navigator.clipboard.writeText(currentApp.code);
            addAIMessage(data.message || '📋 Code copied to clipboard!');
          }
          break;

        case 'new_chat':
          setConversationHistory([]);
          setCurrentApp(null);
          setViewMode(ViewMode.PREVIEW);
          addAIMessage(data.message || '🔄 Starting fresh! What would you like to build?');
          break;

        case 'download':
          if (currentApp?.code) {
            const blob = new Blob([currentApp.code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const extMap: Record<string, string> = {
              react: 'tsx', typescript: 'ts', javascript: 'js', python: 'py',
              html: 'html', java: 'java', csharp: 'cs', go: 'go', rust: 'rs',
              php: 'php', ruby: 'rb', swift: 'swift', kotlin: 'kt', cpp: 'cpp',
              sql: 'sql', shell: 'sh',
            };
            a.download = `app.${extMap[currentApp.language] || 'txt'}`;
            a.click();
            URL.revokeObjectURL(url);
            addAIMessage(data.message || '⬇️ Download started!');
          }
          break;

        case 'sandbox':
          addAIMessage(data.message || '📦 Opening in CodeSandbox...');
          setViewMode(ViewMode.PREVIEW);
          break;

        case 'change_provider': {
          const providerModels = MODELS.filter(m => m.provider === data.provider);
          if (providerModels.length > 0) {
            const model = data.model 
              ? providerModels.find(m => m.id.toLowerCase().includes(data.model.toLowerCase())) || providerModels[0]
              : providerModels[0];
            // Note: selectedModel change needs to be handled by parent via returned action
            addAIMessage(data.message || `✓ Switched to ${model.name}`);
          }
          break;
        }

        case 'change_language':
          addAIMessage(data.message || `✓ Switched to ${data.language}`);
          break;

        case 'explain':
          addAIMessage(data.explanation || 'Let me explain this code...');
          setActivePanel('assistant');
          break;

        case 'debug':
          addAIMessage(`🔍 **Analysis:** ${data.analysis}\n\n🔧 **Fix:** ${data.fix}`);
          setActivePanel('assistant');
          break;

        // 🔗 EDITOR BRIDGE ACTIONS
        case 'insert_at': {
          if (data.position && data.text) {
            editorBridge.insertAt(data.position, data.text);
            addAIMessage(data.message || `✏️ Inserted at line ${data.position.line}`);
          }
          break;
        }

        case 'replace_range': {
          if (data.start && data.end && data.text) {
            editorBridge.replaceRange(data.start, data.end, data.text);
            addAIMessage(data.message || `🔄 Replaced lines ${data.start.line}-${data.end.line}`);
          }
          break;
        }

        case 'delete_lines': {
          if (data.startLine && data.endLine) {
            editorBridge.deleteLines(data.startLine, data.endLine);
            addAIMessage(data.message || `🗑️ Deleted lines ${data.startLine}-${data.endLine}`);
          }
          break;
        }

        case 'goto_line': {
          if (data.line) {
            editorBridge.setCursor({ line: data.line, column: data.column || 1 });
            addAIMessage(data.message || `📍 Moved to line ${data.line}`);
          }
          break;
        }

        case 'create_file': {
          if (data.path && data.content !== undefined) {
            editorBridge.createFile(data.path, data.content, data.language);
            addAIMessage(data.message || `📄 Created ${data.path}`);
          }
          break;
        }

        case 'delete_file': {
          if (data.path) {
            editorBridge.deleteFile(data.path);
            addAIMessage(data.message || `🗑️ Deleted ${data.path}`);
          }
          break;
        }

        case 'open_file': {
          if (data.path) {
            editorBridge.setActiveFile(data.path);
            addAIMessage(data.message || `📂 Opened ${data.path}`);
          }
          break;
        }

        case 'edit_file': {
          // Agent wants to edit a specific file — the backend already generated the updated code
          if (data.path && data.code) {
            editorBridge.writeFile(data.path, data.code);
            editorBridge.setActiveFile(data.path);
            setViewMode(ViewMode.CODE);
            addAIMessage(data.message || `✏️ Updated ${data.path}`);
          } else if (data.path && data.instruction) {
            // Instruction-only edit — tell the user what was requested
            addAIMessage(data.message || `✏️ Edit requested for ${data.path}: ${data.instruction}`);
          }
          break;
        }

        case 'read_file': {
          // Agent wants to read a file's contents — retrieve from editorBridge
          if (data.path) {
            const fileContent = editorBridge.getFile(data.path);
            if (fileContent !== null) {
              addAIMessage(data.message || `📖 Read ${data.path} (${fileContent.length} chars)`);
            } else {
              addAIMessage(`⚠️ File not found: ${data.path}`);
            }
          }
          break;
        }

        case 'undo':
          editorBridge.undo();
          addAIMessage(data.message || '↩️ Undone!');
          break;

        case 'redo':
          editorBridge.redo();
          addAIMessage(data.message || '↪️ Redone!');
          break;

        case 'find_replace': {
          if (data.find && data.replace !== undefined) {
            editorBridge.replaceAll(data.find, data.replace);
            addAIMessage(data.message || `🔍 Replaced all "${data.find}"`);
          }
          break;
        }

        case 'get_selection': {
          const selection = editorBridge.selection;
          if (selection) {
            addAIMessage(data.message || `📋 Selection: lines ${selection.start.line}-${selection.end.line}`);
          } else {
            addAIMessage(data.message || '📋 No selection active');
          }
          break;
        }

        // 🔧 UNIFIED TOOL REGISTRY
        case 'tool_calls': {
          if (data.tool_calls && Array.isArray(data.tool_calls)) {
            console.log('[Canvas Agent] Executing tool calls:', data.tool_calls.length);
            
            const results: ToolResult[] = [];
            
            for (const toolCall of data.tool_calls) {
              const { tool, args } = toolCall;
              console.log(`[Tool Registry] Executing: ${tool}`, args);
              
              const result = runTool(tool, args || []);
              results.push(result);
              
              if (result.success) {
                console.log(`[Tool Registry] ${tool} succeeded:`, result.message || result.data);
              } else {
                console.warn(`[Tool Registry] ${tool} failed:`, result.error);
              }
            }
            
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;
            
            if (failCount === 0) {
              addAIMessage(data.message || `✅ Executed ${successCount} tool${successCount > 1 ? 's' : ''} successfully`);
            } else {
              addAIMessage(data.message || `⚠️ ${successCount} succeeded, ${failCount} failed`);
            }
            
            const fileTools = ['writeFile', 'createFile', 'updateFile'];
            if (data.tool_calls.some((tc: any) => fileTools.includes(tc.tool))) {
              setViewMode(ViewMode.CODE);
            }
          }
          break;
        }

        // 🔧 SINGLE TOOL CALL
        case 'run_tool': {
          if (data.tool) {
            console.log(`[Canvas Agent] Running single tool: ${data.tool}`);
            const result = runTool(data.tool, data.args || []);
            
            if (result.success) {
              addAIMessage(data.message || result.message || `✅ ${data.tool} completed`);
            } else {
              addAIMessage(`⚠️ ${data.tool} failed: ${result.error}`);
            }
          }
          break;
        }

        default:
          if (data.message) {
            addAIMessage(data.message);
          }
          break;
      }

      setGenState({ isGenerating: false, error: null, progressMessage: '' });

    } catch (err: any) {
      setGenState({
        isGenerating: false,
        error: err.message,
        progressMessage: '',
      });
      
      const errorMsg: ChatMessage = {
        role: 'model',
        text: '⚠️ Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setConversationHistory(prev => [...prev, errorMsg]);
    }
    
    // Clear prompt input
    setPrompt('');
  }, [
    genState.isGenerating,
    selectedModel,
    conversationHistory,
    currentApp,
    history,
    deps.viewMode,
    editorBridge,
    saveHistory,
    setGenState,
    setConversationHistory,
    setCurrentApp,
    setViewMode,
    setActivePanel,
    setPrompt,
  ]);

  return { handleAgentMessage, detectLanguageFromCode };
}
