// Cloud Deploy Service for Canvas Studio - Real-time integrations with cloud providers

export type CloudProvider = 
  | 'vercel' 
  | 'netlify' 
  | 'railway'
  | 'render'
  | 'cloudflare'
  | 'firebase'
  | 'onelastai'; // Our built-in hosting

export interface ProviderConfig {
  id: CloudProvider;
  name: string;
  icon: string;
  color: string;
  category: 'frontend' | 'fullstack' | 'cloud' | 'builtin';
  description: string;
  features: string[];
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenHelpUrl: string;
  supportsPreview: boolean;
  supportsRollback: boolean;
  requiresAccountId?: boolean;
  accountIdLabel?: string;
  accountIdPlaceholder?: string;
}

export const cloudProviders: ProviderConfig[] = [
  // Built-in hosting (OneLast AI)
  {
    id: 'onelastai',
    name: 'OneLast AI Hosting',
    icon: '⚡',
    color: 'bg-gradient-to-r from-cyan-500 to-purple-500',
    category: 'builtin',
    description: 'Free instant hosting on OneLast AI',
    features: ['Instant Deploy', 'Free SSL', 'Custom Subdomain', 'No Setup Required'],
    tokenLabel: '',
    tokenPlaceholder: '',
    tokenHelpUrl: '',
    supportsPreview: true,
    supportsRollback: false,
  },
  // Frontend/JAMstack
  {
    id: 'vercel',
    name: 'Vercel',
    icon: '▲',
    color: 'bg-black',
    category: 'frontend',
    description: 'Best for Next.js & React apps',
    features: ['Instant Deploys', 'Edge Functions', 'Analytics'],
    tokenLabel: 'Vercel Token',
    tokenPlaceholder: 'Enter your Vercel API token',
    tokenHelpUrl: 'https://vercel.com/account/tokens',
    supportsPreview: true,
    supportsRollback: true,
  },
  {
    id: 'netlify',
    name: 'Netlify',
    icon: '◆',
    color: 'bg-teal-500',
    category: 'frontend',
    description: 'Static sites & serverless functions',
    features: ['Forms', 'Identity', 'Functions'],
    tokenLabel: 'Netlify Token',
    tokenPlaceholder: 'Enter your Netlify personal access token',
    tokenHelpUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
    supportsPreview: true,
    supportsRollback: true,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Pages',
    icon: '☁',
    color: 'bg-orange-500',
    category: 'frontend',
    description: 'Fast global edge hosting',
    features: ['Edge Network', 'Unlimited Bandwidth', 'Workers'],
    tokenLabel: 'Cloudflare API Token',
    tokenPlaceholder: 'Enter your Cloudflare API token',
    tokenHelpUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    supportsPreview: true,
    supportsRollback: true,
    requiresAccountId: true,
    accountIdLabel: 'Account ID',
    accountIdPlaceholder: 'Found in Cloudflare dashboard URL',
  },
  // Fullstack PaaS
  {
    id: 'railway',
    name: 'Railway',
    icon: '🚂',
    color: 'bg-purple-600',
    category: 'fullstack',
    description: 'Modern PaaS with databases',
    features: ['Databases', 'Auto Deploys', 'Cron Jobs'],
    tokenLabel: 'Railway Token',
    tokenPlaceholder: 'Enter your Railway API token',
    tokenHelpUrl: 'https://railway.app/account/tokens',
    supportsPreview: true,
    supportsRollback: true,
  },
  {
    id: 'render',
    name: 'Render',
    icon: '◈',
    color: 'bg-emerald-600',
    category: 'fullstack',
    description: 'Easy cloud application hosting',
    features: ['Auto Scaling', 'Managed DBs', 'Free SSL'],
    tokenLabel: 'Render API Key',
    tokenPlaceholder: 'Enter your Render API key',
    tokenHelpUrl: 'https://dashboard.render.com/u/settings#api-keys',
    supportsPreview: true,
    supportsRollback: true,
  },
  // Cloud Providers
  {
    id: 'firebase',
    name: 'Firebase Hosting',
    icon: '🔥',
    color: 'bg-amber-500',
    category: 'cloud',
    description: 'Google cloud static hosting',
    features: ['CDN', 'SSL', 'Realtime DB'],
    tokenLabel: 'Firebase CI Token',
    tokenPlaceholder: 'Run: firebase login:ci',
    tokenHelpUrl: 'https://firebase.google.com/docs/cli#cli-ci-systems',
    supportsPreview: true,
    supportsRollback: true,
  },
];

export interface DeploymentResult {
  success: boolean;
  url?: string;
  previewUrl?: string;
  deploymentId?: string;
  projectId?: string;
  siteId?: string;
  error?: string;
  logs?: string[];
  status?: string;
  message?: string;
}

export interface DeployConfig {
  provider: CloudProvider;
  token?: string;
  accountId?: string; // For Cloudflare
  projectName: string;
  buildCommand?: string;
  outputDir?: string;
  envVars?: Record<string, string>;
}

const API_BASE = '/api';

// ============================================================================
// VALIDATE TOKEN
// ============================================================================

