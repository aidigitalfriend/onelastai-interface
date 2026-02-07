/**
 * Deploy Store — Zustand state for deployment lifecycle
 * Tracks deployments, domains, rollbacks, and hosting
 */
import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';

export interface Deployment {
  id: string;
  projectId: string;
  platform: 'maula-s3' | 'vercel' | 'netlify' | 'railway' | 'cloudflare';
  status: 'queued' | 'deploying' | 'live' | 'failed' | 'rolled-back';
  url?: string;
  customDomain?: string;
  commitHash?: string;
  buildId?: string;
  createdAt: number;
  completedAt?: number;
  duration?: number;
  size?: number;
  error?: string;
  version: number;
  isProduction: boolean;
  logs: string[];
}

export interface CustomDomain {
  id: string;
  domain: string;
  projectId: string;
  status: 'pending' | 'verifying' | 'active' | 'failed';
  sslStatus: 'none' | 'provisioning' | 'active' | 'expired';
  addedAt: number;
  verifiedAt?: number;
  dnsRecords: Array<{ type: string; name: string; value: string }>;
}

export interface HostingMetrics {
  bandwidth: number;
  requests: number;
  avgResponseTime: number;
  uptime: number;
  errors: number;
  period: '24h' | '7d' | '30d';
}

interface DeployStoreState {
  deployments: Deployment[];
  currentDeployment: Deployment | null;
  isDeploying: boolean;
  deployLogs: string[];
  domains: CustomDomain[];
  metrics: HostingMetrics | null;
  selectedPlatform: Deployment['platform'];
}

interface DeployStoreActions {
  startDeployment: (projectId: string, platform: Deployment['platform']) => string;
  updateDeploymentStatus: (id: string, status: Deployment['status'], url?: string) => void;
  addDeployLog: (line: string) => void;
  clearDeployLogs: () => void;
  completeDeployment: (id: string, url: string, size?: number) => void;
  failDeployment: (id: string, error: string) => void;
  rollback: (deploymentId: string) => void;
  setDeployments: (deployments: Deployment[]) => void;
  addDomain: (domain: Omit<CustomDomain, 'id' | 'addedAt'>) => void;
  removeDomain: (id: string) => void;
  updateDomainStatus: (id: string, status: CustomDomain['status'], sslStatus?: CustomDomain['sslStatus']) => void;
  setMetrics: (metrics: HostingMetrics) => void;
  setSelectedPlatform: (platform: Deployment['platform']) => void;
}

let deployCounter = 0;

export const useDeployStore = create<DeployStoreState & DeployStoreActions>()(
  subscribeWithSelector((set, get) => ({
    deployments: [],
    currentDeployment: null,
    isDeploying: false,
    deployLogs: [],
    domains: [],
    metrics: null,
    selectedPlatform: 'maula-s3',

    startDeployment: (projectId, platform) => {
      const id = `deploy_${++deployCounter}_${Date.now()}`;
      const version = get().deployments.filter((d) => d.projectId === projectId).length + 1;
      const deployment: Deployment = {
        id,
        projectId,
        platform,
        status: 'queued',
        createdAt: Date.now(),
        version,
        isProduction: true,
        logs: [],
      };
      set((s) => ({
        deployments: [deployment, ...s.deployments].slice(0, 100),
        currentDeployment: deployment,
        isDeploying: true,
        deployLogs: [],
      }));
      return id;
    },

    updateDeploymentStatus: (id, status, url) =>
      set((s) => ({
        deployments: s.deployments.map((d) => (d.id === id ? { ...d, status, url: url || d.url } : d)),
        currentDeployment: s.currentDeployment?.id === id ? { ...s.currentDeployment, status, url: url || s.currentDeployment.url } : s.currentDeployment,
      })),

    addDeployLog: (line) => set((s) => ({ deployLogs: [...s.deployLogs, line] })),
    clearDeployLogs: () => set({ deployLogs: [] }),

    completeDeployment: (id, url, size) =>
      set((s) => {
        const completedAt = Date.now();
        return {
          deployments: s.deployments.map((d) =>
            d.id === id ? { ...d, status: 'live' as const, url, size, completedAt, duration: completedAt - d.createdAt } : d
          ),
          currentDeployment: null,
          isDeploying: false,
        };
      }),

    failDeployment: (id, error) =>
      set((s) => ({
        deployments: s.deployments.map((d) => (d.id === id ? { ...d, status: 'failed' as const, error, completedAt: Date.now() } : d)),
        currentDeployment: null,
        isDeploying: false,
      })),

    rollback: (deploymentId) =>
      set((s) => ({
        deployments: s.deployments.map((d) =>
          d.id === deploymentId ? { ...d, status: 'rolled-back' as const } : d
        ),
      })),

    setDeployments: (deployments) => set({ deployments }),

    addDomain: (domain) => {
      const id = `domain_${Date.now()}`;
      set((s) => ({ domains: [...s.domains, { ...domain, id, addedAt: Date.now() }] }));
    },

    removeDomain: (id) => set((s) => ({ domains: s.domains.filter((d) => d.id !== id) })),

    updateDomainStatus: (id, status, sslStatus) =>
      set((s) => ({
        domains: s.domains.map((d) =>
          d.id === id
            ? { ...d, status, sslStatus: sslStatus || d.sslStatus, verifiedAt: status === 'active' ? Date.now() : d.verifiedAt }
            : d
        ),
      })),

    setMetrics: (metrics) => set({ metrics }),
    setSelectedPlatform: (platform) => set({ selectedPlatform: platform }),
  }))
);
