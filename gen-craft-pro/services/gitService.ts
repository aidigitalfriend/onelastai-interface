/**
 * GitService — Git operations client
 * Uses backend API for isomorphic-git operations
 * 
 * Phase 2-3: Version control for every project
 */

export interface GitStatus {
  branch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
  parents: string[];
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  lastCommit?: GitCommit;
  aheadBehind?: { ahead: number; behind: number };
}

export interface GitDiff {
  path: string;
  hunks: GitDiffHunk[];
  additions: number;
  deletions: number;
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
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface GitRemote {
  name: string;
  url: string;
  type: 'fetch' | 'push';
}

class GitService {
  private getBaseUrl(projectId: string) {
    return `/api/project/${projectId}/git`;
  }

  /**
   * Initialize a git repository for a project
   */
  async init(projectId: string, defaultBranch = 'main'): Promise<void> {
    const response = await fetch(this.getBaseUrl(projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'init', defaultBranch }),
    });

    if (!response.ok) {
      throw new Error(`Git init failed: ${response.status}`);
    }
  }

  /**
   * Get git status for a project
   */
  async getStatus(projectId: string): Promise<GitStatus> {
    const response = await fetch(this.getBaseUrl(projectId), {
      credentials: 'include',
    });

    if (!response.ok) {
      // Return default status if git not initialized
      return {
        branch: 'main',
        isClean: true,
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        untracked: [],
      };
    }

    return response.json();
  }

  /**
   * Stage files for commit
   */
  async stage(projectId: string, paths: string[]): Promise<void> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      throw new Error(`Git stage failed: ${response.status}`);
    }
  }

  /**
   * Unstage files
   */
  async unstage(projectId: string, paths: string[]): Promise<void> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/unstage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      throw new Error(`Git unstage failed: ${response.status}`);
    }
  }

  /**
   * Create a commit
   */
  async commit(projectId: string, message: string): Promise<GitCommit> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Git commit failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Push to remote
   */
  async push(projectId: string, remote = 'origin', branch?: string, force = false): Promise<void> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ remote, branch, force }),
    });

    if (!response.ok) {
      throw new Error(`Git push failed: ${response.status}`);
    }
  }

  /**
   * Pull from remote
   */
  async pull(projectId: string, remote = 'origin', branch?: string): Promise<{ updatedFiles: string[]; conflicts: string[] }> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ remote, branch }),
    });

    if (!response.ok) {
      throw new Error(`Git pull failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List branches
   */
  async getBranches(projectId: string): Promise<GitBranch[]> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/branches`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [{ name: 'main', isCurrent: true, isRemote: false }];
    }

    return response.json();
  }

  /**
   * Create a new branch
   */
  async createBranch(projectId: string, name: string, fromBranch?: string): Promise<void> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, from: fromBranch }),
    });

    if (!response.ok) {
      throw new Error(`Create branch failed: ${response.status}`);
    }
  }

  /**
   * Switch branch
   */
  async checkout(projectId: string, branch: string): Promise<void> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ branch }),
    });

    if (!response.ok) {
      throw new Error(`Checkout failed: ${response.status}`);
    }
  }

  /**
   * Merge a branch
   */
  async merge(projectId: string, branch: string): Promise<{ success: boolean; conflicts?: string[] }> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ branch }),
    });

    if (!response.ok) {
      throw new Error(`Merge failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get commit log
   */
  async getLog(projectId: string, limit = 50): Promise<GitCommit[]> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/log?limit=${limit}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Get diff for a file or all files
   */
  async getDiff(projectId: string, path?: string): Promise<GitDiff[]> {
    const url = path
      ? `${this.getBaseUrl(projectId)}/diff?path=${encodeURIComponent(path)}`
      : `${this.getBaseUrl(projectId)}/diff`;

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Discard changes for files
   */
  async discard(projectId: string, paths: string[]): Promise<void> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/discard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      throw new Error(`Discard failed: ${response.status}`);
    }
  }
}

export const gitService = new GitService();
export default gitService;
