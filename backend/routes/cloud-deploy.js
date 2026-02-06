// Cloud Deploy Routes - Real-time integrations with Vercel, Netlify, Railway, etc.
import express from 'express';
import axios from 'axios';
import FormData from 'form-data';
import archiver from 'archiver';
import { Readable } from 'stream';
import crypto from 'crypto';

const router = express.Router();

// ============================================================================
// VERCEL DEPLOYMENT
// ============================================================================

// Validate Vercel token
router.post('/vercel/validate', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token required' });
    }

    const response = await axios.get('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json({
      valid: true,
      user: response.data.user?.username || response.data.user?.email || response.data.username || response.data.email
    });
  } catch (error) {
    console.error('Vercel validation error:', error.response?.data || error.message);
    res.json({ valid: false, error: error.response?.data?.error?.message || 'Invalid token' });
  }
});

// Deploy to Vercel
router.post('/vercel/deploy', async (req, res) => {
  try {
    const { token, projectName, files, framework, buildCommand, outputDir, envVars } = req.body;

    if (!token || !files) {
      return res.status(400).json({ success: false, error: 'Token and files required' });
    }

    // Prepare files for Vercel API
    const vercelFiles = Object.entries(files).map(([path, content]) => ({
      file: path.replace(/^\//, ''),
      data: Buffer.from(content).toString('base64'),
      encoding: 'base64'
    }));

    // Create deployment
    const response = await axios.post('https://api.vercel.com/v13/deployments', {
      name: projectName || 'canvas-studio-app',
      files: vercelFiles,
      projectSettings: {
        framework: framework || null,
        buildCommand: buildCommand || null,
        outputDirectory: outputDir || null,
      },
      target: 'production'
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const deployment = response.data;

    res.json({
      success: true,
      deploymentId: deployment.id,
      url: `https://${deployment.url}`,
      previewUrl: `https://${deployment.url}`,
      status: deployment.readyState,
      projectId: deployment.projectId
    });

  } catch (error) {
    console.error('Vercel deploy error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Deployment failed'
    });
  }
});

// Get Vercel deployment status
router.get('/vercel/status/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    const response = await axios.get(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const deployment = response.data;
    res.json({
      status: deployment.readyState,
      url: deployment.url ? `https://${deployment.url}` : null,
      error: deployment.errorMessage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List Vercel deployments
router.get('/vercel/deployments', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { projectName } = req.query;

    const response = await axios.get('https://api.vercel.com/v6/deployments', {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 10, projectId: projectName }
    });

    res.json({ deployments: response.data.deployments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// NETLIFY DEPLOYMENT
// ============================================================================

// Validate Netlify token
router.post('/netlify/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token required' });
    }

    const response = await axios.get('https://api.netlify.com/api/v1/user', {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json({
      valid: true,
      user: response.data.email || response.data.full_name || response.data.slug
    });
  } catch (error) {
    console.error('Netlify validation error:', error.response?.data || error.message);
    res.json({ valid: false, error: 'Invalid token' });
  }
});

// Deploy to Netlify
router.post('/netlify/deploy', async (req, res) => {
  try {
    const { token, projectName, files, siteId } = req.body;

    if (!token || !files) {
      return res.status(400).json({ success: false, error: 'Token and files required' });
    }

    let targetSiteId = siteId;

    // Create site if no siteId provided
    if (!targetSiteId) {
      try {
        const siteResponse = await axios.post('https://api.netlify.com/api/v1/sites', {
          name: projectName?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || `canvas-${Date.now()}`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        targetSiteId = siteResponse.data.id;
      } catch (siteError) {
        // Site might already exist, try to find it
        if (siteError.response?.status === 422) {
          const listResponse = await axios.get('https://api.netlify.com/api/v1/sites', {
            headers: { Authorization: `Bearer ${token}` },
            params: { filter: 'all' }
          });
          const existingSite = listResponse.data.find(s => 
            s.name === projectName?.toLowerCase().replace(/[^a-z0-9-]/g, '-')
          );
          if (existingSite) {
            targetSiteId = existingSite.id;
          } else {
            throw siteError;
          }
        } else {
          throw siteError;
        }
      }
    }

    // Create zip buffer from files
    const zipBuffer = await createZipBuffer(files);

    // Deploy the zip
    const deployResponse = await axios.post(
      `https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys`,
      zipBuffer,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/zip'
        }
      }
    );

    const deploy = deployResponse.data;

    res.json({
      success: true,
      deploymentId: deploy.id,
      url: deploy.ssl_url || deploy.url,
      previewUrl: deploy.deploy_ssl_url || deploy.deploy_url,
      siteId: targetSiteId,
      status: deploy.state
    });

  } catch (error) {
    console.error('Netlify deploy error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Deployment failed'
    });
  }
});

// Get Netlify deployment status
router.get('/netlify/status/:deployId', async (req, res) => {
  try {
    const { deployId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    const response = await axios.get(`https://api.netlify.com/api/v1/deploys/${deployId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const deploy = response.data;
    res.json({
      status: deploy.state,
      url: deploy.ssl_url || deploy.url,
      error: deploy.error_message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List Netlify sites
router.get('/netlify/sites', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    const response = await axios.get('https://api.netlify.com/api/v1/sites', {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json({ sites: response.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RAILWAY DEPLOYMENT
// ============================================================================

// Validate Railway token
router.post('/railway/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token required' });
    }

    // Railway uses GraphQL API
    const response = await axios.post('https://backboard.railway.app/graphql/v2', {
      query: `query { me { email name } }`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.data?.me) {
      res.json({
        valid: true,
        user: response.data.data.me.email || response.data.data.me.name
      });
    } else {
      res.json({ valid: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Railway validation error:', error.response?.data || error.message);
    res.json({ valid: false, error: 'Invalid token' });
  }
});

// Deploy to Railway
router.post('/railway/deploy', async (req, res) => {
  try {
    const { token, projectName, files, envVars } = req.body;

    if (!token || !files) {
      return res.status(400).json({ success: false, error: 'Token and files required' });
    }

    // Create a new project
    const createProjectResponse = await axios.post('https://backboard.railway.app/graphql/v2', {
      query: `
        mutation($name: String!) {
          projectCreate(input: { name: $name }) {
            id
            name
          }
        }
      `,
      variables: { name: projectName || 'canvas-studio-app' }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (createProjectResponse.data.errors) {
      throw new Error(createProjectResponse.data.errors[0]?.message || 'Failed to create project');
    }

    const project = createProjectResponse.data.data.projectCreate;

    // Create a service in the project
    const createServiceResponse = await axios.post('https://backboard.railway.app/graphql/v2', {
      query: `
        mutation($projectId: String!, $name: String!) {
          serviceCreate(input: { projectId: $projectId, name: $name }) {
            id
            name
          }
        }
      `,
      variables: { projectId: project.id, name: 'web' }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (createServiceResponse.data.errors) {
      throw new Error(createServiceResponse.data.errors[0]?.message || 'Failed to create service');
    }

    const service = createServiceResponse.data.data.serviceCreate;

    // Note: Railway deployment from files requires their CLI or GitHub integration
    // For now, return project info and instructions
    res.json({
      success: true,
      projectId: project.id,
      serviceId: service.id,
      url: `https://railway.app/project/${project.id}`,
      message: 'Project created. Connect to GitHub or use Railway CLI to deploy code.',
      status: 'created'
    });

  } catch (error) {
    console.error('Railway deploy error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message || 'Deployment failed'
    });
  }
});

// ============================================================================
// RENDER DEPLOYMENT
// ============================================================================

// Validate Render token
router.post('/render/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token required' });
    }

    const response = await axios.get('https://api.render.com/v1/owners', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data && response.data.length > 0) {
      res.json({
        valid: true,
        user: response.data[0].owner?.email || response.data[0].owner?.name || 'Authenticated'
      });
    } else {
      res.json({ valid: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Render validation error:', error.response?.data || error.message);
    res.json({ valid: false, error: 'Invalid token' });
  }
});

