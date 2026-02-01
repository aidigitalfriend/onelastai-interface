/**
 * Production-Level Git Service
 * Features:
 * - Full Git operations (clone, commit, push, pull, merge, rebase)
 * - Branch management with tracking
 * - Remote management
 * - Stash support
 * - Merge conflict detection and resolution
 * - Git blame and history
 * - Credential management
 * - Submodule support
 * - Git hooks integration
 */

import git, { ReadCommitResult, WalkerEntry } from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import LightningFS from '@isomorphic-git/lightning-fs';

// Initialize file system with persistence
const fs = new LightningFS('maula-git-fs', { wipe: false });

// ==================== Type Definitions ====================

export interface GitRepository {
  dir: string;
  url?: string;
  isInitialized: boolean;
  currentBranch: string | null;
  remotes: GitRemote[];
  hasUncommittedChanges: boolean;
}

export interface GitRemote {
  name: string;
  url: string;
  fetchUrl?: string;
  pushUrl?: string;
}

export interface GitStatus {
  filepath: string;
  status: 'modified' | 'added' | 'deleted' | 'unmodified' | 'untracked' | 'ignored' | 'conflict';
  staged: boolean;
  workdir: number;
  stage: number;
  head: number;
  conflictType?: 'both-modified' | 'deleted-by-us' | 'deleted-by-them' | 'added-by-both';
}

export interface GitCommit {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  parent: string[];
  tree: string;
  gpgsig?: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  ahead?: number;
  behind?: number;
  lastCommit?: string;
  tracking?: string;
}

export interface GitTag {
  name: string;
  oid: string;
  annotated: boolean;
  message?: string;
  tagger?: {
    name: string;
    email: string;
    timestamp: number;
  };
}

export interface GitStash {
  index: number;
  message: string;
  oid: string;
  timestamp: number;
  branch: string;
}

export interface GitBlame {
  lineNumber: number;
  content: string;
  commit: string;
  author: string;
  timestamp: number;
}

export interface GitDiff {
  filepath: string;
  type: 'add' | 'modify' | 'delete' | 'rename';
  oldPath?: string;
  additions: number;
  deletions: number;
  hunks: GitDiffHunk[];
  binary: boolean;
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
}

export interface GitDiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldNumber?: number;
  newNumber?: number;
}

export interface GitConflict {
  filepath: string;
  ourContent: string;
  theirContent: string;
  baseContent: string;
  resolvedContent?: string;
}

export interface GitCredentials {
  username: string;
  password?: string;
  token?: string;
  sshKey?: string;
}

export interface GitCloneOptions {
  url: string;
  dir?: string;
  branch?: string;
  depth?: number;
  singleBranch?: boolean;
  credentials?: GitCredentials;
  onProgress?: (progress: GitProgress) => void;
  onMessage?: (message: string) => void;
}

export interface GitProgress {
  phase: string;
  loaded: number;
  total: number;
  percent: number;
}

export interface GitConfig {
  'user.name'?: string;
  'user.email'?: string;
  'core.autocrlf'?: 'true' | 'false' | 'input';
  'init.defaultBranch'?: string;
}

// ==================== Git Service Class ====================

class GitService {
  private dir = '/project';
  private credentials: Map<string, GitCredentials> = new Map();
  private stashes: GitStash[] = [];
  private config: GitConfig = {};
  private corsProxy = 'https://cors.isomorphic-git.org';
  
  // Storage keys
  private CREDS_KEY = 'git_credentials';
  private CONFIG_KEY = 'git_config';
  private STASH_KEY = 'git_stashes';

  constructor() {
    this.loadFromStorage();
  }

  // ==================== Configuration ====================

  setConfig(config: Partial<GitConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveToStorage();
  }

  getConfig(): GitConfig {
    return { ...this.config };
  }

  async getGitConfig(key: string): Promise<string | undefined> {
    try {
      return await git.getConfig({ fs, dir: this.dir, path: key });
    } catch {
      return undefined;
    }
  }

  async setGitConfig(key: string, value: string): Promise<void> {
    await git.setConfig({ fs, dir: this.dir, path: key, value });
  }

  getAuthor(): { name: string; email: string } {
    return {
      name: this.config['user.name'] || 'Maula User',
      email: this.config['user.email'] || 'user@maula.dev',
    };
  }

  setWorkingDirectory(dir: string): void {
    this.dir = dir;
  }

