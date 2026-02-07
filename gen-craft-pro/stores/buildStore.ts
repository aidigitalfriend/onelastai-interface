/**
 * Build Store — Zustand state for build pipeline
 * Tracks build queue, logs, artifacts, and status
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface BuildStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  logs: string[];
  error?: string;
}

export interface BuildRecord {
  id: string;
  projectId: string;
  status: 'queued' | 'building' | 'success' | 'failed' | 'cancelled';
  trigger: 'manual' | 'auto-save' | 'deploy' | 'commit';
  steps: BuildStep[];
  startedAt: number;
  completedAt?: number;
  duration?: number;
  artifactUrl?: string;
  artifactSize?: number;
  error?: string;
  commitHash?: string;
}

export interface BuildConfig {
  framework: string;
  buildCommand: string;
  outputDir: string;
  installCommand: string;
  nodeVersion: string;
  envVars: Record<string, string>;
  cache: boolean;
}

interface BuildStoreState {
  builds: BuildRecord[];
  currentBuild: BuildRecord | null;
  buildConfig: BuildConfig;
  isBuilding: boolean;
  buildLogs: string[];
  lastSuccessfulBuild: BuildRecord | null;
  autoRebuild: boolean;
}

interface BuildStoreActions {
  startBuild: (projectId: string, trigger?: BuildRecord['trigger']) => string;
  updateBuildStatus: (buildId: string, status: BuildRecord['status'], error?: string) => void;
  updateBuildStep: (buildId: string, stepId: string, update: Partial<BuildStep>) => void;
  addBuildLog: (line: string) => void;
  clearBuildLogs: () => void;
  cancelBuild: (buildId: string) => void;
  completeBuild: (buildId: string, artifactUrl?: string, artifactSize?: number) => void;
  setBuildConfig: (config: Partial<BuildConfig>) => void;
  setAutoRebuild: (auto: boolean) => void;
  clearBuilds: () => void;
}

const defaultBuildConfig: BuildConfig = {
  framework: 'vite',
  buildCommand: 'npm run build',
  outputDir: 'dist',
  installCommand: 'npm install',
  nodeVersion: '20',
  envVars: {},
  cache: true,
};

let buildCounter = 0;

export const useBuildStore = create<BuildStoreState & BuildStoreActions>()(
  subscribeWithSelector((set, get) => ({
    builds: [],
    currentBuild: null,
    buildConfig: defaultBuildConfig,
    isBuilding: false,
    buildLogs: [],
    lastSuccessfulBuild: null,
    autoRebuild: true,

    startBuild: (projectId, trigger = 'manual') => {
      const id = `build_${++buildCounter}_${Date.now()}`;
      const build: BuildRecord = {
        id,
        projectId,
        status: 'queued',
        trigger,
        steps: [
          { id: 'install', name: 'Install Dependencies', status: 'pending', logs: [] },
          { id: 'lint', name: 'Lint & Type Check', status: 'pending', logs: [] },
          { id: 'build', name: 'Build', status: 'pending', logs: [] },
          { id: 'optimize', name: 'Optimize & Bundle', status: 'pending', logs: [] },
        ],
        startedAt: Date.now(),
      };
      set((s) => ({
        builds: [build, ...s.builds].slice(0, 50),
        currentBuild: build,
        isBuilding: true,
        buildLogs: [],
      }));
      return id;
    },

    updateBuildStatus: (buildId, status, error) =>
      set((s) => {
        const builds = s.builds.map((b) =>
          b.id === buildId ? { ...b, status, error, ...(status === 'failed' || status === 'success' ? { completedAt: Date.now() } : {}) } : b
        );
        const currentBuild = s.currentBuild?.id === buildId
          ? { ...s.currentBuild, status, error }
          : s.currentBuild;
        return {
          builds,
          currentBuild,
          isBuilding: status === 'building' || status === 'queued',
          lastSuccessfulBuild: status === 'success' ? builds.find((b) => b.id === buildId) || s.lastSuccessfulBuild : s.lastSuccessfulBuild,
        };
      }),

    updateBuildStep: (buildId, stepId, update) =>
      set((s) => ({
        builds: s.builds.map((b) =>
          b.id === buildId
            ? { ...b, steps: b.steps.map((step) => (step.id === stepId ? { ...step, ...update } : step)) }
            : b
        ),
        currentBuild:
          s.currentBuild?.id === buildId
            ? { ...s.currentBuild, steps: s.currentBuild.steps.map((step) => (step.id === stepId ? { ...step, ...update } : step)) }
            : s.currentBuild,
      })),

    addBuildLog: (line) => set((s) => ({ buildLogs: [...s.buildLogs, line] })),
    clearBuildLogs: () => set({ buildLogs: [] }),

    cancelBuild: (buildId) => {
      get().updateBuildStatus(buildId, 'cancelled');
      set({ isBuilding: false });
    },

    completeBuild: (buildId, artifactUrl, artifactSize) =>
      set((s) => {
        const completedAt = Date.now();
        const builds = s.builds.map((b) =>
          b.id === buildId
            ? { ...b, status: 'success' as const, completedAt, duration: completedAt - b.startedAt, artifactUrl, artifactSize }
            : b
        );
        return {
          builds,
          currentBuild: null,
          isBuilding: false,
          lastSuccessfulBuild: builds.find((b) => b.id === buildId) || s.lastSuccessfulBuild,
        };
      }),

    setBuildConfig: (config) => set((s) => ({ buildConfig: { ...s.buildConfig, ...config } })),
    setAutoRebuild: (auto) => set({ autoRebuild: auto }),
    clearBuilds: () => set({ builds: [], currentBuild: null, isBuilding: false, buildLogs: [] }),
  }))
);
