import { Injectable } from '@nestjs/common';
import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

interface TerminalSession {
  id: string;
  pty: pty.IPty;
  userId: string;
  projectPath?: string;
}

@Injectable()
export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();

  createSession(userId: string, options?: { cols?: number; rows?: number; cwd?: string; projectId?: string }): string {
    const id = uuidv4();
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

    // Determine working directory
    let cwd = options?.cwd || process.cwd();
    
    // If projectId provided, use the project workspace directory
    if (options?.projectId) {
      const workspacesDir = process.env.WORKSPACES_DIR || '/tmp/workspaces';
      const projectPath = `${workspacesDir}/${options.projectId}`;
      if (fs.existsSync(projectPath)) {
        cwd = projectPath;
      }
    }

    console.log(`[Terminal] Creating session in directory: ${cwd}`);

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: options?.cols || 80,
      rows: options?.rows || 24,
      cwd,
      env: {
        ...process.env as Record<string, string>,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    this.sessions.set(id, {
      id,
      pty: ptyProcess,
      userId,
      projectPath: cwd,
    });

    return id;
  }

  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  write(id: string, data: string): boolean {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.write(data);
      return true;
    }
    return false;
  }

  resize(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.resize(cols, rows);
      return true;
    }
    return false;
  }

  destroySession(id: string): boolean {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.kill();
      this.sessions.delete(id);
      return true;
    }
    return false;
  }

  destroyUserSessions(userId: string): number {
    let count = 0;
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        session.pty.kill();
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }

  listSessions(userId: string): string[] {
    return Array.from(this.sessions.entries())
      .filter(([_, session]) => session.userId === userId)
      .map(([id]) => id);
  }

  onData(id: string, callback: (data: string) => void): void {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.onData(callback);
    }
  }

  onExit(id: string, callback: (exitCode: number) => void): void {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.onExit(({ exitCode }) => callback(exitCode));
    }
  }
}
