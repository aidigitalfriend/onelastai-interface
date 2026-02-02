
import { SettingsState, NavItem } from './types';

export const PROVIDER_CONFIG = [
  {
    id: 'cerebras',
    name: 'Maula AI',
    icon: '🧠',
    color: '#ec4899', // pink
    models: [
      { id: 'llama-3.3-70b', name: 'Ultra Fast' }
    ]
  },
  {
    id: 'groq',
    name: 'One Last AI',
    icon: '⚡',
    color: '#22c55e', // green
    models: [
      { id: 'llama-3.3-70b-specdec', name: 'Power Mode' }
    ]
  },
  {
    id: 'xai',
    name: 'Planner',
    icon: '📋',
    color: '#94a3b8', // gray
    models: [
      { id: 'grok-3', name: 'Master Plan' }
    ]
  },
  {
    id: 'anthropic',
    name: 'Code Expert',
    icon: '💻',
    color: '#f97316', // orange
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Pro Coder' }
    ]
  },
  {
    id: 'openai',
    name: 'Designer',
    icon: '🎨',
    color: '#06b6d4', // cyan
    models: [
      { id: 'gpt-4.1', name: 'Creative Pro' }
    ]
  },
  {
    id: 'mistral',
    name: 'Writer',
    icon: '✍️',
    color: '#a855f7', // purple
    models: [
      { id: 'mistral-large-2411', name: 'Bestseller' }
    ]
  },
  {
    id: 'gemini',
    name: 'Researcher',
    icon: '🔬',
    color: '#8b5cf6', // violet
    models: [
      { id: 'gemini-2.0-flash', name: 'Deep Dive' }
    ]
  }
];

export const DEFAULT_SETTINGS: SettingsState = {
  customPrompt: "You are a friendly AI assistant for One LastAI. Be helpful, conversational, and supportive. Help users with their questions and tasks.",
  agentName: "AI Assistant",
  temperature: 0.7,
  maxTokens: 2048,
  provider: 'cerebras',
  model: "llama-3.3-70b",
  activeTool: 'none',
  workspaceMode: 'CHAT',
  portalUrl: 'https://www.google.com/search?igu=1',
  canvas: {
    content: "// Welcome to your workspace!\n\nStart typing or paste content here.",
    type: 'text',
    title: 'Workspace'
  }
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Create Image', icon: '🎨', tool: 'image_gen', description: 'Generate AI images' },
  { label: 'Thinking', icon: '💡', tool: 'thinking', description: 'Deep reasoning mode' },
  { label: 'Deep Research', icon: '🔭', tool: 'deep_research', description: 'Comprehensive research' },
  { label: 'Web Portal', icon: '🌐', tool: 'browser', description: 'Browse the web' },
  { label: 'Study and Learn', icon: '📚', tool: 'study', description: 'Learning assistant' },
  { label: 'Web Search', icon: '🔍', tool: 'web_search', description: 'Search the internet' },
  { label: 'Canvas', icon: '🖌️', tool: 'canvas', description: 'Writing workspace' },
  { label: 'Quizzes', icon: '📝', tool: 'quizzes', description: 'Test your knowledge' },
  { label: 'Canvas App', icon: '💻', tool: 'canvas_app', description: 'Code generation studio' }
];

export const NEURAL_PRESETS: Record<string, { prompt: string; temp: number }> = {
  educational: { prompt: "You are an educational mentor. Use clear logic and analogies.", temp: 0.5 },
  professional: { prompt: "You are a professional business advisor. Use formal language and precise data.", temp: 0.3 },
  creative: { prompt: "You are a creative visionary. Generate imaginative and novel thoughts.", temp: 1.5 },
  coding: { prompt: "You are a senior software engineer. Provide clean, documented code.", temp: 0.4 }
};
