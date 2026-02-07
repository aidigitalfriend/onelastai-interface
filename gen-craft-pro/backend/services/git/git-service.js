/**
 * Git Service — Backend git operations using isomorphic-git
 * 
 * Provides git functionality for project sandboxes:
 *   - Initialize repo
 *   - Stage, commit, push
 *   - Branch management
 *   - Diff and log
 *   - Webhook handling for external repos
 */

const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');
const { sandboxManager } = require('../sandbox/sandbox-manager');

/**
 * Initialize a git repository in a sandbox
 * 
 * @param {string} sandboxId
 * @param {Object} options
 * @param {string} [options.defaultBranch='main']
 * @param {string} [options.authorName]
 * @param {string} [options.authorEmail]
 */
async function initRepo(sandboxId, options = {}) {
  const result = await sandboxManager.exec(sandboxId, [
    'git init',
    `git checkout -b ${options.defaultBranch || 'main'}`,
    options.authorName ? `git config user.name "${options.authorName}"` : '',
    options.authorEmail ? `git config user.email "${options.authorEmail}"` : '',
    'git add .',
    'git commit -m "Initial commit" --allow-empty',
  ].filter(Boolean).join(' && '), { timeout: 15000 });

  return {
    success: result.exitCode === 0,
    output: result.stdout,
    error: result.stderr,
  };
}

/**
 * Get git status for sandbox project
 * 
 * @param {string} sandboxId
 * @returns {Object} Git status
 */
async function getStatus(sandboxId) {
  const result = await sandboxManager.exec(sandboxId, 
    'git status --porcelain -b 2>/dev/null', 
    { timeout: 10000 }
  );

  if (result.exitCode !== 0) {
    return { branch: 'main', isClean: true, staged: [], unstaged: [], untracked: [] };
  }

  const lines = result.stdout.split('\n').filter(Boolean);
  const branchLine = lines.find(l => l.startsWith('##'));
  const branch = branchLine 
    ? branchLine.replace('## ', '').split('...')[0]
    : 'main';

  const staged = [];
  const unstaged = [];
  const untracked = [];

  for (const line of lines) {
    if (line.startsWith('##')) continue;
    const x = line[0]; // Index status
    const y = line[1]; // Working tree status
    const filePath = line.slice(3).trim();

    if (x === '?' && y === '?') {
      untracked.push(filePath);
    } else {
      if (x !== ' ' && x !== '?') {
        staged.push({
          path: filePath,
          status: x === 'A' ? 'added' : x === 'M' ? 'modified' : x === 'D' ? 'deleted' : x === 'R' ? 'renamed' : 'modified',
        });
      }
      if (y !== ' ' && y !== '?') {
        unstaged.push({
          path: filePath,
          status: y === 'A' ? 'added' : y === 'M' ? 'modified' : y === 'D' ? 'deleted' : 'modified',
        });
      }
    }
  }

  // Get ahead/behind count
  let ahead = 0, behind = 0;
  try {
    const abResult = await sandboxManager.exec(sandboxId,
      'git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null',
      { timeout: 5000 }
    );
    if (abResult.exitCode === 0) {
      const [a, b] = abResult.stdout.trim().split('\t').map(Number);
      ahead = a || 0;
      behind = b || 0;
    }
  } catch {}

  return {
    branch,
    isClean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0,
    ahead,
    behind,
    staged,
    unstaged,
    untracked,
  };
}

/**
 * Stage files for commit
 * 
 * @param {string} sandboxId
 * @param {string[]} files - File paths to stage (or ['.'] for all)
 */
async function stageFiles(sandboxId, files = ['.']) {
  const fileArgs = files.map(f => `"${f}"`).join(' ');
  const result = await sandboxManager.exec(sandboxId, 
    `git add ${fileArgs}`,
    { timeout: 10000 }
  );

  return {
    success: result.exitCode === 0,
    output: result.stdout,
    error: result.stderr,
  };
}

/**
 * Unstage files
 */
async function unstageFiles(sandboxId, files = ['.']) {
  const fileArgs = files.map(f => `"${f}"`).join(' ');
  const result = await sandboxManager.exec(sandboxId,
    `git reset HEAD ${fileArgs}`,
    { timeout: 10000 }
  );

  return {
    success: result.exitCode === 0,
    output: result.stdout,
    error: result.stderr,
  };
}

/**
 * Create a commit
 * 
 * @param {string} sandboxId
 * @param {string} message - Commit message
 * @param {Object} [author]
 * @param {string} [author.name]
 * @param {string} [author.email]
 */
async function commit(sandboxId, message, author = {}) {
  let cmd = `git commit -m "${message.replace(/"/g, '\\"')}"`;
  
  if (author.name && author.email) {
    cmd += ` --author="${author.name} <${author.email}>"`;
  }

  const result = await sandboxManager.exec(sandboxId, cmd, { timeout: 15000 });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Commit failed');
  }

  // Get commit hash
  const hashResult = await sandboxManager.exec(sandboxId, 
    'git rev-parse --short HEAD',
    { timeout: 5000 }
  );

  return {
    success: true,
    hash: hashResult.stdout.trim(),
    message,
    output: result.stdout,
  };
}

