import { SettingsState, NavItem } from './types';

export const PROVIDER_CONFIG = [
  {
    id: 'anthropic',
    name: 'Maula AI',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Code Expert Pro' },
      { id: 'claude-3-opus-20240229', name: 'Deep Thinker' },
      { id: 'claude-3-haiku-20240307', name: 'Quick Response' }
    ]
  },
  {
    id: 'openai',
    name: 'One Last AI',
    models: [
      { id: 'gpt-4o', name: 'Vision Master' },
      { id: 'gpt-4-turbo', name: 'Power Engine' },
      { id: 'gpt-4o-mini', name: 'Fast Code' },
      { id: 'gpt-3.5-turbo', name: 'Lightning' }
    ]
  },
  {
    id: 'gemini',
    name: 'Planner',
    models: [
      { id: 'gemini-2.0-flash', name: 'Flash Think' },
      { id: 'gemini-1.5-pro', name: 'Strategic Mind' },
      { id: 'gemini-1.5-flash', name: 'Rapid Plan' }
    ]
  },
  {
    id: 'mistral',
    name: 'Code Expert',
    models: [
      { id: 'mistral-large-latest', name: 'Master Coder' },
      { id: 'mistral-medium-latest', name: 'Pro Coder' },
      { id: 'mistral-small-latest', name: 'Quick Coder' }
    ]
  },
  {
    id: 'xai',
    name: 'Designer',
    models: [
      { id: 'grok-beta', name: 'Creative Studio' },
      { id: 'grok-2', name: 'Design Pro' }
    ]
  },
  {
    id: 'groq',
    name: 'Speed AI',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Ultra Fast' },
      { id: 'llama-3.1-8b-instant', name: 'Instant Reply' },
      { id: 'mixtral-8x7b-32768', name: 'Turbo Mix' }
    ]
  }
];

export const DEFAULT_SETTINGS: SettingsState = {
  customPrompt: "You are a helpful AI assistant. Be concise, accurate, and helpful.",
  agentName: "Neural Agent",
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
