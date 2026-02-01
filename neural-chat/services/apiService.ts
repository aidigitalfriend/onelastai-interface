/**
 * API Service - Calls backend API for AI chat
 * Supports multiple providers: Anthropic, OpenAI, Mistral, xAI, Groq, Cerebras
 */

import { SettingsState, CanvasState } from "../types";

// API base URL - uses relative path in production (same domain)
const API_BASE = '/api';

interface ChatResponse {
  text: string;
  isImage?: boolean;
  urls?: string[];
  navigationUrl?: string;
  canvasUpdate?: Partial<CanvasState>;
  credits?: number;
  error?: string;
}

// Map frontend provider/model to backend provider/model
const mapProviderModel = (provider: string, model: string): { provider: string; model: string } => {
  // Map to backend supported providers
  const providerMap: Record<string, string> = {
    'gemini': 'gemini',
    'openai': 'openai',
    'anthropic': 'anthropic',
    'mistral': 'mistral',
    'xai': 'xai',
    'groq': 'groq',
    'cerebras': 'cerebras'
  };

  // Map models to valid backend models
  const modelMap: Record<string, string> = {
    // Gemini
    'gemini-3-flash-preview': 'gemini-2.0-flash',
    'gemini-3-pro-preview': 'gemini-1.5-pro',
    'gemini-2.5-flash-lite-latest': 'gemini-1.5-flash',
    'gemini-2.5-flash-native-audio-preview-09-2025': 'gemini-1.5-flash',
    'gemini-2.5-flash-image': 'gemini-1.5-flash',
    // OpenAI
    'gpt-4o': 'gpt-4o',
    'gpt-4-turbo': 'gpt-4-turbo',
    'gpt-4o-mini': 'gpt-4o-mini',
    'o1-preview': 'gpt-4o',
    // Anthropic
    'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
    'claude-3-opus': 'claude-3-opus-20240229',
    'claude-3-haiku': 'claude-3-haiku-20240307',
    // Mistral
    'mistral-large': 'mistral-large-latest',
    'mistral-small': 'mistral-small-latest',
    // xAI
    'grok-2': 'grok-2',
    'grok-2-mini': 'grok-2-mini',
    // Groq
    'llama-3.3-70b': 'llama-3.3-70b-versatile',
    'llama-3.1-8b': 'llama-3.1-8b-instant',
    // Cerebras
    'llama3.1-70b': 'llama3.1-70b',
    'llama3.1-8b': 'llama3.1-8b',
  };

  return {
    provider: providerMap[provider] || 'anthropic',
    model: modelMap[model] || model
  };
};

export const callBackendAPI = async (
  prompt: string,
  settings: SettingsState
): Promise<ChatResponse> => {
  try {
    const { provider, model } = mapProviderModel(settings.provider, settings.model);

    const response = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify({
        message: prompt,
        provider,
        model,
        systemPrompt: settings.customPrompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific errors
      if (response.status === 401) {
        return { 
          text: "⚠️ Please sign in to use the AI chat. Go to the landing page and create an account or sign in.", 
          error: 'auth' 
        };
      }
      if (response.status === 402) {
        return { 
          text: "⚠️ Insufficient credits. Please purchase more credits from your dashboard.", 
          error: 'credits',
          credits: 0
        };
      }
      return { 
        text: `ERROR: ${data.error || 'Unknown error occurred'}`, 
        error: 'api' 
      };
    }

    // Parse the response
    const content = data.response?.content || data.assistantMessage?.content || 'No response received';
    
    // Check for canvas/navigation commands in the response
    let canvasUpdate: Partial<CanvasState> | undefined;
    let navigationUrl: string | undefined;

    // Simple parsing for code blocks
    const codeBlockMatch = content.match(/```(\w+)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || 'text';
      const code = codeBlockMatch[2];
      
      if (['javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'rust', 'go'].includes(language)) {
        canvasUpdate = {
          content: code,
          type: 'code',
          language: language,
          title: `CODE_${language.toUpperCase()}`
        };
      } else if (language === 'html') {
        canvasUpdate = {
          content: code,
          type: 'html',
          title: 'HTML_PREVIEW'
        };
      }
    }

    return {
      text: content,
      credits: data.credits,
      canvasUpdate,
      navigationUrl
    };

  } catch (error: any) {
    console.error('[API Service] Error:', error);
    
    if (error.message?.includes('Failed to fetch')) {
      return { 
        text: "⚠️ Cannot connect to the server. Please check your internet connection or try again later.", 
        error: 'network' 
      };
    }
    
    return { 
      text: `CRITICAL_ERROR: ${error.message || 'Network error'}`, 
      error: 'unknown' 
    };
  }
};

// Get available providers from backend
export const getProviders = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/chat/providers`, {
      credentials: 'include',
    });
    const data = await response.json();
    return data.providers || [];
  } catch (error) {
    console.error('[API Service] Failed to get providers:', error);
    return [];
  }
};

// Get user's credit balance
export const getCredits = async (): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });
    const data = await response.json();
    return data.user?.credits?.balance || 0;
  } catch (error) {
    console.error('[API Service] Failed to get credits:', error);
    return 0;
  }
};
