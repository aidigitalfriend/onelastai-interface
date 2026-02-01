/**
 * Version Control Extension Service
 * ==================================
 * Provides an extensible architecture for supporting multiple
 * version control systems (VCS) through a plugin-based approach.
 * 
 * Built-in support for:
 * - Git (via isomorphic-git)
 * 
 * Extension points for:
 * - Subversion (SVN)
 * - Mercurial (Hg)
 * - Perforce
 * - Custom VCS implementations
 */

// ============================================================================
// Core Types
// ============================================================================

export type VCSType = 'git' | 'svn' | 'mercurial' | 'perforce' | 'custom';

export interface VCSFileStatus {
  filepath: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'conflict' | 'renamed' | 'copied';
  staged: boolean;
}

export interface VCSCommit {
  id: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  parents: string[];
}

export interface VCSBranch {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
}

export interface VCSRemote {
  name: string;
  url: string;
  fetchUrl?: string;
  pushUrl?: string;
}

export interface VCSStash {
  id: string;
  message: string;
  branch: string;
  timestamp: number;
}

export interface VCSDiff {
  filepath: string;
  additions: number;
  deletions: number;
  hunks: VCSDiffHunk[];
}

export interface VCSDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: VCSDiffLine[];
}

export interface VCSDiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldNumber?: number;
  newNumber?: number;
}

export interface VCSProgress {
  phase: string;
  percent: number;
  loaded?: number;
  total?: number;
}

export interface VCSConflict {
  filepath: string;
  ourContent: string;
  theirContent: string;
  baseContent: string;
}

export interface VCSCredentials {
  username: string;
  password?: string;
  sshKey?: string;
  sshPassphrase?: string;
}

// ============================================================================
// VCS Provider Interface
// ============================================================================

/**
 * Interface that all VCS providers must implement
 */
export interface VCSProvider {
  // Provider metadata
  readonly type: VCSType;
  readonly name: string;
  readonly icon: string;
  readonly supportedFeatures: VCSFeature[];
  
  // Initialization
  init(dir?: string): Promise<void>;
  clone(url: string, options?: VCSCloneOptions): Promise<void>;
  isRepository(): Promise<boolean>;
  
  // Status
  status(): Promise<VCSFileStatus[]>;
  getCurrentBranch(): Promise<string | null>;
  
  // Staging
  add(filepath: string): Promise<void>;
  addAll(): Promise<void>;
  unstage(filepath: string): Promise<void>;
  unstageAll(): Promise<void>;
  
  // Commits
  commit(message: string, options?: VCSCommitOptions): Promise<string>;
  log(options?: VCSLogOptions): Promise<VCSCommit[]>;
  
  // Branches
  listBranches(): Promise<VCSBranch[]>;
  createBranch(name: string, options?: VCSBranchOptions): Promise<void>;
  deleteBranch(name: string, options?: VCSBranchDeleteOptions): Promise<void>;
  checkout(ref: string): Promise<void>;
  merge(options: VCSMergeOptions): Promise<VCSMergeResult>;
  
  // Remotes
  listRemotes(): Promise<VCSRemote[]>;
  addRemote(name: string, url: string): Promise<void>;
  removeRemote(name: string): Promise<void>;
  push(options?: VCSPushOptions): Promise<void>;
  pull(options?: VCSPullOptions): Promise<void>;
  fetch(options?: VCSFetchOptions): Promise<void>;
  
  // Stash (optional)
  stashList?(): Promise<VCSStash[]>;
  stash?(message?: string): Promise<void>;
  stashPop?(index?: number): Promise<void>;
  stashDrop?(index?: number): Promise<void>;
  
  // Diff
  diff(options?: VCSDiffOptions): Promise<VCSDiff[]>;
  
  // Credentials
  setCredentials(remote: string, credentials: VCSCredentials): void;
  
  // Cleanup
  dispose(): void;
}

// ============================================================================
// Feature Flags
// ============================================================================

