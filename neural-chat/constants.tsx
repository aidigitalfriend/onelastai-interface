
import { SettingsState, NavItem } from './types';

export const PROVIDER_CONFIG = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  {
    id: 'mistral',
    name: 'Mistral',
    models: ['mistral-large-latest', 'mistral-small-latest']
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    models: ['grok-2', 'grok-2-mini']
  },
  {
    id: 'groq',
    name: 'Groq',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
  }
];

export const DEFAULT_SETTINGS: SettingsState = {
  customPrompt: "You are a helpful AI assistant called Neural Companion. Be concise, helpful, and friendly.",
  agentName: "Neural Companion",
  temperature: 0.7,
  maxTokens: 2048,
  provider: 'anthropic',
  model: "claude-3-5-sonnet-20241022",
  activeTool: 'none',
  workspaceMode: 'CHAT',
  portalUrl: 'https://www.google.com/search?igu=1',
  canvas: {
    content: "// AGENT_DIRECTIVE: Collaborative workspace active.\n\nReady for synthesis.",
    type: 'text',
    title: 'Neural_Canvas_01'
  }
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Create Image', icon: '🎨', tool: 'image_gen', description: 'Visual synthesis module' },
  { label: 'Thinking', icon: '💡', tool: 'thinking', description: 'Chain-of-thought processing' },
  { label: 'Deep Research', icon: '🔭', tool: 'deep_research', description: 'Multi-layer semantic analysis' },
  { label: 'Web Portal', icon: '🌐', tool: 'browser', description: 'Interactive web integration' },
  { label: 'Study and Learn', icon: '📚', tool: 'study', description: 'Pedagogical core enabled' },
  { label: 'Web Search', icon: '🔍', tool: 'web_search', description: 'Real-time global grounding' },
  { label: 'Canvas', icon: '🖌️', tool: 'canvas', description: 'Creative writing workspace' },
  { label: 'Quizzes', icon: '📝', tool: 'quizzes', description: 'Knowledge testing protocol' },
  { label: 'Canvas App', icon: '💻', tool: 'canvas_app', description: 'Full-stack code generation studio' }
];

export const NEURAL_PRESETS: Record<string, { prompt: string; temp: number }> = {
  educational: { prompt: "You are an educational mentor. Use clear logic and analogies.", temp: 0.5 },
  professional: { prompt: "You are a professional business advisor. Use formal language and precise data.", temp: 0.3 },
  creative: { prompt: "You are a creative visionary. Generate imaginative and novel thoughts.", temp: 1.5 },
  coding: { prompt: "You are a senior software engineer. Provide clean, documented code.", temp: 0.4 }
};