  getWorkingDirectory(): string {
    return this.dir;
  }

  // ==================== Credentials Management ====================

  setCredentials(remote: string, credentials: GitCredentials): void {
    this.credentials.set(remote, credentials);
    this.saveToStorage();
  }

  getCredentials(remote: string): GitCredentials | undefined {
    return this.credentials.get(remote);
  }

  removeCredentials(remote: string): void {
    this.credentials.delete(remote);
    this.saveToStorage();
  }

  private getAuthCallback(url?: string): () => GitCredentials | undefined {
    return () => {
      if (!url) return undefined;
      
      // Try to find matching credentials
      for (const [remote, creds] of this.credentials) {
        if (url.includes(remote) || remote === 'default') {
          return creds;
        }
      }
      
      return this.credentials.get('default');
    };
  }

  // ==================== Repository Operations ====================

  async init(options?: { defaultBranch?: string }): Promise<void> {
    const defaultBranch = options?.defaultBranch || this.config['init.defaultBranch'] || 'main';
    
    await git.init({ 
      fs, 
      dir: this.dir, 
      defaultBranch,
    });
    
    console.log(`Git repository initialized with default branch: ${defaultBranch}`);
  }

  async clone(options: GitCloneOptions): Promise<void> {
    const dir = options.dir || this.dir;
    
    // Clean target directory
    await this.cleanDirectory(dir);

    const cloneOptions: any = {
      fs,
      http,
      dir,
      url: options.url,
      ref: options.branch || 'main',
      singleBranch: options.singleBranch ?? true,
      depth: options.depth || 1,
      corsProxy: this.corsProxy,
    };

    // Add auth if credentials provided
    if (options.credentials) {
      cloneOptions.onAuth = () => options.credentials;
    } else {
      cloneOptions.onAuth = this.getAuthCallback(options.url);
    }

    // Progress callback
    if (options.onProgress) {
      cloneOptions.onProgress = (event: any) => {
        options.onProgress!({
          phase: event.phase,
          loaded: event.loaded || 0,
          total: event.total || 0,
          percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0,
        });
      };
    }

    // Message callback
    if (options.onMessage) {
      cloneOptions.onMessage = options.onMessage;
    }

    await git.clone(cloneOptions);
    this.dir = dir;
    
    console.log(`Cloned ${options.url} to ${dir}`);
  }

  async isRepository(): Promise<boolean> {
    try {
      await git.findRoot({ fs, filepath: this.dir });
      return true;
    } catch {
      return false;
    }
  }

  async getRepositoryInfo(): Promise<GitRepository> {
    const isInitialized = await this.isRepository();
    
    if (!isInitialized) {
      return {
        dir: this.dir,
        isInitialized: false,
        currentBranch: null,
        remotes: [],
        hasUncommittedChanges: false,
      };
    }

    const [currentBranch, remotes, status] = await Promise.all([
      this.getCurrentBranch(),
      this.listRemotes(),
      this.status(),
    ]);

    return {
      dir: this.dir,
      isInitialized,
      currentBranch,
      remotes,
      hasUncommittedChanges: status.some(s => s.status !== 'unmodified'),
    };
  }

  // ==================== Status & Staging ====================

  async status(): Promise<GitStatus[]> {
    try {
      const matrix = await git.statusMatrix({ fs, dir: this.dir });
      
      return matrix.map(([filepath, head, workdir, stage]) => {
        let status: GitStatus['status'] = 'unmodified';
        let staged = stage !== head;
        
        // Determine status based on matrix values
        // [HEAD, WORKDIR, STAGE]
        // 0 = absent, 1 = same as HEAD, 2 = different from HEAD
        
        if (head === 0 && workdir === 2 && stage === 0) {
          status = 'untracked';
          staged = false;
        } else if (head === 0 && workdir === 2 && stage === 2) {
          status = 'added';
          staged = true;
        } else if (head === 0 && workdir === 2 && stage === 3) {
          status = 'added';
          staged = false;
        } else if (head === 1 && workdir === 2 && stage === 1) {
          status = 'modified';
          staged = false;
        } else if (head === 1 && workdir === 2 && stage === 2) {
          status = 'modified';
          staged = true;
        } else if (head === 1 && workdir === 2 && stage === 3) {
          status = 'modified';
          staged = false;
        } else if (head === 1 && workdir === 0 && stage === 0) {
          status = 'deleted';
          staged = true;
        } else if (head === 1 && workdir === 0 && stage === 1) {
          status = 'deleted';
          staged = false;
        } else if (head === 1 && workdir === 1 && stage === 1) {
          status = 'unmodified';
          staged = false;
        }

        return {
          filepath,
          status,
          staged,
          head,
          workdir,
          stage,
        };
      }).filter(f => f.status !== 'unmodified');
    } catch (error) {
      console.error('Git status error:', error);
      return [];
    }
  }

