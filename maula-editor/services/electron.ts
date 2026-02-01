// Electron Shell Service
// VS Code-style desktop application integration

export interface ElectronWindow {
  id: number;
  title: string;
  bounds: WindowBounds;
  state: WindowState;
  focused: boolean;
  fullscreen: boolean;
  maximized: boolean;
  minimized: boolean;
  alwaysOnTop: boolean;
  transparent: boolean;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type WindowState = 'normal' | 'maximized' | 'minimized' | 'fullscreen';

export interface NativeMenu {
  id: string;
  label: string;
  items: NativeMenuItem[];
  enabled: boolean;
}

export interface NativeMenuItem {
  id: string;
  label: string;
  type: 'normal' | 'separator' | 'checkbox' | 'radio' | 'submenu';
  accelerator?: string;
  enabled: boolean;
  checked?: boolean;
  submenu?: NativeMenuItem[];
  click?: () => void;
}

export interface NativeDialog {
  type: 'open' | 'save' | 'message' | 'error' | 'question';
  title: string;
  message?: string;
  detail?: string;
  buttons?: string[];
  defaultPath?: string;
  filters?: FileFilter[];
  properties?: DialogProperty[];
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export type DialogProperty = 
  | 'openFile' 
  | 'openDirectory' 
  | 'multiSelections' 
  | 'showHiddenFiles'
  | 'createDirectory'
  | 'promptToCreate'
  | 'noResolveAliases'
  | 'treatPackageAsDirectory';

export interface NativeNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'low' | 'normal' | 'critical';
  timeoutType?: 'default' | 'never';
  actions?: { type: string; text: string }[];
}

export interface TrayIcon {
  id: string;
  icon: string;
  tooltip: string;
  menu?: NativeMenuItem[];
}

export interface IPCChannel {
  name: string;
  direction: 'main-to-renderer' | 'renderer-to-main' | 'bidirectional';
  handlers: Map<string, (...args: any[]) => any>;
}

export interface SystemInfo {
  platform: NodeJS.Platform;
  arch: string;
  version: string;
  hostname: string;
  username: string;
  homedir: string;
  tmpdir: string;
  cpus: number;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  uptime: number;
}

export interface AppInfo {
  name: string;
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  v8Version: string;
  locale: string;
  isPackaged: boolean;
  appPath: string;
  userDataPath: string;
  logsPath: string;
  tempPath: string;
}

export interface GlobalShortcut {
  accelerator: string;
  callback: () => void;
  registered: boolean;
}

export interface PowerMonitorState {
  onBattery: boolean;
  batteryLevel?: number;
  isCharging?: boolean;
  systemIdleTime: number;
  suspendState: 'active' | 'suspended' | 'locked';
}

export interface ProtocolHandler {
  scheme: string;
  privileges: {
    standard: boolean;
    secure: boolean;
    supportFetchAPI: boolean;
    corsEnabled: boolean;
    stream: boolean;
  };
  handler: (url: string) => void;
}

export interface NativeTheme {
  shouldUseDarkColors: boolean;
  shouldUseHighContrastColors: boolean;
  shouldUseInvertedColorScheme: boolean;
  themeSource: 'system' | 'light' | 'dark';
}

export interface AutoUpdater {
  currentVersion: string;
  updateAvailable: boolean;
  updateDownloaded: boolean;
  updateInfo?: {
    version: string;
    releaseDate: string;
    releaseNotes: string;
  };
  checking: boolean;
  downloading: boolean;
  downloadProgress: number;
}

// Process information for Electron processes
export interface ProcessInfo {
  pid: number;
  type: 'main' | 'renderer' | 'gpu' | 'utility' | 'worker';
  cpu: number;
  memory: number;
  name: string;
}

// Window state object for TechStackPanel
export interface WindowStateInfo {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
  isFocused: boolean;
}

type EventCallback = (event: { type: string; data: any }) => void;

class ElectronService {
  private windows: Map<number, ElectronWindow> = new Map();
  private menus: Map<string, NativeMenu> = new Map();
  private notifications: Map<string, NativeNotification> = new Map();
  private trayIcons: Map<string, TrayIcon> = new Map();
  private ipcChannels: Map<string, IPCChannel> = new Map();
  private shortcuts: Map<string, GlobalShortcut> = new Map();
  private protocolHandlers: Map<string, ProtocolHandler> = new Map();
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private windowIdCounter: number = 1;
  private isElectronEnvironment: boolean = false;
  private nativeTheme: NativeTheme;
  private autoUpdater: AutoUpdater;
  private powerState: PowerMonitorState;