/**
 * Get commit log
 * 
 * @param {string} sandboxId
 * @param {number} [limit=50]
 */
async function getLog(sandboxId, limit = 50) {
  const result = await sandboxManager.exec(sandboxId,
    `git log --oneline --format='%H|%h|%s|%an|%ae|%aI|%P' -n ${limit} 2>/dev/null`,
    { timeout: 10000 }
  );

  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return [];
  }

  return result.stdout.trim().split('\n').map(line => {
    const [hash, shortHash, message, author, authorEmail, date, parents] = line.split('|');
    return {
      hash,
      shortHash,
      message,
      author,
      authorEmail,
      date,
      parents: parents ? parents.split(' ').filter(Boolean) : [],
    };
  });
}

/**
 * Get diff for staged or unstaged changes
 * 
 * @param {string} sandboxId
 * @param {Object} [options]
 * @param {boolean} [options.staged=false] - Show staged changes
 * @param {string} [options.file] - Specific file to diff
 */
async function getDiff(sandboxId, options = {}) {
  let cmd = 'git diff';
  if (options.staged) cmd += ' --cached';
  if (options.file) cmd += ` -- "${options.file}"`;
  cmd += ' 2>/dev/null';

  const result = await sandboxManager.exec(sandboxId, cmd, { timeout: 10000 });

  return {
    raw: result.stdout,
    files: parseDiff(result.stdout),
  };
}

/**
 * List branches
 */
async function getBranches(sandboxId) {
  const result = await sandboxManager.exec(sandboxId,
    'git branch -a --format="%(refname:short)|%(HEAD)|%(objectname:short)|%(subject)" 2>/dev/null',
    { timeout: 10000 }
  );

  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return [{ name: 'main', isCurrent: true, isRemote: false }];
  }

  return result.stdout.trim().split('\n').map(line => {
    const [name, isCurrent, commitHash, lastMessage] = line.split('|');
    return {
      name: name.trim(),
      isCurrent: isCurrent === '*',
      isRemote: name.startsWith('remotes/'),
      lastCommitHash: commitHash,
      lastCommitMessage: lastMessage,
    };
  });
}

/**
 * Create a new branch
 */
async function createBranch(sandboxId, branchName, checkout = true) {
  const cmd = checkout
    ? `git checkout -b "${branchName}"`
    : `git branch "${branchName}"`;

  const result = await sandboxManager.exec(sandboxId, cmd, { timeout: 10000 });

  return {
    success: result.exitCode === 0,
    branch: branchName,
    output: result.stdout || result.stderr,
  };
}

/**
 * Switch to a branch
 */
async function checkoutBranch(sandboxId, branchName) {
  const result = await sandboxManager.exec(sandboxId,
    `git checkout "${branchName}"`,
    { timeout: 10000 }
  );

  return {
    success: result.exitCode === 0,
    branch: branchName,
    output: result.stdout || result.stderr,
  };
}

/**
 * Push to remote
 */
async function push(sandboxId, remote = 'origin', branch = '') {
  const branchArg = branch || '';
  const result = await sandboxManager.exec(sandboxId,
    `git push ${remote} ${branchArg} 2>&1`,
    { timeout: 30000 }
  );

  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr,
  };
}

/**
 * Pull from remote
 */
async function pull(sandboxId, remote = 'origin', branch = '') {
  const branchArg = branch || '';
  const result = await sandboxManager.exec(sandboxId,
    `git pull ${remote} ${branchArg} 2>&1`,
    { timeout: 30000 }
  );

  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr,
  };
}

/**
 * Add remote
 */
async function addRemote(sandboxId, name, url) {
  const result = await sandboxManager.exec(sandboxId,
    `git remote add ${name} "${url}" 2>&1 || git remote set-url ${name} "${url}" 2>&1`,
    { timeout: 10000 }
  );

  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr,
  };
}

// ──────── HELPERS ────────

function parseDiff(diffText) {
  if (!diffText) return [];

  const files = [];
  const fileDiffs = diffText.split(/^diff --git /m).filter(Boolean);

  for (const fileDiff of fileDiffs) {
    const lines = fileDiff.split('\n');
    const headerMatch = lines[0].match(/a\/(.*?) b\/(.*)/);
    if (!headerMatch) continue;

    const filePath = headerMatch[2];
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    files.push({
      path: filePath,
      additions,
      deletions,
    });
  }

  return files;
}

module.exports = {
  initRepo,
  getStatus,
  stageFiles,
  unstageFiles,
  commit,
  getLog,
  getDiff,
  getBranches,
  createBranch,
  checkoutBranch,
  push,
  pull,
  addRemote,
};