export type VCSFeature = 
  | 'init'
  | 'clone'
  | 'staging'
  | 'commits'
  | 'branches'
  | 'remotes'
  | 'push'
  | 'pull'
  | 'fetch'
  | 'merge'
  | 'stash'
  | 'diff'
  | 'blame'
  | 'tags'
  | 'submodules';

// ============================================================================
// Options Types
// ============================================================================

export interface VCSCloneOptions {
  depth?: number;
  branch?: string;
  onProgress?: (progress: VCSProgress) => void;
}

export interface VCSCommitOptions {
  amend?: boolean;
  author?: { name: string; email: string };
}

export interface VCSLogOptions {
  depth?: number;
  ref?: string;
  filepath?: string;
}

export interface VCSBranchOptions {
  checkout?: boolean;
  startPoint?: string;
}

export interface VCSBranchDeleteOptions {
  force?: boolean;
}

export interface VCSMergeOptions {
  theirs: string;
  message?: string;
  noFastForward?: boolean;
}

export interface VCSMergeResult {
  success: boolean;
  conflicts?: string[];
  oid?: string;
}

export interface VCSPushOptions {
  remote?: string;
  branch?: string;
  force?: boolean;
  onProgress?: (progress: VCSProgress) => void;
}

export interface VCSPullOptions {
  remote?: string;
  branch?: string;
  onProgress?: (progress: VCSProgress) => void;
}

export interface VCSFetchOptions {
  remote?: string;
  prune?: boolean;
  onProgress?: (progress: VCSProgress) => void;
}

export interface VCSDiffOptions {
  filepath?: string;
  staged?: boolean;
  commit1?: string;
  commit2?: string;
}

// ============================================================================
// VCS Extension Registry
// ============================================================================

class VCSExtensionRegistry {
  private providers: Map<VCSType, () => VCSProvider> = new Map();
  private activeProviders: Map<VCSType, VCSProvider> = new Map();
  private listeners: Set<(type: VCSType, provider: VCSProvider | null) => void> = new Set();

  /**
   * Register a VCS provider factory
   */
  register(type: VCSType, factory: () => VCSProvider): void {
    this.providers.set(type, factory);
    console.log(`[VCS] Registered provider: ${type}`);
  }

  /**
   * Unregister a VCS provider
   */
  unregister(type: VCSType): void {
    const active = this.activeProviders.get(type);
    if (active) {
      active.dispose();
      this.activeProviders.delete(type);
    }
    this.providers.delete(type);
    this.notifyListeners(type, null);
    console.log(`[VCS] Unregistered provider: ${type}`);
  }

  /**
   * Get or create a provider instance
   */
  getProvider(type: VCSType): VCSProvider | null {
    // Check active providers
    let provider = this.activeProviders.get(type);
    if (provider) return provider;

    // Create new instance from factory
    const factory = this.providers.get(type);
    if (!factory) {
      console.warn(`[VCS] No provider registered for type: ${type}`);
      return null;
    }

    provider = factory();
    this.activeProviders.set(type, provider);
    this.notifyListeners(type, provider);
    return provider;
  }

  /**
   * Get all registered provider types
   */
  getRegisteredTypes(): VCSType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all active providers
   */
  getActiveProviders(): VCSProvider[] {
    return Array.from(this.activeProviders.values());
  }

  /**
   * Check if a provider type is registered
   */
  isRegistered(type: VCSType): boolean {
    return this.providers.has(type);
  }