  constructor() {
    this.detectEnvironment();
    this.nativeTheme = this.getDefaultTheme();
    this.autoUpdater = this.getDefaultAutoUpdater();
    this.powerState = this.getDefaultPowerState();
    this.initializeDefaultMenus();
    this.initializeIPC();
  }

  private detectEnvironment(): void {
    // Detect if running in Electron
    this.isElectronEnvironment = 
      typeof window !== 'undefined' && 
      (window as any).process?.type === 'renderer';
  }

  private getDefaultTheme(): NativeTheme {
    const prefersDark = typeof window !== 'undefined' && 
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    
    return {
      shouldUseDarkColors: prefersDark,
      shouldUseHighContrastColors: false,
      shouldUseInvertedColorScheme: false,
      themeSource: 'system',
    };
  }

  private getDefaultAutoUpdater(): AutoUpdater {
    return {
      currentVersion: '1.0.0',
      updateAvailable: false,
      updateDownloaded: false,
      checking: false,
      downloading: false,
      downloadProgress: 0,
    };
  }

  private getDefaultPowerState(): PowerMonitorState {
    return {
      onBattery: false,
      batteryLevel: 100,
      isCharging: true,
      systemIdleTime: 0,
      suspendState: 'active',
    };
  }

  // Window Management
  createWindow(options: Partial<ElectronWindow> = {}): ElectronWindow {
    const id = this.windowIdCounter++;
    const window: ElectronWindow = {
      id,
      title: options.title || 'Untitled',
      bounds: options.bounds || { x: 100, y: 100, width: 1200, height: 800 },
      state: options.state || 'normal',
      focused: true,
      fullscreen: false,
      maximized: false,
      minimized: false,
      alwaysOnTop: false,
      transparent: false,
      ...options,
    };

    this.windows.set(id, window);
    this.emit('windowCreated', window);
    return window;
  }

  getWindow(id: number): ElectronWindow | undefined {
    return this.windows.get(id);
  }

  getAllWindows(): ElectronWindow[] {
    return Array.from(this.windows.values());
  }

  // Get current window state info for TechStackPanel
  getWindowState(): WindowStateInfo {
    const mainWindow = this.windows.get(1) || this.createWindow({ title: 'Main Window' });
    return {
      width: mainWindow.bounds.width,
      height: mainWindow.bounds.height,
      x: mainWindow.bounds.x,
      y: mainWindow.bounds.y,
      isMaximized: mainWindow.maximized,
      isMinimized: mainWindow.minimized,
      isFullScreen: mainWindow.fullscreen,
      isFocused: mainWindow.focused,
    };
  }

  // Get simulated process information for TechStackPanel
  getProcesses(): ProcessInfo[] {
    return [
      { pid: 1, type: 'main', cpu: 2.5, memory: 150 * 1024 * 1024, name: 'Main Process' },
      { pid: 2, type: 'renderer', cpu: 8.3, memory: 280 * 1024 * 1024, name: 'Editor Window' },
      { pid: 3, type: 'gpu', cpu: 1.2, memory: 85 * 1024 * 1024, name: 'GPU Process' },
      { pid: 4, type: 'utility', cpu: 0.5, memory: 45 * 1024 * 1024, name: 'Utility Process' },
    ];
  }

  // Window control methods for TechStackPanel
  minimizeWindow(): void {
    const mainWindow = this.windows.get(1);
    if (mainWindow) {
      mainWindow.minimized = true;
      mainWindow.state = 'minimized';
      this.emit('windowMinimized', mainWindow);
    }
  }

