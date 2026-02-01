/**
 * Production-Level WebSocket Gateway
 * Features:
 * - JWT authentication for WebSocket connections
 * - Session management with heartbeat
 * - Rate limiting per client
 * - Terminal session persistence and recovery
 * - Connection state management
 * - Graceful reconnection handling
 * - Activity tracking and cleanup
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TerminalService } from '../terminal/terminal.service';
import { AIService } from '../ai/ai.service';

// Utility to safely extract error message from unknown error type
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return getErrorMessage(error);
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

// ==================== Types ====================

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
  lastActivity?: number;
}

interface TerminalSessionInfo {
  id: string;
  clientId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  isAlive: boolean;
}

interface ClientInfo {
  id: string;
  userId?: string;
  connectedAt: number;
  lastActivity: number;
  terminals: string[];
  rateLimitCounter: number;
  rateLimitReset: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// ==================== Decorators ====================

// Custom guard for WebSocket authentication
@Injectable()
class WsAuthGuard {
  constructor(private jwtService: JwtService) {}

  canActivate(context: any): boolean {
    const client: AuthenticatedSocket = context.switchToWs().getClient();
    return !!client.userId;
  }
}

// ==================== Gateway ====================

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://maula.dev',
      'https://app.maula.dev',
      'https://www.maula.dev',
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class ProductionAppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('WebSocketGateway');
  
  // Client tracking
  private clients: Map<string, ClientInfo> = new Map();
  private terminalSessions: Map<string, TerminalSessionInfo> = new Map();
  
  // Rate limiting
  private rateLimits: Map<string, RateLimitConfig> = new Map([
    ['terminal:input', { maxRequests: 100, windowMs: 1000 }],
    ['ai:chat', { maxRequests: 10, windowMs: 60000 }],
    ['default', { maxRequests: 50, windowMs: 1000 }],
  ]);

  // Heartbeat interval
  private heartbeatInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly terminalService: TerminalService,
    private readonly aiService: AIService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== Lifecycle ====================

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // Start heartbeat checker
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 30000);

    // Start cleanup job for inactive sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000);

    // Middleware for authentication
    server.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = this.extractToken(socket);
        
        if (token) {
          const payload = await this.verifyToken(token);
          if (payload) {
            socket.userId = payload.sub || payload.userId;
            socket.sessionId = payload.sessionId;
          }
        }
        
        // Allow anonymous connections with limited capabilities
        next();
      } catch (error) {
        this.logger.warn(`Auth error: ${getErrorMessage(error)}`);
        next(); // Allow connection but mark as unauthenticated
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    const clientInfo: ClientInfo = {
      id: client.id,
      userId: client.userId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      terminals: [],
      rateLimitCounter: 0,
      rateLimitReset: Date.now(),
    };
    
    this.clients.set(client.id, clientInfo);
    
    this.logger.log(`Client connected: ${client.id} (User: ${client.userId || 'anonymous'})`);
    
    // Send connection confirmation
    client.emit('connection:established', {
      clientId: client.id,
      authenticated: !!client.userId,
      serverTime: Date.now(),
    });

    // Attempt to restore previous sessions if authenticated
    if (client.userId) {
      this.restoreSessions(client);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const clientInfo = this.clients.get(client.id);
    
    if (clientInfo) {
      this.logger.log(`Client disconnected: ${client.id} (Terminals: ${clientInfo.terminals.length})`);
      
      // Mark terminals as inactive but don't destroy them immediately
      // This allows for reconnection
      for (const terminalId of clientInfo.terminals) {
        const session = this.terminalSessions.get(terminalId);
        if (session) {
          session.isAlive = false;
          session.lastActivity = Date.now();
        }
      }
      
      this.clients.delete(client.id);
    }
  }

  // ==================== Authentication ====================

  private extractToken(socket: Socket): string | null {
    // Try auth header
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Try query parameter
    const token = socket.handshake.query.token as string;
    if (token) {
      return token;
    }
    
    // Try auth object
    if (socket.handshake.auth?.token) {
      return socket.handshake.auth.token;
    }
    
    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      return null;
    }
  }

  @SubscribeMessage('auth:login')
  async handleAuthLogin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string },
  ) {
    try {
      const payload = await this.verifyToken(data.token);
      
      if (payload) {
        client.userId = payload.sub || payload.userId;
        client.sessionId = payload.sessionId;
        
        const clientInfo = this.clients.get(client.id);
        if (clientInfo) {
          clientInfo.userId = client.userId;
        }
        
        // Restore sessions after authentication
        this.restoreSessions(client);
        
        return { success: true, userId: client.userId };
      }
      
      return { success: false, error: 'Invalid token' };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ==================== Rate Limiting ====================

  private checkRateLimit(clientId: string, action: string): boolean {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) return false;
    
    const config = this.rateLimits.get(action) || this.rateLimits.get('default')!;
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now > clientInfo.rateLimitReset) {
      clientInfo.rateLimitCounter = 0;
      clientInfo.rateLimitReset = now + config.windowMs;
    }
    
    clientInfo.rateLimitCounter++;
    
    if (clientInfo.rateLimitCounter > config.maxRequests) {
      this.logger.warn(`Rate limit exceeded for client ${clientId} on action ${action}`);
      return false;
    }
    
    return true;
  }

  // ==================== Session Management ====================

  private async restoreSessions(client: AuthenticatedSocket) {
    if (!client.userId) return;
    
    // Find orphaned sessions for this user
    const orphanedSessions: TerminalSessionInfo[] = [];
    
    for (const [id, session] of this.terminalSessions) {
      if (session.userId === client.userId && !session.isAlive) {
        orphanedSessions.push(session);
      }
    }
    
    if (orphanedSessions.length > 0) {
      client.emit('sessions:recoverable', {
        sessions: orphanedSessions.map(s => ({
          id: s.id,
          createdAt: s.createdAt,
          lastActivity: s.lastActivity,
        })),
      });
    }
  }

  @SubscribeMessage('session:recover')
  handleSessionRecover(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { terminalId: string },
  ) {
    const session = this.terminalSessions.get(data.terminalId);
    
    if (session && session.userId === client.userId) {
      // Update session
      session.clientId = client.id;
      session.isAlive = true;
      session.lastActivity = Date.now();
      
      // Update client info
      const clientInfo = this.clients.get(client.id);
      if (clientInfo && !clientInfo.terminals.includes(data.terminalId)) {
        clientInfo.terminals.push(data.terminalId);
      }
      
      // Re-attach output handler
      this.terminalService.onData(data.terminalId, (output) => {
        client.emit('terminal:output', { terminalId: data.terminalId, data: output });
      });
      
      client.emit('session:recovered', { terminalId: data.terminalId });
      return { success: true };
    }
    
    return { success: false, error: 'Session not found or not authorized' };
  }

  private checkHeartbeats() {
    const now = Date.now();
    const timeout = 120000; // 2 minutes
    
    for (const [id, session] of this.terminalSessions) {
      if (session.isAlive && now - session.lastActivity > timeout) {
        session.isAlive = false;
        this.logger.debug(`Terminal ${id} marked inactive due to timeout`);
      }
    }
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    const maxInactiveTime = 300000; // 5 minutes
    
    for (const [id, session] of this.terminalSessions) {
      if (!session.isAlive && now - session.lastActivity > maxInactiveTime) {
        this.terminalService.destroySession(id);
        this.terminalSessions.delete(id);
        this.logger.log(`Cleaned up inactive terminal: ${id}`);
      }
    }
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = Date.now();
      
      // Update all terminal sessions for this client
      for (const terminalId of clientInfo.terminals) {
        const session = this.terminalSessions.get(terminalId);
        if (session) {
          session.lastActivity = Date.now();
        }
      }
    }
    
    return { timestamp: Date.now() };
  }

  // ==================== Terminal Operations ====================

  @SubscribeMessage('terminal:create')
  handleTerminalCreate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { cols?: number; rows?: number; name?: string; projectId?: string; cwd?: string },
  ) {
    if (!this.checkRateLimit(client.id, 'default')) {
      throw new WsException('Rate limit exceeded');
    }

    const userId = client.userId || client.id;
    const terminalId = this.terminalService.createSession(userId, {
      cols: data.cols,
      rows: data.rows,
      projectId: data.projectId,
      cwd: data.cwd,
    });
    
    // Track session
    const sessionInfo: TerminalSessionInfo = {
      id: terminalId,
      clientId: client.id,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isAlive: true,
    };
    this.terminalSessions.set(terminalId, sessionInfo);
    
    // Track terminal for client
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.terminals.push(terminalId);
    }

    // Set up output handler
    this.terminalService.onData(terminalId, (output) => {
      const session = this.terminalSessions.get(terminalId);
      if (session?.isAlive) {
        client.emit('terminal:output', { terminalId, data: output });
        session.lastActivity = Date.now();
      }
    });

    // Set up exit handler
    this.terminalService.onExit(terminalId, (exitCode) => {
      client.emit('terminal:exit', { terminalId, exitCode });
      this.terminalSessions.delete(terminalId);
      
      if (clientInfo) {
        const idx = clientInfo.terminals.indexOf(terminalId);
        if (idx > -1) clientInfo.terminals.splice(idx, 1);
      }
    });

    client.emit('terminal:created', { terminalId });
    this.logger.log(`Terminal created: ${terminalId} for client ${client.id}`);

    return { terminalId };
  }

  @SubscribeMessage('terminal:input')
  handleTerminalInput(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { terminalId: string; input: string },
  ) {
    if (!this.checkRateLimit(client.id, 'terminal:input')) {
      return; // Silently drop input to avoid interruption
    }

    const session = this.terminalSessions.get(data.terminalId);
    
    // Verify ownership
    if (!session || session.clientId !== client.id) {
      throw new WsException('Terminal not found or not authorized');
    }

    this.terminalService.write(data.terminalId, data.input);
    session.lastActivity = Date.now();
  }

  @SubscribeMessage('terminal:resize')
  handleTerminalResize(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { terminalId: string; cols: number; rows: number },
  ) {
    const session = this.terminalSessions.get(data.terminalId);
    
    if (!session || session.clientId !== client.id) {
      throw new WsException('Terminal not found or not authorized');
    }

    this.terminalService.resize(data.terminalId, data.cols, data.rows);
  }

  @SubscribeMessage('terminal:kill')
  handleTerminalKill(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { terminalId: string },
  ) {
    const session = this.terminalSessions.get(data.terminalId);
    
    if (!session || session.clientId !== client.id) {
      throw new WsException('Terminal not found or not authorized');
    }

    this.terminalService.destroySession(data.terminalId);
    this.terminalSessions.delete(data.terminalId);
    
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      const idx = clientInfo.terminals.indexOf(data.terminalId);
      if (idx > -1) clientInfo.terminals.splice(idx, 1);
    }

    client.emit('terminal:killed', { terminalId: data.terminalId });
    this.logger.log(`Terminal killed: ${data.terminalId}`);

    return { success: true };
  }

  @SubscribeMessage('terminal:list')
  handleTerminalList(@ConnectedSocket() client: AuthenticatedSocket) {
    const clientInfo = this.clients.get(client.id);
    const terminals = clientInfo?.terminals.map(id => {
      const session = this.terminalSessions.get(id);
      return session ? {
        id: session.id,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isAlive: session.isAlive,
      } : null;
    }).filter(Boolean) || [];

    return { terminals };
  }

  // ==================== AI Operations ====================

  @SubscribeMessage('ai:chat:stream')
  async handleAIChatStream(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      messages: Array<{ role: string; content: string; images?: string[] }>;
      provider?: string;
      model?: string;
    },
  ) {
    if (!this.checkRateLimit(client.id, 'ai:chat')) {
      client.emit('ai:chat:error', { error: 'Rate limit exceeded. Please wait.' });
      return;
    }

    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = Date.now();
    }

    try {
      // Stream response
      for await (const chunk of this.aiService.streamChat({
        messages: data.messages as any,
        provider: data.provider,
        model: data.model,
      })) {
        client.emit('ai:chat:chunk', { content: chunk });
      }
      
      client.emit('ai:chat:done', {});
    } catch (error) {
      this.logger.error(`AI chat error: ${getErrorMessage(error)}`);
      client.emit('ai:chat:error', { error: getErrorMessage(error) });
    }
  }

  @SubscribeMessage('ai:complete')
  async handleAIComplete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      prefix: string;
      suffix: string;
      language: string;
    },
  ) {
    if (!this.checkRateLimit(client.id, 'ai:chat')) {
      return { completion: '' };
    }

    try {
      const completion = await this.aiService.complete(data);
      client.emit('ai:complete:result', { completion });
      return { completion };
    } catch (error) {
      this.logger.error(`AI completion error: ${getErrorMessage(error)}`);
      return { completion: '', error: getErrorMessage(error) };
    }
  }

  // ==================== Collaboration ====================

  @SubscribeMessage('room:join')
  handleRoomJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; userId?: string; username?: string },
  ) {
    client.join(data.roomId);
    
    const userInfo = {
      id: data.userId || client.userId || client.id,
      username: data.username || 'Anonymous',
      socketId: client.id,
    };
    
    // Notify others in room
    client.to(data.roomId).emit('room:user-joined', userInfo);
    
    this.logger.log(`Client ${client.id} joined room ${data.roomId}`);
    
    return { success: true, roomId: data.roomId };
  }

  @SubscribeMessage('room:leave')
  handleRoomLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    client.leave(data.roomId);
    client.to(data.roomId).emit('room:user-left', { 
      userId: client.userId || client.id,
      socketId: client.id,
    });
    
    return { success: true };
  }

  @SubscribeMessage('room:broadcast')
  handleRoomBroadcast(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; event: string; payload: any },
  ) {
    client.to(data.roomId).emit(data.event, {
      ...data.payload,
      from: client.userId || client.id,
    });
  }

  // ==================== File Sync ====================

  @SubscribeMessage('file:change')
  handleFileChange(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      roomId: string;
      filePath: string;
      content: string;
      version: number;
      cursorPosition?: { line: number; column: number };
    },
  ) {
    client.to(data.roomId).emit('file:changed', {
      userId: client.userId || client.id,
      ...data,
    });
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      roomId: string;
      filePath: string;
      position: { line: number; column: number };
      selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    },
  ) {
    client.to(data.roomId).emit('cursor:moved', {
      userId: client.userId || client.id,
      ...data,
    });
  }

  // ==================== System ====================

  @SubscribeMessage('system:stats')
  handleSystemStats(@ConnectedSocket() client: AuthenticatedSocket) {
    return {
      connectedClients: this.clients.size,
      activeTerminals: this.terminalSessions.size,
      serverTime: Date.now(),
      uptime: process.uptime(),
    };
  }

  // Cleanup on module destroy
  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Cleanup all terminal sessions
    for (const [id] of this.terminalSessions) {
      this.terminalService.destroySession(id);
    }
  }
}
