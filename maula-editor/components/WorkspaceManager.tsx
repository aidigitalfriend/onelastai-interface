import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { FileNode, Project } from '../types';

interface Workspace {
  id: string;
  name: string;
  projects: string[]; // Project IDs
  lastOpened: number;
  color?: string;
}

interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({ isOpen, onClose }) => {
  const { 
    theme, 
    projects, 
    currentProject, 
    setCurrentProject, 
    setFiles,
    createProject,
    deleteProject,
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'recent' | 'workspaces' | 'new'>('recent');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');

  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // Load workspaces from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('workspaces');
    if (saved) {
      try {
        setWorkspaces(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load workspaces:', e);
      }
    }
  }, []);

  // Save workspaces to localStorage
  useEffect(() => {
    localStorage.setItem('workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  // Create new workspace
  const handleCreateWorkspace = useCallback(() => {
    if (!newWorkspaceName.trim()) return;
    
    const newWorkspace: Workspace = {
      id: crypto.randomUUID(),
      name: newWorkspaceName.trim(),
      projects: [],
      lastOpened: Date.now(),
      color: getRandomColor(),
    };
    
    setWorkspaces(prev => [...prev, newWorkspace]);
    setNewWorkspaceName('');
    setSelectedWorkspace(newWorkspace.id);
  }, [newWorkspaceName]);

  // Delete workspace
  const handleDeleteWorkspace = useCallback((workspaceId: string) => {
    if (confirm('Delete this workspace? Projects will not be deleted.')) {
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
      if (selectedWorkspace === workspaceId) {
        setSelectedWorkspace(null);
      }
    }
  }, [selectedWorkspace]);

  // Add project to workspace
  const handleAddProjectToWorkspace = useCallback((workspaceId: string, projectId: string) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === workspaceId 
        ? { ...w, projects: [...w.projects, projectId] }
        : w
    ));
  }, []);

  // Remove project from workspace
  const handleRemoveProjectFromWorkspace = useCallback((workspaceId: string, projectId: string) => {
    setWorkspaces(prev => prev.map(w => 
      w.id === workspaceId 
        ? { ...w, projects: w.projects.filter(p => p !== projectId) }
        : w
    ));
  }, []);

  // Open project
  const handleOpenProject = useCallback((project: Project) => {
    setCurrentProject(project);
    setFiles(project.files);
    onClose();
  }, [setCurrentProject, setFiles, onClose]);

  // Delete project
  const handleDeleteProject = useCallback((projectId: string) => {
    if (confirm('Delete this project? This cannot be undone.')) {
      deleteProject(projectId);
      // Remove from all workspaces
      setWorkspaces(prev => prev.map(w => ({
        ...w,
        projects: w.projects.filter(p => p !== projectId)
      })));
    }
  }, [deleteProject]);

  // Create new project
  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) return;
    
    const defaultFiles: FileNode[] = [
      {
        id: crypto.randomUUID(),
        name: 'index.html',
        type: 'file',
        path: '/index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${newProjectName}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello, ${newProjectName}!</h1>
  <script src="script.js"></script>
</body>
</html>`,
        language: 'html',
      },
      {
        id: crypto.randomUUID(),
        name: 'style.css',
        type: 'file',
        path: '/style.css',
        content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

h1 {
  font-size: 3rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}`,
        language: 'css',
      },
      {
        id: crypto.randomUUID(),
        name: 'script.js',
        type: 'file',
        path: '/script.js',
        content: `// Welcome to ${newProjectName}!
console.log('Project initialized');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
});`,
        language: 'javascript',
      },
    ];

    await createProject(newProjectName.trim(), selectedTemplate, defaultFiles);
    setNewProjectName('');
    setActiveTab('recent');
  }, [newProjectName, selectedTemplate, createProject]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.template.toLowerCase().includes(query)
      );
    }
    
    // Sort
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    
    return result;
  }, [projects, searchQuery, sortBy]);

  // Get workspace projects
  const getWorkspaceProjects = useCallback((workspace: Workspace) => {
    return projects.filter(p => workspace.projects.includes(p.id));
  }, [projects]);

  // Random color generator
  const getRandomColor = () => {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Template options
  const templates = [
    { id: 'blank', name: 'Blank Project', icon: '📄', description: 'Start from scratch' },
    { id: 'react', name: 'React', icon: '⚛️', description: 'React with TypeScript' },
    { id: 'nextjs', name: 'Next.js', icon: '▲', description: 'Full-stack React framework' },
    { id: 'vue', name: 'Vue.js', icon: '💚', description: 'Vue 3 with Composition API' },
    { id: 'node', name: 'Node.js', icon: '🟢', description: 'Express server' },
    { id: 'python', name: 'Python', icon: '🐍', description: 'Python with Flask' },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-4xl h-[80vh] mx-4 ${
          isDark ? 'bg-vscode-sidebar' : 'bg-white'
        } rounded-lg shadow-2xl overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-vscode-border' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Project Manager
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded ${isDark ? 'hover:bg-vscode-hover text-vscode-textMuted' : 'hover:bg-gray-200 text-gray-500'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
          {[
            { id: 'recent' as const, label: 'Recent Projects', icon: '🕐' },
            { id: 'workspaces' as const, label: 'Workspaces', icon: '📁' },
            { id: 'new' as const, label: 'New Project', icon: '➕' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? isDark 
                    ? 'text-white border-b-2 border-vscode-accent' 
                    : 'text-blue-600 border-b-2 border-blue-600'
                  : isDark 
                    ? 'text-vscode-textMuted hover:text-white' 
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Recent Projects Tab */}
          {activeTab === 'recent' && (
            <div className="flex-1 flex flex-col">
              {/* Search and Sort */}
              <div className={`flex items-center gap-3 p-3 border-b ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                      isDark 
                        ? 'bg-vscode-bg border-vscode-border text-white placeholder-vscode-textMuted focus:ring-vscode-accent' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
                    }`}
                  />
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-vscode-textMuted' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
                  className={`px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                    isDark 
                      ? 'bg-vscode-bg border-vscode-border text-white focus:ring-vscode-accent' 
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                  }`}
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>

              {/* Project List */}
              <div className="flex-1 overflow-y-auto p-3">
                {filteredProjects.length === 0 ? (
                  <div className={`text-center py-12 ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No projects yet</p>
                    <p className="text-sm mt-1">Create your first project to get started</p>
                    <button
                      onClick={() => setActiveTab('new')}
                      className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
                        isDark ? 'bg-vscode-accent text-white hover:bg-vscode-accent/90' : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      Create Project
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`group relative p-4 rounded-lg border cursor-pointer transition-all ${
                          currentProject?.id === project.id
                            ? isDark 
                              ? 'bg-vscode-selection border-vscode-accent' 
                              : 'bg-blue-50 border-blue-500'
                            : isDark 
                              ? 'bg-vscode-bg border-vscode-border hover:border-vscode-accent/50' 
                              : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => handleOpenProject(project)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                            isDark ? 'bg-vscode-hover' : 'bg-white'
                          }`}>
                            {project.template === 'react' ? '⚛️' : 
                             project.template === 'nextjs' ? '▲' :
                             project.template === 'vue' ? '💚' :
                             project.template === 'node' ? '🟢' :
                             project.template === 'python' ? '🐍' : '📄'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {project.name}
                            </h3>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                              {project.template} • {project.files.length} files
                            </p>
                            <p className={`text-xs mt-1 ${isDark ? 'text-vscode-textMuted' : 'text-gray-400'}`}>
                              {formatDate(project.updatedAt)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                            className={`p-1.5 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                            title="Delete Project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Current indicator */}
                        {currentProject?.id === project.id && (
                          <div className={`absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded ${
                            isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white'
                          }`}>
                            Current
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workspaces Tab */}
          {activeTab === 'workspaces' && (
            <div className="flex-1 flex">
              {/* Workspace List */}
              <div className={`w-64 border-r ${isDark ? 'border-vscode-border' : 'border-gray-200'} flex flex-col`}>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      placeholder="New workspace name"
                      className={`flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 ${
                        isDark 
                          ? 'bg-vscode-bg border-vscode-border text-white placeholder-vscode-textMuted focus:ring-vscode-accent' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
                      }`}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                    />
                    <button
                      onClick={handleCreateWorkspace}
                      disabled={!newWorkspaceName.trim()}
                      className={`p-1.5 rounded ${
                        newWorkspaceName.trim()
                          ? isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {workspaces.length === 0 ? (
                    <div className={`p-4 text-center ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                      <p className="text-sm">No workspaces yet</p>
                      <p className="text-xs mt-1">Create one to organize projects</p>
                    </div>
                  ) : (
                    workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => setSelectedWorkspace(workspace.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          selectedWorkspace === workspace.id
                            ? isDark ? 'bg-vscode-selection' : 'bg-blue-50'
                            : isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: workspace.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {workspace.name}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                            {workspace.projects.length} projects
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Workspace Details */}
              <div className="flex-1 flex flex-col">
                {selectedWorkspace ? (
                  <>
                    {(() => {
                      const workspace = workspaces.find(w => w.id === selectedWorkspace);
                      if (!workspace) return null;
                      const workspaceProjects = getWorkspaceProjects(workspace);
                      const availableProjects = projects.filter(p => !workspace.projects.includes(p.id));
                      
                      return (
                        <>
                          {/* Workspace Header */}
                          <div className={`p-4 border-b ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: workspace.color }}
                                />
                                <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {workspace.name}
                                </h3>
                              </div>
                              <button
                                onClick={() => handleDeleteWorkspace(workspace.id)}
                                className={`p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Workspace Projects */}
                          <div className="flex-1 overflow-y-auto p-4">
                            <h4 className={`text-xs font-medium uppercase mb-2 ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                              Projects in Workspace
                            </h4>
                            
                            {workspaceProjects.length === 0 ? (
                              <div className={`text-center py-8 ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                                <p className="text-sm">No projects in this workspace</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {workspaceProjects.map((project) => (
                                  <div
                                    key={project.id}
                                    className={`flex items-center gap-3 p-2 rounded ${
                                      isDark ? 'bg-vscode-bg' : 'bg-gray-50'
                                    }`}
                                  >
                                    <span className="text-lg">📁</span>
                                    <div className="flex-1">
                                      <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {project.name}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleOpenProject(project)}
                                      className={`px-2 py-1 text-xs rounded ${
                                        isDark ? 'bg-vscode-accent text-white' : 'bg-blue-500 text-white'
                                      }`}
                                    >
                                      Open
                                    </button>
                                    <button
                                      onClick={() => handleRemoveProjectFromWorkspace(workspace.id, project.id)}
                                      className={`p-1 rounded ${isDark ? 'hover:bg-vscode-hover text-vscode-textMuted' : 'hover:bg-gray-200 text-gray-500'}`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add Projects */}
                            {availableProjects.length > 0 && (
                              <>
                                <h4 className={`text-xs font-medium uppercase mt-6 mb-2 ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                                  Add Projects
                                </h4>
                                <div className="space-y-2">
                                  {availableProjects.map((project) => (
                                    <button
                                      key={project.id}
                                      onClick={() => handleAddProjectToWorkspace(workspace.id, project.id)}
                                      className={`w-full flex items-center gap-3 p-2 rounded transition-colors ${
                                        isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100'
                                      }`}
                                    >
                                      <span className="text-lg">📄</span>
                                      <div className={`flex-1 text-left text-sm ${isDark ? 'text-vscode-text' : 'text-gray-700'}`}>
                                        {project.name}
                                      </div>
                                      <svg className={`w-4 h-4 ${isDark ? 'text-vscode-accent' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <div className={`flex-1 flex items-center justify-center ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <p>Select a workspace to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Project Tab */}
          {activeTab === 'new' && (
            <div className="flex-1 p-6">
              <div className="max-w-xl mx-auto">
                <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Create New Project
                </h3>
                
                {/* Project Name */}
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-vscode-text' : 'text-gray-700'}`}>
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="my-awesome-project"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      isDark 
                        ? 'bg-vscode-bg border-vscode-border text-white placeholder-vscode-textMuted focus:ring-vscode-accent' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
                    }`}
                  />
                </div>

                {/* Template Selection */}
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-vscode-text' : 'text-gray-700'}`}>
                    Choose Template
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          selectedTemplate === template.id
                            ? isDark 
                              ? 'bg-vscode-selection border-vscode-accent' 
                              : 'bg-blue-50 border-blue-500'
                            : isDark 
                              ? 'bg-vscode-bg border-vscode-border hover:border-vscode-accent/50' 
                              : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <span className="text-2xl">{template.icon}</span>
                        <div className={`text-sm font-medium mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {template.name}
                        </div>
                        <div className={`text-xs mt-1 ${isDark ? 'text-vscode-textMuted' : 'text-gray-500'}`}>
                          {template.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create Button */}
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    newProjectName.trim()
                      ? isDark ? 'bg-vscode-accent text-white hover:bg-vscode-accent/90' : 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'opacity-50 cursor-not-allowed bg-gray-400 text-white'
                  }`}
                >
                  Create Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceManager;
