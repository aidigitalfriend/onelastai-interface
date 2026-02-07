/**
 * Git Webhook Handler — Handle GitHub/GitLab webhooks
 * 
 * Triggers automatic builds when push events are received
 * from connected git repositories.
 */

const crypto = require('crypto');
const { buildOrchestrator } = require('../build/build-orchestrator');

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'gencraft-webhook-secret';

/**
 * Verify GitHub webhook signature
 * 
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Hub-Signature-256 header
 * @returns {boolean}
 */
function verifyGitHubSignature(payload, signature) {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(payload).digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  );
}

/**
 * Handle GitHub push event
 * 
 * @param {Object} payload - GitHub webhook payload
 * @param {Object} project - Project record from database
 */
async function handleGitHubPush(payload, project) {
  const { ref, after, head_commit, pusher, repository } = payload;

  // Extract branch name from ref (refs/heads/main → main)
  const branch = ref.replace('refs/heads/', '');

  console.log(`[GitWebhook] Push to ${repository.full_name}:${branch} by ${pusher.name}`);

  // Only trigger builds for configured branches
  const triggerBranches = project.triggerBranches || ['main', 'master'];
  if (!triggerBranches.includes(branch)) {
    console.log(`[GitWebhook] Branch ${branch} not configured for auto-build — skipping`);
    return { triggered: false, reason: 'Branch not configured' };
  }

  // Trigger build
  const build = await buildOrchestrator.triggerBuild({
    projectId: project.id,
    userId: project.userId,
    sandboxId: project.sandboxId,
    branch,
    commitHash: after,
    commitMessage: head_commit?.message || 'Push from GitHub',
    triggeredBy: 'webhook',
    environment: branch === 'main' || branch === 'master' ? 'production' : 'preview',
  });

  console.log(`[GitWebhook] Build triggered: ${build.id}`);

  return {
    triggered: true,
    buildId: build.id,
    branch,
    commitHash: after,
  };
}

/**
 * Handle GitLab push event
 */
async function handleGitLabPush(payload, project) {
  const { ref, after, commits, user_name } = payload;
  const branch = ref.replace('refs/heads/', '');

  console.log(`[GitWebhook] GitLab push to ${branch} by ${user_name}`);

  const triggerBranches = project.triggerBranches || ['main', 'master'];
  if (!triggerBranches.includes(branch)) {
    return { triggered: false, reason: 'Branch not configured' };
  }

  const lastCommit = commits?.[commits.length - 1];

  const build = await buildOrchestrator.triggerBuild({
    projectId: project.id,
    userId: project.userId,
    sandboxId: project.sandboxId,
    branch,
    commitHash: after,
    commitMessage: lastCommit?.message || 'Push from GitLab',
    triggeredBy: 'webhook',
    environment: branch === 'main' || branch === 'master' ? 'production' : 'preview',
  });

  return {
    triggered: true,
    buildId: build.id,
    branch,
    commitHash: after,
  };
}

/**
 * Generate webhook URL for a project
 */
function generateWebhookUrl(projectId) {
  return `${process.env.API_BASE_URL || 'https://maula.ai'}/api/project/${projectId}/git/webhook`;
}

module.exports = {
  verifyGitHubSignature,
  handleGitHubPush,
  handleGitLabPush,
  generateWebhookUrl,
};