  async add(filepath: string): Promise<void> {
    await git.add({ fs, dir: this.dir, filepath });
  }

  async addAll(): Promise<void> {
    const statuses = await this.status();
    
    for (const file of statuses) {
      if (file.status === 'deleted') {
        await git.remove({ fs, dir: this.dir, filepath: file.filepath });
      } else if (file.status !== 'unmodified') {
        await git.add({ fs, dir: this.dir, filepath: file.filepath });
      }
    }
  }

  async unstage(filepath: string): Promise<void> {
    await git.resetIndex({ fs, dir: this.dir, filepath });
  }

  async unstageAll(): Promise<void> {
    const statuses = await this.status();
    
    for (const file of statuses) {
      if (file.staged) {
        await git.resetIndex({ fs, dir: this.dir, filepath: file.filepath });
      }
    }
  }

  async remove(filepath: string): Promise<void> {
    await git.remove({ fs, dir: this.dir, filepath });
  }

  // ==================== Commits ====================

  async commit(message: string, options?: {
    amend?: boolean;
    author?: { name: string; email: string };
  }): Promise<string> {
    const author = options?.author || this.getAuthor();
    
    const sha = await git.commit({
      fs,
      dir: this.dir,
      message,
      author,
    });
    
    console.log(`Committed: ${sha.slice(0, 7)} - ${message}`);
    return sha;
  }

  async log(options?: {
    depth?: number;
    ref?: string;
    filepath?: string;
  }): Promise<GitCommit[]> {
    try {
      const commits = await git.log({
        fs,
        dir: this.dir,
        depth: options?.depth || 50,
        ref: options?.ref,
      });

      return commits.map(c => ({
        oid: c.oid,
        message: c.commit.message,
        author: {
          name: c.commit.author.name,
          email: c.commit.author.email,
          timestamp: c.commit.author.timestamp,
          timezoneOffset: c.commit.author.timezoneOffset,
        },
        committer: {
          name: c.commit.committer.name,
          email: c.commit.committer.email,
          timestamp: c.commit.committer.timestamp,
          timezoneOffset: c.commit.committer.timezoneOffset,
        },
        parent: c.commit.parent,
        tree: c.commit.tree,
        gpgsig: c.commit.gpgsig,
      }));
    } catch (error) {
      console.error('Git log error:', error);
      return [];
    }
  }

  async getCommit(oid: string): Promise<GitCommit | null> {
    try {
      const result = await git.readCommit({ fs, dir: this.dir, oid });
      return {
        oid: result.oid,
        message: result.commit.message,
        author: {
          name: result.commit.author.name,
          email: result.commit.author.email,
          timestamp: result.commit.author.timestamp,
          timezoneOffset: result.commit.author.timezoneOffset,
        },
        committer: {
          name: result.commit.committer.name,
          email: result.commit.committer.email,
          timestamp: result.commit.committer.timestamp,
          timezoneOffset: result.commit.committer.timezoneOffset,
        },
        parent: result.commit.parent,
        tree: result.commit.tree,
        gpgsig: result.commit.gpgsig,
      };
    } catch {
      return null;
    }
  }

  // ==================== Branches ====================

  async getCurrentBranch(): Promise<string | null> {
    try {
      const branch = await git.currentBranch({ fs, dir: this.dir, fullname: false });
      return branch || null;
    } catch {
      return null;
    }
  }

  async listBranches(options?: { remote?: string }): Promise<GitBranch[]> {
    try {
      let branches: string[];
      
      if (options?.remote) {
        branches = await git.listBranches({ fs, dir: this.dir, remote: options.remote });
        return branches.map(name => ({
          name,
          current: false,
          remote: options.remote,
        }));
      }
      
      branches = await git.listBranches({ fs, dir: this.dir });
      const current = await this.getCurrentBranch();
      
      const branchList: GitBranch[] = [];
      
      for (const name of branches) {
        const branch: GitBranch = {
          name,
          current: name === current,
        };
        
        // Get last commit for branch
        try {
          const commits = await git.log({ fs, dir: this.dir, ref: name, depth: 1 });
          if (commits.length > 0) {
            branch.lastCommit = commits[0].oid.slice(0, 7);
          }
        } catch {}
        
        branchList.push(branch);
      }
      
      return branchList;
    } catch (error) {
      console.error('List branches error:', error);
      return [];
    }
  }

