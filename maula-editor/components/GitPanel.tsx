import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gitService, GitStatus, GitCommit, GitBranch } from '../services/git';
import { diffService } from '../services/diff';
import { useStore } from '../store/useStore';
import { isDarkTheme } from '../utils/theme';

interface GitPanelProps {
  className?: string;
}

export const GitPanel: React.FC<GitPanelProps> = ({ className = '' }) => {
  const { theme } = useStore();
  const [activeTab, setActiveTab] = useState<'changes' | 'commits' | 'branches'>('changes');
  const [status, setStatus] = useState<GitStatus[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string>('');
  
  // Push/Pull state
  const [showPushModal, setShowPushModal] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteBranch, setRemoteBranch] = useState('main');
  const [gitUsername, setGitUsername] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMode, setPushMode] = useState<'push' | 'pull'>('push');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = isDarkTheme(theme);

  // Load git status
  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const statusData = await gitService.status();
      setStatus(statusData);
    } catch (err) {
      setError('Failed to load git status');
    } finally {
      setIsLoading(false);
    }
  };

  // Load commits
  const loadCommits = async () => {
    setIsLoading(true);
    try {
      const commitData = await gitService.log(20);
      setCommits(commitData);
    } catch (err) {
      setError('Failed to load commits');
    } finally {
      setIsLoading(false);
    }
  };

  // Load branches
  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const branchData = await gitService.branches();
      setBranches(branchData);
    } catch (err) {
      setError('Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'commits') loadCommits();
    if (activeTab === 'branches') loadBranches();
  }, [activeTab]);

  // Show diff for selected file
  const showDiff = async (filepath: string) => {
    setSelectedFile(filepath);
    try {
      const diff = await gitService.diff(filepath);
      setDiffContent(diff);
    } catch (err) {
      setDiffContent('Unable to show diff');
    }
  };

  // Stage file
  const stageFile = async (filepath: string) => {
    try {
      await gitService.add(filepath);
      await loadStatus();
    } catch (err) {
      setError('Failed to stage file');
    }
  };

  // Stage all
  const stageAll = async () => {
    try {
      await gitService.addAll();
      await loadStatus();
    } catch (err) {
      setError('Failed to stage all files');
    }
  };

  // Commit
  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError('Please enter a commit message');
      return;
    }
    try {
      await gitService.commit(commitMessage);
      setCommitMessage('');
      await loadStatus();
      await loadCommits();
    } catch (err) {
      setError('Failed to commit');
    }
  };

  // Initialize repo
  const handleInit = async () => {
    try {
      await gitService.init();
      await loadStatus();
    } catch (err) {
      setError('Failed to initialize repository');
    }
  };

  // Push to remote
  const handlePush = async () => {
    if (!gitToken) {
      setError('GitHub token is required for push');
      return;
    }
    setPushLoading(true);
    try {
      await gitService.push('origin', remoteBranch, {
        username: gitUsername || 'git',
        password: gitToken
      });
      setShowPushModal(false);
      setError(null);
      // Show success
      alert('Successfully pushed to remote!');
    } catch (err: any) {
      setError(`Push failed: ${err.message || 'Unknown error'}`);
    } finally {
      setPushLoading(false);
    }
  };

  // Pull from remote
  const handlePull = async () => {
    setPushLoading(true);
    try {
      await gitService.pull('origin', remoteBranch, gitToken ? {
        username: gitUsername || 'git',
        password: gitToken
      } : undefined);
      setShowPushModal(false);
      await loadStatus();
      await loadCommits();
      alert('Successfully pulled from remote!');
    } catch (err: any) {
      setError(`Pull failed: ${err.message || 'Unknown error'}`);
    } finally {
      setPushLoading(false);
    }
  };

  // Status icon
  const getStatusIcon = (fileStatus: GitStatus['status']) => {
    switch (fileStatus) {
      case 'modified': return <span className="text-yellow-500">M</span>;
      case 'added': return <span className="text-green-500">A</span>;
      case 'deleted': return <span className="text-red-500">D</span>;
      case 'untracked': return <span className="text-gray-500">?</span>;
      default: return null;
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-gray-900'} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-medium">Git</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadStatus}
            className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleInit}
            className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
            title="Initialize Repository"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => { setPushMode('pull'); setShowPushModal(true); }}
            className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
            title="Pull"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={() => { setPushMode('push'); setShowPushModal(true); }}
            className={`p-1 rounded ${isDark ? 'hover:bg-slate-700 text-green-400' : 'hover:bg-gray-100 text-green-600'}`}
            title="Push"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        {(['changes', 'commits', 'branches'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? isDark ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-900'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
            {tab === 'changes' && status.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                {status.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {/* Changes Tab */}
          {activeTab === 'changes' && (
            <motion.div
              key="changes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 space-y-3"
            >
              {/* Commit message input */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Commit message"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDark 
                      ? 'bg-slate-800 border-slate-600 focus:border-blue-500' 
                      : 'bg-white border-gray-300 focus:border-blue-500'
                  } outline-none`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={stageAll}
                    className={`flex-1 px-3 py-1.5 text-xs rounded ${
                      isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Stage All
                  </button>
                  <button
                    onClick={handleCommit}
                    disabled={!commitMessage.trim()}
                    className={`flex-1 px-3 py-1.5 text-xs rounded ${
                      commitMessage.trim()
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    Commit
                  </button>
                </div>
              </div>

              {/* Changed files list */}
              {status.length === 0 ? (
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  No changes to commit
                </p>
              ) : (
                <div className="space-y-1">
                  {status.map((file) => (
                    <motion.div
                      key={file.filepath}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                        selectedFile === file.filepath
                          ? isDark ? 'bg-slate-700' : 'bg-gray-100'
                          : isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => showDiff(file.filepath)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono w-4 text-center">
                          {getStatusIcon(file.status)}
                        </span>
                        <span className="text-sm truncate">{file.filepath}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); stageFile(file.filepath); }}
                        className={`p-1 rounded ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}
                        title="Stage"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Diff view */}
              {selectedFile && diffContent && (
                <div className={`mt-3 p-2 rounded font-mono text-xs overflow-auto max-h-48 ${
                  isDark ? 'bg-slate-800' : 'bg-gray-50'
                }`}>
                  <pre className="whitespace-pre-wrap">
                    {diffContent.split('\n').map((line, i) => (
                      <div
                        key={i}
                        className={
                          line.startsWith('+') ? 'text-green-500' :
                          line.startsWith('-') ? 'text-red-500' :
                          line.startsWith('@') ? 'text-blue-500' : ''
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </pre>
                </div>
              )}
            </motion.div>
          )}

          {/* Commits Tab */}
          {activeTab === 'commits' && (
            <motion.div
              key="commits"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3"
            >
              {commits.length === 0 ? (
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  No commits yet
                </p>
              ) : (
                <div className="space-y-2">
                  {commits.map((commit) => (
                    <motion.div
                      key={commit.oid}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-2 rounded ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{commit.message}</p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {commit.author.name} • {new Date(commit.author.timestamp * 1000).toLocaleDateString()}
                          </p>
                        </div>
                        <code className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          {commit.oid.slice(0, 7)}
                        </code>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Branches Tab */}
          {activeTab === 'branches' && (
            <motion.div
              key="branches"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3"
            >
              {branches.length === 0 ? (
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  No branches
                </p>
              ) : (
                <div className="space-y-1">
                  {branches.map((branch) => (
                    <motion.div
                      key={branch.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`flex items-center gap-2 p-2 rounded ${
                        branch.current
                          ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
                          : isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'
                      }`}
                    >
                      {branch.current && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="text-sm">{branch.name}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Push/Pull Modal */}
      <AnimatePresence>
        {showPushModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowPushModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-96 rounded-lg shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'} p-4`}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {pushMode === 'push' ? (
                  <><svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Push to Remote</>
                ) : (
                  <><svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Pull from Remote</>
                )}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Branch</label>
                  <input
                    type="text"
                    value={remoteBranch}
                    onChange={e => setRemoteBranch(e.target.value)}
                    placeholder="main"
                    className={`w-full px-3 py-2 text-sm rounded border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-300'} outline-none focus:border-blue-500`}
                  />
                </div>
                
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>GitHub Username (optional)</label>
                  <input
                    type="text"
                    value={gitUsername}
                    onChange={e => setGitUsername(e.target.value)}
                    placeholder="username"
                    className={`w-full px-3 py-2 text-sm rounded border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-300'} outline-none focus:border-blue-500`}
                  />
                </div>
                
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    GitHub Token / PAT {pushMode === 'push' && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="password"
                    value={gitToken}
                    onChange={e => setGitToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className={`w-full px-3 py-2 text-sm rounded border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-300'} outline-none focus:border-blue-500`}
                  />
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    Generate at GitHub → Settings → Developer settings → Personal access tokens
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowPushModal(false)}
                  className={`flex-1 px-4 py-2 text-sm rounded ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={pushMode === 'push' ? handlePush : handlePull}
                  disabled={pushLoading || (pushMode === 'push' && !gitToken)}
                  className={`flex-1 px-4 py-2 text-sm rounded text-white flex items-center justify-center gap-2 ${
                    pushLoading || (pushMode === 'push' && !gitToken)
                      ? 'bg-gray-500 cursor-not-allowed'
                      : pushMode === 'push' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {pushLoading ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> {pushMode === 'push' ? 'Pushing...' : 'Pulling...'}</>
                  ) : (
                    pushMode === 'push' ? 'Push' : 'Pull'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 p-3 bg-red-500 text-white text-sm rounded shadow-lg"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="absolute top-1 right-1 p-1"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GitPanel;