// Deploy to Render (static site)
router.post('/render/deploy', async (req, res) => {
  try {
    const { token, projectName, files, repoUrl, branch, buildCommand, publishPath } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    // Get owner ID
    const ownersResponse = await axios.get('https://api.render.com/v1/owners', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!ownersResponse.data || ownersResponse.data.length === 0) {
      throw new Error('No owner found');
    }

    const ownerId = ownersResponse.data[0].owner.id;

    // Create a static site service
    // Note: Render requires GitHub/GitLab repo connection for deployment
    // For direct file deployment, we'd need to create a repo first
    res.json({
      success: false,
      error: 'Render requires a GitHub/GitLab repository. Please push your code to a Git repository and connect it via render.com dashboard.',
      dashboardUrl: 'https://dashboard.render.com/new/static'
    });

  } catch (error) {
    console.error('Render deploy error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Deployment failed'
    });
  }
});

// ============================================================================
// CLOUDFLARE PAGES DEPLOYMENT
// ============================================================================

// Validate Cloudflare token
router.post('/cloudflare/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token required' });
    }

    const response = await axios.get('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success) {
      res.json({
        valid: true,
        user: response.data.result?.id || 'Authenticated'
      });
    } else {
      res.json({ valid: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Cloudflare validation error:', error.response?.data || error.message);
    res.json({ valid: false, error: 'Invalid token' });
  }
});

