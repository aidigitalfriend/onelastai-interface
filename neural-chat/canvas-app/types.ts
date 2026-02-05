export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  hasAudio?: boolean;
}

export type ModelProvider =
  | 'Maula AI'
  | 'Image Generator'
  | 'Designer'
  | 'Planner'
  | 'Code Builder'
  | 'Fast Coding'
  | 'OpenAI'
  | 'Anthropic'
  | 'Groq'
  | 'Mistral'
  | 'Cohere'
  | 'xAI'
  | 'Gemini'
  | 'google'
  | 'openai'
  | 'groq'
  | 'xai'
  | 'anthropic';

// Backend provider IDs
export type BackendProvider = 'mistral' | 'openai' | 'gemini' | 'anthropic' | 'groq' | 'cerebras' | 'xai';

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  backendProvider?: BackendProvider;
  description: string;
  isThinking?: boolean;
  icon?: string;
}

export interface GeneratedApp {
  id: string;
  name: string;
  code: string;
  prompt: string;
  timestamp: number;
  history: ChatMessage[];
}

export enum ViewMode {
  PREVIEW = 'PREVIEW',
  CODE = 'CODE',
  SPLIT = 'SPLIT',
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  progressMessage: string;
  isThinking?: boolean;
}
