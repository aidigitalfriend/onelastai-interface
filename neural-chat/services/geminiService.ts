
import { SettingsState, CanvasState } from "../types";

// API Base URL - use the backend API
const API_BASE = '/api';

export const callGemini = async (
  prompt: string, 
  settings: SettingsState
): Promise<{ 
  text: string; 
  isImage?: boolean; 
  urls?: string[]; 
  navigationUrl?: string;
  canvasUpdate?: Partial<CanvasState>;
}> => {
  try {
    // Map provider based on settings
    let provider = 'gemini';
    let model = settings.model || 'gemini-2.0-flash';
    
    // Map model names to providers
    if (model.startsWith('claude')) {
      provider = 'anthropic';
    } else if (model.startsWith('gpt')) {
      provider = 'openai';
    } else if (model.startsWith('mistral')) {
      provider = 'mistral';
    } else if (model.startsWith('grok')) {
      provider = 'xai';
    } else if (model.startsWith('llama') || model.startsWith('mixtral')) {
      provider = 'groq';
    }

    // Build system prompt with canvas capabilities
    const systemPrompt = settings.customPrompt + `

WORKSPACE CAPABILITIES:
1. You are Neural Companion, an AI assistant integrated into the Neural Link workspace.
2. You can help with coding, writing, research, and creative tasks.
3. Be concise but thorough. Use markdown formatting when helpful.
4. If asked to create code or documents, provide complete working solutions.`;

    const response = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for session cookies
      body: JSON.stringify({
        message: prompt,
        provider,
        model,
        systemPrompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        return { text: "⚠️ Please sign in to use Neural Chat. Click the lock icon or go to the home page to sign in." };
      }
      if (response.status === 402) {
        return { text: "⚠️ Insufficient credits. Please purchase more credits from the dashboard to continue." };
      }
      throw new Error(data.error || 'Failed to send message');
    }

    return { 
      text: data.response?.content || data.assistantMessage?.content || "Command processed successfully.",
      urls: data.response?.urls,
    };

  } catch (error: any) {
    console.error("API Error:", error);
    return { text: `CRITICAL_ERROR: ${error.message || "Connection failure. Please check your network."}` };
  }
};