export async function validateToken(token: string, provider: CloudProvider): Promise<{ valid: boolean; user?: string; error?: string }> {
  if (provider === 'onelastai') {
    return { valid: true, user: 'OneLast AI' };
  }

  try {
    const response = await fetch(`${API_BASE}/cloud-deploy/${provider}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`[CloudDeploy] Token validation failed for ${provider}:`, error);
    return { valid: false, error: error.message };
  }
}

// ============================================================================
// DEPLOY TO PROVIDER
// ============================================================================

export async function deployToProvider(
  code: string,
  files: Record<string, string> | null,
  language: string,
  config: DeployConfig
): Promise<DeploymentResult> {
  const { provider, token, accountId, projectName, buildCommand, outputDir, envVars } = config;
  const logs: string[] = [];

  // OneLast AI built-in hosting - uses our existing API
  if (provider === 'onelastai') {
    return deployToOneLast(code, language, projectName, logs);
  }

  // External providers require tokens
  if (!token) {
    return { success: false, error: 'API token is required', logs: ['❌ No API token provided'] };
  }

  // Prepare files object
  const deployFiles: Record<string, string> = {};
  if (files && Object.keys(files).length > 0) {
    Object.entries(files).forEach(([path, content]) => {
      deployFiles[path.replace(/^\//, '')] = content;
    });
  } else {
    // Single file - determine filename based on content
    const isHtml = code.includes('<!DOCTYPE') || code.includes('<html');
    const filename = isHtml ? 'index.html' : 'index.tsx';
    deployFiles[filename] = code;
    
    // Add package.json for React/JS projects
    if (!isHtml) {
      deployFiles['package.json'] = JSON.stringify({
        name: projectName || 'canvas-app',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.0.0',
          'typescript': '^5.0.0',
          'vite': '^5.0.0'
        }
      }, null, 2);

      deployFiles['vite.config.ts'] = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

      deployFiles['index.html'] = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName || 'Canvas App'}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
`;
    }
  }

  logs.push(`🔗 Connecting to ${cloudProviders.find(p => p.id === provider)?.name}...`);
  logs.push(`📦 Preparing ${Object.keys(deployFiles).length} files...`);

  try {
    const response = await fetch(`${API_BASE}/cloud-deploy/${provider}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        accountId,
        projectName,
        files: deployFiles,
        buildCommand,
        outputDir,
        envVars,
      }),
    });

    const data = await response.json();

    if (data.success) {
      logs.push('✅ Deployment initiated!');
      if (data.url) {
        logs.push(`🌐 URL: ${data.url}`);
      }
      if (data.status) {
        logs.push(`📊 Status: ${data.status}`);
      }
      if (data.message) {
        logs.push(`💬 ${data.message}`);
      }
      return { ...data, logs };
    } else {
      logs.push(`❌ Deployment failed: ${data.error}`);
      return { success: false, error: data.error, logs };
    }
  } catch (error: any) {
    logs.push(`❌ Error: ${error.message}`);
    return { success: false, error: error.message, logs };
  }
}

// ============================================================================
// DEPLOY TO ONELAST AI (Built-in)
// ============================================================================

async function deployToOneLast(code: string, language: string, name: string, logs: string[]): Promise<DeploymentResult> {
  logs.push('⚡ Deploying to OneLast AI Hosting...');
  logs.push('📦 Uploading files...');

  try {
    const response = await fetch(`${API_BASE}/hosting/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        name,
        language,
        isPublic: true,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Deployment failed');
    }

    logs.push('✅ Deployment successful!');
    logs.push(`🌐 URL: ${data.app.url}`);

    return {
      success: true,
      url: data.app.url,
      deploymentId: data.app.id,
      logs,
    };
  } catch (error: any) {
    logs.push(`❌ Error: ${error.message}`);
    return { success: false, error: error.message, logs };
  }
}

// ============================================================================
// GET DEPLOYMENT STATUS
// ============================================================================

export async function getDeploymentStatus(
  provider: CloudProvider,
  deploymentId: string,
  token: string
): Promise<{ status: string; url?: string; ready: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/cloud-deploy/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, deploymentId, token }),
    });

    return await response.json();
  } catch (error: any) {
    return { status: 'error', ready: false, error: error.message };
  }
}

// ============================================================================
// POLL DEPLOYMENT STATUS
// ============================================================================

export function pollDeploymentStatus(
  provider: CloudProvider,
  deploymentId: string,
  token: string,
  onUpdate: (status: { status: string; url?: string; ready: boolean; error?: string }) => void,
  intervalMs: number = 3000,
  maxAttempts: number = 60
): () => void {
  let attempts = 0;
  let cancelled = false;

  const poll = async () => {
    if (cancelled || attempts >= maxAttempts) return;
    attempts++;

    const status = await getDeploymentStatus(provider, deploymentId, token);
    onUpdate(status);

    if (!status.ready && !status.error && !cancelled) {
      setTimeout(poll, intervalMs);
    }
  };

  poll();

  // Return cancel function
  return () => {
    cancelled = true;
  };
}

// ============================================================================
// LIST DEPLOYMENTS
// ============================================================================

export async function listDeployments(
  provider: CloudProvider,
  token: string,
  projectName?: string
): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/cloud-deploy/${provider}/deployments?projectName=${projectName || ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    return data.deployments || data.sites || [];
  } catch (error) {
    console.error(`[CloudDeploy] Failed to list deployments for ${provider}:`, error);
    return [];
  }
}

// ============================================================================
// SERVICE EXPORT
// ============================================================================

export const cloudDeployService = {
  providers: cloudProviders,
  getProvider: (id: CloudProvider) => cloudProviders.find(p => p.id === id),
  deploy: deployToProvider,
  validateToken,
  getStatus: getDeploymentStatus,
  pollStatus: pollDeploymentStatus,
  listDeployments,
};
