/**
 * WORKSPACE SERVICE - Project Persistence for Canvas Studio
 * Handles saving/loading projects to/from the backend
 */

const API_BASE = '/api/workspace';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
  isOpen?: boolean;
  isMain?: boolean;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  thumbnail?: string;
  language: string;
  framework?: string;
  projectType: string;
  mainFile: string;
  editorState?: EditorState;
  originalPrompt?: string;
  isPublic: boolean;
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
  files: ProjectFile[];
  fileCount?: number;
}

export interface EditorState {
  activeFile?: string;
  cursor?: { line: number; column: number };
  openFiles?: string[];
  scrollPositions?: Record<string, number>;
}

export interface SaveResult {
  success: boolean;
  savedAt?: string;
  fileCount?: number;
  error?: string;
}

export interface ProjectVersion {
  id: string;
  version: number;
  name: string;
  createdAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ============================================================================
// PROJECT CRUD
// ============================================================================

/**
 * List user's projects
 */
export async function listProjects(options?: { limit?: number; offset?: number; archived?: boolean }): Promise<Project[]> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.archived) params.set('archived', 'true');

    const response = await fetch(`${API_BASE}/projects?${params}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    console.error('[Workspace] List projects error:', error);
    return [];
  }
}

/**
 * Create a new project
 */
export async function createProject(options: {
  name?: string;
  description?: string;
  language?: string;
  framework?: string;
  projectType?: string;
  mainFile?: string;
  files?: ProjectFile[];
  editorState?: EditorState;
  originalPrompt?: string;
}): Promise<{ slug: string; id: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(options),
    });

    const data = await response.json();
    if (data.success) {
      return { slug: data.project.slug, id: data.project.id };
    }
    console.error('[Workspace] Create project error:', data.error);
    return null;
  } catch (error) {
    console.error('[Workspace] Create project error:', error);
    return null;
  }
}

/**
 * Load a project by slug
 */
export async function loadProject(slug: string): Promise<Project | null> {
  try {
    const response = await fetch(`${API_BASE}/projects/${slug}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.error('[Workspace] Load project error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.project || null;
  } catch (error) {
    console.error('[Workspace] Load project error:', error);
    return null;
  }
}

/**
 * Update project metadata
 */
export async function updateProject(slug: string, updates: {
  name?: string;
  description?: string;
  language?: string;
  framework?: string;
  mainFile?: string;
  isPublic?: boolean;
  isArchived?: boolean;
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/projects/${slug}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('[Workspace] Update project error:', error);
    return false;
  }
}

/**
 * Delete a project
 */
export async function deleteProject(slug: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/projects/${slug}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('[Workspace] Delete project error:', error);
    return false;
  }
}

// ============================================================================
// AUTO-SAVE
// ============================================================================

/**
 * Save all project files (auto-save)
 */
export async function saveProject(slug: string, options: {
  files: ProjectFile[];
  editorState?: EditorState;
  mainFile?: string;
}): Promise<SaveResult> {
  try {
    const response = await fetch(`${API_BASE}/projects/${slug}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(options),
    });

    const data = await response.json();
    return {
      success: data.success || false,
      savedAt: data.savedAt,
      fileCount: data.fileCount,
      error: data.error,
    };
  } catch (error: any) {
    console.error('[Workspace] Save project error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save a single file
 */
export async function saveFile(slug: string, file: {
  path: string;
  content: string;
  language?: string;
  isOpen?: boolean;
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/projects/${slug}/file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(file),
    });

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('[Workspace] Save file error:', error);
    return false;
  }
}

/**
 * Delete a single file
 */
export async function deleteFile(slug: string, path: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/projects/${slug}/file`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ path }),
    });

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('[Workspace] Delete file error:', error);
    return false;
  }
}

// ============================================================================
// QUICK SAVE (Anonymous)
// ============================================================================

/**
 * Quick save for anonymous users - creates new project and returns slug
 */
export async function quickSave(options: {
  name?: string;
  files: ProjectFile[];
  editorState?: EditorState;
  mainFile?: string;
  language?: string;
  framework?: string;
  originalPrompt?: string;
}): Promise<{ slug: string; url: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/quick-save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(options),
    });

    const data = await response.json();
    if (data.success) {
      return { slug: data.slug, url: data.url };
    }
    console.error('[Workspace] Quick save error:', data.error);
    return null;
  } catch (error) {
    console.error('[Workspace] Quick save error:', error);
    return null;
  }
}

// ============================================================================
// VERSIONING
// ============================================================================

/**
 * Create a version snapshot
 */
export async function createVersion(slug: string, name?: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/projects/${slug}/version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('[Workspace] Create version error:', error);
    return false;
  }
}

/**
 * List project versions
 */
export async function listVersions(slug: string): Promise<ProjectVersion[]> {
  try {
    const response = await fetch(`${API_BASE}/projects/${slug}/versions`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    return data.versions || [];
  } catch (error) {
    console.error('[Workspace] List versions error:', error);
    return [];
  }
}

/**
 * Restore a version
 */
export async function restoreVersion(slug: string, version: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/projects/${slug}/restore/${version}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('[Workspace] Restore version error:', error);
    return false;
  }
}

// ============================================================================
// WORKSPACE SERVICE EXPORT
// ============================================================================

export const workspaceService = {
  // Project CRUD
  list: listProjects,
  create: createProject,
  load: loadProject,
  update: updateProject,
  delete: deleteProject,
  
  // Auto-save
  save: saveProject,
  saveFile,
  deleteFile,
  quickSave,
  
  // Versioning
  createVersion,
  listVersions,
  restoreVersion,
};

export default workspaceService;
