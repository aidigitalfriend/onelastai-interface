/**
 * BuildService — CI/CD Build pipeline orchestrator client
 * Connects to /api/build/* endpoints
 * 
 * Phase 3: Code change → Build → Test → Deploy → Live
 */

export interface BuildConfig {
  projectId: string;
  branch?: string;
  environment?: 'preview' | 'staging' | 'production';
  autoPromote?: boolean;
  skipTests?: boolean;
  skipLint?: boolean;
}

export type BuildStageStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface BuildStage {
  name: string;
  status: BuildStageStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  logs: string[];
  error?: string;
}

export type BuildStatus = 'queued' | 'installing' | 'linting' | 'testing' | 'building' | 'scanning' | 'deploying' | 'success' | 'failed' | 'cancelled';

export interface Build {
  id: string;
  projectId: string;
  userId: string;
  branch: string;
  commitHash?: string;
  commitMessage?: string;
  status: BuildStatus;
  stages: BuildStage[];
  totalDuration?: number;
  artifactUrl?: string;
  previewUrl?: string;
  triggeredBy: 'manual' | 'auto-save' | 'git-push' | 'webhook';
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BuildLogEntry {
  timestamp: string;
  stage: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface BuildMetrics {
  totalBuilds: number;
  successRate: number;
  avgDuration: number;
  recentBuilds: Build[];
}

export interface FrameworkInfo {
  name: string;
  version: string;
  buildCommand: string;
  devCommand: string;
  outputDir: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

class BuildService {
  private baseUrl = '/api/build';

  /**
   * Trigger a new build for a project
   */
  async triggerBuild(config: BuildConfig): Promise<Build> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Build trigger failed' }));
      throw new Error(error.message || `Build failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get build status and details
   */
  async getBuildStatus(buildId: string): Promise<Build> {
    const response = await fetch(`${this.baseUrl}/${buildId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get build status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List builds for a project
   */
  async listBuilds(projectId: string, limit = 20): Promise<Build[]> {
    const response = await fetch(`${this.baseUrl}?projectId=${projectId}&limit=${limit}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to list builds: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Cancel a running build
   */
  async cancelBuild(buildId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${buildId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel build: ${response.status}`);
    }
  }

  /**
   * Stream build logs via Server-Sent Events
   */
  streamBuildLogs(buildId: string, onLog: (entry: BuildLogEntry) => void): EventSource {
    const es = new EventSource(`${this.baseUrl}/${buildId}/logs`, {
      withCredentials: true,
    } as EventSourceInit);

    es.onmessage = (event) => {
      try {
        const entry: BuildLogEntry = JSON.parse(event.data);
        onLog(entry);
      } catch (e) {
        console.error('[BuildService] Failed to parse log:', e);
      }
    };

    es.onerror = () => {
      console.error('[BuildService] Log stream error');
    };

    return es;
  }

  /**
   * Get build configuration for a project
   */
  async getBuildConfig(projectId: string): Promise<BuildConfig & { framework?: FrameworkInfo }> {
    const response = await fetch(`${this.baseUrl}/config?projectId=${projectId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      // Return default config
      return { projectId, branch: 'main', environment: 'preview' };
    }

    return response.json();
  }

  /**
   * Update build configuration
   */
  async updateBuildConfig(projectId: string, config: Partial<BuildConfig>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ projectId, ...config }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update build config: ${response.status}`);
    }
  }

  /**
   * Get build metrics for analytics
   */
  async getBuildMetrics(projectId: string): Promise<BuildMetrics> {
    const response = await fetch(`${this.baseUrl}/metrics?projectId=${projectId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return { totalBuilds: 0, successRate: 0, avgDuration: 0, recentBuilds: [] };
    }

    return response.json();
  }

  /**
   * Auto-detect project framework from files
   */
  detectFramework(files: Record<string, string>): FrameworkInfo | null {
    const packageJson = files['package.json'];
    if (!packageJson) return null;

    try {
      const pkg = JSON.parse(packageJson);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['next']) {
        return {
          name: 'Next.js',
          version: deps['next'],
          buildCommand: 'npm run build',
          devCommand: 'npm run dev',
          outputDir: '.next',
          packageManager: 'npm',
        };
      }

      if (deps['vite']) {
        return {
          name: 'Vite',
          version: deps['vite'],
          buildCommand: 'npm run build',
          devCommand: 'npm run dev',
          outputDir: 'dist',
          packageManager: 'npm',
        };
      }

      if (deps['express']) {
        return {
          name: 'Express',
          version: deps['express'],
          buildCommand: deps['typescript'] ? 'npx tsc' : 'echo "No build step"',
          devCommand: deps['nodemon'] ? 'npx nodemon' : 'node index.js',
          outputDir: 'dist',
          packageManager: 'npm',
        };
      }

      if (deps['react-scripts']) {
        return {
          name: 'Create React App',
          version: deps['react-scripts'],
          buildCommand: 'npm run build',
          devCommand: 'npm start',
          outputDir: 'build',
          packageManager: 'npm',
        };
      }

      return {
        name: 'Node.js',
        version: 'generic',
        buildCommand: pkg.scripts?.build || 'echo "No build"',
        devCommand: pkg.scripts?.dev || pkg.scripts?.start || 'node index.js',
        outputDir: 'dist',
        packageManager: 'npm',
      };
    } catch {
      return null;
    }
  }
}

export const buildService = new BuildService();
export default buildService;
