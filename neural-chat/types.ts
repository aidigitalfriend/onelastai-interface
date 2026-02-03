
export type Sender = 'YOU' | 'AGENT' | 'SYSTEM';

export interface FileAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number;
  content?: string; // For text files - actual content
  dataUrl?: string; // For images/binary - base64 data URL
  downloadUrl?: string; // For agent-created files
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: string;
  isImage?: boolean;
  imageData?: string;
  groundingUrls?: string[];
  files?: FileAttachment[]; // Attached files
  codeBlocks?: { language: string; code: string; filename?: string }[];
}

export interface ChatSession {
  id: string;
  name: string;
  active: boolean;
  messages: Message[];
  settings: SettingsState;
}

export type NeuralTool = 
  | 'none' 
  | 'image_gen' 
  | 'thinking' 
  | 'deep_research' 
  | 'shopping' 
  | 'study' 
  | 'web_search' 
  | 'canvas' 
  | 'quizzes'
  | 'browser';

export type WorkspaceMode = 'CHAT' | 'PORTAL' | 'CANVAS';

export interface CanvasState {
  content: string;
  type: 'text' | 'code' | 'html' | 'video' | 'image';
  language?: string;
  title: string;
}

export interface SettingsState {
  customPrompt: string;
  agentName: string;
  temperature: number;
  maxTokens: number;
  provider: string;
  model: string;
  activeTool: NeuralTool;
  workspaceMode: WorkspaceMode;
  portalUrl: string;
  canvas: CanvasState;
}

export interface NavItem {
  label: string;
  icon: string;
  tool: NeuralTool;
  description: string;
}