  maximizeWindow(): void {
    const mainWindow = this.windows.get(1);
    if (mainWindow) {
      mainWindow.maximized = !mainWindow.maximized;
      mainWindow.state = mainWindow.maximized ? 'maximized' : 'normal';
      this.emit('windowMaximized', mainWindow);
    }
  }

  toggleFullScreen(): void {
    const mainWindow = this.windows.get(1);
    if (mainWindow) {
      mainWindow.fullscreen = !mainWindow.fullscreen;
      mainWindow.state = mainWindow.fullscreen ? 'fullscreen' : 'normal';
      this.emit('windowFullscreen', mainWindow);
    }
  }

  closeWindow(id: number): void {
    const window = this.windows.get(id);
    if (window) {
      this.windows.delete(id);
      this.emit('windowClosed', { id });
    }
  }

  minimizeWindow(id: number): void {
    const window = this.windows.get(id);
    if (window) {
      window.minimized = true;
      window.state = 'minimized';
      this.emit('windowMinimized', window);
    }
  }

  maximizeWindow(id: number): void {
    const window = this.windows.get(id);
    if (window) {
      window.maximized = true;
      window.state = 'maximized';
      this.emit('windowMaximized', window);
    }
  }

  restoreWindow(id: number): void {
    const window = this.windows.get(id);
    if (window) {
      window.maximized = false;
      window.minimized = false;
      window.state = 'normal';
      this.emit('windowRestored', window);
    }
  }

  setFullscreen(id: number, fullscreen: boolean): void {
    const window = this.windows.get(id);
    if (window) {
      window.fullscreen = fullscreen;
      window.state = fullscreen ? 'fullscreen' : 'normal';
      this.emit('windowFullscreen', { window, fullscreen });
    }
  }

  setBounds(id: number, bounds: Partial<WindowBounds>): void {
    const window = this.windows.get(id);
    if (window) {
      window.bounds = { ...window.bounds, ...bounds };
      this.emit('windowBoundsChanged', window);
    }
  }

