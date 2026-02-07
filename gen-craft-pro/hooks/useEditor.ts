/**
 * useEditor — Editor state management hook
 * Wraps editorSettingsStore for convenient component usage
 */
import { useCallback, useEffect } from 'react';
import { useEditorSettingsStore, EditorSettings, ProblemItem } from '../stores/editorStore';

export function useEditor() {
  const store = useEditorSettingsStore();

  // Open a file in a tab
  const openFile = useCallback((path: string, name?: string, language?: string) => {
    const fileName = name || path.split('/').pop() || path;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      html: 'html', css: 'css', json: 'json', md: 'markdown', py: 'python',
      rs: 'rust', go: 'go', java: 'java', rb: 'ruby', php: 'php',
      vue: 'vue', svelte: 'svelte', scss: 'scss', yaml: 'yaml',
    };
    const detectedLang = language || langMap[ext] || 'plaintext';
    store.openTab(path, fileName, detectedLang);
  }, [store]);

  // Close a file tab
  const closeFile = useCallback((path: string) => {
    store.closeTab(path);
  }, [store]);

  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac');
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'p') {
        e.preventDefault();
        store.toggleCommandPalette();
      }
      if (modKey && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        store.toggleSearch();
      }
      if (modKey && e.key === '`') {
        e.preventDefault();
        store.toggleBottomPanel();
      }
      if (modKey && e.key === 'b') {
        e.preventDefault();
        store.toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  return {
    // Tabs
    tabs: store.tabs,
    activeTabPath: store.activeTabPath,
    openFile,
    closeFile,
    setActiveTab: store.setActiveTab,
    closeAllTabs: store.closeAllTabs,
    closeOtherTabs: store.closeOtherTabs,
    markTabDirty: store.markTabDirty,
    reorderTabs: store.reorderTabs,

    // Cursor & Selection
    cursor: store.cursor,
    setCursor: store.setCursor,

    // Settings
    settings: store.settings,
    updateSettings: store.updateSettings,

    // Search
    search: store.search,
    setSearchQuery: store.setSearchQuery,
    toggleSearch: store.toggleSearch,

    // Problems
    problems: store.problems,
    setProblems: store.setProblems,
    addProblem: store.addProblem,
    clearProblems: store.clearProblems,

    // UI
    isCommandPaletteOpen: store.isCommandPaletteOpen,
    isSidebarCollapsed: store.isSidebarCollapsed,
    isBottomPanelVisible: store.isBottomPanelVisible,
    bottomPanelTab: store.bottomPanelTab,
    bottomPanelHeight: store.bottomPanelHeight,
    toggleCommandPalette: store.toggleCommandPalette,
    toggleSidebar: store.toggleSidebar,
    toggleBottomPanel: store.toggleBottomPanel,
    setBottomPanelTab: store.setBottomPanelTab,
    setBottomPanelHeight: store.setBottomPanelHeight,
  };
}
