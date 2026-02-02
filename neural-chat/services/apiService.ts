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
    'anthropic': 'anthropic',
    'openai': 'openai',
    'gemini': 'gemini',
    'mistral': 'mistral',
    'xai': 'xai',
    'groq': 'groq',
    'cerebras': 'cerebras'
  };

  // Model IDs are passed directly - backend handles them
  return {
    provider: providerMap[provider] || 'anthropic',
    model: model
  };
};

export const callBackendAPI = async (
  prompt: string,
  settings: SettingsState,
  image?: { data: string; name: string; mimeType: string }
): Promise<ChatResponse> => {
  try {
    const { provider, model } = mapProviderModel(settings.provider, settings.model);

    const requestBody: any = {
      message: prompt,
      provider,
      model,
      systemPrompt: settings.customPrompt,
    };

    // Include image data if present (for vision models)
    if (image) {
      requestBody.image = {
        data: image.data,
        mimeType: image.mimeType
      };
    }

    const response = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify(requestBody),
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