  // Menu Management
  private initializeDefaultMenus(): void {
    // File Menu
    this.menus.set('file', {
      id: 'file',
      label: 'File',
      enabled: true,
      items: [
        { id: 'new-file', label: 'New File', type: 'normal', accelerator: 'CmdOrCtrl+N', enabled: true },
        { id: 'new-window', label: 'New Window', type: 'normal', accelerator: 'CmdOrCtrl+Shift+N', enabled: true },
        { id: 'sep1', label: '', type: 'separator', enabled: true },
        { id: 'open-file', label: 'Open File...', type: 'normal', accelerator: 'CmdOrCtrl+O', enabled: true },
        { id: 'open-folder', label: 'Open Folder...', type: 'normal', accelerator: 'CmdOrCtrl+K CmdOrCtrl+O', enabled: true },
        { id: 'open-recent', label: 'Open Recent', type: 'submenu', enabled: true, submenu: [] },
        { id: 'sep2', label: '', type: 'separator', enabled: true },
        { id: 'save', label: 'Save', type: 'normal', accelerator: 'CmdOrCtrl+S', enabled: true },
        { id: 'save-as', label: 'Save As...', type: 'normal', accelerator: 'CmdOrCtrl+Shift+S', enabled: true },
        { id: 'save-all', label: 'Save All', type: 'normal', accelerator: 'CmdOrCtrl+K S', enabled: true },
        { id: 'sep3', label: '', type: 'separator', enabled: true },
        { id: 'auto-save', label: 'Auto Save', type: 'checkbox', enabled: true, checked: true },
        { id: 'sep4', label: '', type: 'separator', enabled: true },
        { id: 'preferences', label: 'Preferences', type: 'submenu', enabled: true, submenu: [
          { id: 'settings', label: 'Settings', type: 'normal', accelerator: 'CmdOrCtrl+,', enabled: true },
          { id: 'keyboard-shortcuts', label: 'Keyboard Shortcuts', type: 'normal', accelerator: 'CmdOrCtrl+K CmdOrCtrl+S', enabled: true },
          { id: 'keymaps', label: 'Keymaps', type: 'normal', enabled: true },
          { id: 'user-snippets', label: 'User Snippets', type: 'normal', enabled: true },
        ]},
        { id: 'sep5', label: '', type: 'separator', enabled: true },
        { id: 'close-editor', label: 'Close Editor', type: 'normal', accelerator: 'CmdOrCtrl+W', enabled: true },
        { id: 'close-folder', label: 'Close Folder', type: 'normal', accelerator: 'CmdOrCtrl+K F', enabled: true },
        { id: 'close-window', label: 'Close Window', type: 'normal', accelerator: 'CmdOrCtrl+Shift+W', enabled: true },
        { id: 'sep6', label: '', type: 'separator', enabled: true },
        { id: 'exit', label: 'Exit', type: 'normal', accelerator: 'CmdOrCtrl+Q', enabled: true },
      ],
    });

    // Edit Menu
    this.menus.set('edit', {
      id: 'edit',
      label: 'Edit',
      enabled: true,
      items: [
        { id: 'undo', label: 'Undo', type: 'normal', accelerator: 'CmdOrCtrl+Z', enabled: true },
        { id: 'redo', label: 'Redo', type: 'normal', accelerator: 'CmdOrCtrl+Shift+Z', enabled: true },
        { id: 'sep1', label: '', type: 'separator', enabled: true },
        { id: 'cut', label: 'Cut', type: 'normal', accelerator: 'CmdOrCtrl+X', enabled: true },
        { id: 'copy', label: 'Copy', type: 'normal', accelerator: 'CmdOrCtrl+C', enabled: true },
        { id: 'paste', label: 'Paste', type: 'normal', accelerator: 'CmdOrCtrl+V', enabled: true },
        { id: 'sep2', label: '', type: 'separator', enabled: true },
        { id: 'find', label: 'Find', type: 'normal', accelerator: 'CmdOrCtrl+F', enabled: true },
        { id: 'replace', label: 'Replace', type: 'normal', accelerator: 'CmdOrCtrl+H', enabled: true },
        { id: 'sep3', label: '', type: 'separator', enabled: true },
        { id: 'find-in-files', label: 'Find in Files', type: 'normal', accelerator: 'CmdOrCtrl+Shift+F', enabled: true },
        { id: 'replace-in-files', label: 'Replace in Files', type: 'normal', accelerator: 'CmdOrCtrl+Shift+H', enabled: true },
      ],
    });

    // View Menu
    this.menus.set('view', {
      id: 'view',
      label: 'View',
      enabled: true,
      items: [
        { id: 'command-palette', label: 'Command Palette...', type: 'normal', accelerator: 'CmdOrCtrl+Shift+P', enabled: true },
        { id: 'open-view', label: 'Open View...', type: 'normal', enabled: true },
        { id: 'sep1', label: '', type: 'separator', enabled: true },
        { id: 'appearance', label: 'Appearance', type: 'submenu', enabled: true, submenu: [
          { id: 'fullscreen', label: 'Full Screen', type: 'checkbox', accelerator: 'F11', enabled: true, checked: false },
          { id: 'zen-mode', label: 'Zen Mode', type: 'checkbox', accelerator: 'CmdOrCtrl+K Z', enabled: true, checked: false },
          { id: 'centered-layout', label: 'Centered Layout', type: 'checkbox', enabled: true, checked: false },
        ]},
        { id: 'sep2', label: '', type: 'separator', enabled: true },
        { id: 'explorer', label: 'Explorer', type: 'normal', accelerator: 'CmdOrCtrl+Shift+E', enabled: true },
        { id: 'search', label: 'Search', type: 'normal', accelerator: 'CmdOrCtrl+Shift+F', enabled: true },
        { id: 'scm', label: 'Source Control', type: 'normal', accelerator: 'CmdOrCtrl+Shift+G', enabled: true },
        { id: 'debug', label: 'Run and Debug', type: 'normal', accelerator: 'CmdOrCtrl+Shift+D', enabled: true },
        { id: 'extensions', label: 'Extensions', type: 'normal', accelerator: 'CmdOrCtrl+Shift+X', enabled: true },
        { id: 'sep3', label: '', type: 'separator', enabled: true },
        { id: 'problems', label: 'Problems', type: 'normal', accelerator: 'CmdOrCtrl+Shift+M', enabled: true },
        { id: 'output', label: 'Output', type: 'normal', accelerator: 'CmdOrCtrl+Shift+U', enabled: true },
        { id: 'debug-console', label: 'Debug Console', type: 'normal', accelerator: 'CmdOrCtrl+Shift+Y', enabled: true },
        { id: 'terminal', label: 'Terminal', type: 'normal', accelerator: 'CmdOrCtrl+`', enabled: true },
      ],
    });

    // Terminal Menu
    this.menus.set('terminal', {
      id: 'terminal',
      label: 'Terminal',
      enabled: true,
      items: [
        { id: 'new-terminal', label: 'New Terminal', type: 'normal', accelerator: 'CmdOrCtrl+Shift+`', enabled: true },
        { id: 'split-terminal', label: 'Split Terminal', type: 'normal', enabled: true },
        { id: 'sep1', label: '', type: 'separator', enabled: true },
        { id: 'run-task', label: 'Run Task...', type: 'normal', enabled: true },
        { id: 'run-build-task', label: 'Run Build Task...', type: 'normal', accelerator: 'CmdOrCtrl+Shift+B', enabled: true },
        { id: 'run-active-file', label: 'Run Active File', type: 'normal', enabled: true },
        { id: 'sep2', label: '', type: 'separator', enabled: true },
        { id: 'configure-tasks', label: 'Configure Tasks...', type: 'normal', enabled: true },
        { id: 'configure-default-build', label: 'Configure Default Build Task...', type: 'normal', enabled: true },
      ],
    });

    // Help Menu
    this.menus.set('help', {
      id: 'help',
      label: 'Help',
      enabled: true,
      items: [
        { id: 'welcome', label: 'Welcome', type: 'normal', enabled: true },
        { id: 'show-all-commands', label: 'Show All Commands', type: 'normal', accelerator: 'CmdOrCtrl+Shift+P', enabled: true },
        { id: 'documentation', label: 'Documentation', type: 'normal', enabled: true },
        { id: 'release-notes', label: 'Release Notes', type: 'normal', enabled: true },
        { id: 'sep1', label: '', type: 'separator', enabled: true },
        { id: 'keyboard-shortcuts-ref', label: 'Keyboard Shortcuts Reference', type: 'normal', accelerator: 'CmdOrCtrl+K CmdOrCtrl+R', enabled: true },
        { id: 'interactive-playground', label: 'Editor Playground', type: 'normal', enabled: true },
        { id: 'sep2', label: '', type: 'separator', enabled: true },
        { id: 'report-issue', label: 'Report Issue', type: 'normal', enabled: true },
        { id: 'sep3', label: '', type: 'separator', enabled: true },
        { id: 'toggle-dev-tools', label: 'Toggle Developer Tools', type: 'normal', accelerator: 'CmdOrCtrl+Shift+I', enabled: true },
        { id: 'sep4', label: '', type: 'separator', enabled: true },
        { id: 'about', label: 'About', type: 'normal', enabled: true },
      ],
    });
  }

