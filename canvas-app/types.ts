export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  hasAudio?: boolean;
}

export type ModelProvider =
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

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  isThinking?: boolean;
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
