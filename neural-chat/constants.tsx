
import { SettingsState, NavItem } from './types';

export const PROVIDER_CONFIG = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    models: ['gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-2.5-flash-lite-latest', 'gemini-2.5-flash-native-audio-preview-09-2025', 'gemini-2.5-flash-image']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4-turbo', 'o1-preview', 'gpt-4o-mini']
  }
];

export const DEFAULT_SETTINGS: SettingsState = {
  customPrompt: "You are a helpful assistant.",
  agentName: "Neural Companion",
  temperature: 0.7,
  maxTokens: 2048,
  provider: 'gemini',
  model: "gemini-3-flash-preview",
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