  getMenu(id: string): NativeMenu | undefined {
    return this.menus.get(id);
  }

  getAllMenus(): NativeMenu[] {
    return Array.from(this.menus.values());
  }

  setMenuItemChecked(menuId: string, itemId: string, checked: boolean): void {
    const menu = this.menus.get(menuId);
    if (menu) {
      const item = this.findMenuItem(menu.items, itemId);
      if (item && item.type === 'checkbox') {
        item.checked = checked;
        this.emit('menuItemChanged', { menuId, itemId, checked });
      }
    }
  }

  private findMenuItem(items: NativeMenuItem[], id: string): NativeMenuItem | undefined {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.submenu) {
        const found = this.findMenuItem(item.submenu, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  // IPC Communication
  private initializeIPC(): void {
    // Define standard IPC channels
    const channels = [
      { name: 'app:ready', direction: 'main-to-renderer' as const },
      { name: 'window:focus', direction: 'main-to-renderer' as const },
      { name: 'window:blur', direction: 'main-to-renderer' as const },
      { name: 'file:open', direction: 'bidirectional' as const },
      { name: 'file:save', direction: 'renderer-to-main' as const },
      { name: 'dialog:show', direction: 'renderer-to-main' as const },
      { name: 'notification:show', direction: 'renderer-to-main' as const },
      { name: 'shell:openExternal', direction: 'renderer-to-main' as const },
      { name: 'clipboard:read', direction: 'renderer-to-main' as const },
      { name: 'clipboard:write', direction: 'renderer-to-main' as const },
    ];

    channels.forEach(ch => {
      this.ipcChannels.set(ch.name, {
        name: ch.name,
        direction: ch.direction,
        handlers: new Map(),
      });
    });
  }

  ipcSend(channel: string, ...args: any[]): void {
    const ch = this.ipcChannels.get(channel);
    if (ch) {
      this.emit('ipc:send', { channel, args });
    }
  }

  ipcOn(channel: string, handler: (...args: any[]) => any): () => void {
    const ch = this.ipcChannels.get(channel);
    if (ch) {
      const handlerId = Math.random().toString(36).substr(2, 9);
      ch.handlers.set(handlerId, handler);
      return () => ch.handlers.delete(handlerId);
    }
    return () => {};
  }

  ipcInvoke(channel: string, ...args: any[]): Promise<any> {
    return new Promise((resolve) => {
      this.emit('ipc:invoke', { channel, args });
      // Simulate async response
      setTimeout(() => resolve({ success: true, channel }), 100);
    });
  }

  // Dialogs
  async showOpenDialog(options: NativeDialog): Promise<{ canceled: boolean; filePaths: string[] }> {
    this.emit('dialog:open', options);
    // Simulate dialog result
    return {
      canceled: false,
      filePaths: ['/path/to/selected/file.ts'],
    };
  }

  async showSaveDialog(options: NativeDialog): Promise<{ canceled: boolean; filePath?: string }> {
    this.emit('dialog:save', options);
    return {
      canceled: false,
      filePath: '/path/to/save/file.ts',
    };
  }

  async showMessageBox(options: NativeDialog): Promise<{ response: number; checkboxChecked: boolean }> {
    this.emit('dialog:message', options);
    return { response: 0, checkboxChecked: false };
  }

  // Notifications
  showNotification(notification: Omit<NativeNotification, 'id'>): string {
    const id = `notif_${Date.now()}`;
    const notif: NativeNotification = { id, ...notification };
    this.notifications.set(id, notif);
    this.emit('notification:show', notif);
    return id;
  }

  closeNotification(id: string): void {
    this.notifications.delete(id);
    this.emit('notification:close', { id });
  }

  // Tray
  createTray(tray: Omit<TrayIcon, 'id'>): string {
    const id = `tray_${Date.now()}`;
    const trayIcon: TrayIcon = { id, ...tray };
    this.trayIcons.set(id, trayIcon);
    this.emit('tray:created', trayIcon);
    return id;
  }

  updateTray(id: string, updates: Partial<TrayIcon>): void {
    const tray = this.trayIcons.get(id);
    if (tray) {
      Object.assign(tray, updates);
      this.emit('tray:updated', tray);
    }
  }

  destroyTray(id: string): void {
    this.trayIcons.delete(id);
    this.emit('tray:destroyed', { id });
  }

  // Global Shortcuts
  registerShortcut(accelerator: string, callback: () => void): boolean {
    if (this.shortcuts.has(accelerator)) return false;
    
    const shortcut: GlobalShortcut = {
      accelerator,
      callback,
      registered: true,
    };
    this.shortcuts.set(accelerator, shortcut);
    this.emit('shortcut:registered', { accelerator });
    return true;
  }

  unregisterShortcut(accelerator: string): void {
    this.shortcuts.delete(accelerator);
    this.emit('shortcut:unregistered', { accelerator });
  }

  unregisterAllShortcuts(): void {
    this.shortcuts.clear();
    this.emit('shortcut:unregisteredAll', {});
  }

  // Protocol Handlers
  registerProtocol(scheme: string, handler: (url: string) => void): void {
    const protocol: ProtocolHandler = {
      scheme,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: false,
        stream: true,
      },
      handler,
    };
    this.protocolHandlers.set(scheme, protocol);
    this.emit('protocol:registered', { scheme });
  }

  // Native Theme
  getNativeTheme(): NativeTheme {
    return { ...this.nativeTheme };
  }

  setThemeSource(source: NativeTheme['themeSource']): void {
    this.nativeTheme.themeSource = source;
    this.nativeTheme.shouldUseDarkColors = 
      source === 'dark' || 
      (source === 'system' && typeof window !== 'undefined' && 
        window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    this.emit('theme:changed', this.nativeTheme);
  }

  // Power Monitor
  getPowerState(): PowerMonitorState {
    return { ...this.powerState };
  }

  // Auto Updater
  getAutoUpdater(): AutoUpdater {
    return { ...this.autoUpdater };
  }

  async checkForUpdates(): Promise<void> {
    this.autoUpdater.checking = true;
    this.emit('updater:checking', {});
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.autoUpdater.checking = false;
    this.autoUpdater.updateAvailable = Math.random() > 0.5;
    
    if (this.autoUpdater.updateAvailable) {
      this.autoUpdater.updateInfo = {
        version: '1.1.0',
        releaseDate: new Date().toISOString(),
        releaseNotes: '- Bug fixes\n- Performance improvements\n- New features',
      };
      this.emit('updater:available', this.autoUpdater.updateInfo);
    } else {
      this.emit('updater:not-available', {});
    }
  }

  async downloadUpdate(): Promise<void> {
    if (!this.autoUpdater.updateAvailable) return;
    
    this.autoUpdater.downloading = true;
    this.emit('updater:downloading', {});
    
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.autoUpdater.downloadProgress = progress;
      this.emit('updater:progress', { progress });
    }
    
    this.autoUpdater.downloading = false;
    this.autoUpdater.updateDownloaded = true;
    this.emit('updater:downloaded', {});
  }

  quitAndInstall(): void {
    this.emit('updater:installing', {});
    // In real Electron, this would restart the app
  }

  // System Info
  getSystemInfo(): SystemInfo {
    return {
      platform: typeof process !== 'undefined' ? (process.platform as NodeJS.Platform) : 'linux',
      arch: typeof process !== 'undefined' ? process.arch : 'x64',
      version: '22.04',
      hostname: 'dev-workstation',
      username: 'developer',
      homedir: '/home/developer',
      tmpdir: '/tmp',
      cpus: 8,
      memory: {
        total: 16 * 1024 * 1024 * 1024, // 16GB
        free: 8 * 1024 * 1024 * 1024,   // 8GB
        used: 8 * 1024 * 1024 * 1024,   // 8GB
      },
      uptime: 86400, // 1 day
    };
  }

  getAppInfo(): AppInfo {
    return {
      name: 'VS Code Clone',
      version: '1.0.0',
      electronVersion: '28.0.0',
      chromeVersion: '120.0.0.0',
      nodeVersion: '20.10.0',
      v8Version: '12.0.267.8',
      locale: 'en-US',
      isPackaged: false,
      appPath: '/app',
      userDataPath: '/home/user/.config/vscode-clone',
      logsPath: '/home/user/.config/vscode-clone/logs',
      tempPath: '/tmp/vscode-clone',
    };
  }

  // Shell operations
  openExternal(url: string): Promise<void> {
    this.emit('shell:openExternal', { url });
    return Promise.resolve();
  }

  openPath(path: string): Promise<string> {
    this.emit('shell:openPath', { path });
    return Promise.resolve('');
  }

  showItemInFolder(path: string): void {
    this.emit('shell:showItemInFolder', { path });
  }

  // Clipboard
  readClipboardText(): string {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      // Modern browsers
      return '';
    }
    return '';
  }

  writeClipboardText(text: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    this.emit('clipboard:write', { text });
  }

  // Check if in Electron
  isElectron(): boolean {
    return this.isElectronEnvironment;
  }

  // Event System
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb({ type: event, data }));
    this.listeners.get('*')?.forEach(cb => cb({ type: event, data }));
  }
}

export const electronService = new ElectronService();
export default electronService;
