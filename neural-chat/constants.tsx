
import { SettingsState, NavItem } from './types';

export const PROVIDER_CONFIG = [
  {
    id: 'anthropic',
    name: 'MAULA AI',
    icon: '🧠',
    color: '#ec4899', // pink
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'ULTRA FAST' }
    ]
  },
  {
    id: 'openai',
    name: 'ONE LAST AI',
    icon: '⚡',
    color: '#22c55e', // green
    models: [
      { id: 'gpt-4o', name: 'POWER MODE' },
      { id: 'gpt-4o-mini', name: 'QUICK REPLY' },
      { id: 'gpt-4-turbo', name: 'LIGHT SPEED' }
    ]
  },
  {
    id: 'gemini',
    name: 'PLANNER',
    icon: '📋',
    color: '#94a3b8', // gray
    models: [
      { id: 'gemini-1.5-pro', name: 'MASTER PLAN' },
      { id: 'gemini-2.0-flash', name: 'QUICK PLAN' }
    ]
  },
  {
    id: 'mistral',
    name: 'CODE EXPERT',
    icon: '💻',
    color: '#f97316', // orange
    models: [
      { id: 'codestral-latest', name: 'PRO CODER' },
      { id: 'mistral-large-latest', name: 'SENIOR DEV' },
      { id: 'mistral-small-latest', name: 'QUICK FIX' }
    ]
  },
  {
    id: 'xai',
    name: 'DESIGNER',
    icon: '🎨',
    color: '#06b6d4', // cyan
    models: [
      { id: 'grok-2', name: 'CREATIVE PRO' },
      { id: 'grok-2-mini', name: 'FAST DESIGN' },
      { id: 'grok-beta', name: 'QUICK SKETCH' }
    ]
  },
  {
    id: 'groq',
    name: 'WRITER',
    icon: '✍️',
    color: '#a855f7', // purple
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'BESTSELLER' },
      { id: 'llama-3.1-70b-versatile', name: 'STORY MODE' },
      { id: 'llama-3.1-8b-instant', name: 'QUICK DRAFT' }
    ]
  },
  {
    id: 'cerebras',
    name: 'RESEARCHER',
    icon: '🔬',
    color: '#8b5cf6', // violet
    models: [
      { id: 'llama3.1-70b', name: 'DEEP DIVE' },
      { id: 'llama3.1-8b', name: 'ANALYSIS PRO' },
      { id: 'llama-3.3-70b', name: 'QUICK SEARCH' }
    ]
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
