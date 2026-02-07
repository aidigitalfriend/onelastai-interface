/**
 * Editor Store — Zustand state for the code editor
 * Tracks tabs, cursors, selections, theme, and settings
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface EditorTab {
  path: string;
  name: string;
  language: string;
  isDirty: boolean;
  isPinned: boolean;
  scrollPosition?: number;
}

export interface EditorTheme {
  id: string;
  name: string;
  type: 'dark' | 'light';
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  bracketPairColorization: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  formatOnSave: boolean;
  theme: string;
}

export interface EditorCursorState {
  line: number;
  column: number;
  selectionStart?: { line: number; column: number };
  selectionEnd?: { line: number; column: number };
}

export interface SearchState {
  query: string;
  replaceWith: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  isWholeWord: boolean;
  isOpen: boolean;
  matchCount: number;
  currentMatch: number;
  results: Array<{ path: string; line: number; column: number; text: string }>;
}

export interface ProblemItem {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column: number;
  source?: string;
}

interface EditorStoreState {
  // Tabs
  tabs: EditorTab[];
  activeTabPath: string | null;

  // Cursor
  cursor: EditorCursorState;
  selections: Map<string, EditorCursorState>;

  // Settings
  settings: EditorSettings;

  // Search
  search: SearchState;

  // Problems
  problems: ProblemItem[];
  problemsVisible: boolean;

  // UI state
  isCommandPaletteOpen: boolean;
  isSidebarCollapsed: boolean;
  bottomPanelHeight: number;
  bottomPanelTab: 'terminal' | 'problems' | 'output' | 'console';
  isBottomPanelVisible: boolean;
}

interface EditorStoreActions {
  // Tabs
  openTab: (path: string, name: string, language?: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  pinTab: (path: string) => void;
  unpinTab: (path: string) => void;
  markTabDirty: (path: string, dirty: boolean) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (exceptPath: string) => void;

  // Cursor
  setCursor: (cursor: EditorCursorState) => void;
  setSelectionForFile: (path: string, cursor: EditorCursorState) => void;

  // Settings
  updateSettings: (partial: Partial<EditorSettings>) => void;
  resetSettings: () => void;

  // Search
  setSearchQuery: (query: string) => void;
  setReplaceWith: (text: string) => void;
  toggleSearch: () => void;
  setSearchResults: (results: SearchState['results'], matchCount: number) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  updateSearchFlags: (flags: Partial<Pick<SearchState, 'isRegex' | 'isCaseSensitive' | 'isWholeWord'>>) => void;

  // Problems
  setProblems: (problems: ProblemItem[]) => void;
  addProblem: (problem: ProblemItem) => void;
  clearProblems: () => void;
  toggleProblems: () => void;

  // UI
  toggleCommandPalette: () => void;
  toggleSidebar: () => void;
  setBottomPanelHeight: (h: number) => void;
  setBottomPanelTab: (tab: EditorStoreState['bottomPanelTab']) => void;
  toggleBottomPanel: () => void;
}

const defaultSettings: EditorSettings = {
  fontSize: 13,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
  lineNumbers: 'on',
  bracketPairColorization: true,
  autoSave: true,
  autoSaveDelay: 1000,
  formatOnSave: true,
  theme: 'gencraft-dark',
};

const defaultSearch: SearchState = {
  query: '',
  replaceWith: '',
  isRegex: false,
  isCaseSensitive: false,
  isWholeWord: false,
  isOpen: false,
  matchCount: 0,
  currentMatch: 0,
  results: [],
};

export const useEditorSettingsStore = create<EditorStoreState & EditorStoreActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    tabs: [],
    activeTabPath: null,
    cursor: { line: 1, column: 1 },
    selections: new Map(),
    settings: defaultSettings,
    search: defaultSearch,
    problems: [],
    problemsVisible: false,
    isCommandPaletteOpen: false,
    isSidebarCollapsed: false,
    bottomPanelHeight: 200,
    bottomPanelTab: 'terminal',
    isBottomPanelVisible: false,

    // Tab actions
    openTab: (path, name, language = 'plaintext') => {
      const { tabs } = get();
      if (!tabs.find((t) => t.path === path)) {
        set({ tabs: [...tabs, { path, name, language, isDirty: false, isPinned: false }] });
      }
      set({ activeTabPath: path });
    },
    closeTab: (path) =>
      set((s) => {
        const newTabs = s.tabs.filter((t) => t.path !== path);
        const newActive = s.activeTabPath === path
          ? newTabs[Math.max(0, s.tabs.findIndex((t) => t.path === path) - 1)]?.path || null
          : s.activeTabPath;
        return { tabs: newTabs, activeTabPath: newActive };
      }),
    setActiveTab: (path) => set({ activeTabPath: path }),
    pinTab: (path) =>
      set((s) => ({ tabs: s.tabs.map((t) => (t.path === path ? { ...t, isPinned: true } : t)) })),
    unpinTab: (path) =>
      set((s) => ({ tabs: s.tabs.map((t) => (t.path === path ? { ...t, isPinned: false } : t)) })),
    markTabDirty: (path, dirty) =>
      set((s) => ({ tabs: s.tabs.map((t) => (t.path === path ? { ...t, isDirty: dirty } : t)) })),
    reorderTabs: (from, to) =>
      set((s) => {
        const newTabs = [...s.tabs];
        const [moved] = newTabs.splice(from, 1);
        newTabs.splice(to, 0, moved);
        return { tabs: newTabs };
      }),
    closeAllTabs: () => set({ tabs: [], activeTabPath: null }),
    closeOtherTabs: (exceptPath) =>
      set((s) => ({
        tabs: s.tabs.filter((t) => t.path === exceptPath || t.isPinned),
        activeTabPath: exceptPath,
      })),

    // Cursor
    setCursor: (cursor) => set({ cursor }),
    setSelectionForFile: (path, cursor) =>
      set((s) => {
        const newMap = new Map(s.selections);
        newMap.set(path, cursor);
        return { selections: newMap };
      }),

    // Settings
    updateSettings: (partial) =>
      set((s) => ({ settings: { ...s.settings, ...partial } })),
    resetSettings: () => set({ settings: defaultSettings }),

    // Search
    setSearchQuery: (query) => set((s) => ({ search: { ...s.search, query } })),
    setReplaceWith: (text) => set((s) => ({ search: { ...s.search, replaceWith: text } })),
    toggleSearch: () => set((s) => ({ search: { ...s.search, isOpen: !s.search.isOpen } })),
    setSearchResults: (results, matchCount) =>
      set((s) => ({ search: { ...s.search, results, matchCount, currentMatch: 0 } })),
    nextMatch: () =>
      set((s) => ({ search: { ...s.search, currentMatch: Math.min(s.search.currentMatch + 1, s.search.matchCount - 1) } })),
    prevMatch: () =>
      set((s) => ({ search: { ...s.search, currentMatch: Math.max(s.search.currentMatch - 1, 0) } })),
    updateSearchFlags: (flags) =>
      set((s) => ({ search: { ...s.search, ...flags } })),

    // Problems
    setProblems: (problems) => set({ problems }),
    addProblem: (problem) => set((s) => ({ problems: [...s.problems, problem] })),
    clearProblems: () => set({ problems: [] }),
    toggleProblems: () => set((s) => ({ problemsVisible: !s.problemsVisible })),

    // UI
    toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
    toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
    setBottomPanelHeight: (h) => set({ bottomPanelHeight: h }),
    setBottomPanelTab: (tab) => set({ bottomPanelTab: tab, isBottomPanelVisible: true }),
    toggleBottomPanel: () => set((s) => ({ isBottomPanelVisible: !s.isBottomPanelVisible })),
  }))
);
