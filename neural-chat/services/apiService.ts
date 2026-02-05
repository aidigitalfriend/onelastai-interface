/**
 * API Service - Calls backend API for AI chat
 * Supports multiple providers: Anthropic, OpenAI, Mistral, xAI, Groq, Cerebras
 */

import { SettingsState, CanvasState } from "../types";
import { PROVIDER_CONFIG } from "../constants";

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

// Build a lookup map from display name to model ID
const buildModelLookup = (): Record<string, { provider: string; modelId: string }> => {
  const lookup: Record<string, { provider: string; modelId: string }> = {};
  
  for (const provider of PROVIDER_CONFIG) {
    for (const model of provider.models) {
      // Map both the display name and the ID to the correct values
      lookup[model.name] = { provider: provider.id, modelId: model.id };
      lookup[model.id] = { provider: provider.id, modelId: model.id };
    }
  }
  
  return lookup;
};

const MODEL_LOOKUP = buildModelLookup();

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

  // Look up the model ID from display name
  const modelInfo = MODEL_LOOKUP[model];
  if (modelInfo) {
    return {
      provider: modelInfo.provider,
      model: modelInfo.modelId
    };
  }

  // Fallback: assume model is already an ID
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

// Streaming chat API
export interface StreamCallbacks {
  onText: (text: string) => void;
  onDone: (data: { tokens: number; credits: number; balance: number }) => void;
  onError: (error: string) => void;
  onSession?: (sessionId: string) => void;
}

export const streamChat = async (
  prompt: string,
  settings: SettingsState,
  callbacks: StreamCallbacks,
  image?: { data: string; name: string; mimeType: string },
  abortSignal?: AbortSignal
): Promise<void> => {
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

    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
      signal: abortSignal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        callbacks.onError('auth');
        return;
      }
      if (response.status === 402) {
        callbacks.onError('credits');
        return;
      }
      callbacks.onError('api');
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'text':
                callbacks.onText(data.content);
                break;
              case 'done':
                callbacks.onDone({
                  tokens: data.tokens,
                  credits: data.credits,
                  balance: data.balance,
                });
                break;
              case 'session':
                callbacks.onSession?.(data.sessionId);
                break;
              case 'error':
                callbacks.onError(data.error);
                break;
            }
          } catch (e) {
            // Ignore JSON parse errors for incomplete data
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // User cancelled - not an error
      return;
    }
    console.error('[API Service] Stream error:', error);
    callbacks.onError(error.message || 'Network error');
  }
};

// Extract text from files (PDF, DOCX, etc.)
export interface FileExtractionResult {
  success: boolean;
  text?: string;
  metadata?: {
    pages?: number;
    info?: any;
  };
  fileName?: string;
  type?: string;
  error?: string;
}

export const extractFileText = async (
  fileData: string,
  fileName: string,
  mimeType: string
): Promise<FileExtractionResult> => {
  try {
    const response = await fetch(`${API_BASE}/files/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ fileData, fileName, mimeType }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to extract file content',
      };
    }

    return {
      success: true,
      text: data.text,
      metadata: data.metadata,
      fileName: data.fileName,
      type: data.type,
    };
  } catch (error: any) {
    console.error('[API Service] File extraction error:', error);
    return {
      success: false,
      error: error.message || 'Network error during file extraction',
    };
  }
};