  /**
   * Listen for provider changes
   */
  onProviderChange(callback: (type: VCSType, provider: VCSProvider | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Dispose all providers
   */
  dispose(): void {
    for (const provider of this.activeProviders.values()) {
      provider.dispose();
    }
    this.activeProviders.clear();
  }

  private notifyListeners(type: VCSType, provider: VCSProvider | null): void {
    for (const listener of this.listeners) {
      try {
        listener(type, provider);
      } catch (err) {
        console.error('[VCS] Listener error:', err);
      }
    }
  }
}

// ============================================================================
// Built-in Git Provider
// ============================================================================

import { gitServicePro } from './gitPro';

class GitVCSProvider implements VCSProvider {
  readonly type: VCSType = 'git';
  readonly name = 'Git';
  readonly icon = '🔀';
  readonly supportedFeatures: VCSFeature[] = [
    'init', 'clone', 'staging', 'commits', 'branches',
    'remotes', 'push', 'pull', 'fetch', 'merge', 'stash', 'diff'
  ];

  async init(dir?: string): Promise<void> {
    await gitServicePro.init(dir);
  }

  async clone(url: string, options?: VCSCloneOptions): Promise<void> {
    await gitServicePro.clone({
      url,
      depth: options?.depth,
      ref: options?.branch,
      onProgress: options?.onProgress,
    });
  }

  async isRepository(): Promise<boolean> {
    try {
      await gitServicePro.getCurrentBranch();
      return true;
    } catch {
      return false;
    }
  }

  async status(): Promise<VCSFileStatus[]> {
    return gitServicePro.status();
  }

  async getCurrentBranch(): Promise<string | null> {
    return gitServicePro.getCurrentBranch();
  }

  async add(filepath: string): Promise<void> {
    await gitServicePro.add(filepath);
  }

  async addAll(): Promise<void> {
    await gitServicePro.addAll();
  }

  async unstage(filepath: string): Promise<void> {
    await gitServicePro.unstage(filepath);
  }

  async unstageAll(): Promise<void> {
    await gitServicePro.unstageAll();
  }

  async commit(message: string): Promise<string> {
    return gitServicePro.commit(message);
  }

  async log(options?: VCSLogOptions): Promise<VCSCommit[]> {
    const commits = await gitServicePro.log({
      depth: options?.depth,
      ref: options?.ref,
    });
    return commits.map(c => ({
      id: c.oid,
      message: c.message,
      author: c.author,
      parents: c.parent,
    }));
  }

  async listBranches(): Promise<VCSBranch[]> {
    return gitServicePro.listBranches();
  }

  async createBranch(name: string, options?: VCSBranchOptions): Promise<void> {
    await gitServicePro.createBranch(name, options);
  }

  async deleteBranch(name: string, options?: VCSBranchDeleteOptions): Promise<void> {
    await gitServicePro.deleteBranch(name, options?.force);
  }

  async checkout(ref: string): Promise<void> {
    await gitServicePro.checkout(ref);
  }

  async merge(options: VCSMergeOptions): Promise<VCSMergeResult> {
    return gitServicePro.merge(options);
  }

  async listRemotes(): Promise<VCSRemote[]> {
    return gitServicePro.listRemotes();
  }

  async addRemote(name: string, url: string): Promise<void> {
    await gitServicePro.addRemote(name, url);
  }

  async removeRemote(name: string): Promise<void> {
    await gitServicePro.removeRemote(name);
  }

  async push(options?: VCSPushOptions): Promise<void> {
    await gitServicePro.push(options);
  }

  async pull(options?: VCSPullOptions): Promise<void> {
    await gitServicePro.pull(options);
  }

  async fetch(options?: VCSFetchOptions): Promise<void> {
    await gitServicePro.fetch(options);
  }

  async stashList(): Promise<VCSStash[]> {
    return gitServicePro.stashList();
  }

  async stash(message?: string): Promise<void> {
    await gitServicePro.stash(message);
  }

  async stashPop(index?: number): Promise<void> {
    await gitServicePro.stashPop(index);
  }

  async stashDrop(index?: number): Promise<void> {
    await gitServicePro.stashDrop(index);
  }

  async diff(options?: VCSDiffOptions): Promise<VCSDiff[]> {
    return gitServicePro.diff(options);
  }

  setCredentials(remote: string, credentials: VCSCredentials): void {
    gitServicePro.setCredentials(remote, credentials);
  }

  dispose(): void {
    // Cleanup if needed
  }
}

// ============================================================================
// Placeholder Providers (for extension demonstration)
// ============================================================================

class SVNVCSProvider implements VCSProvider {
  readonly type: VCSType = 'svn';
  readonly name = 'Subversion';
  readonly icon = '📦';
  readonly supportedFeatures: VCSFeature[] = ['init', 'staging', 'commits', 'diff'];

  async init(): Promise<void> {
    throw new Error('SVN support requires the SVN extension to be installed');
  }

  async clone(): Promise<void> {
    throw new Error('SVN checkout not implemented');
  }

  async isRepository(): Promise<boolean> {
    return false;
  }

  async status(): Promise<VCSFileStatus[]> {
    return [];
  }

  async getCurrentBranch(): Promise<string | null> {
    return null;
  }

  async add(): Promise<void> {}
  async addAll(): Promise<void> {}
  async unstage(): Promise<void> {}
  async unstageAll(): Promise<void> {}
  
  async commit(): Promise<string> {
    return '';
  }

  async log(): Promise<VCSCommit[]> {
    return [];
  }

  async listBranches(): Promise<VCSBranch[]> {
    return [];
  }

  async createBranch(): Promise<void> {}
  async deleteBranch(): Promise<void> {}
  async checkout(): Promise<void> {}
  
  async merge(): Promise<VCSMergeResult> {
    return { success: false };
  }

  async listRemotes(): Promise<VCSRemote[]> {
    return [];
  }

  async addRemote(): Promise<void> {}
  async removeRemote(): Promise<void> {}
  async push(): Promise<void> {}
  async pull(): Promise<void> {}
  async fetch(): Promise<void> {}

  async diff(): Promise<VCSDiff[]> {
    return [];
  }

  setCredentials(): void {}
  dispose(): void {}
}

class MercurialVCSProvider implements VCSProvider {
  readonly type: VCSType = 'mercurial';
  readonly name = 'Mercurial';
  readonly icon = '🪨';
  readonly supportedFeatures: VCSFeature[] = ['init', 'staging', 'commits', 'branches', 'diff'];

  async init(): Promise<void> {
    throw new Error('Mercurial support requires the Mercurial extension');
  }

  async clone(): Promise<void> {
    throw new Error('Mercurial clone not implemented');
  }

  async isRepository(): Promise<boolean> {
    return false;
  }

  async status(): Promise<VCSFileStatus[]> {
    return [];
  }

  async getCurrentBranch(): Promise<string | null> {
    return null;
  }

  async add(): Promise<void> {}
  async addAll(): Promise<void> {}
  async unstage(): Promise<void> {}
  async unstageAll(): Promise<void> {}

  async commit(): Promise<string> {
    return '';
  }

  async log(): Promise<VCSCommit[]> {
    return [];
  }

  async listBranches(): Promise<VCSBranch[]> {
    return [];
  }

  async createBranch(): Promise<void> {}
  async deleteBranch(): Promise<void> {}
  async checkout(): Promise<void> {}

  async merge(): Promise<VCSMergeResult> {
    return { success: false };
  }

  async listRemotes(): Promise<VCSRemote[]> {
    return [];
  }

  async addRemote(): Promise<void> {}
  async removeRemote(): Promise<void> {}
  async push(): Promise<void> {}
  async pull(): Promise<void> {}
  async fetch(): Promise<void> {}

  async diff(): Promise<VCSDiff[]> {
    return [];
  }

  setCredentials(): void {}
  dispose(): void {}
}

class PerforceVCSProvider implements VCSProvider {
  readonly type: VCSType = 'perforce';
  readonly name = 'Perforce';
  readonly icon = '🔷';
  readonly supportedFeatures: VCSFeature[] = ['staging', 'commits', 'diff'];

  async init(): Promise<void> {
    throw new Error('Perforce support requires the Perforce extension');
  }

  async clone(): Promise<void> {
    throw new Error('Perforce sync not implemented');
  }

  async isRepository(): Promise<boolean> {
    return false;
  }

  async status(): Promise<VCSFileStatus[]> {
    return [];
  }

  async getCurrentBranch(): Promise<string | null> {
    return null;
  }

  async add(): Promise<void> {}
  async addAll(): Promise<void> {}
  async unstage(): Promise<void> {}
  async unstageAll(): Promise<void> {}

  async commit(): Promise<string> {
    return '';
  }

  async log(): Promise<VCSCommit[]> {
    return [];
  }

  async listBranches(): Promise<VCSBranch[]> {
    return [];
  }

  async createBranch(): Promise<void> {}
  async deleteBranch(): Promise<void> {}
  async checkout(): Promise<void> {}

  async merge(): Promise<VCSMergeResult> {
    return { success: false };
  }

  async listRemotes(): Promise<VCSRemote[]> {
    return [];
  }

  async addRemote(): Promise<void> {}
  async removeRemote(): Promise<void> {}
  async push(): Promise<void> {}
  async pull(): Promise<void> {}
  async fetch(): Promise<void> {}

  async diff(): Promise<VCSDiff[]> {
    return [];
  }

  setCredentials(): void {}
  dispose(): void {}
}

// ============================================================================
// Registry Singleton & Initialization
// ============================================================================

export const vcsRegistry = new VCSExtensionRegistry();

// Register built-in providers
vcsRegistry.register('git', () => new GitVCSProvider());
vcsRegistry.register('svn', () => new SVNVCSProvider());
vcsRegistry.register('mercurial', () => new MercurialVCSProvider());
vcsRegistry.register('perforce', () => new PerforceVCSProvider());

// ============================================================================
// Unified VCS Service
// ============================================================================

/**
 * Unified service that auto-detects and uses the appropriate VCS
 */
class UnifiedVCSService {
  private currentProvider: VCSProvider | null = null;

  /**
   * Auto-detect and initialize the appropriate VCS provider
   */
  async autoDetect(): Promise<VCSProvider | null> {
    // Try Git first (most common)
    const gitProvider = vcsRegistry.getProvider('git');
    if (gitProvider && await gitProvider.isRepository()) {
      this.currentProvider = gitProvider;
      return gitProvider;
    }

    // Try other registered providers
    for (const type of vcsRegistry.getRegisteredTypes()) {
      if (type === 'git') continue;
      const provider = vcsRegistry.getProvider(type);
      if (provider && await provider.isRepository()) {
        this.currentProvider = provider;
        return provider;
      }
    }

    return null;
  }

  /**
   * Get the current provider
   */
  getProvider(): VCSProvider | null {
    return this.currentProvider;
  }

  /**
   * Set a specific provider
   */
  setProvider(type: VCSType): VCSProvider | null {
    this.currentProvider = vcsRegistry.getProvider(type);
    return this.currentProvider;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): { type: VCSType; name: string; icon: string }[] {
    return vcsRegistry.getRegisteredTypes().map(type => {
      const provider = vcsRegistry.getProvider(type);
      return {
        type,
        name: provider?.name || type,
        icon: provider?.icon || '📁',
      };
    });
  }
}

export const unifiedVCS = new UnifiedVCSService();

// ============================================================================
// Extension API
// ============================================================================

/**
 * API for VCS extensions to register themselves
 */
export const vcsExtensionAPI = {
  /**
   * Register a new VCS provider
   */
  registerProvider(type: VCSType, factory: () => VCSProvider): void {
    vcsRegistry.register(type, factory);
  },

  /**
   * Unregister a VCS provider
   */
  unregisterProvider(type: VCSType): void {
    vcsRegistry.unregister(type);
  },

  /**
   * Check if a provider is registered
   */
  isProviderRegistered(type: VCSType): boolean {
    return vcsRegistry.isRegistered(type);
  },

  /**
   * Get all registered provider types
   */
  getRegisteredTypes(): VCSType[] {
    return vcsRegistry.getRegisteredTypes();
  },

  /**
   * Listen for provider changes
   */
  onProviderChange(callback: (type: VCSType, provider: VCSProvider | null) => void): () => void {
    return vcsRegistry.onProviderChange(callback);
  },
};

export default vcsExtensionAPI;
