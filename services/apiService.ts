/**
 * NEURAL LINK API SERVICE
 * Connects to the backend for multi-provider AI chat with credit billing
 */

const API_BASE = '/api';

export interface ChatResponse {
  success: boolean;
  sessionId?: string;
  response?: {
    content: string;
    provider: string;
    model: string;
    tokens: number;
    credits: number;
    latency: number;
  };
  credits?: number;
  error?: string;
}

export interface Provider {
  name: string;
  models: Record<string, { inputCost: number; outputCost: number }>;
}

export interface Providers {
  anthropic?: Provider;
  openai?: Provider;
  gemini?: Provider;
  mistral?: Provider;
  xai?: Provider;
  groq?: Provider;
  cerebras?: Provider;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceDisplay: string;
  description: string;
  popular: boolean;
  savings?: string;
}

// Get available providers and models
export const getProviders = async (): Promise<Providers> => {
  try {
    const response = await fetch(`${API_BASE}/chat/providers`, {
      credentials: 'include',
    });
    const data = await response.json();
    return data.providers || {};
  } catch (error) {
    console.error('[API] Failed to get providers:', error);
    return {};
  }
};

// Get current user info and credits
export const getCurrentUser = async (): Promise<{ user: any; credits: number } | null> => {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      user: data.user,
      credits: data.user?.credits?.balance || 0,
    };
  } catch (error) {
    console.error('[API] Failed to get user:', error);
    return null;
  }
};

// Get credit packages
export const getCreditPackages = async (): Promise<CreditPackage[]> => {
  try {
    const response = await fetch(`${API_BASE}/billing/packages`, {
      credentials: 'include',
    });
    const data = await response.json();
    return data.packages || [];
  } catch (error) {
    console.error('[API] Failed to get packages:', error);
    return [];
  }
};

// Get credit balance
export const getCreditBalance = async (): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE}/billing/credits`, {
      credentials: 'include',
    });
    const data = await response.json();
    return data.credits || 0;
  } catch (error) {
    console.error('[API] Failed to get balance:', error);
    return 0;
  }
};

// Send chat message (non-streaming)
export const sendMessage = async (
  message: string,
  provider: string = 'anthropic',
  model: string = 'claude-3-5-sonnet-20241022',
  sessionId?: string,
  systemPrompt?: string
): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        provider,
        model,
        sessionId,
        systemPrompt,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send message',
        credits: data.credits,
      };
    }

    return data;
  } catch (error: any) {
    console.error('[API] Chat error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

// Stream chat message
export const streamMessage = async (
  message: string,
  provider: string = 'anthropic',
  model: string = 'claude-3-5-sonnet-20241022',
  sessionId?: string,
  systemPrompt?: string,
  onChunk: (chunk: string) => void,
  onDone: (response: { tokens: number; credits: number; balance: number }) => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        provider,
        model,
        sessionId,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      onError(data.error || 'Failed to stream');
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      onError('No response stream');
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              onChunk(data.content);
            } else if (data.type === 'done') {
              onDone({
                tokens: data.tokens,
                credits: data.credits,
                balance: data.balance,
              });
            } else if (data.type === 'error') {
              onError(data.error);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error: any) {
    console.error('[API] Stream error:', error);
    onError(error.message || 'Stream failed');
  }
};

// Create checkout session for credits
export const createCheckout = async (packageId: string): Promise<{ url: string } | null> => {
  try {
    const response = await fetch(`${API_BASE}/billing/checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId }),
    });

    const data = await response.json();
    if (!response.ok || !data.url) {
      console.error('[API] Checkout failed:', data.error);
      return null;
    }

    return { url: data.url };
  } catch (error) {
    console.error('[API] Checkout error:', error);
    return null;
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('[API] Logout error:', error);
  }
};