// Deploy to Cloudflare Pages (Direct Upload)
router.post('/cloudflare/deploy', async (req, res) => {
  try {
    const { token, accountId, projectName, files } = req.body;

    if (!token || !accountId || !files) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token, Account ID, and files required. Get your Account ID from Cloudflare dashboard.' 
      });
    }

    const safeName = (projectName || 'canvas-app').toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Check if project exists, create if not
    try {
      await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${safeName}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (projectError) {
      if (projectError.response?.status === 404) {
        // Create project
        await axios.post(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
          {
            name: safeName,
            production_branch: 'main'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    }

    // Upload files using Direct Upload API
    const formData = new FormData();
    
    // Add each file to form data
    for (const [path, content] of Object.entries(files)) {
      const cleanPath = path.replace(/^\//, '');
      formData.append(cleanPath, Buffer.from(content), {
        filename: cleanPath,
        contentType: 'application/octet-stream'
      });
    }

    // Create deployment
    const deployResponse = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${safeName}/deployments`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...formData.getHeaders()
        }
      }
    );

    if (deployResponse.data.success) {
      const deployment = deployResponse.data.result;
      res.json({
        success: true,
        deploymentId: deployment.id,
        url: deployment.url,
        previewUrl: deployment.url,
        status: deployment.latest_stage?.name || 'deploying'
      });
    } else {
      throw new Error(deployResponse.data.errors?.[0]?.message || 'Deployment failed');
    }

  } catch (error) {
    console.error('Cloudflare deploy error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message || 'Deployment failed'
    });
  }
});

// ============================================================================
// FIREBASE HOSTING DEPLOYMENT
// ============================================================================

// Validate Firebase token
router.post('/firebase/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token required' });
    }

    // Firebase CI tokens are used with the CLI, not REST API directly
    // For REST API, we'd need a Google OAuth token
    res.json({
      valid: true,
      user: 'Firebase CI Token',
      note: 'Firebase deployment requires Firebase CLI. Use: firebase deploy --token YOUR_TOKEN'
    });
  } catch (error) {
    res.json({ valid: false, error: 'Invalid token' });
  }
});

// ============================================================================
// GENERIC PROVIDER STATUS CHECK
// ============================================================================

router.post('/status', async (req, res) => {
  try {
    const { provider, deploymentId, token, ...extraParams } = req.body;

    switch (provider) {
      case 'vercel': {
        const response = await axios.get(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const deployment = response.data;
        return res.json({
          status: deployment.readyState,
          url: deployment.url ? `https://${deployment.url}` : null,
          ready: deployment.readyState === 'READY',
          error: deployment.errorMessage
        });
      }

      case 'netlify': {
        const response = await axios.get(`https://api.netlify.com/api/v1/deploys/${deploymentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const deploy = response.data;
        return res.json({
          status: deploy.state,
          url: deploy.ssl_url || deploy.url,
          ready: deploy.state === 'ready',
          error: deploy.error_message
        });
      }

      default:
        return res.json({ status: 'unknown', ready: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Create a zip buffer from files object
async function createZipBuffer(files) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    // Add files to archive
    for (const [path, content] of Object.entries(files)) {
      const cleanPath = path.replace(/^\//, '');
      archive.append(content, { name: cleanPath });
    }

    archive.finalize();
  });
}

export default router;
