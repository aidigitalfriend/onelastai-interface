// Real-Time Collaboration Service
// Provides Live Share, presence, cursor sharing, voice/chat, permissions, and session recording

import { io, Socket } from 'socket.io-client';

// Types
export type UserRole = 'owner' | 'editor' | 'viewer';
export type SessionState = 'active' | 'paused' | 'ended';

export interface CollaboratorUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  role: UserRole;
  isOnline: boolean;
  lastActivity: Date;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  isTyping?: boolean;
  isSpeaking?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

export interface CursorPosition {
  filePath: string;
  line: number;
  column: number;
  timestamp: number;
}

export interface SelectionRange {
  filePath: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface CollaborationSession {
  id: string;
  name: string;
  hostId: string;
  projectId: string;
  state: SessionState;
  participants: CollaboratorUser[];
  settings: SessionSettings;
  createdAt: Date;
  inviteCode?: string;
  inviteUrl?: string;
}

export interface SessionSettings {
  allowAnonymous: boolean;
  requireApproval: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  allowChat: boolean;
  allowTerminalSharing: boolean;
  allowDebugSharing: boolean;
  defaultRole: UserRole;
  maxParticipants: number;
  autoRecord: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  type: 'text' | 'code' | 'file' | 'system';
  timestamp: Date;
  reactions?: Record<string, string[]>;
  replyTo?: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file' | 'code-snippet';
  name: string;
  url?: string;
  content?: string;
  language?: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  ownerId: string;
  isShared: boolean;
  allowInput: boolean;
  participants: string[];
}

export interface DebugSession {
  id: string;
  name: string;
  ownerId: string;
  isShared: boolean;
  breakpoints: Breakpoint[];
  currentFrame?: StackFrame;
}

export interface Breakpoint {
  id: string;
  filePath: string;
  line: number;
  condition?: string;
  hitCount?: number;
  enabled: boolean;
}

export interface StackFrame {
  id: number;
  name: string;
  filePath: string;
  line: number;
  column: number;
  scopes: DebugScope[];
}

export interface DebugScope {
  name: string;
  variables: DebugVariable[];
}

export interface DebugVariable {
  name: string;
  value: string;
  type: string;
}

export interface SessionRecording {
  id: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  events: RecordingEvent[];
  participants: string[];
  size: number;
}

export interface RecordingEvent {
  timestamp: number;
  type: 'edit' | 'cursor' | 'selection' | 'chat' | 'terminal' | 'debug' | 'join' | 'leave' | 'voice';
  userId: string;
  data: any;
}

export interface FileOperation {
  type: 'insert' | 'delete' | 'replace';
  filePath: string;
  position: { line: number; column: number };
  text?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

// Event types
export type CollaborationEventType =
  | 'connected'
  | 'disconnected'
  | 'session:created'
  | 'session:joined'
  | 'session:left'
  | 'session:ended'
  | 'user:joined'
  | 'user:left'
  | 'user:updated'
  | 'cursor:moved'
  | 'selection:changed'
  | 'file:changed'
  | 'chat:message'
  | 'chat:typing'
  | 'voice:started'
  | 'voice:ended'
  | 'terminal:shared'
  | 'terminal:input'
  | 'terminal:output'
  | 'debug:started'
  | 'debug:breakpoint'
  | 'debug:step'
  | 'recording:started'
  | 'recording:stopped'
  | 'permission:changed'
  | 'error';

export interface CollaborationEvent {
  type: CollaborationEventType;
  data?: any;
  error?: string;
}

// User colors for presence
const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#16A085',
  '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6',
  '#F39C12', '#1ABC9C', '#E91E63', '#00BCD4',
];

class CollaborationService {
  private socket: Socket | null = null;
  private currentUser: CollaboratorUser | null = null;
  private currentSession: CollaborationSession | null = null;
  private eventListeners: Map<CollaborationEventType, Set<(event: CollaborationEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isRecording = false;
  private recordingEvents: RecordingEvent[] = [];
  private recordingStartTime: number = 0;
  
  // Voice/Video
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private audioContext: AudioContext | null = null;
  private audioAnalysers: Map<string, AnalyserNode> = new Map();

  // Initialize collaboration service
  async initialize(serverUrl?: string): Promise<void> {
    // Use api subdomain in production, localhost in development
    const defaultUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? 'wss://api.maula.dev'
      : 'ws://localhost:3001';
    const url = serverUrl || process.env.VITE_COLLABORATION_URL || defaultUrl;
    
    this.socket = io(`${url}/collaboration`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.emit({ type: 'connected' });
      console.log('🔗 Collaboration connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.emit({ type: 'disconnected', data: { reason } });
      console.log('🔌 Collaboration disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.emit({ type: 'error', error: error.message });
      console.error('❌ Collaboration error:', error);
    });

    // Session events
    this.socket.on('session:created', (data) => {
      this.currentSession = data.session;
      this.emit({ type: 'session:created', data });
    });

    this.socket.on('session:joined', (data) => {
      this.currentSession = data.session;
      this.emit({ type: 'session:joined', data });
    });

    this.socket.on('session:ended', (data) => {
      this.currentSession = null;
      this.emit({ type: 'session:ended', data });
    });

    // User events
    this.socket.on('user:joined', (data) => {
      if (this.currentSession) {
        const existingIndex = this.currentSession.participants.findIndex(p => p.id === data.user.id);
        if (existingIndex === -1) {
          this.currentSession.participants.push(data.user);
        }
      }
      this.emit({ type: 'user:joined', data });
    });

    this.socket.on('user:left', (data) => {
      if (this.currentSession) {
        this.currentSession.participants = this.currentSession.participants.filter(p => p.id !== data.userId);
      }
      this.emit({ type: 'user:left', data });
    });

    this.socket.on('user:updated', (data) => {
      if (this.currentSession) {
        const index = this.currentSession.participants.findIndex(p => p.id === data.user.id);
        if (index !== -1) {
          this.currentSession.participants[index] = { ...this.currentSession.participants[index], ...data.user };
        }
      }
      this.emit({ type: 'user:updated', data });
    });

    // Cursor/Selection events
    this.socket.on('cursor:moved', (data) => {
      this.recordEvent('cursor', data.userId, data);
      this.emit({ type: 'cursor:moved', data });
    });

    this.socket.on('selection:changed', (data) => {
      this.recordEvent('selection', data.userId, data);
      this.emit({ type: 'selection:changed', data });
    });

    // File events
    this.socket.on('file:changed', (data) => {
      this.recordEvent('edit', data.userId, data);
      this.emit({ type: 'file:changed', data });
    });

    // Chat events
    this.socket.on('chat:message', (data) => {
      this.recordEvent('chat', data.message.userId, data.message);
      this.emit({ type: 'chat:message', data });
    });

    this.socket.on('chat:typing', (data) => {
      this.emit({ type: 'chat:typing', data });
    });

    // Voice events
    this.socket.on('voice:started', (data) => {
      this.recordEvent('voice', data.userId, { action: 'started' });
      this.emit({ type: 'voice:started', data });
    });

    this.socket.on('voice:ended', (data) => {
      this.recordEvent('voice', data.userId, { action: 'ended' });
      this.emit({ type: 'voice:ended', data });
    });

    // Terminal events
    this.socket.on('terminal:shared', (data) => {
      this.emit({ type: 'terminal:shared', data });
    });

    this.socket.on('terminal:output', (data) => {
      this.recordEvent('terminal', data.userId, data);
      this.emit({ type: 'terminal:output', data });
    });

    // Debug events
    this.socket.on('debug:started', (data) => {
      this.emit({ type: 'debug:started', data });
    });

    this.socket.on('debug:breakpoint', (data) => {
      this.recordEvent('debug', data.userId, data);
      this.emit({ type: 'debug:breakpoint', data });
    });

    // Recording events
    this.socket.on('recording:started', (data) => {
      this.emit({ type: 'recording:started', data });
    });

    this.socket.on('recording:stopped', (data) => {
      this.emit({ type: 'recording:stopped', data });
    });

    // Permission events
    this.socket.on('permission:changed', (data) => {
      this.emit({ type: 'permission:changed', data });
    });

    // WebRTC signaling
    this.socket.on('rtc:offer', (data) => this.handleRTCOffer(data));
    this.socket.on('rtc:answer', (data) => this.handleRTCAnswer(data));
    this.socket.on('rtc:ice-candidate', (data) => this.handleRTCIceCandidate(data));
  }

  // Event system
  on(type: CollaborationEventType, callback: (event: CollaborationEvent) => void): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(callback);
    
    return () => {
      this.eventListeners.get(type)?.delete(callback);
    };
  }

  private emit(event: CollaborationEvent): void {
    this.eventListeners.get(event.type)?.forEach(cb => cb(event));
  }

  // Session management
  async createSession(options: {
    name: string;
    projectId: string;
    settings?: Partial<SessionSettings>;
  }): Promise<CollaborationSession> {
    if (!this.socket) throw new Error('Not connected');

    const settings: SessionSettings = {
      allowAnonymous: false,
      requireApproval: false,
      allowVoice: true,
      allowVideo: true,
      allowChat: true,
      allowTerminalSharing: true,
      allowDebugSharing: true,
      defaultRole: 'editor',
      maxParticipants: 10,
      autoRecord: false,
      ...options.settings,
    };

    return new Promise((resolve, reject) => {
      this.socket!.emit('session:create', {
        name: options.name,
        projectId: options.projectId,
        settings,
      }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.currentSession = response.session;
          resolve(response.session);
        }
      });
    });
  }

