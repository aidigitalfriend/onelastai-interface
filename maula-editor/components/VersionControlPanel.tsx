/**
 * Version Control Panel Component
 * ================================
 * Comprehensive Git UI with:
 * - Staging area with visual diff
 * - Side-by-side diff view
 * - Commits history with graph
 * - Branch management
 * - Merge conflicts resolution UI
 * - Remote management
 * - Stash support
 * - VCS extension support
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import {
  gitServicePro,
  GitStatus,
  GitCommit,
  GitBranch,
  GitRemote,
  GitStash,
  GitDiff,
  GitDiffHunk,
  GitProgress,
} from '../services/gitPro';

// ============================================================================
// Types
// ============================================================================

type VCSTab = 'changes' | 'commits' | 'branches' | 'remotes' | 'stashes' | 'conflicts';

interface ConflictResolution {
  filepath: string;
  ourContent: string;
  theirContent: string;
  baseContent: string;
  resolvedContent: string;
  resolved: boolean;
}

interface VCSExtension {
  id: string;
  name: string;
  icon: string;
  type: 'git' | 'svn' | 'mercurial' | 'perforce' | 'custom';
  enabled: boolean;
}

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  Git: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.6-.719.721-1.889.721-2.609 0-.719-.719-.719-1.879 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187"/>
    </svg>
  ),
  Branch: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Commit: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="3" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Minus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Merge: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a4 4 0 004 4h4m0 0l-4-4m4 4l-4-4M8 7h4a4 4 0 014 4v8" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Cloud: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  Key: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Diff: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Split: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h2m8-16h2a2 2 0 012 2v12a2 2 0 01-2 2h-2m-8-12v12" />
    </svg>
  ),
  Conflict: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  History: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Expand: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Collapse: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
};

// ============================================================================
// Status Colors
// ============================================================================

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  modified: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: 'M', label: 'Modified' },
  added: { bg: 'bg-green-500/20', text: 'text-green-400', icon: 'A', label: 'Added' },
  deleted: { bg: 'bg-red-500/20', text: 'text-red-400', icon: 'D', label: 'Deleted' },
  untracked: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '?', label: 'Untracked' },
  conflict: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '!', label: 'Conflict' },
  renamed: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: 'R', label: 'Renamed' },
  copied: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: 'C', label: 'Copied' },
};

const BRANCH_COLORS = [
  '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa',
  '#f87171', '#22d3ee', '#fb923c', '#4ade80', '#818cf8',
];

// ============================================================================
// Props
// ============================================================================

interface VersionControlPanelProps {
  className?: string;
  onFileSelect?: (filepath: string) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  className = '',
  onFileSelect,
}) => {
  const { theme, openFiles, updateFileContent } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // ============================================================================
  // State
  // ============================================================================

  // Tab & View State
  const [activeTab, setActiveTab] = useState<VCSTab>('changes');
  const [diffViewMode, setDiffViewMode] = useState<'inline' | 'split'>('inline');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Git Data State
  const [status, setStatus] = useState<GitStatus[]>([]);
  const [stagedFiles, setStagedFiles] = useState<GitStatus[]>([]);
  const [unstagedFiles, setUnstagedFiles] = useState<GitStatus[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [stashes, setStashes] = useState<GitStash[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);

  // Form State
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newRemoteName, setNewRemoteName] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [stashMessage, setStashMessage] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<GitProgress | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<GitDiff | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Modal State
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showCommitDetail, setShowCommitDetail] = useState(false);
  const [mergeBranch, setMergeBranch] = useState<string | null>(null);

  // Credentials State
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [credRemote, setCredRemote] = useState('default');

  // VCS Extensions State
  const [vcsExtensions, setVcsExtensions] = useState<VCSExtension[]>([
    { id: 'git', name: 'Git', icon: '🔀', type: 'git', enabled: true },
    { id: 'svn', name: 'Subversion', icon: '📦', type: 'svn', enabled: false },
    { id: 'hg', name: 'Mercurial', icon: '🪨', type: 'mercurial', enabled: false },
    { id: 'p4', name: 'Perforce', icon: '🔷', type: 'perforce', enabled: false },
  ]);

  // ============================================================================
  // Theme Classes
  // ============================================================================

  const bgClass = isDark ? 'bg-vscode-sidebar' : 'bg-white';
  const bgSecondary = isDark ? 'bg-vscode-hover' : 'bg-gray-50';
  const borderClass = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textClass = isDark ? 'text-vscode-text' : 'text-gray-900';
  const mutedClass = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const hoverClass = isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100';
  const activeClass = isDark ? 'bg-vscode-listActive' : 'bg-blue-100';
  const inputClass = isDark
    ? 'bg-vscode-input border-vscode-inputBorder text-vscode-text'
    : 'bg-white border-gray-300 text-gray-900';
  const accentClass = isDark ? 'text-vscode-accent' : 'text-blue-600';

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadStatus = useCallback(async () => {
    try {
      const statusData = await gitServicePro.status();
      setStatus(statusData);
      setStagedFiles(statusData.filter(f => f.staged));
      setUnstagedFiles(statusData.filter(f => !f.staged));

      // Check for conflicts
      const conflictFiles = statusData.filter(f => f.status === 'conflict');
      if (conflictFiles.length > 0) {
        setConflicts(conflictFiles.map(f => ({
          filepath: f.filepath,
          ourContent: '',
          theirContent: '',
          baseContent: '',
          resolvedContent: '',
          resolved: false,
        })));
      }

      const branch = await gitServicePro.getCurrentBranch();
      setCurrentBranch(branch);
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  }, []);

  const loadCommits = useCallback(async () => {
    try {
      const commitData = await gitServicePro.log({ depth: 100 });
      setCommits(commitData);
    } catch (err) {
      console.error('Failed to load commits:', err);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const branchData = await gitServicePro.listBranches();
      setBranches(branchData);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  }, []);

  const loadRemotes = useCallback(async () => {
    try {
      const remoteData = await gitServicePro.listRemotes();
      setRemotes(remoteData);
    } catch (err) {
      console.error('Failed to load remotes:', err);
    }
  }, []);

  const loadStashes = useCallback(async () => {
    try {
      const stashData = await gitServicePro.stashList();
      setStashes(stashData);
    } catch (err) {
      console.error('Failed to load stashes:', err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      loadStatus(),
      loadCommits(),
      loadBranches(),
      loadRemotes(),
      loadStashes(),
    ]);
    setIsLoading(false);
  }, [loadStatus, loadCommits, loadBranches, loadRemotes, loadStashes]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'commits') loadCommits();
    if (activeTab === 'branches') loadBranches();
    if (activeTab === 'remotes') loadRemotes();
    if (activeTab === 'stashes') loadStashes();
  }, [activeTab, loadCommits, loadBranches, loadRemotes, loadStashes]);

  // ============================================================================
  // Notifications
  // ============================================================================

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  };

  // ============================================================================
  // Git Actions
  // ============================================================================

  const handleInit = async () => {
    try {
      setIsLoading(true);
      await gitServicePro.init();
      showNotification('Repository initialized', 'success');
      await loadAll();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClone = async () => {
    if (!cloneUrl) return;
    try {
      setIsLoading(true);
      await gitServicePro.clone({ url: cloneUrl, onProgress: setProgress });
      setCloneUrl('');
      setShowCloneModal(false);
      showNotification('Repository cloned successfully', 'success');
      await loadAll();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleStage = async (filepath: string) => {
    try {
      await gitServicePro.add(filepath);
      await loadStatus();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleUnstage = async (filepath: string) => {
    try {
      await gitServicePro.unstage(filepath);
      await loadStatus();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleStageAll = async () => {
    try {
      await gitServicePro.addAll();
      await loadStatus();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleUnstageAll = async () => {
    try {
      await gitServicePro.unstageAll();
      await loadStatus();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleDiscard = async (filepath: string) => {
    if (!confirm(`Discard changes to "${filepath}"?`)) return;
    try {
      await gitServicePro.checkout(filepath);
      await loadStatus();
      showNotification('Changes discarded', 'success');
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      showNotification('Please enter a commit message', 'error');
      return;
    }
    try {
      setIsLoading(true);
      await gitServicePro.commit(commitMessage);
      setCommitMessage('');
      showNotification('Changes committed', 'success');
      await loadStatus();
      await loadCommits();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    try {
      setIsLoading(true);
      await gitServicePro.push({ onProgress: setProgress });
      showNotification('Pushed to remote', 'success');
    } catch (err) {
      showNotification((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handlePull = async () => {
    try {
      setIsLoading(true);
      await gitServicePro.pull({ onProgress: setProgress });
      showNotification('Pulled from remote', 'success');
      await loadAll();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleFetch = async () => {
    try {
      setIsLoading(true);
      await gitServicePro.fetch({ onProgress: setProgress });
      showNotification('Fetched from remote', 'success');
      await loadBranches();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      await gitServicePro.createBranch(newBranchName, { checkout: true });
      setNewBranchName('');
      setShowBranchModal(false);
      showNotification(`Created and switched to branch: ${newBranchName}`, 'success');
      await loadBranches();
      await loadStatus();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleCheckout = async (branchName: string) => {
    try {
      setIsLoading(true);
      await gitServicePro.checkout(branchName);
      showNotification(`Switched to branch: ${branchName}`, 'success');
      await loadAll();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (!confirm(`Delete branch "${branchName}"?`)) return;
    try {
      await gitServicePro.deleteBranch(branchName);
      showNotification(`Deleted branch: ${branchName}`, 'success');
      await loadBranches();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleMerge = async () => {
    if (!mergeBranch) return;
    try {
      setIsLoading(true);
      const result = await gitServicePro.merge({ theirs: mergeBranch });

      if (result.success) {
        showNotification(`Merged ${mergeBranch} successfully`, 'success');
      } else if (result.conflicts) {
        showNotification(`Merge has conflicts: ${result.conflicts.join(', ')}`, 'error');
        setActiveTab('conflicts');
      }

      setShowMergeModal(false);
      setMergeBranch(null);
      await loadAll();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRemote = async () => {
    if (!newRemoteName.trim() || !newRemoteUrl.trim()) return;
    try {
      await gitServicePro.addRemote(newRemoteName, newRemoteUrl);
      setNewRemoteName('');
      setNewRemoteUrl('');
      setShowRemoteModal(false);
      showNotification(`Added remote: ${newRemoteName}`, 'success');
      await loadRemotes();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleRemoveRemote = async (name: string) => {
    if (!confirm(`Remove remote "${name}"?`)) return;
    try {
      await gitServicePro.removeRemote(name);
      showNotification(`Removed remote: ${name}`, 'success');
      await loadRemotes();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleStash = async () => {
    try {
      await gitServicePro.stash(stashMessage || undefined);
      setStashMessage('');
      showNotification('Changes stashed', 'success');
      await loadStatus();
      await loadStashes();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleStashPop = async (index: number) => {
    try {
      await gitServicePro.stashPop(index);
      showNotification('Stash applied', 'success');
      await loadStatus();
      await loadStashes();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleStashDrop = async (index: number) => {
    if (!confirm('Drop this stash?')) return;
    try {
      await gitServicePro.stashDrop(index);
      showNotification('Stash dropped', 'success');
      await loadStashes();
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleShowDiff = async (filepath: string) => {
    try {
      const diffs = await gitServicePro.diff({ filepath });
      if (diffs.length > 0) {
        setSelectedDiff(diffs[0]);
        setExpandedFiles(prev => {
          const next = new Set(prev);
          if (next.has(filepath)) {
            next.delete(filepath);
          } else {
            next.add(filepath);
          }
          return next;
        });
      }
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  const handleSaveCredentials = () => {
    gitServicePro.setCredentials(credRemote, {
      username: credUsername,
      password: credPassword,
    });
    setCredUsername('');
    setCredPassword('');
    setShowCredentialsModal(false);
    showNotification('Credentials saved', 'success');
  };

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  const handleResolveConflict = (filepath: string, resolution: 'ours' | 'theirs' | 'merged') => {
    setConflicts(prev => prev.map(c => {
      if (c.filepath === filepath) {
        let resolvedContent = c.resolvedContent;
        if (resolution === 'ours') resolvedContent = c.ourContent;
        if (resolution === 'theirs') resolvedContent = c.theirContent;
        return { ...c, resolvedContent, resolved: true };
      }
      return c;
    }));
    showNotification(`Conflict resolved for ${filepath}`, 'success');
  };

  const handleMarkConflictResolved = async (filepath: string) => {
    try {
      await gitServicePro.add(filepath);
      setConflicts(prev => prev.filter(c => c.filepath !== filepath));
      await loadStatus();
      showNotification(`Marked ${filepath} as resolved`, 'success');
    } catch (err) {
      showNotification((err as Error).message, 'error');
    }
  };

  // ============================================================================
  // Filtered Data
  // ============================================================================

  const filteredCommits = useMemo(() => {
    if (!searchQuery) return commits;
    const query = searchQuery.toLowerCase();
    return commits.filter(c =>
      c.message.toLowerCase().includes(query) ||
      c.author.name.toLowerCase().includes(query) ||
      c.oid.toLowerCase().startsWith(query)
    );
  }, [commits, searchQuery]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderFileItem = (file: GitStatus, staged: boolean) => {
    const statusStyle = STATUS_COLORS[file.status] || STATUS_COLORS.modified;
    const isExpanded = expandedFiles.has(file.filepath);

    return (
      <div key={file.filepath}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-center justify-between p-2 rounded ${hoverClass} cursor-pointer group`}
          onClick={() => handleShowDiff(file.filepath)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={(e) => { e.stopPropagation(); handleShowDiff(file.filepath); }}
              className={`w-4 h-4 flex-shrink-0 ${mutedClass}`}
            >
              {isExpanded ? <Icons.Collapse /> : <Icons.Expand />}
            </button>
            <span
              className={`w-5 h-5 flex items-center justify-center rounded text-xs font-mono flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}
              title={statusStyle.label}
            >
              {statusStyle.icon}
            </span>
            <span className={`text-sm truncate ${textClass}`}>{file.filepath}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!staged && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDiscard(file.filepath); }}
                className={`p-1 rounded ${hoverClass} text-red-400`}
                title="Discard Changes"
              >
                <Icons.Trash />
              </button>
            )}
            {staged ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleUnstage(file.filepath); }}
                className={`p-1 rounded ${hoverClass}`}
                title="Unstage"
              >
                <Icons.Minus />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleStage(file.filepath); }}
                className={`p-1 rounded ${hoverClass}`}
                title="Stage"
              >
                <Icons.Plus />
              </button>
            )}
          </div>
        </motion.div>

        {/* Inline Diff View */}
        <AnimatePresence>
          {isExpanded && selectedDiff && selectedDiff.filepath === file.filepath && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {renderDiffContent(selectedDiff)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderDiffContent = (diff: GitDiff) => (
    <div className={`ml-6 mr-2 mb-2 rounded border ${borderClass} overflow-hidden`}>
      {/* Diff Header */}
      <div className={`flex items-center justify-between px-3 py-1 ${bgSecondary} border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${mutedClass}`}>
            +{diff.additions} -{diff.deletions}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDiffViewMode('inline')}
            className={`px-2 py-0.5 text-xs rounded ${diffViewMode === 'inline' ? activeClass : hoverClass}`}
          >
            Inline
          </button>
          <button
            onClick={() => setDiffViewMode('split')}
            className={`px-2 py-0.5 text-xs rounded ${diffViewMode === 'split' ? activeClass : hoverClass}`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="overflow-x-auto max-h-60">
        {diffViewMode === 'inline' ? (
          renderInlineDiff(diff.hunks)
        ) : (
          renderSplitDiff(diff.hunks)
        )}
      </div>
    </div>
  );

  const renderInlineDiff = (hunks: GitDiffHunk[]) => (
    <div className="font-mono text-xs">
      {hunks.map((hunk, hi) => (
        <div key={hi}>
          <div className={`px-3 py-1 ${bgSecondary} ${mutedClass}`}>
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </div>
          {hunk.lines.map((line, li) => (
            <div
              key={li}
              className={`px-3 py-0.5 ${
                line.type === 'add'
                  ? 'bg-green-500/10 text-green-400'
                  : line.type === 'delete'
                    ? 'bg-red-500/10 text-red-400'
                    : mutedClass
              }`}
            >
              <span className="inline-block w-8 text-right mr-2 opacity-50">
                {line.type === 'delete' ? line.oldNumber : ''}
              </span>
              <span className="inline-block w-8 text-right mr-2 opacity-50">
                {line.type === 'add' ? line.newNumber : line.type === 'context' ? line.newNumber : ''}
              </span>
              <span className="inline-block w-4">
                {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
              </span>
              {line.content}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderSplitDiff = (hunks: GitDiffHunk[]) => (
    <div className="flex font-mono text-xs">
      {/* Left side (old) */}
      <div className="flex-1 border-r border-vscode-border">
        {hunks.map((hunk, hi) => (
          <div key={`left-${hi}`}>
            <div className={`px-2 py-1 ${bgSecondary} ${mutedClass}`}>
              -{hunk.oldStart},{hunk.oldLines}
            </div>
            {hunk.lines.filter(l => l.type !== 'add').map((line, li) => (
              <div
                key={li}
                className={`px-2 py-0.5 ${
                  line.type === 'delete'
                    ? 'bg-red-500/10 text-red-400'
                    : mutedClass
                }`}
              >
                <span className="inline-block w-6 text-right mr-2 opacity-50">
                  {line.oldNumber || line.newNumber}
                </span>
                {line.content}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Right side (new) */}
      <div className="flex-1">
        {hunks.map((hunk, hi) => (
          <div key={`right-${hi}`}>
            <div className={`px-2 py-1 ${bgSecondary} ${mutedClass}`}>
              +{hunk.newStart},{hunk.newLines}
            </div>
            {hunk.lines.filter(l => l.type !== 'delete').map((line, li) => (
              <div
                key={li}
                className={`px-2 py-0.5 ${
                  line.type === 'add'
                    ? 'bg-green-500/10 text-green-400'
                    : mutedClass
                }`}
              >
                <span className="inline-block w-6 text-right mr-2 opacity-50">
                  {line.newNumber || line.oldNumber}
                </span>
                {line.content}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================================================
  // Tab Renders
  // ============================================================================

  const renderChangesTab = () => (
    <div className="p-3 space-y-4">
      {/* Commit Form */}
      <div className="space-y-2">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          rows={3}
          className={`w-full px-3 py-2 text-sm rounded border ${inputClass} resize-none outline-none focus:ring-1 focus:ring-blue-500`}
        />
        <div className="flex gap-2">
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || stagedFiles.length === 0}
            className={`flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors ${
              commitMessage.trim() && stagedFiles.length > 0
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : isDark ? 'bg-vscode-hover text-vscode-textMuted' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <Icons.Commit />
              Commit ({stagedFiles.length})
            </span>
          </button>
          <button
            onClick={handlePush}
            className={`px-3 py-1.5 text-sm rounded ${hoverClass} border ${borderClass} flex items-center gap-1`}
            title="Push"
          >
            <Icons.Upload />
          </button>
          <button
            onClick={handlePull}
            className={`px-3 py-1.5 text-sm rounded ${hoverClass} border ${borderClass} flex items-center gap-1`}
            title="Pull"
          >
            <Icons.Download />
          </button>
        </div>
      </div>

      {/* Staged Files */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
            Staged Changes ({stagedFiles.length})
          </h3>
          {stagedFiles.length > 0 && (
            <button
              onClick={handleUnstageAll}
              className={`text-xs ${mutedClass} hover:text-red-400 transition-colors`}
            >
              Unstage All
            </button>
          )}
        </div>
        <div className={`rounded border ${borderClass} overflow-hidden`}>
          {stagedFiles.length === 0 ? (
            <p className={`p-3 text-sm ${mutedClass}`}>No staged changes</p>
          ) : (
            <div className="divide-y divide-vscode-border">
              {stagedFiles.map(f => renderFileItem(f, true))}
            </div>
          )}
        </div>
      </div>

      {/* Unstaged Files */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
            Changes ({unstagedFiles.length})
          </h3>
          {unstagedFiles.length > 0 && (
            <button
              onClick={handleStageAll}
              className={`text-xs ${mutedClass} hover:text-green-400 transition-colors`}
            >
              Stage All
            </button>
          )}
        </div>
        <div className={`rounded border ${borderClass} overflow-hidden`}>
          {unstagedFiles.length === 0 ? (
            <p className={`p-3 text-sm ${mutedClass}`}>No changes</p>
          ) : (
            <div className="divide-y divide-vscode-border">
              {unstagedFiles.map(f => renderFileItem(f, false))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCommitsTab = () => (
    <div className="p-3">
      {/* Search */}
      <div className="mb-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${inputClass}`}>
          <Icons.Search />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commits..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      {/* Commit List with Graph */}
      <div className="space-y-1">
        {filteredCommits.length === 0 ? (
          <p className={`text-sm ${mutedClass} p-2`}>No commits yet</p>
        ) : (
          filteredCommits.map((commit, index) => (
            <motion.div
              key={commit.oid}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.01 }}
              className={`flex items-start gap-3 p-2 rounded ${hoverClass} cursor-pointer`}
              onClick={() => { setSelectedCommit(commit); setShowCommitDetail(true); }}
            >
              {/* Commit graph visualization */}
              <div className="flex flex-col items-center w-6">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: BRANCH_COLORS[index % BRANCH_COLORS.length] }}
                />
                {index < filteredCommits.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[20px] ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${textClass} truncate`}>
                  {commit.message.split('\n')[0]}
                </p>
                <div className={`flex items-center gap-2 mt-0.5 text-xs ${mutedClass}`}>
                  <span>{commit.author.name}</span>
                  <span>•</span>
                  <span>{new Date(commit.author.timestamp * 1000).toLocaleDateString()}</span>
                  <span>•</span>
                  <code className="font-mono text-vscode-accent">{commit.oid.slice(0, 7)}</code>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderBranchesTab = () => (
    <div className="p-3 space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setShowBranchModal(true)}
          className={`flex-1 px-3 py-1.5 text-sm rounded ${hoverClass} border ${borderClass} flex items-center justify-center gap-2`}
        >
          <Icons.Plus />
          New Branch
        </button>
        <button
          onClick={() => setShowMergeModal(true)}
          className={`flex-1 px-3 py-1.5 text-sm rounded ${hoverClass} border ${borderClass} flex items-center justify-center gap-2`}
        >
          <Icons.Merge />
          Merge
        </button>
      </div>

      <div className="space-y-1">
        {branches.length === 0 ? (
          <p className={`text-sm ${mutedClass}`}>No branches</p>
        ) : (
          branches.map(branch => (
            <motion.div
              key={branch.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex items-center justify-between p-2 rounded ${
                branch.current ? activeClass : hoverClass
              } cursor-pointer group`}
              onClick={() => !branch.current && handleCheckout(branch.name)}
            >
              <div className="flex items-center gap-2">
                {branch.current && <Icons.Check />}
                <Icons.Branch />
                <span className={`text-sm ${textClass}`}>{branch.name}</span>
                {branch.current && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    current
                  </span>
                )}
              </div>
              {!branch.current && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteBranch(branch.name); }}
                  className={`p-1 rounded ${hoverClass} opacity-0 group-hover:opacity-100 text-red-400`}
                >
                  <Icons.Trash />
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderRemotesTab = () => (
    <div className="p-3 space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setShowRemoteModal(true)}
          className={`flex-1 px-3 py-1.5 text-sm rounded ${hoverClass} border ${borderClass} flex items-center justify-center gap-2`}
        >
          <Icons.Plus />
          Add Remote
        </button>
        <button
          onClick={handleFetch}
          className={`flex-1 px-3 py-1.5 text-sm rounded ${hoverClass} border ${borderClass} flex items-center justify-center gap-2`}
        >
          <Icons.Download />
          Fetch
        </button>
      </div>

      <div className="space-y-2">
        {remotes.length === 0 ? (
          <p className={`text-sm ${mutedClass}`}>No remotes configured</p>
        ) : (
          remotes.map(remote => (
            <motion.div
              key={remote.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex items-center justify-between p-3 rounded ${bgSecondary} group`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Icons.Cloud />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${textClass}`}>{remote.name}</p>
                  <p className={`text-xs ${mutedClass} truncate`}>{remote.url}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveRemote(remote.name)}
                className={`p-1 rounded ${hoverClass} opacity-0 group-hover:opacity-100 text-red-400`}
              >
                <Icons.Trash />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderStashesTab = () => (
    <div className="p-3 space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={stashMessage}
          onChange={(e) => setStashMessage(e.target.value)}
          placeholder="Stash message (optional)"
          className={`flex-1 px-3 py-1.5 text-sm rounded border ${inputClass} outline-none focus:ring-1 focus:ring-blue-500`}
        />
        <button
          onClick={handleStash}
          disabled={status.length === 0}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            status.length > 0
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : isDark ? 'bg-vscode-hover text-vscode-textMuted' : 'bg-gray-100 text-gray-400'
          }`}
        >
          Stash
        </button>
      </div>

      <div className="space-y-2">
        {stashes.length === 0 ? (
          <p className={`text-sm ${mutedClass}`}>No stashes</p>
        ) : (
          stashes.map((stash, index) => (
            <motion.div
              key={stash.oid}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-3 rounded ${bgSecondary} group`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${textClass}`}>
                    stash@{`{${index}}`}: {stash.message || 'WIP'}
                  </p>
                  <p className={`text-xs ${mutedClass}`}>
                    on {stash.branch} • {new Date(stash.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStashPop(index)}
                    className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => handleStashDrop(index)}
                    className="p-1 rounded text-red-400 hover:bg-red-500/20"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderConflictsTab = () => (
    <div className="p-3 space-y-4">
      {conflicts.length === 0 ? (
        <div className={`text-center py-8 ${mutedClass}`}>
          <Icons.Check />
          <p className="mt-2 text-sm">No merge conflicts</p>
        </div>
      ) : (
        <>
          <div className={`p-3 rounded border border-orange-500/30 bg-orange-500/10`}>
            <div className="flex items-center gap-2 text-orange-400">
              <Icons.Warning />
              <span className="text-sm font-medium">
                {conflicts.length} file{conflicts.length > 1 ? 's' : ''} with conflicts
              </span>
            </div>
          </div>

          {conflicts.map(conflict => (
            <div key={conflict.filepath} className={`rounded border ${borderClass} overflow-hidden`}>
              <div className={`flex items-center justify-between px-3 py-2 ${bgSecondary} border-b ${borderClass}`}>
                <div className="flex items-center gap-2">
                  <Icons.Conflict />
                  <span className={`text-sm font-medium ${textClass}`}>{conflict.filepath}</span>
                </div>
                <div className="flex items-center gap-2">
                  {conflict.resolved ? (
                    <button
                      onClick={() => handleMarkConflictResolved(conflict.filepath)}
                      className="px-2 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
                    >
                      Mark Resolved
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleResolveConflict(conflict.filepath, 'ours')}
                        className={`px-2 py-1 text-xs rounded ${hoverClass} border ${borderClass}`}
                      >
                        Accept Ours
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict.filepath, 'theirs')}
                        className={`px-2 py-1 text-xs rounded ${hoverClass} border ${borderClass}`}
                      >
                        Accept Theirs
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Conflict resolution UI */}
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className={`text-xs ${mutedClass} mb-1`}>Ours (Current)</div>
                    <div className={`p-2 rounded bg-blue-500/10 border border-blue-500/30 font-mono text-xs max-h-40 overflow-auto`}>
                      {conflict.ourContent || 'Loading...'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs ${mutedClass} mb-1`}>Theirs (Incoming)</div>
                    <div className={`p-2 rounded bg-purple-500/10 border border-purple-500/30 font-mono text-xs max-h-40 overflow-auto`}>
                      {conflict.theirContent || 'Loading...'}
                    </div>
                  </div>
                </div>
                {conflict.resolved && (
                  <div className="mt-2">
                    <div className={`text-xs ${mutedClass} mb-1`}>Resolved</div>
                    <div className={`p-2 rounded bg-green-500/10 border border-green-500/30 font-mono text-xs max-h-40 overflow-auto`}>
                      {conflict.resolvedContent}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  // ============================================================================
  // Modal Render
  // ============================================================================

  const renderModal = (
    isOpen: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode
  ) => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`w-full max-w-md rounded-lg ${bgClass} border ${borderClass} shadow-xl`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between p-4 border-b ${borderClass}`}>
              <h3 className={`text-lg font-medium ${textClass}`}>{title}</h3>
              <button onClick={onClose} className={`p-1 rounded ${hoverClass}`}>
                <Icons.Close />
              </button>
            </div>
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={`flex flex-col h-full ${bgClass} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <Icons.Git />
          <span className={`text-sm font-medium ${textClass}`}>Source Control</span>
          {currentBranch && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
              {currentBranch}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCredentialsModal(true)}
            className={`p-1 rounded ${hoverClass}`}
            title="Credentials"
          >
            <Icons.Key />
          </button>
          <button
            onClick={loadAll}
            disabled={isLoading}
            className={`p-1 rounded ${hoverClass} ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <Icons.Refresh />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${borderClass} overflow-x-auto scrollbar-thin`}>
        {(['changes', 'commits', 'branches', 'remotes', 'stashes', 'conflicts'] as VCSTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-medium capitalize whitespace-nowrap transition-colors ${
              activeTab === tab
                ? `${activeClass} ${textClass}`
                : `${mutedClass} ${hoverClass}`
            }`}
          >
            {tab}
            {tab === 'changes' && status.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                {status.length}
              </span>
            )}
            {tab === 'conflicts' && conflicts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
                {conflicts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className={`px-3 py-2 border-b ${borderClass}`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${mutedClass}`}>{progress.phase}</span>
            <div className={`flex-1 h-1 ${bgSecondary} rounded overflow-hidden`}>
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className={`text-xs ${mutedClass}`}>{progress.percent}%</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'changes' && renderChangesTab()}
        {activeTab === 'commits' && renderCommitsTab()}
        {activeTab === 'branches' && renderBranchesTab()}
        {activeTab === 'remotes' && renderRemotesTab()}
        {activeTab === 'stashes' && renderStashesTab()}
        {activeTab === 'conflicts' && renderConflictsTab()}
      </div>

      {/* Repository Actions (when no repo) */}
      {!currentBranch && (
        <div className={`p-3 border-t ${borderClass}`}>
          <div className="flex gap-2">
            <button
              onClick={handleInit}
              className={`flex-1 px-3 py-2 text-sm rounded ${hoverClass} border ${borderClass}`}
            >
              Initialize Repository
            </button>
            <button
              onClick={() => setShowCloneModal(true)}
              className="flex-1 px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              Clone Repository
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`absolute bottom-4 left-4 right-4 p-3 rounded shadow-lg ${
              error ? 'bg-red-500' : 'bg-green-500'
            } text-white text-sm z-10`}
          >
            <div className="flex items-center justify-between">
              <span>{error || success}</span>
              <button onClick={() => { setError(null); setSuccess(null); }}>
                <Icons.Close />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {renderModal(showCloneModal, () => setShowCloneModal(false), 'Clone Repository', (
        <div className="space-y-4">
          <div>
            <label className={`block text-sm ${mutedClass} mb-1`}>Repository URL</label>
            <input
              type="text"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className={`w-full px-3 py-2 rounded border ${inputClass}`}
            />
          </div>
          <button
            onClick={handleClone}
            disabled={!cloneUrl.trim() || isLoading}
            className="w-full py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Cloning...' : 'Clone'}
          </button>
        </div>
      ))}

      {renderModal(showBranchModal, () => setShowBranchModal(false), 'Create Branch', (
        <div className="space-y-4">
          <div>
            <label className={`block text-sm ${mutedClass} mb-1`}>Branch Name</label>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="feature/my-feature"
              className={`w-full px-3 py-2 rounded border ${inputClass}`}
            />
          </div>
          <button
            onClick={handleCreateBranch}
            disabled={!newBranchName.trim()}
            className="w-full py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Create & Switch
          </button>
        </div>
      ))}

      {renderModal(showRemoteModal, () => setShowRemoteModal(false), 'Add Remote', (
        <div className="space-y-4">
          <div>
            <label className={`block text-sm ${mutedClass} mb-1`}>Remote Name</label>
            <input
              type="text"
              value={newRemoteName}
              onChange={(e) => setNewRemoteName(e.target.value)}
              placeholder="origin"
              className={`w-full px-3 py-2 rounded border ${inputClass}`}
            />
          </div>
          <div>
            <label className={`block text-sm ${mutedClass} mb-1`}>Remote URL</label>
            <input
              type="text"
              value={newRemoteUrl}
              onChange={(e) => setNewRemoteUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className={`w-full px-3 py-2 rounded border ${inputClass}`}
            />
          </div>
          <button
            onClick={handleAddRemote}
            disabled={!newRemoteName.trim() || !newRemoteUrl.trim()}
            className="w-full py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Add Remote
          </button>
        </div>
      ))}

      {renderModal(showMergeModal, () => setShowMergeModal(false), 'Merge Branch', (
        <div className="space-y-4">
          <div>
            <label className={`block text-sm ${mutedClass} mb-1`}>Select Branch to Merge</label>
            <select
              value={mergeBranch || ''}
              onChange={(e) => setMergeBranch(e.target.value)}
              className={`w-full px-3 py-2 rounded border ${inputClass}`}
            >
              <option value="">Select branch...</option>
              {branches.filter(b => !b.current).map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleMerge}
            disabled={!mergeBranch}
            className="w-full py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Merge into {currentBranch}
          </button>
        </div>
      ))}

      {renderModal(showCredentialsModal, () => setShowCredentialsModal(false), 'Git Credentials', (
        <div className="space-y-4">
          <div>
            <label className={`block text-sm ${mutedClass} mb-1`}>Remote (or "default")</label>
            <input
              type="text"
              value={credRemote}
              onChange={(e) => setCredRemote(e.target.value)}
              className={`w-full px-3 py-2 rounded border ${inputClass}`}
            />
          </div>
          <div>
            <label className={`block text-sm ${mutedClass} mb-1`}>Username</label>
            <input
              type="text"
              value={credUsername}
              onChange={(e) => setCredUsername(e.target.value)}
              className={`w-full px-3 py-2 rounded border ${inputClass}`}
            />
          </div>
          <div>
            <label className={`block text-sm ${mutedClass} mb-1`}>Password / Token</label>
            <input
              type="password"
              value={credPassword}
              onChange={(e) => setCredPassword(e.target.value)}
              className={`w-full px-3 py-2 rounded border ${inputClass}`}
            />
          </div>
          <button
            onClick={handleSaveCredentials}
            disabled={!credUsername.trim()}
            className="w-full py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Save Credentials
          </button>
        </div>
      ))}

      {/* Commit Detail Modal */}
      {renderModal(showCommitDetail, () => setShowCommitDetail(false), 'Commit Details', (
        selectedCommit && (
          <div className="space-y-4">
            <div className={`p-3 rounded ${bgSecondary}`}>
              <p className={`text-sm font-medium ${textClass}`}>{selectedCommit.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className={mutedClass}>Author</span>
                <p className={textClass}>{selectedCommit.author.name}</p>
                <p className={`text-xs ${mutedClass}`}>{selectedCommit.author.email}</p>
              </div>
              <div>
                <span className={mutedClass}>Date</span>
                <p className={textClass}>
                  {new Date(selectedCommit.author.timestamp * 1000).toLocaleString()}
                </p>
              </div>
              <div className="col-span-2">
                <span className={mutedClass}>SHA</span>
                <p className={`font-mono text-xs ${accentClass}`}>{selectedCommit.oid}</p>
              </div>
              {selectedCommit.parent.length > 0 && (
                <div className="col-span-2">
                  <span className={mutedClass}>Parents</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedCommit.parent.map(p => (
                      <code key={p} className={`text-xs px-2 py-0.5 rounded ${bgSecondary}`}>
                        {p.slice(0, 7)}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ))}
    </div>
  );
};

export default VersionControlPanel;