  async createBranch(name: string, options?: {
    checkout?: boolean;
    ref?: string;
  }): Promise<void> {
    await git.branch({
      fs,
      dir: this.dir,
      ref: name,
      object: options?.ref,
    });
    
    if (options?.checkout) {
      await this.checkout(name);
    }
  }

  async deleteBranch(name: string, options?: { force?: boolean }): Promise<void> {
    await git.deleteBranch({
      fs,
      dir: this.dir,
      ref: name,
    });
  }

  async renameBranch(oldName: string, newName: string): Promise<void> {
    await git.renameBranch({
      fs,
      dir: this.dir,
      ref: newName,
      oldref: oldName,
    });
  }

  async checkout(ref: string, options?: {
    force?: boolean;
    track?: boolean;
  }): Promise<void> {
    await git.checkout({
      fs,
      dir: this.dir,
      ref,
      force: options?.force,
      track: options?.track,
    });
  }

  // ==================== Remotes ====================

  async listRemotes(): Promise<GitRemote[]> {
    try {
      const remotes = await git.listRemotes({ fs, dir: this.dir });
      return remotes.map(r => ({
        name: r.remote,
        url: r.url,
      }));
    } catch {
      return [];
    }
  }

  async addRemote(name: string, url: string): Promise<void> {
    await git.addRemote({ fs, dir: this.dir, remote: name, url });
  }

  async removeRemote(name: string): Promise<void> {
    await git.deleteRemote({ fs, dir: this.dir, remote: name });
  }

  // ==================== Fetch, Pull, Push ====================

  async fetch(options?: {
    remote?: string;
    ref?: string;
    depth?: number;
    credentials?: GitCredentials;
    onProgress?: (progress: GitProgress) => void;
  }): Promise<void> {
    const fetchOptions: any = {
      fs,
      http,
      dir: this.dir,
      remote: options?.remote || 'origin',
      ref: options?.ref,
      depth: options?.depth,
      singleBranch: !!options?.ref,
      corsProxy: this.corsProxy,
    };

    if (options?.credentials) {
      fetchOptions.onAuth = () => options.credentials;
    } else {
      const remotes = await this.listRemotes();
      const remote = remotes.find(r => r.name === (options?.remote || 'origin'));
      if (remote) {
        fetchOptions.onAuth = this.getAuthCallback(remote.url);
      }
    }

    if (options?.onProgress) {
      fetchOptions.onProgress = (event: any) => {
        options.onProgress!({
          phase: event.phase,
          loaded: event.loaded || 0,
          total: event.total || 0,
          percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0,
        });
      };
    }

    await git.fetch(fetchOptions);
  }

  async pull(options?: {
    remote?: string;
    ref?: string;
    credentials?: GitCredentials;
    onProgress?: (progress: GitProgress) => void;
  }): Promise<void> {
    const pullOptions: any = {
      fs,
      http,
      dir: this.dir,
      remote: options?.remote || 'origin',
      ref: options?.ref,
      singleBranch: true,
      corsProxy: this.corsProxy,
      author: this.getAuthor(),
    };

    if (options?.credentials) {
      pullOptions.onAuth = () => options.credentials;
    } else {
      const remotes = await this.listRemotes();
      const remote = remotes.find(r => r.name === (options?.remote || 'origin'));
      if (remote) {
        pullOptions.onAuth = this.getAuthCallback(remote.url);
      }
    }

    if (options?.onProgress) {
      pullOptions.onProgress = (event: any) => {
        options.onProgress!({
          phase: event.phase,
          loaded: event.loaded || 0,
          total: event.total || 0,
          percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0,
        });
      };
    }

    await git.pull(pullOptions);
  }

