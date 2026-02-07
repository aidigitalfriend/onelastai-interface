/**
 * DEPLOY CREDENTIALS ROUTES
 * Secure CRUD for user's external platform tokens (Vercel, Netlify, Railway, etc.)
 * Tokens are AES-256-GCM encrypted at rest — never stored in plaintext.
 */

import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import * as jose from 'jose';

const router = express.Router();
const prisma = new PrismaClient();

// Encryption key derived from env — 32 bytes for AES-256
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'onelastai-credential-key-2026')
  .digest();

// ============================================================================
// ENCRYPTION HELPERS
// ============================================================================

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    encrypted: encrypted + ':' + authTag,
    iv: iv.toString('hex'),
  };
}

function decrypt(encryptedText, ivHex) {
  const [data, authTag] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

const JWT_SECRET = process.env.NEURAL_LINK_JWT_SECRET || process.env.JWT_SECRET || 'neural-link-secret-key-2026';

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.neural_token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    req.userId = payload.userId || payload.sub;

    if (!req.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ============================================================================
// PLATFORM VALIDATION
// ============================================================================

const VALIDATORS = {
  VERCEL: async (token) => {
    const res = await axios.get('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.user?.username || res.data.user?.email || res.data.username || res.data.email;
  },

  NETLIFY: async (token) => {
    const res = await axios.get('https://api.netlify.com/api/v1/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.email || res.data.full_name || res.data.slug;
  },

  RAILWAY: async (token) => {
    const res = await axios.post(
      'https://backboard.railway.app/graphql/v2',
      { query: `query { me { email name } }` },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.data.data?.me) throw new Error('Invalid token');
    return res.data.data.me.email || res.data.data.me.name;
  },

  RENDER: async (token) => {
    const res = await axios.get('https://api.render.com/v1/owners', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.data || res.data.length === 0) throw new Error('Invalid token');
    return res.data[0].owner?.email || res.data[0].owner?.name;
  },

  CLOUDFLARE: async (token) => {
    const res = await axios.get('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.data.success) throw new Error('Invalid token');
    return res.data.result?.id || 'Cloudflare User';
  },

  GITHUB: async (token) => {
    const res = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.login || res.data.email;
  },
};

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/credentials — List all credentials for the authenticated user
 * Returns provider, label, username, isValid — NEVER returns the actual token.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const credentials = await prisma.deployCredential.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        provider: true,
        label: true,
        username: true,
        isValid: true,
        extras: true,
        lastValidatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ credentials });
  } catch (error) {
    console.error('[Credentials] List error:', error);
    res.status(500).json({ error: 'Failed to load credentials' });
  }
});

/**
 * POST /api/credentials — Add or update a deploy credential
 * Validates the token with the platform API first, then encrypts and stores.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { provider, token, label, extras } = req.body;

    if (!provider || !token) {
      return res.status(400).json({ error: 'Provider and token are required' });
    }

    const validProviders = ['VERCEL', 'NETLIFY', 'RAILWAY', 'RENDER', 'CLOUDFLARE', 'GITHUB'];
    const upperProvider = provider.toUpperCase();
    if (!validProviders.includes(upperProvider)) {
      return res.status(400).json({ error: `Invalid provider. Supported: ${validProviders.join(', ')}` });
    }

    // Validate the token with the platform
    let username = null;
    const validator = VALIDATORS[upperProvider];
    if (validator) {
      try {
        username = await validator(token);
      } catch (valError) {
        console.error(`[Credentials] ${upperProvider} validation failed:`, valError.message);
        return res.status(400).json({
          error: `Token validation failed for ${upperProvider}. Please check your token and try again.`,
          details: valError.response?.data?.error?.message || valError.message,
        });
      }
    }

    // Encrypt the token
    const { encrypted, iv } = encrypt(token);

    // Upsert — one credential per provider per user
    const credential = await prisma.deployCredential.upsert({
      where: {
        userId_provider: {
          userId: req.userId,
          provider: upperProvider,
        },
      },
      update: {
        encryptedToken: encrypted,
        tokenIv: iv,
        username,
        label: label || null,
        extras: extras || null,
        isValid: true,
        lastValidatedAt: new Date(),
      },
      create: {
        userId: req.userId,
        provider: upperProvider,
        encryptedToken: encrypted,
        tokenIv: iv,
        username,
        label: label || null,
        extras: extras || null,
        isValid: true,
        lastValidatedAt: new Date(),
      },
      select: {
        id: true,
        provider: true,
        label: true,
        username: true,
        isValid: true,
        extras: true,
        lastValidatedAt: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      credential,
      message: `${upperProvider} credentials saved. Connected as ${username}`,
    });
  } catch (error) {
    console.error('[Credentials] Save error:', error);
    res.status(500).json({ error: 'Failed to save credentials' });
  }
});

/**
 * DELETE /api/credentials/:provider — Remove a credential
 */
