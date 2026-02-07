/**
 * GitPanel — Git status, commit, push, branches
 * Gorgeous sidebar panel for version control
 */
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, GitCommit as GitCommitIcon, GitMerge, GitPullRequest,
  Plus, Check, X, RefreshCw, Upload, Download, ChevronRight,
  FileText, FilePlus, FileMinus, FileCode, Clock, User
} from 'lucide-react';
import { gitService, GitStatus, GitCommit, GitBranch as GitBranchType, GitFileChange } from '../../services/gitService';

interface GitPanelProps {
  projectId: string;
  className?: string;
}

const changeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  added: { icon: FilePlus, color: 'text-emerald-400' },
  modified: { icon: FileCode, color: 'text-amber-400' },
  deleted: { icon: FileMinus, color: 'text-red-400' },
  renamed: { icon: FileText, color: 'text-blue-400' },
};

const GitPanel: React.FC<GitPanelProps> = ({ projectId, className = '' }) => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<GitBranchType[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'changes' | 'branches' | 'history'>('changes');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, b, c] = await Promise.all([
        gitService.getStatus(projectId),
        gitService.getBranches(projectId),
        gitService.getLog(projectId, 30),
      ]);
      setStatus(s);
      setBranches(b);
      setCommits(c);
    } catch (e) {
      console.error('Git refresh failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleStage = useCallback(async (paths: string[]) => {
    try {
      await gitService.stage(projectId, paths);
      refresh();
    } catch (e) {
      console.error('Stage failed:', e);
    }
  }, [projectId, refresh]);

  const handleUnstage = useCallback(async (paths: string[]) => {
    try {
      await gitService.unstage(projectId, paths);
      refresh();
    } catch (e) {
      console.error('Unstage failed:', e);
    }
  }, [projectId, refresh]);

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;
    try {
      await gitService.commit(projectId, commitMessage);
      setCommitMessage('');
      refresh();
    } catch (e) {
      console.error('Commit failed:', e);
    }
  }, [projectId, commitMessage, refresh]);

  const handlePush = useCallback(async () => {
    try {
      await gitService.push(projectId);
      refresh();
    } catch (e) {
      console.error('Push failed:', e);
    }
  }, [projectId, refresh]);

  const handlePull = useCallback(async () => {
    try {
      await gitService.pull(projectId);
      refresh();
    } catch (e) {
      console.error('Pull failed:', e);
    }
  }, [projectId, refresh]);

  const handleCreateBranch = useCallback(async () => {
    if (!newBranchName.trim()) return;
    try {
      await gitService.createBranch(projectId, newBranchName);
      setNewBranchName('');
      setShowNewBranch(false);
      refresh();
    } catch (e) {
      console.error('Create branch failed:', e);
    }
  }, [projectId, newBranchName, refresh]);

  const handleCheckout = useCallback(async (branch: string) => {
    try {
      await gitService.checkout(projectId, branch);
      refresh();
    } catch (e) {
      console.error('Checkout failed:', e);
    }
  }, [projectId, refresh]);

  const renderFileChange = (change: GitFileChange, isStaged: boolean) => {
    const { icon: Icon, color } = changeIcons[change.status] || changeIcons.modified;
    return (
      <div key={change.path} className="group flex items-center gap-2 px-3 py-1 hover:bg-zinc-800/50 transition-colors">
        <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
        <span className="text-[11px] text-zinc-300 truncate flex-1">{change.path}</span>
        <button
          onClick={() => isStaged ? handleUnstage([change.path]) : handleStage([change.path])}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-800/50 transition-all"
          title={isStaged ? 'Unstage' : 'Stage'}
        >
          {isStaged ? <X className="w-3 h-3 text-zinc-400" /> : <Plus className="w-3 h-3 text-emerald-400" />}
        </button>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-950 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-200">Source Control</h3>
            <p className="text-[10px] text-zinc-500">{status?.branch || 'main'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handlePull} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all" title="Pull">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={handlePush} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all" title="Push">
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button onClick={refresh} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Ahead/Behind indicators */}
      {status && (status.ahead > 0 || status.behind > 0) && (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900/40 border-b border-zinc-800/50 text-[10px]">
          {status.ahead > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Upload className="w-3 h-3" /> {status.ahead} ahead
            </span>
          )}
          {status.behind > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <Download className="w-3 h-3" /> {status.behind} behind
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-800 px-1">
        {(['changes', 'branches', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === tab
                ? 'text-violet-400 border-violet-400'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Changes tab */}
        {activeTab === 'changes' && (
          <div>
            {/* Commit input */}
            <div className="p-3 border-b border-zinc-800/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                  placeholder="Commit message..."
                  className="flex-1 px-3 py-2 bg-zinc-900/40 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-500/30 outline-none transition-all"
                />
                <button
                  onClick={handleCommit}
                  disabled={!commitMessage.trim()}
                  className="px-3 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Staged changes */}
            {status && status.staged.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/40">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Staged ({status.staged.length})
                  </span>
                  <button
                    onClick={() => handleUnstage(status.staged.map((s) => s.path))}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    Unstage All
                  </button>
                </div>
                {status.staged.map((change) => renderFileChange(change, true))}
              </div>
            )}

            {/* Unstaged changes */}
            {status && status.unstaged.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/40">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Changes ({status.unstaged.length})
                  </span>
                  <button
                    onClick={() => handleStage(status.unstaged.map((s) => s.path))}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    Stage All
                  </button>
                </div>
                {status.unstaged.map((change) => renderFileChange(change, false))}
              </div>
            )}

            {/* Untracked */}
            {status && status.untracked.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/40">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Untracked ({status.untracked.length})
                  </span>
                </div>
                {status.untracked.map((path) => (
                  <div key={path} className="group flex items-center gap-2 px-3 py-1 hover:bg-zinc-800/50 transition-colors">
                    <FilePlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-zinc-300 truncate flex-1">{path}</span>
                    <button
                      onClick={() => handleStage([path])}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-800/50 transition-all"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Clean state */}
            {status?.isClean && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <Check className="w-8 h-8 mb-2 text-emerald-400/30" />
                <p className="text-xs">Working tree clean</p>
              </div>
            )}
          </div>
        )}

        {/* Branches tab */}
        {activeTab === 'branches' && (
          <div>
            {/* New branch input */}
            <div className="p-3 border-b border-zinc-800/50">
              {showNewBranch ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                    placeholder="Branch name..."
                    autoFocus
                    className="flex-1 px-3 py-2 bg-zinc-900/40 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-500/30 outline-none"
                  />
                  <button onClick={handleCreateBranch} className="p-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={() => { setShowNewBranch(false); setNewBranchName(''); }} className="p-2 text-zinc-500 hover:text-zinc-300">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewBranch(true)}
                  className="w-full px-3 py-2 bg-zinc-900/40 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" /> New Branch
                </button>
              )}
            </div>

            {/* Branch list */}
            {branches.map((branch) => (
              <button
                key={branch.name}
                onClick={() => !branch.isCurrent && handleCheckout(branch.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 transition-colors text-left ${
                  branch.isCurrent ? 'bg-violet-500/5' : ''
                }`}
              >
                <GitBranch className={`w-3.5 h-3.5 ${branch.isCurrent ? 'text-violet-400' : 'text-zinc-500'} shrink-0`} />
                <span className={`text-xs flex-1 ${branch.isCurrent ? 'text-violet-300 font-semibold' : 'text-zinc-300'}`}>
                  {branch.name}
                </span>
                {branch.isCurrent && (
                  <span className="text-[9px] text-violet-400 bg-violet-500/15 px-1.5 py-0.5 rounded">current</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div>
            {commits.map((commit, i) => (
              <div key={commit.hash} className="flex gap-3 px-3 py-2 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50">
                {/* Timeline line */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500/40 border-2 border-violet-500/60 shrink-0" />
                  {i < commits.length - 1 && <div className="w-[1px] flex-1 bg-zinc-800 mt-1" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-200 font-medium leading-tight truncate">{commit.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-zinc-500 font-mono">{commit.shortHash}</span>
                    <span className="text-[9px] text-zinc-600">·</span>
                    <span className="text-[9px] text-zinc-500">{commit.author}</span>
                    <span className="text-[9px] text-zinc-600">·</span>
                    <span className="text-[9px] text-zinc-500">
                      {new Date(commit.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {commits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <Clock className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">No commits yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GitPanel;