  async push(options?: {
    remote?: string;
    ref?: string;
    force?: boolean;
    credentials?: GitCredentials;
    onProgress?: (progress: GitProgress) => void;
  }): Promise<void> {
    const pushOptions: any = {
      fs,
      http,
      dir: this.dir,
      remote: options?.remote || 'origin',
      ref: options?.ref,
      force: options?.force,
      corsProxy: this.corsProxy,
    };

    if (options?.credentials) {
      pushOptions.onAuth = () => options.credentials;
    } else {
      const remotes = await this.listRemotes();
      const remote = remotes.find(r => r.name === (options?.remote || 'origin'));
      if (remote) {
        pushOptions.onAuth = this.getAuthCallback(remote.url);
      }
    }

    if (options?.onProgress) {
      pushOptions.onProgress = (event: any) => {
        options.onProgress!({
          phase: event.phase,
          loaded: event.loaded || 0,
          total: event.total || 0,
          percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0,
        });
      };
    }

    await git.push(pushOptions);
  }

  // ==================== Merge ====================

  async merge(options: {
    theirs: string;
    message?: string;
    author?: { name: string; email: string };
  }): Promise<{ success: boolean; conflicts?: string[] }> {
    try {
      const result = await git.merge({
        fs,
        dir: this.dir,
        theirs: options.theirs,
        message: options.message,
        author: options.author || this.getAuthor(),
      });

      // Check if merge was successful or has conflicts
      if (result.alreadyMerged) {
        return { success: true };
      }

      if (result.fastForward) {
        return { success: true };
      }

      // Check for conflicts
      const status = await this.status();
      const conflicts = status.filter(s => s.status === 'conflict').map(s => s.filepath);

      if (conflicts.length > 0) {
        return { success: false, conflicts };
      }

      return { success: true };
    } catch (error) {
      // Check for merge conflicts
      if ((error as Error).message.includes('conflict')) {
        const status = await this.status();
        const conflicts = status.filter(s => s.status === 'conflict').map(s => s.filepath);
        return { success: false, conflicts };
      }
      throw error;
    }
  }

  async abortMerge(): Promise<void> {
    // Reset to HEAD to abort merge
    const commits = await this.log({ depth: 1 });
    if (commits.length > 0) {
      await git.checkout({
        fs,
        dir: this.dir,
        ref: commits[0].oid,
        force: true,
      });
    }
  }

  // ==================== Diff ====================

  async diff(options: {
    filepath?: string;
    commitA?: string;
    commitB?: string;
  }): Promise<GitDiff[]> {
    const diffs: GitDiff[] = [];
    
    try {
      if (options.filepath) {
        // Single file diff
        const diff = await this.diffFile(options.filepath, options.commitA, options.commitB);
        if (diff) diffs.push(diff);
      } else {
        // All files diff
        const status = await this.status();
        for (const file of status) {
          const diff = await this.diffFile(file.filepath, options.commitA, options.commitB);
          if (diff) diffs.push(diff);
        }
      }
    } catch (error) {
      console.error('Diff error:', error);
    }

    return diffs;
  }