router.delete('/:provider', requireAuth, async (req, res) => {
  try {
    const provider = req.params.provider.toUpperCase();

    await prisma.deployCredential.deleteMany({
      where: {
        userId: req.userId,
        provider,
      },
    });

    res.json({ success: true, message: `${provider} credentials removed` });
  } catch (error) {
    console.error('[Credentials] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete credentials' });
  }
});

/**
 * POST /api/credentials/:provider/validate — Re-validate an existing credential
 */
router.post('/:provider/validate', requireAuth, async (req, res) => {
  try {
    const provider = req.params.provider.toUpperCase();

    const credential = await prisma.deployCredential.findUnique({
      where: {
        userId_provider: {
          userId: req.userId,
          provider,
        },
      },
    });

    if (!credential) {
      return res.status(404).json({ error: `No ${provider} credentials found` });
    }

    // Decrypt the token
    const token = decrypt(credential.encryptedToken, credential.tokenIv);

    // Validate with the platform
    const validator = VALIDATORS[provider];
    if (!validator) {
      return res.status(400).json({ error: `No validator for ${provider}` });
    }

    try {
      const username = await validator(token);

      await prisma.deployCredential.update({
        where: { id: credential.id },
        data: { isValid: true, username, lastValidatedAt: new Date() },
      });

      res.json({ valid: true, username, message: `${provider} token is valid` });
    } catch {
      await prisma.deployCredential.update({
        where: { id: credential.id },
        data: { isValid: false },
      });

      res.json({ valid: false, message: `${provider} token is no longer valid. Please update it.` });
    }
  } catch (error) {
    console.error('[Credentials] Validate error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * POST /api/credentials/deploy — Deploy using stored credentials
 * This is the unified deploy endpoint the agent and frontend use.
 * The actual token is decrypted server-side and passed to the cloud-deploy routes.
 */
router.post('/deploy', requireAuth, async (req, res) => {
  try {
    const { provider, projectName, files, framework, buildCommand, outputDir, envVars, siteId } = req.body;

    if (!provider || !files) {
      return res.status(400).json({ error: 'Provider and files are required' });
    }

    const upperProvider = provider.toUpperCase();

    // Get stored credential
    const credential = await prisma.deployCredential.findUnique({
      where: {
        userId_provider: {
          userId: req.userId,
          provider: upperProvider,
        },
      },
    });

    if (!credential) {
      return res.status(400).json({
        error: `No ${upperProvider} credentials found. Please add your ${upperProvider} token in the Credentials panel.`,
        needsCredentials: true,
        provider: upperProvider,
      });
    }

    // Decrypt the token
    const token = decrypt(credential.encryptedToken, credential.tokenIv);

    // Map provider to cloud-deploy API internally
    let deployResult;

    switch (upperProvider) {
      case 'VERCEL': {
        const vercelFiles = Object.entries(files).map(([path, content]) => ({
          file: path.replace(/^\//, ''),
          data: Buffer.from(content).toString('base64'),
          encoding: 'base64',
        }));

        const response = await axios.post(
          'https://api.vercel.com/v13/deployments',
          {
            name: projectName || 'canvas-studio-app',
            files: vercelFiles,
            projectSettings: {
              framework: framework || null,
              buildCommand: buildCommand || null,
              outputDirectory: outputDir || null,
            },
            target: 'production',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        deployResult = {
          success: true,
          provider: 'VERCEL',
          deploymentId: response.data.id,
          url: `https://${response.data.url}`,
          status: response.data.readyState,
          projectId: response.data.projectId,
        };
        break;
      }

      case 'NETLIFY': {
        let targetSiteId = siteId;

        if (!targetSiteId) {
          try {
            const siteRes = await axios.post(
              'https://api.netlify.com/api/v1/sites',
              { name: (projectName || `canvas-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '-') },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            targetSiteId = siteRes.data.id;
          } catch (siteError) {
            if (siteError.response?.status === 422) {
              const listRes = await axios.get('https://api.netlify.com/api/v1/sites', {
                headers: { Authorization: `Bearer ${token}` },
                params: { filter: 'all' },
              });
              const existing = listRes.data.find(
                (s) => s.name === (projectName || '').toLowerCase().replace(/[^a-z0-9-]/g, '-')
              );
              if (existing) targetSiteId = existing.id;
              else throw siteError;
            } else throw siteError;
          }
        }

        // Create zip
        const { default: archiver } = await import('archiver');
        const zipBuffer = await new Promise((resolve, reject) => {
          const archive = archiver('zip', { zlib: { level: 9 } });
          const chunks = [];
          archive.on('data', (c) => chunks.push(c));
          archive.on('end', () => resolve(Buffer.concat(chunks)));
          archive.on('error', reject);
          for (const [path, content] of Object.entries(files)) {
            archive.append(content, { name: path.replace(/^\//, '') });
          }
          archive.finalize();
        });

        const deployRes = await axios.post(
          `https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys`,
          zipBuffer,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/zip',
            },
          }
        );

        deployResult = {
          success: true,
          provider: 'NETLIFY',
          deploymentId: deployRes.data.id,
          url: deployRes.data.ssl_url || deployRes.data.url,
          siteId: targetSiteId,
          status: deployRes.data.state,
        };
        break;
      }

      case 'RAILWAY': {
        // Create project + service
        const createProject = await axios.post(
          'https://backboard.railway.app/graphql/v2',
          {
            query: `mutation($name: String!) { projectCreate(input: { name: $name }) { id name } }`,
            variables: { name: projectName || 'canvas-studio-app' },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (createProject.data.errors) {
          throw new Error(createProject.data.errors[0]?.message || 'Failed to create Railway project');
        }

        const project = createProject.data.data.projectCreate;

        const createService = await axios.post(
          'https://backboard.railway.app/graphql/v2',
          {
            query: `mutation($projectId: String!, $name: String!) { serviceCreate(input: { projectId: $projectId, name: $name }) { id name } }`,
            variables: { projectId: project.id, name: 'web' },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (createService.data.errors) {
          throw new Error(createService.data.errors[0]?.message || 'Failed to create Railway service');
        }

        deployResult = {
          success: true,
          provider: 'RAILWAY',
          projectId: project.id,
          serviceId: createService.data.data.serviceCreate.id,
          url: `https://railway.app/project/${project.id}`,
          status: 'created',
          message: 'Project created on Railway. Connect to GitHub or use Railway CLI to deploy code.',
        };
        break;
      }

      case 'CLOUDFLARE': {
        const accountId = credential.extras?.accountId;
        if (!accountId) {
          return res.status(400).json({
            error: 'Cloudflare Account ID is required. Please update your credentials with your Account ID.',
            needsExtras: true,
            provider: 'CLOUDFLARE',
          });
        }

        const safeName = (projectName || 'canvas-app').toLowerCase().replace(/[^a-z0-9-]/g, '-');

        // Ensure project exists
        try {
          await axios.get(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${safeName}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (projectError) {
          if (projectError.response?.status === 404) {
            await axios.post(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
              { name: safeName, production_branch: 'main' },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }

        const { default: FormData } = await import('form-data');
        const formData = new FormData();
        for (const [path, content] of Object.entries(files)) {
          formData.append(path.replace(/^\//, ''), Buffer.from(content), {
            filename: path.replace(/^\//, ''),
            contentType: 'application/octet-stream',
          });
        }

        const cfDeploy = await axios.post(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${safeName}/deployments`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              ...formData.getHeaders(),
            },
          }
        );

        if (cfDeploy.data.success) {
          deployResult = {
            success: true,
            provider: 'CLOUDFLARE',
            deploymentId: cfDeploy.data.result.id,
            url: cfDeploy.data.result.url,
            status: cfDeploy.data.result.latest_stage?.name || 'deploying',
          };
        } else {
          throw new Error(cfDeploy.data.errors?.[0]?.message || 'Cloudflare deployment failed');
        }
        break;
      }

      default:
        return res.status(400).json({ error: `Deployment not supported for ${upperProvider}` });
    }

    res.json(deployResult);
  } catch (error) {
    console.error('[Credentials] Deploy error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.response?.data?.errors?.[0]?.message || error.message || 'Deployment failed',
    });
  }
});

export default router;
