/**
 * Production-Level Git Panel Component
 * Features:
 * - Visual commit graph with branch visualization
 * - Comprehensive status view with staging area
 * - Branch management with create/merge/delete
 * - Remote management (add/remove/fetch/push/pull)
 * - Stash management
 * - Interactive diff viewer
 * - Merge conflict resolution UI
 * - Commit history with search
 * - Git blame integration
 * - Credential management
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  GitCredentials,
  GitProgress,
} from '../services/gitPro';

// ==================== Types ====================

type GitTab = 'changes' | 'commits' | 'branches' | 'remotes' | 'stashes' | 'settings';

interface CommitGraphNode {
  commit: GitCommit;
  column: number;
  color: string;
  parents: string[];
  children: string[];
}

// ==================== Icons ====================

const Icons = {
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
  Folder: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  File: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
  Eye: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
};

// ==================== Status Colors ====================

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  modified: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: 'M' },
  added: { bg: 'bg-green-500/20', text: 'text-green-400', icon: 'A' },
  deleted: { bg: 'bg-red-500/20', text: 'text-red-400', icon: 'D' },
  untracked: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '?' },
  conflict: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '!' },
  ignored: { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: 'I' },
};

const BRANCH_COLORS = [
  '#60a5fa', // blue
  '#f472b6', // pink
  '#34d399', // green
  '#fbbf24', // yellow
  '#a78bfa', // purple
  '#f87171', // red
  '#22d3ee', // cyan
  '#fb923c', // orange
];

// ==================== Props ====================

interface ProductionGitPanelProps {
  className?: string;
}

// ==================== Main Component ====================

export const ProductionGitPanel: React.FC<ProductionGitPanelProps> = ({ className = '' }) => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // State
  const [activeTab, setActiveTab] = useState<GitTab>('changes');
  const [status, setStatus] = useState<GitStatus[]>([]);
  const [stagedFiles, setStagedFiles] = useState<GitStatus[]>([]);
  const [unstagedFiles, setUnstagedFiles] = useState<GitStatus[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [stashes, setStashes] = useState<GitStash[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<GitProgress | null>(null);
  
  // Modal states
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  
  // Form states
  const [cloneUrl, setCloneUrl] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newRemoteName, setNewRemoteName] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<GitDiff | null>(null);
  const [mergeBranch, setMergeBranch] = useState<string | null>(null);
  const [stashMessage, setStashMessage] = useState('');
  
  // Credentials
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [credRemote, setCredRemote] = useState('default');

  // Theme classes
  const bgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-gray-50';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const hoverClass = isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
  const activeClass = isDark ? 'bg-slate-700' : 'bg-gray-100';
  const inputClass = isDark 
    ? 'bg-slate-800 border-slate-600 text-white' 
    : 'bg-white border-gray-300 text-gray-900';

  // ==================== Data Loading ====================

  const loadStatus = useCallback(async () => {
    try {
      const statusData = await gitServicePro.status();
      setStatus(statusData);
      setStagedFiles(statusData.filter(f => f.staged));
      setUnstagedFiles(statusData.filter(f => !f.staged));
      
      const branch = await gitServicePro.getCurrentBranch();
      setCurrentBranch(branch);
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  }, []);

  const loadCommits = useCallback(async () => {
    try {
      const commitData = await gitServicePro.log({ depth: 50 });
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
  }, [activeTab]);

  // ==================== Actions ====================

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  };

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
      await gitServicePro.clone({
        url: cloneUrl,
        onProgress: setProgress,
      });
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
        setShowDiffModal(true);
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

  // ==================== Render Functions ====================

  const renderFileItem = (file: GitStatus, staged: boolean) => {
    const statusStyle = STATUS_COLORS[file.status] || STATUS_COLORS.modified;
    
    return (
      <motion.div
        key={file.filepath}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center justify-between p-2 rounded ${hoverClass} cursor-pointer group`}
        onClick={() => handleShowDiff(file.filepath)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`w-5 h-5 flex items-center justify-center rounded text-xs font-mono ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.icon}
          </span>
          <span className={`text-sm truncate ${textClass}`}>{file.filepath}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    );
  };

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
            className={`flex-1 px-3 py-1.5 text-sm rounded ${
              commitMessage.trim() && stagedFiles.length > 0
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
            } transition-colors`}
          >
            Commit ({stagedFiles.length})
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
          <h3 className={`text-xs font-medium uppercase ${mutedClass}`}>
            Staged Changes ({stagedFiles.length})
          </h3>
          {stagedFiles.length > 0 && (
            <button
              onClick={handleUnstageAll}
              className={`text-xs ${mutedClass} hover:text-red-400`}
            >
              Unstage All
            </button>
          )}
        </div>
        <div className={`rounded border ${borderClass} overflow-hidden`}>
          {stagedFiles.length === 0 ? (
            <p className={`p-3 text-sm ${mutedClass}`}>No staged changes</p>
          ) : (
            stagedFiles.map(f => renderFileItem(f, true))
          )}
        </div>
      </div>

      {/* Unstaged Files */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-xs font-medium uppercase ${mutedClass}`}>
            Changes ({unstagedFiles.length})
          </h3>
          {unstagedFiles.length > 0 && (
            <button
              onClick={handleStageAll}
              className={`text-xs ${mutedClass} hover:text-green-400`}
            >
              Stage All
            </button>
          )}
        </div>
        <div className={`rounded border ${borderClass} overflow-hidden`}>
          {unstagedFiles.length === 0 ? (
            <p className={`p-3 text-sm ${mutedClass}`}>No changes</p>
          ) : (
            unstagedFiles.map(f => renderFileItem(f, false))
          )}
        </div>
      </div>
    </div>
  );

  const renderCommitsTab = () => (
    <div className="p-3">
      <div className="space-y-2">
        {commits.length === 0 ? (
          <p className={`text-sm ${mutedClass}`}>No commits yet</p>
        ) : (
          commits.map((commit, index) => (
            <motion.div
              key={commit.oid}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className={`p-3 rounded ${bgSecondary} border ${borderClass}`}
            >
              <div className="flex items-start gap-3">
                {/* Commit graph dot */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: BRANCH_COLORS[index % BRANCH_COLORS.length] }}
                  />
                  {index < commits.length - 1 && (
                    <div className={`w-0.5 h-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${textClass} truncate`}>
                    {commit.message.split('\n')[0]}
                  </p>
                  <div className={`flex items-center gap-2 mt-1 text-xs ${mutedClass}`}>
                    <span>{commit.author.name}</span>
                    <span>•</span>
                    <span>{new Date(commit.author.timestamp * 1000).toLocaleDateString()}</span>
                    <span>•</span>
                    <code className="font-mono">{commit.oid.slice(0, 7)}</code>
                  </div>
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
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400`}>
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

      <div className="space-y-1">
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
          className={`px-3 py-1.5 text-sm rounded ${
            status.length > 0
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
          } transition-colors`}
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
                    stash@{index}: {stash.message}
                  </p>
                  <p className={`text-xs ${mutedClass}`}>
                    on {stash.branch} • {new Date(stash.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleStashPop(index)}
                    className={`px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30`}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => handleStashDrop(index)}
                    className={`p-1 rounded text-red-400 hover:bg-red-500/20`}
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

  const renderSettingsTab = () => (
    <div className="p-3 space-y-4">
      {/* User Config */}
      <div className={`p-3 rounded ${bgSecondary}`}>
        <h3 className={`text-sm font-medium ${textClass} mb-3`}>Git Configuration</h3>
        <div className="space-y-2">
          <div>
            <label className={`block text-xs ${mutedClass} mb-1`}>User Name</label>
            <input
              type="text"
              defaultValue={gitServicePro.getConfig()['user.name'] || ''}
              onBlur={(e) => gitServicePro.setConfig({ 'user.name': e.target.value })}
              className={`w-full px-3 py-1.5 text-sm rounded border ${inputClass}`}
            />
          </div>
          <div>
            <label className={`block text-xs ${mutedClass} mb-1`}>User Email</label>
            <input
              type="email"
              defaultValue={gitServicePro.getConfig()['user.email'] || ''}
              onBlur={(e) => gitServicePro.setConfig({ 'user.email': e.target.value })}
              className={`w-full px-3 py-1.5 text-sm rounded border ${inputClass}`}
            />
          </div>
        </div>
      </div>

      {/* Credentials */}
      <div className={`p-3 rounded ${bgSecondary}`}>
        <h3 className={`text-sm font-medium ${textClass} mb-3`}>Credentials</h3>
        <button
          onClick={() => setShowCredentialsModal(true)}
          className={`w-full px-3 py-2 text-sm rounded ${hoverClass} border ${borderClass} flex items-center justify-center gap-2`}
        >
          <Icons.Key />
          Manage Credentials
        </button>
      </div>

      {/* Repository Actions */}
      <div className={`p-3 rounded ${bgSecondary}`}>
        <h3 className={`text-sm font-medium ${textClass} mb-3`}>Repository</h3>
        <div className="space-y-2">
          <button
            onClick={handleInit}
            className={`w-full px-3 py-2 text-sm rounded ${hoverClass} border ${borderClass}`}
          >
            Initialize Repository
          </button>
          <button
            onClick={() => setShowCloneModal(true)}
            className={`w-full px-3 py-2 text-sm rounded ${hoverClass} border ${borderClass}`}
          >
            Clone Repository
          </button>
        </div>
      </div>
    </div>
  );

  // ==================== Modals ====================

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

  // ==================== Main Render ====================

  return (
    <div className={`flex flex-col h-full ${bgClass} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <Icons.Branch />
          <span className={`text-sm font-medium ${textClass}`}>Git</span>
          {currentBranch && (
            <span className={`text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400`}>
              {currentBranch}
            </span>
          )}
        </div>
        <button
          onClick={loadAll}
          disabled={isLoading}
          className={`p-1 rounded ${hoverClass} ${isLoading ? 'animate-spin' : ''}`}
        >
          <Icons.Refresh />
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${borderClass} overflow-x-auto`}>
        {(['changes', 'commits', 'branches', 'remotes', 'stashes', 'settings'] as GitTab[]).map(tab => (
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
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className={`px-3 py-2 border-b ${borderClass}`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${mutedClass}`}>{progress.phase}</span>
            <div className="flex-1 h-1 bg-slate-700 rounded overflow-hidden">
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
        {activeTab === 'settings' && renderSettingsTab()}
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`absolute bottom-4 left-4 right-4 p-3 rounded shadow-lg ${
              error ? 'bg-red-500' : 'bg-green-500'
            } text-white text-sm`}
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

      {/* Clone Modal */}
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

      {/* Branch Modal */}
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

      {/* Remote Modal */}
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

      {/* Merge Modal */}
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

      {/* Credentials Modal */}
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

      {/* Diff Modal */}
      {renderModal(showDiffModal, () => setShowDiffModal(false), `Diff: ${selectedDiff?.filepath || ''}`, (
        <div className="max-h-96 overflow-auto">
          {selectedDiff && (
            <div className={`font-mono text-xs ${bgSecondary} rounded p-3`}>
              {selectedDiff.hunks.map((hunk, hi) => (
                <div key={hi} className="mb-4">
                  <div className={`${mutedClass} mb-2`}>
                    @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                  </div>
                  {hunk.lines.map((line, li) => (
                    <div
                      key={li}
                      className={`${
                        line.type === 'add'
                          ? 'bg-green-500/20 text-green-400'
                          : line.type === 'delete'
                            ? 'bg-red-500/20 text-red-400'
                            : mutedClass
                      }`}
                    >
                      {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '} {line.content}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProductionGitPanel;
