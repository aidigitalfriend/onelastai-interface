/**
 * SandboxService — Sandbox lifecycle management client
 * Connects to /api/sandbox/* endpoints for Docker container orchestration
 * 
 * Phase 2: Every project runs in an isolated container
 */

export interface SandboxConfig {
  projectId: string;
  template: SandboxTemplate;
  resources?: SandboxResources;
}

export type SandboxTemplate = 
  | 'node-18' | 'node-20' | 'node-22'
  | 'python-3.11' | 'python-3.12'
  | 'next-app' | 'express-app' | 'vite-app'
  | 'react-app' | 'vue-app' | 'svelte-app';

export interface SandboxResources {
  memory: number;   // MB
  cpu: number;      // vCPUs
  storage: number;  // GB
  timeout: number;  // minutes
}

export interface Sandbox {
  id: string;
  projectId: string;
  userId: string;
  containerId: string;
  status: SandboxStatus;
  template: SandboxTemplate;
  port: number;
  previewUrl: string;
  resources: SandboxResources;
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
}

export type SandboxStatus = 'creating' | 'pulling' | 'starting' | 'running' | 'stopped' | 'destroying' | 'destroyed' | 'error';

export interface SandboxExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface SandboxLog {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  text: string;
}

export interface SandboxTemplateInfo {
  id: SandboxTemplate;
  name: string;
  description: string;
  baseImage: string;
  defaultPort: number;
  features: string[];
  estimatedStartTime: number; // seconds
}

// Plan-based resource limits
const PLAN_LIMITS: Record<string, { sandboxes: number; memory: number; cpu: number; storage: number; timeout: number }> = {
  weekly:  { sandboxes: 2,  memory: 256,  cpu: 0.5, storage: 1,  timeout: 30  },
  monthly: { sandboxes: 5,  memory: 512,  cpu: 1,   storage: 5,  timeout: 60  },
  yearly:  { sandboxes: 10, memory: 1024, cpu: 2,   storage: 20, timeout: 120 },
};

class SandboxService {
  private baseUrl = '/api/sandbox';

  /**
   * Create a new sandbox for a project
   */
  async createSandbox(config: SandboxConfig): Promise<Sandbox> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create sandbox' }));
      throw new Error(error.message || `Sandbox creation failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get sandbox status and details
   */
  async getSandboxStatus(sandboxId: string): Promise<Sandbox> {
    const response = await fetch(`${this.baseUrl}/${sandboxId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get sandbox status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List all active sandboxes for the current user
   */
  async listSandboxes(): Promise<Sandbox[]> {
    const response = await fetch(this.baseUrl, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to list sandboxes: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Execute a command inside a sandbox
   */
  async execCommand(sandboxId: string, command: string, cwd?: string): Promise<SandboxExecResult> {
    const response = await fetch(`${this.baseUrl}/${sandboxId}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ command, cwd }),
    });

    if (!response.ok) {
      throw new Error(`Command execution failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Connect to sandbox terminal via WebSocket
   * Returns a WebSocket connection for xterm.js
   */
  connectTerminal(sandboxId: string): WebSocket {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${this.baseUrl}/${sandboxId}/terminal`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`[SandboxService] Terminal connected to sandbox ${sandboxId}`);
    };

    ws.onerror = (error) => {
      console.error(`[SandboxService] Terminal WebSocket error:`, error);
    };

    return ws;
  }

  /**
   * Stream sandbox logs via Server-Sent Events
   */
  streamLogs(sandboxId: string, onLog: (log: SandboxLog) => void): EventSource {
    const es = new EventSource(`${this.baseUrl}/${sandboxId}/logs`, {
      withCredentials: true,
    } as EventSourceInit);

    es.onmessage = (event) => {
      try {
        const log: SandboxLog = JSON.parse(event.data);
        onLog(log);
      } catch (e) {
        console.error('[SandboxService] Failed to parse log:', e);
      }
    };

    es.onerror = () => {
      console.error('[SandboxService] Log stream error');
    };

    return es;
  }

  /**
   * Destroy a sandbox and cleanup resources
   */
  async destroySandbox(sandboxId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${sandboxId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to destroy sandbox: ${response.status}`);
    }
  }

  /**
   * Get available sandbox templates
   */
  async getTemplates(): Promise<SandboxTemplateInfo[]> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      credentials: 'include',
    });

    if (!response.ok) {
      // Return default templates if endpoint not available
      return this.getDefaultTemplates();
    }

    return response.json();
  }

  /**
   * Get resource limits for a plan
   */
  getPlanLimits(plan: string) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.weekly;
  }

  /**
   * Default templates (fallback when API is unavailable)
   */
  private getDefaultTemplates(): SandboxTemplateInfo[] {
    return [
      {
        id: 'node-20',
        name: 'Node.js 20',
        description: 'Latest LTS Node.js environment',
        baseImage: 'node:20-alpine',
        defaultPort: 3000,
        features: ['npm', 'yarn', 'pnpm', 'TypeScript'],
        estimatedStartTime: 8,
      },
      {
        id: 'next-app',
        name: 'Next.js App',
        description: 'Next.js 14 with App Router',
        baseImage: 'node:20-alpine',
        defaultPort: 3000,
        features: ['React 18', 'TypeScript', 'Tailwind CSS', 'App Router'],
        estimatedStartTime: 15,
      },
      {
        id: 'vite-app',
        name: 'Vite + React',
        description: 'Vite-powered React application',
        baseImage: 'node:20-alpine',
        defaultPort: 5173,
        features: ['React 18', 'TypeScript', 'Vite 5', 'HMR'],
        estimatedStartTime: 10,
      },
      {
        id: 'express-app',
        name: 'Express.js',
        description: 'Express.js REST API server',
        baseImage: 'node:20-alpine',
        defaultPort: 4000,
        features: ['Express 4', 'TypeScript', 'REST', 'Middleware'],
        estimatedStartTime: 8,
      },
      {
        id: 'python-3.12',
        name: 'Python 3.12',
        description: 'Python with pip and virtualenv',
        baseImage: 'python:3.12-slim',
        defaultPort: 8000,
        features: ['pip', 'virtualenv', 'FastAPI', 'Django'],
        estimatedStartTime: 10,
      },
      {
        id: 'react-app',
        name: 'React App',
        description: 'Create React App with TypeScript',
        baseImage: 'node:20-alpine',
        defaultPort: 3000,
        features: ['React 18', 'TypeScript', 'Testing Library'],
        estimatedStartTime: 12,
      },
    ];
  }
}

export const sandboxService = new SandboxService();
export default sandboxService;
