/**
 * Production Git Service - Server-side Git Operations
 * 
 * This service handles Git operations that require server-side execution:
 * - Remote repository operations (push, pull, fetch)
 * - Credential management
 * - SSH key operations
 * - Large repository handling
 * - Webhook integrations
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as simpleGit from 'simple-git';
import { SimpleGit, SimpleGitOptions, StatusResult, LogResult, BranchSummary } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

// ==================== Types ====================

export interface GitCredentials {
  username?: string;
  password?: string;
  sshKey?: string;
  sshPassphrase?: string;
}

export interface CloneOptions {
  url: string;
  targetPath: string;
  branch?: string;
  depth?: number;
  credentials?: GitCredentials;
}

export interface PushOptions {
  repoPath: string;
  remote?: string;
  branch?: string;
  force?: boolean;
  tags?: boolean;
  credentials?: GitCredentials;
}

export interface PullOptions {
  repoPath: string;
  remote?: string;
  branch?: string;
  rebase?: boolean;
  credentials?: GitCredentials;
}

export interface CommitOptions {
  repoPath: string;
  message: string;
  files?: string[];
  all?: boolean;
  author?: {
    name: string;
    email: string;
  };
}

export interface BranchOptions {
  repoPath: string;
  name: string;
  startPoint?: string;
  checkout?: boolean;
}

export interface MergeOptions {
  repoPath: string;
  branch: string;
  strategy?: 'ort' | 'recursive' | 'ours' | 'theirs';
  noFastForward?: boolean;
  squash?: boolean;
}

export interface RebaseOptions {
  repoPath: string;
  upstream: string;
  interactive?: boolean;
  onto?: string;
}

export interface DiffOptions {
  repoPath: string;
  from?: string;
  to?: string;
  files?: string[];
  stat?: boolean;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: Array<{ path: string; status: string }>;
  unstaged: Array<{ path: string; status: string }>;
  untracked: string[];
  conflicted: string[];
  isClean: boolean;
}

export interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  refs: string;
  body: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
  remote?: string;
  tracking?: string;
  ahead?: number;
  behind?: number;
}

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitStash {
  index: number;
  message: string;
  date: string;
  hash: string;
}

// ==================== Service ====================

@Injectable()
export class GitService implements OnModuleInit {
  private readonly logger = new Logger('GitService');
  private readonly baseDir: string;
  private credentialCache: Map<string, GitCredentials> = new Map();

  constructor(private configService: ConfigService) {
    this.baseDir = this.configService.get('GIT_REPOS_PATH') || '/tmp/git-repos';
  }

  async onModuleInit() {
    // Ensure base directory exists
    await fs.mkdir(this.baseDir, { recursive: true });
    this.logger.log(`Git service initialized. Base directory: ${this.baseDir}`);
  }

  // ==================== Utility Methods ====================

  private getGit(repoPath: string): SimpleGit {
    const options: Partial<SimpleGitOptions> = {
      baseDir: repoPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    };
    return simpleGit.simpleGit(options);
  }

  private async setupCredentials(git: SimpleGit, credentials?: GitCredentials): Promise<void> {
    if (!credentials) return;

    if (credentials.username && credentials.password) {
      // Use credential helper for HTTPS
      await git.addConfig('credential.helper', 'store');
    }
    
    if (credentials.sshKey) {
      // Create temporary SSH key file
      const keyPath = path.join('/tmp', `git-key-${crypto.randomBytes(8).toString('hex')}`);
      await fs.writeFile(keyPath, credentials.sshKey, { mode: 0o600 });
      
      // Set GIT_SSH_COMMAND
      const sshCommand = credentials.sshPassphrase
        ? `ssh -i ${keyPath} -o StrictHostKeyChecking=no`
        : `ssh -i ${keyPath} -o StrictHostKeyChecking=no -o BatchMode=yes`;
      
      await git.env('GIT_SSH_COMMAND', sshCommand);
    }
  }

  private transformUrl(url: string, credentials?: GitCredentials): string {
    if (!credentials?.username || !credentials?.password) return url;
    
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        parsed.username = encodeURIComponent(credentials.username);
        parsed.password = encodeURIComponent(credentials.password);
        return parsed.toString();
      }
    } catch {
      // Not a valid URL, return as-is
    }
    
    return url;
  }

  // ==================== Repository Operations ====================

  async initRepository(targetPath: string): Promise<{ success: boolean; path: string }> {
    const fullPath = path.resolve(this.baseDir, targetPath);
    await fs.mkdir(fullPath, { recursive: true });
    
    const git = this.getGit(fullPath);
    await git.init();
    
    this.logger.log(`Initialized repository at ${fullPath}`);
    return { success: true, path: fullPath };
  }

  async clone(options: CloneOptions): Promise<{ success: boolean; path: string }> {
    const targetPath = path.resolve(this.baseDir, options.targetPath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    
    const cloneUrl = this.transformUrl(options.url, options.credentials);
    const git = simpleGit.simpleGit();
    
    await this.setupCredentials(git, options.credentials);
    
    const cloneOptions: string[] = [];
    if (options.branch) {
      cloneOptions.push('--branch', options.branch);
    }
    if (options.depth) {
      cloneOptions.push('--depth', String(options.depth));
    }
    
    await git.clone(cloneUrl, targetPath, cloneOptions);
    
    this.logger.log(`Cloned repository to ${targetPath}`);
    return { success: true, path: targetPath };
  }

  async getStatus(repoPath: string): Promise<GitStatus> {
    const git = this.getGit(repoPath);
    const status: StatusResult = await git.status();
    
    return {
      branch: status.current || 'HEAD',
      ahead: status.ahead,
      behind: status.behind,
      staged: status.staged.map(f => ({ path: f, status: 'staged' })),
      unstaged: status.modified.map(f => ({ path: f, status: 'modified' })),
      untracked: status.not_added,
      conflicted: status.conflicted,
      isClean: status.isClean(),
    };
  }

  // ==================== Staging Operations ====================

  async stageFiles(repoPath: string, files: string[]): Promise<void> {
    const git = this.getGit(repoPath);
    await git.add(files);
    this.logger.debug(`Staged files: ${files.join(', ')}`);
  }

  async stageAll(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.add('-A');
    this.logger.debug('Staged all files');
  }

  async unstageFiles(repoPath: string, files: string[]): Promise<void> {
    const git = this.getGit(repoPath);
    await git.reset(['HEAD', '--', ...files]);
  }

  async discardChanges(repoPath: string, files: string[]): Promise<void> {
    const git = this.getGit(repoPath);
    await git.checkout(['--', ...files]);
  }

  // ==================== Commit Operations ====================

  async commit(options: CommitOptions): Promise<{ hash: string }> {
    const git = this.getGit(options.repoPath);
    
    if (options.author) {
      await git.addConfig('user.name', options.author.name, false);
      await git.addConfig('user.email', options.author.email, false);
    }
    
    if (options.files && options.files.length > 0) {
      await git.add(options.files);
    } else if (options.all) {
      await git.add('-A');
    }
    
    const result = await git.commit(options.message);
    
    this.logger.log(`Committed: ${result.commit}`);
    return { hash: result.commit };
  }

  async getLog(repoPath: string, limit = 50, branch?: string): Promise<GitLogEntry[]> {
    const git = this.getGit(repoPath);
    
    const options: string[] = [
      `--max-count=${limit}`,
      '--format=%H|%ai|%s|%an|%ae|%D|%b|||',
    ];
    
    if (branch) {
      options.push(branch);
    }
    
    const result: LogResult = await git.log(options);
    
    return result.all.map(entry => ({
      hash: entry.hash,
      date: entry.date,
      message: entry.message,
      author: {
        name: entry.author_name,
        email: entry.author_email,
      },
      refs: entry.refs || '',
      body: entry.body || '',
    }));
  }

  async show(repoPath: string, ref: string): Promise<{ diff: string; stats: string }> {
    const git = this.getGit(repoPath);
    
    const [diff, stats] = await Promise.all([
      git.show([ref, '--format=', '--patch']),
      git.show([ref, '--format=', '--stat']),
    ]);
    
    return { diff, stats };
  }

  // ==================== Branch Operations ====================

  async getBranches(repoPath: string): Promise<GitBranch[]> {
    const git = this.getGit(repoPath);
    const branches: BranchSummary = await git.branch(['-vv', '-a']);
    
    return Object.entries(branches.branches).map(([name, info]) => ({
      name,
      current: (info as any).current,
      commit: (info as any).commit,
      remote: name.startsWith('remotes/') ? name.split('/')[1] : undefined,
      tracking: (info as any).label,
    }));
  }

  async createBranch(options: BranchOptions): Promise<void> {
    const git = this.getGit(options.repoPath);
    
    if (options.checkout) {
      await git.checkoutBranch(options.name, options.startPoint || 'HEAD');
    } else {
      await git.branch([options.name, options.startPoint || 'HEAD']);
    }
    
    this.logger.log(`Created branch: ${options.name}`);
  }

  async checkoutBranch(repoPath: string, branch: string, create = false): Promise<void> {
    const git = this.getGit(repoPath);
    
    if (create) {
      await git.checkoutBranch(branch, 'HEAD');
    } else {
      await git.checkout(branch);
    }
    
    this.logger.log(`Checked out branch: ${branch}`);
  }

  async deleteBranch(repoPath: string, branch: string, force = false): Promise<void> {
    const git = this.getGit(repoPath);
    await git.deleteLocalBranch(branch, force);
    this.logger.log(`Deleted branch: ${branch}`);
  }

  async renameBranch(repoPath: string, oldName: string, newName: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.branch(['-m', oldName, newName]);
    this.logger.log(`Renamed branch: ${oldName} -> ${newName}`);
  }

  // ==================== Remote Operations ====================

  async getRemotes(repoPath: string): Promise<GitRemote[]> {
    const git = this.getGit(repoPath);
    const remotes = await git.getRemotes(true);
    
    return remotes.map(r => ({
      name: r.name,
      fetchUrl: r.refs.fetch || '',
      pushUrl: r.refs.push || r.refs.fetch || '',
    }));
  }

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.addRemote(name, url);
    this.logger.log(`Added remote: ${name} -> ${url}`);
  }

  async removeRemote(repoPath: string, name: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.removeRemote(name);
    this.logger.log(`Removed remote: ${name}`);
  }

  async fetch(repoPath: string, remote = 'origin', credentials?: GitCredentials): Promise<void> {
    const git = this.getGit(repoPath);
    await this.setupCredentials(git, credentials);
    
    await git.fetch(remote, undefined, ['--prune']);
    this.logger.log(`Fetched from ${remote}`);
  }

  async pull(options: PullOptions): Promise<{ changes: number; insertions: number; deletions: number }> {
    const git = this.getGit(options.repoPath);
    await this.setupCredentials(git, options.credentials);
    
    const pullOptions: string[] = [];
    if (options.rebase) {
      pullOptions.push('--rebase');
    }
    
    const result = await git.pull(options.remote || 'origin', options.branch, pullOptions);
    
    this.logger.log(`Pulled: ${result.summary.changes} changes`);
    return {
      changes: result.summary.changes,
      insertions: result.summary.insertions,
      deletions: result.summary.deletions,
    };
  }

  async push(options: PushOptions): Promise<void> {
    const git = this.getGit(options.repoPath);
    await this.setupCredentials(git, options.credentials);
    
    const pushOptions: string[] = [];
    if (options.force) {
      pushOptions.push('--force-with-lease');
    }
    if (options.tags) {
      pushOptions.push('--tags');
    }
    
    await git.push(options.remote || 'origin', options.branch, pushOptions);
    this.logger.log(`Pushed to ${options.remote || 'origin'}/${options.branch || 'current'}`);
  }

  // ==================== Merge & Rebase ====================

  async merge(options: MergeOptions): Promise<{ success: boolean; conflicts: string[] }> {
    const git = this.getGit(options.repoPath);
    
    const mergeOptions: string[] = [];
    if (options.noFastForward) {
      mergeOptions.push('--no-ff');
    }
    if (options.squash) {
      mergeOptions.push('--squash');
    }
    if (options.strategy) {
      mergeOptions.push('-s', options.strategy);
    }
    
    try {
      await git.merge([options.branch, ...mergeOptions]);
      this.logger.log(`Merged ${options.branch}`);
      return { success: true, conflicts: [] };
    } catch (error: any) {
      // Check for merge conflicts
      const status = await git.status();
      if (status.conflicted.length > 0) {
        return { success: false, conflicts: status.conflicted };
      }
      throw error;
    }
  }

  async abortMerge(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.merge(['--abort']);
    this.logger.log('Merge aborted');
  }

  async rebase(options: RebaseOptions): Promise<{ success: boolean; conflicts: string[] }> {
    const git = this.getGit(options.repoPath);
    
    const rebaseArgs: string[] = [options.upstream];
    if (options.onto) {
      rebaseArgs.unshift('--onto', options.onto);
    }
    
    try {
      await git.rebase(rebaseArgs);
      this.logger.log(`Rebased onto ${options.upstream}`);
      return { success: true, conflicts: [] };
    } catch (error: any) {
      const status = await git.status();
      if (status.conflicted.length > 0) {
        return { success: false, conflicts: status.conflicted };
      }
      throw error;
    }
  }

  async abortRebase(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.rebase(['--abort']);
    this.logger.log('Rebase aborted');
  }

  async continueRebase(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.rebase(['--continue']);
  }

  // ==================== Stash Operations ====================

  async getStashes(repoPath: string): Promise<GitStash[]> {
    const git = this.getGit(repoPath);
    const result = await git.stashList();
    
    return result.all.map((stash, index) => ({
      index,
      message: stash.message,
      date: stash.date,
      hash: stash.hash,
    }));
  }

  async stash(repoPath: string, message?: string, includeUntracked = true): Promise<void> {
    const git = this.getGit(repoPath);
    
    const options: string[] = ['push'];
    if (message) {
      options.push('-m', message);
    }
    if (includeUntracked) {
      options.push('-u');
    }
    
    await git.stash(options);
    this.logger.log('Changes stashed');
  }

  async stashPop(repoPath: string, index = 0): Promise<void> {
    const git = this.getGit(repoPath);
    await git.stash(['pop', `stash@{${index}}`]);
    this.logger.log(`Popped stash@{${index}}`);
  }

  async stashApply(repoPath: string, index = 0): Promise<void> {
    const git = this.getGit(repoPath);
    await git.stash(['apply', `stash@{${index}}`]);
    this.logger.log(`Applied stash@{${index}}`);
  }

  async stashDrop(repoPath: string, index = 0): Promise<void> {
    const git = this.getGit(repoPath);
    await git.stash(['drop', `stash@{${index}}`]);
    this.logger.log(`Dropped stash@{${index}}`);
  }

  // ==================== Diff Operations ====================

  async getDiff(options: DiffOptions): Promise<string> {
    const git = this.getGit(options.repoPath);
    
    const diffArgs: string[] = [];
    
    if (options.stat) {
      diffArgs.push('--stat');
    }
    
    if (options.from && options.to) {
      diffArgs.push(`${options.from}..${options.to}`);
    } else if (options.from) {
      diffArgs.push(options.from);
    }
    
    if (options.files && options.files.length > 0) {
      diffArgs.push('--', ...options.files);
    }
    
    return await git.diff(diffArgs);
  }

  async getStagedDiff(repoPath: string): Promise<string> {
    const git = this.getGit(repoPath);
    return await git.diff(['--cached']);
  }

  async getFileDiff(repoPath: string, filePath: string, staged = false): Promise<string> {
    const git = this.getGit(repoPath);
    const args = staged ? ['--cached', '--', filePath] : ['--', filePath];
    return await git.diff(args);
  }

  // ==================== Tags ====================

  async getTags(repoPath: string): Promise<Array<{ name: string; hash: string }>> {
    const git = this.getGit(repoPath);
    const tags = await git.tags();
    
    const result: Array<{ name: string; hash: string }> = [];
    for (const tag of tags.all) {
      const hash = await git.revparse([tag]);
      result.push({ name: tag, hash: hash.trim() });
    }
    
    return result;
  }

  async createTag(repoPath: string, name: string, message?: string, ref = 'HEAD'): Promise<void> {
    const git = this.getGit(repoPath);
    
    if (message) {
      await git.tag(['-a', name, '-m', message, ref]);
    } else {
      await git.tag([name, ref]);
    }
    
    this.logger.log(`Created tag: ${name}`);
  }

  async deleteTag(repoPath: string, name: string, remote?: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.tag(['-d', name]);
    
    if (remote) {
      await git.push(remote, `:refs/tags/${name}`);
    }
    
    this.logger.log(`Deleted tag: ${name}`);
  }

  // ==================== Reset & Revert ====================

  async reset(repoPath: string, ref: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<void> {
    const git = this.getGit(repoPath);
    await git.reset([`--${mode}`, ref]);
    this.logger.log(`Reset to ${ref} (${mode})`);
  }

  async revert(repoPath: string, commit: string, noCommit = false): Promise<void> {
    const git = this.getGit(repoPath);
    
    if (noCommit) {
      await git.raw(['revert', '--no-commit', commit]);
    } else {
      await git.revert(commit);
    }
    
    this.logger.log(`Reverted ${commit}`);
  }

  // ==================== Cherry Pick ====================

  async cherryPick(repoPath: string, commits: string[], noCommit = false): Promise<void> {
    const git = this.getGit(repoPath);
    
    const options = noCommit ? ['--no-commit', ...commits] : commits;
    await git.raw(['cherry-pick', ...options]);
    
    this.logger.log(`Cherry-picked: ${commits.join(', ')}`);
  }

  // ==================== Blame ====================

  async blame(repoPath: string, filePath: string): Promise<Array<{
    hash: string;
    author: string;
    date: string;
    line: number;
    content: string;
  }>> {
    const git = this.getGit(repoPath);
    const raw = await git.raw(['blame', '-l', '-t', '--', filePath]);
    
    const lines = raw.split('\n').filter(l => l.trim());
    return lines.map((line, index) => {
      const match = line.match(/^(\w+)\s+.*?\((.+?)\s+(\d+)\s+[+-]\d+\s+(\d+)\)\s*(.*)$/);
      if (match) {
        return {
          hash: match[1],
          author: match[2].trim(),
          date: new Date(parseInt(match[3]) * 1000).toISOString(),
          line: parseInt(match[4]),
          content: match[5] || '',
        };
      }
      return {
        hash: '',
        author: '',
        date: '',
        line: index + 1,
        content: line,
      };
    });
  }

  // ==================== Config ====================

  async getConfig(repoPath: string, key: string): Promise<string | null> {
    const git = this.getGit(repoPath);
    try {
      const value = await git.getConfig(key);
      return value.value || null;
    } catch {
      return null;
    }
  }

  async setConfig(repoPath: string, key: string, value: string, global = false): Promise<void> {
    const git = this.getGit(repoPath);
    await git.addConfig(key, value, false, global ? 'global' : 'local');
  }

  // ==================== Worktree ====================

  async getWorktrees(repoPath: string): Promise<Array<{ path: string; head: string; branch: string }>> {
    const git = this.getGit(repoPath);
    const result = await git.raw(['worktree', 'list', '--porcelain']);
    
    const worktrees: Array<{ path: string; head: string; branch: string }> = [];
    let current: any = {};
    
    for (const line of result.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current.path) worktrees.push(current);
        current = { path: line.replace('worktree ', ''), head: '', branch: '' };
      } else if (line.startsWith('HEAD ')) {
        current.head = line.replace('HEAD ', '');
      } else if (line.startsWith('branch ')) {
        current.branch = line.replace('branch refs/heads/', '');
      }
    }
    
    if (current.path) worktrees.push(current);
    return worktrees;
  }

  // ==================== Validation ====================

  async isGitRepository(dirPath: string): Promise<boolean> {
    try {
      const git = this.getGit(dirPath);
      await git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  async hasRemote(repoPath: string, remote = 'origin'): Promise<boolean> {
    const remotes = await this.getRemotes(repoPath);
    return remotes.some(r => r.name === remote);
  }

  async getBranchTrackingInfo(repoPath: string, branch?: string): Promise<{ ahead: number; behind: number } | null> {
    const git = this.getGit(repoPath);
    
    try {
      const currentBranch = branch || (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
      const tracking = await git.raw(['rev-list', '--left-right', '--count', `${currentBranch}...origin/${currentBranch}`]);
      const [ahead, behind] = tracking.trim().split('\t').map(Number);
      return { ahead, behind };
    } catch {
      return null;
    }
  }
}