  async joinSession(sessionId: string, user: { name: string; email?: string }): Promise<CollaborationSession> {
    if (!this.socket) throw new Error('Not connected');

    const colorIndex = Math.floor(Math.random() * USER_COLORS.length);
    this.currentUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: user.name,
      email: user.email,
      color: USER_COLORS[colorIndex],
      role: 'viewer',
      isOnline: true,
      lastActivity: new Date(),
    };

    return new Promise((resolve, reject) => {
      this.socket!.emit('session:join', {
        sessionId,
        user: this.currentUser,
      }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.currentSession = response.session;
          this.currentUser = response.user;
          this.recordEvent('join', this.currentUser!.id, { sessionId });
          resolve(response.session);
        }
      });
    });
  }

  async joinByInviteCode(inviteCode: string, user: { name: string; email?: string }): Promise<CollaborationSession> {
    if (!this.socket) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      this.socket!.emit('session:join-by-code', {
        inviteCode,
        user,
      }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.currentSession = response.session;
          this.currentUser = response.user;
          resolve(response.session);
        }
      });
    });
  }

  async leaveSession(): Promise<void> {
    if (!this.socket || !this.currentSession) return;

    if (this.currentUser) {
      this.recordEvent('leave', this.currentUser.id, { sessionId: this.currentSession.id });
    }

    return new Promise((resolve) => {
      this.socket!.emit('session:leave', {
        sessionId: this.currentSession!.id,
      }, () => {
        this.currentSession = null;
        this.stopRecording();
        resolve();
      });
    });
  }

  async endSession(): Promise<void> {
    if (!this.socket || !this.currentSession) return;

    return new Promise((resolve, reject) => {
      this.socket!.emit('session:end', {
        sessionId: this.currentSession!.id,
      }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.currentSession = null;
          this.stopRecording();
          resolve();
        }
      });
    });
  }

  generateInviteLink(): string | null {
    if (!this.currentSession) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/collab/${this.currentSession.inviteCode}`;
  }

  // Cursor & Selection
  updateCursor(cursor: CursorPosition): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;

    this.socket.emit('cursor:update', {
      sessionId: this.currentSession.id,
      userId: this.currentUser.id,
      cursor: { ...cursor, timestamp: Date.now() },
    });
  }

  updateSelection(selection: SelectionRange | null): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;

    this.socket.emit('selection:update', {
      sessionId: this.currentSession.id,
      userId: this.currentUser.id,
      selection,
    });
  }

  // File operations (CRDT-based)
  sendFileOperation(operation: FileOperation): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;

    this.socket.emit('file:operation', {
      sessionId: this.currentSession.id,
      operation: {
        ...operation,
        userId: this.currentUser.id,
        timestamp: Date.now(),
      },
    });
  }

  // Chat
  sendChatMessage(content: string, type: ChatMessage['type'] = 'text', attachments?: ChatAttachment[]): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;

    const message: Partial<ChatMessage> = {
      sessionId: this.currentSession.id,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userColor: this.currentUser.color,
      content,
      type,
      timestamp: new Date(),
      attachments,
    };

    this.socket.emit('chat:send', { message });
  }

  sendTypingIndicator(isTyping: boolean): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;

    this.socket.emit('chat:typing', {
      sessionId: this.currentSession.id,
      userId: this.currentUser.id,
      isTyping,
    });
  }

  addReaction(messageId: string, reaction: string): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;

    this.socket.emit('chat:react', {
      sessionId: this.currentSession.id,
      messageId,
      userId: this.currentUser.id,
      reaction,
    });
  }

  // Voice/Video (WebRTC)
  async startVoice(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Set up voice activity detection
      const analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      source.connect(analyser);
      this.audioAnalysers.set('local', analyser);

      // Notify others
      if (this.socket && this.currentSession && this.currentUser) {
        this.socket.emit('voice:start', {
          sessionId: this.currentSession.id,
          userId: this.currentUser.id,
        });

        // Initialize peer connections for all participants
        for (const participant of this.currentSession.participants) {
          if (participant.id !== this.currentUser.id && participant.audioEnabled) {
            await this.createPeerConnection(participant.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to start voice:', error);
      throw error;
    }
  }

  async stopVoice(): Promise<void> {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    if (this.socket && this.currentSession && this.currentUser) {
      this.socket.emit('voice:stop', {
        sessionId: this.currentSession.id,
        userId: this.currentUser.id,
      });
    }
  }

  async startVideo(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      if (this.socket && this.currentSession && this.currentUser) {
        this.socket.emit('video:start', {
          sessionId: this.currentSession.id,
          userId: this.currentUser.id,
        });
      }

      return this.localStream;
    } catch (error) {
      console.error('Failed to start video:', error);
      throw error;
    }
  }

  async stopVideo(): Promise<void> {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.socket && this.currentSession && this.currentUser) {
      this.socket.emit('video:stop', {
        sessionId: this.currentSession.id,
        userId: this.currentUser.id,
      });
    }
  }

  private async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('rtc:ice-candidate', {
          peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      // Handle remote track (audio/video)
      this.emit({ type: 'voice:started', data: { userId: peerId, stream: event.streams[0] } });
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (this.socket) {
      this.socket.emit('rtc:offer', {
        peerId,
        offer,
      });
    }

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private async handleRTCOffer(data: { peerId: string; offer: RTCSessionDescriptionInit }): Promise<void> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('rtc:ice-candidate', {
          peerId: data.peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      this.emit({ type: 'voice:started', data: { userId: data.peerId, stream: event.streams[0] } });
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    await pc.setRemoteDescription(data.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (this.socket) {
      this.socket.emit('rtc:answer', {
        peerId: data.peerId,
        answer,
      });
    }

    this.peerConnections.set(data.peerId, pc);
  }

  private async handleRTCAnswer(data: { peerId: string; answer: RTCSessionDescriptionInit }): Promise<void> {
    const pc = this.peerConnections.get(data.peerId);
    if (pc) {
      await pc.setRemoteDescription(data.answer);
    }
  }

  private async handleRTCIceCandidate(data: { peerId: string; candidate: RTCIceCandidateInit }): Promise<void> {
    const pc = this.peerConnections.get(data.peerId);
    if (pc) {
      await pc.addIceCandidate(data.candidate);
    }
  }

  // Terminal sharing
  shareTerminal(terminalId: string, allowInput: boolean = false): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;

    this.socket.emit('terminal:share', {
      sessionId: this.currentSession.id,
      terminalId,
      userId: this.currentUser.id,
      allowInput,
    });
  }

  stopSharingTerminal(terminalId: string): void {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('terminal:unshare', {
      sessionId: this.currentSession.id,
      terminalId,
    });
  }

  sendTerminalInput(terminalId: string, input: string): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;

    this.socket.emit('terminal:input', {
      sessionId: this.currentSession.id,
      terminalId,
      userId: this.currentUser.id,
      input,
    });
  }

  // Debug sharing
  shareDebugSession(debugSessionId: string): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;

    this.socket.emit('debug:share', {
      sessionId: this.currentSession.id,
      debugSessionId,
      userId: this.currentUser.id,
    });
  }

  syncBreakpoint(breakpoint: Breakpoint): void {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('debug:breakpoint', {
      sessionId: this.currentSession.id,
      breakpoint,
    });
  }

  // Permissions
  updateUserRole(userId: string, role: UserRole): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;
    if (this.currentUser.role !== 'owner') {
      console.error('Only owner can change roles');
      return;
    }

    this.socket.emit('permission:update', {
      sessionId: this.currentSession.id,
      userId,
      role,
    });
  }

  kickUser(userId: string): void {
    if (!this.socket || !this.currentSession || !this.currentUser) return;
    if (this.currentUser.role !== 'owner') {
      console.error('Only owner can kick users');
      return;
    }

    this.socket.emit('user:kick', {
      sessionId: this.currentSession.id,
      userId,
    });
  }

  canEdit(): boolean {
    return this.currentUser?.role === 'owner' || this.currentUser?.role === 'editor';
  }

  canManageSession(): boolean {
    return this.currentUser?.role === 'owner';
  }

  // Session recording
  startRecording(): void {
    if (this.isRecording) return;
    
    this.isRecording = true;
    this.recordingEvents = [];
    this.recordingStartTime = Date.now();

    if (this.socket && this.currentSession) {
      this.socket.emit('recording:start', {
        sessionId: this.currentSession.id,
      });
    }
  }

  stopRecording(): SessionRecording | null {
    if (!this.isRecording) return null;

    this.isRecording = false;
    const endTime = Date.now();

    const recording: SessionRecording = {
      id: `recording-${Date.now()}`,
      sessionId: this.currentSession?.id || '',
      startTime: new Date(this.recordingStartTime),
      endTime: new Date(endTime),
      duration: endTime - this.recordingStartTime,
      events: this.recordingEvents,
      participants: this.currentSession?.participants.map(p => p.id) || [],
      size: JSON.stringify(this.recordingEvents).length,
    };

    if (this.socket && this.currentSession) {
      this.socket.emit('recording:stop', {
        sessionId: this.currentSession.id,
        recording,
      });
    }

    this.recordingEvents = [];
    return recording;
  }

  private recordEvent(type: RecordingEvent['type'], userId: string, data: any): void {
    if (!this.isRecording) return;

    this.recordingEvents.push({
      timestamp: Date.now() - this.recordingStartTime,
      type,
      userId,
      data,
    });
  }

  isRecordingActive(): boolean {
    return this.isRecording;
  }

  // Getters
  getSession(): CollaborationSession | null {
    return this.currentSession;
  }

  getCurrentUser(): CollaboratorUser | null {
    return this.currentUser;
  }

  getParticipants(): CollaboratorUser[] {
    return this.currentSession?.participants || [];
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Cleanup
  disconnect(): void {
    this.leaveSession();
    this.stopVoice();
    this.socket?.disconnect();
    this.socket = null;
    this.currentUser = null;
    this.currentSession = null;
    this.eventListeners.clear();
  }
}

// Singleton instance
export const collaborationService = new CollaborationService();
export default collaborationService;