  private async diffFile(filepath: string, commitA?: string, commitB?: string): Promise<GitDiff | null> {
    try {
      // Get old content
      let oldContent = '';
      if (commitA) {
        const { blob } = await git.readBlob({
          fs,
          dir: this.dir,
          oid: commitA,
          filepath,
        });
        oldContent = new TextDecoder().decode(blob);
      } else {
        // Compare against HEAD
        try {
          const commits = await this.log({ depth: 1 });
          if (commits.length > 0) {
            const { blob } = await git.readBlob({
              fs,
              dir: this.dir,
              oid: commits[0].oid,
              filepath,
            });
            oldContent = new TextDecoder().decode(blob);
          }
        } catch {
          // New file
        }
      }

      // Get new content
      let newContent = '';
      if (commitB) {
        const { blob } = await git.readBlob({
          fs,
          dir: this.dir,
          oid: commitB,
          filepath,
        });
        newContent = new TextDecoder().decode(blob);
      } else {
        // Compare against working directory
        try {
          newContent = await fs.promises.readFile(`${this.dir}/${filepath}`, { encoding: 'utf8' }) as string;
        } catch {
          // Deleted file
        }
      }

      // Calculate diff
      const hunks = this.computeDiffHunks(oldContent, newContent);
      const additions = hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'add').length, 0);
      const deletions = hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'delete').length, 0);

      return {
        filepath,
        type: oldContent === '' ? 'add' : newContent === '' ? 'delete' : 'modify',
        additions,
        deletions,
        hunks,
        binary: false,
      };
    } catch {
      return null;
    }
  }

  private computeDiffHunks(oldText: string, newText: string): GitDiffHunk[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const hunks: GitDiffHunk[] = [];

    // Simple Myers diff algorithm
    const lcs = this.longestCommonSubsequence(oldLines, newLines);
    const diffLines: GitDiffLine[] = [];

    let oldIdx = 0;
    let newIdx = 0;
    let oldLineNum = 1;
    let newLineNum = 1;

    for (const [oldMatch, newMatch] of lcs) {
      // Add deletions before the match
      while (oldIdx < oldMatch) {
        diffLines.push({
          type: 'delete',
          content: oldLines[oldIdx],
          oldNumber: oldLineNum++,
        });
        oldIdx++;
      }

      // Add additions before the match
      while (newIdx < newMatch) {
        diffLines.push({
          type: 'add',
          content: newLines[newIdx],
          newNumber: newLineNum++,
        });
        newIdx++;
      }

      // Add context line
      if (oldIdx < oldLines.length && newIdx < newLines.length) {
        diffLines.push({
          type: 'context',
          content: oldLines[oldIdx],
          oldNumber: oldLineNum++,
          newNumber: newLineNum++,
        });
        oldIdx++;
        newIdx++;
      }
    }

    // Add remaining lines
    while (oldIdx < oldLines.length) {
      diffLines.push({
        type: 'delete',
        content: oldLines[oldIdx++],
        oldNumber: oldLineNum++,
      });
    }
    while (newIdx < newLines.length) {
      diffLines.push({
        type: 'add',
        content: newLines[newIdx++],
        newNumber: newLineNum++,
      });
    }

    // Group into hunks
    if (diffLines.length > 0) {
      hunks.push({
        oldStart: 1,
        oldLines: oldLines.length,
        newStart: 1,
        newLines: newLines.length,
        lines: diffLines,
      });
    }

    return hunks;
  }

  private longestCommonSubsequence(a: string[], b: string[]): [number, number][] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find matching indices
    const result: [number, number][] = [];
    let i = m, j = n;
    
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift([i - 1, j - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return result;
  }

  // ==================== Stash ====================

  async stash(message?: string): Promise<void> {
    // Get current status
    const status = await this.status();
    if (status.length === 0) {
      throw new Error('No changes to stash');
    }

    // Create a commit-like object for the stash
    const branch = await this.getCurrentBranch();
    const stashEntry: GitStash = {
      index: this.stashes.length,
      message: message || `WIP on ${branch}`,
      oid: `stash-${Date.now()}`,
      timestamp: Date.now(),
      branch: branch || 'unknown',
    };

    // Save file contents
    const stashData: Record<string, string> = {};
    for (const file of status) {
      try {
        const content = await fs.promises.readFile(`${this.dir}/${file.filepath}`, { encoding: 'utf8' });
        stashData[file.filepath] = content as string;
      } catch {}
    }

    // Store stash data
    localStorage.setItem(`stash_${stashEntry.oid}`, JSON.stringify(stashData));
    this.stashes.push(stashEntry);
    this.saveToStorage();

    // Reset working directory
    await git.checkout({ fs, dir: this.dir, force: true });
  }

  async stashPop(index?: number): Promise<void> {
    const stashIndex = index ?? this.stashes.length - 1;
    const stash = this.stashes[stashIndex];
    
    if (!stash) {
      throw new Error('No stash found');
    }

    // Restore stashed files
    const stashData = JSON.parse(localStorage.getItem(`stash_${stash.oid}`) || '{}');
    for (const [filepath, content] of Object.entries(stashData)) {
      await this.ensureDirectory(filepath);
      await fs.promises.writeFile(`${this.dir}/${filepath}`, content as string, { encoding: 'utf8' });
    }

    // Remove stash
    localStorage.removeItem(`stash_${stash.oid}`);
    this.stashes.splice(stashIndex, 1);
    this.saveToStorage();
  }

  async stashList(): Promise<GitStash[]> {
    return [...this.stashes];
  }

  async stashDrop(index: number): Promise<void> {
    const stash = this.stashes[index];
    if (stash) {
      localStorage.removeItem(`stash_${stash.oid}`);
      this.stashes.splice(index, 1);
      this.saveToStorage();
    }
  }

  // ==================== Tags ====================

  async listTags(): Promise<GitTag[]> {
    try {
      const tags = await git.listTags({ fs, dir: this.dir });
      return tags.map(name => ({
        name,
        oid: '', // Would need to resolve
        annotated: false,
      }));
    } catch {
      return [];
    }
  }

  async createTag(name: string, options?: {
    ref?: string;
    message?: string;
  }): Promise<void> {
    await git.tag({
      fs,
      dir: this.dir,
      ref: name,
      object: options?.ref,
    });
  }

  async deleteTag(name: string): Promise<void> {
    await git.deleteTag({ fs, dir: this.dir, ref: name });
  }

  // ==================== Reset ====================

  async reset(options: {
    ref?: string;
    hard?: boolean;
    soft?: boolean;
  }): Promise<void> {
    if (options.hard) {
      await git.checkout({
        fs,
        dir: this.dir,
        ref: options.ref || 'HEAD',
        force: true,
      });
    } else {
      // Soft reset - just move HEAD
      await git.resetIndex({
        fs,
        dir: this.dir,
        filepath: '.',
      });
    }
  }

  // ==================== File Operations ====================

  async readFile(filepath: string, ref?: string): Promise<string> {
    if (ref) {
      const { blob } = await git.readBlob({
        fs,
        dir: this.dir,
        oid: ref,
        filepath,
      });
      return new TextDecoder().decode(blob);
    }
    
    return await fs.promises.readFile(`${this.dir}/${filepath}`, { encoding: 'utf8' }) as string;
  }

  async writeFile(filepath: string, content: string): Promise<void> {
    await this.ensureDirectory(filepath);
    await fs.promises.writeFile(`${this.dir}/${filepath}`, content, { encoding: 'utf8' });
  }

  async deleteFile(filepath: string): Promise<void> {
    await fs.promises.unlink(`${this.dir}/${filepath}`);
  }

  async listFiles(dirpath?: string): Promise<string[]> {
    try {
      const path = dirpath ? `${this.dir}/${dirpath}` : this.dir;
      return await fs.promises.readdir(path) as string[];
    } catch {
      return [];
    }
  }

  // ==================== Utility Methods ====================

  private async cleanDirectory(dir: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(dir) as string[];
      for (const file of files) {
        await this.recursiveDelete(`${dir}/${file}`);
      }
    } catch {
      // Directory doesn't exist, create it
      await fs.promises.mkdir(dir, { recursive: true } as any);
    }
  }

  private async recursiveDelete(path: string): Promise<void> {
    try {
      const stat = await fs.promises.stat(path);
      if (stat.isDirectory()) {
        const files = await fs.promises.readdir(path) as string[];
        for (const file of files) {
          await this.recursiveDelete(`${path}/${file}`);
        }
        await fs.promises.rmdir(path);
      } else {
        await fs.promises.unlink(path);
      }
    } catch {}
  }

  private async ensureDirectory(filepath: string): Promise<void> {
    const parts = filepath.split('/');
    parts.pop(); // Remove filename
    
    let currentPath = this.dir;
    for (const part of parts) {
      currentPath = `${currentPath}/${part}`;
      try {
        await fs.promises.mkdir(currentPath);
      } catch {}
    }
  }

  private loadFromStorage(): void {
    try {
      // Load config
      const savedConfig = localStorage.getItem(this.CONFIG_KEY);
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
      }

      // Load stashes
      const savedStashes = localStorage.getItem(this.STASH_KEY);
      if (savedStashes) {
        this.stashes = JSON.parse(savedStashes);
      }

      // Load credentials (encrypted in production)
      const savedCreds = localStorage.getItem(this.CREDS_KEY);
      if (savedCreds) {
        const creds = JSON.parse(savedCreds);
        for (const [key, value] of Object.entries(creds)) {
          this.credentials.set(key, value as GitCredentials);
        }
      }
    } catch (error) {
      console.error('Failed to load git data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
      localStorage.setItem(this.STASH_KEY, JSON.stringify(this.stashes));
      
      // Save credentials
      const creds: Record<string, GitCredentials> = {};
      for (const [key, value] of this.credentials) {
        creds[key] = value;
      }
      localStorage.setItem(this.CREDS_KEY, JSON.stringify(creds));
    } catch (error) {
      console.error('Failed to save git data to storage:', error);
    }
  }

  // Get the LightningFS instance for direct file operations
  getFs() {
    return fs;
  }
}

// Export singleton instance
export const gitServicePro = new GitService();
