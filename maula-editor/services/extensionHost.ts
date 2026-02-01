/**
 * Extension Host Service
 * 
 * Manages extension lifecycle with sandboxed execution:
 * - Web Worker sandbox for browser-side isolation
 * - Message-based event bridge
 * - Hot reload support
 * - Failure isolation
 */

import { extensionEvents, extensionAPI } from './extensions';

// Types
export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  main: string;
  permissions: string[];
  activationEvents?: string[];
}

export interface ExtensionContext {
  extensionId: string;
  subscriptions: Array<{ dispose: () => void }>;
  workspaceState: Map<string, any>;
  globalState: Map<string, any>;
}

export interface ExtensionRuntime {
  id: string;
  worker: Worker | null;
  context: ExtensionContext;
  status: 'inactive' | 'activating' | 'active' | 'error' | 'disposed';
  error?: string;
}

export type ExtensionStatus = 'inactive' | 'activating' | 'active' | 'error' | 'disposed';

// Extension Host manages all extension runtimes
class ExtensionHostService {
  private runtimes = new Map<string, ExtensionRuntime>();
  private messageHandlers = new Map<string, (data: any) => any>();
  private editorRef: any = null;
  private terminalRef: any = null;
  private storeRef: any = null;
  private pendingCallbacks = new Map<string, { resolve: Function; reject: Function }>();
  private callbackId = 0;

  constructor() {
    this.setupMessageHandlers();
    this.setupEventBridge();
  }

  // Register editor reference for API calls
  setEditorRef(editor: any) {
    this.editorRef = editor;
  }

  // Register terminal reference
  setTerminalRef(terminal: any) {
    this.terminalRef = terminal;
  }

  // Register store reference
  setStoreRef(store: any) {
    this.storeRef = store;
  }

  // Setup handlers for messages from extensions
  private setupMessageHandlers() {
    // Editor API handlers
    this.messageHandlers.set('editor.getContent', () => {
      if (this.editorRef) {
        return this.editorRef.getValue?.() || '';
      }
      return '';
    });

    this.messageHandlers.set('editor.setContent', (data: { content: string }) => {
      if (this.editorRef) {
        this.editorRef.setValue?.(data.content);
      }
    });

    this.messageHandlers.set('editor.getSelection', () => {
      if (this.editorRef) {
        const selection = this.editorRef.getSelection?.();
        if (selection) {
          const model = this.editorRef.getModel?.();
          if (model) {
            return {
              start: model.getOffsetAt(selection.getStartPosition()),
              end: model.getOffsetAt(selection.getEndPosition()),
              text: model.getValueInRange(selection)
            };
          }
        }
      }
      return null;
    });

    this.messageHandlers.set('editor.insertText', (data: { text: string; position?: any }) => {
      if (this.editorRef) {
        const selection = this.editorRef.getSelection?.();
        if (selection) {
          this.editorRef.executeEdits?.('extension', [{
            range: selection,
            text: data.text,
            forceMoveMarkers: true
          }]);
        }
      }
    });

    this.messageHandlers.set('editor.replaceSelection', (data: { text: string }) => {
      if (this.editorRef) {
        const selection = this.editorRef.getSelection?.();
        if (selection) {
          this.editorRef.executeEdits?.('extension', [{
            range: selection,
            text: data.text,
            forceMoveMarkers: true
          }]);
        }
      }
    });

    this.messageHandlers.set('editor.format', () => {
      if (this.editorRef) {
        this.editorRef.getAction?.('editor.action.formatDocument')?.run();
      }
    });

    this.messageHandlers.set('editor.addDecoration', (data: { range: any; options: any }) => {
      if (this.editorRef) {
        return this.editorRef.deltaDecorations?.([], [{
          range: data.range,
          options: data.options
        }]);
      }
      return [];
    });

    this.messageHandlers.set('editor.removeDecoration', (data: { ids: string[] }) => {
      if (this.editorRef) {
        this.editorRef.deltaDecorations?.(data.ids, []);
      }
    });

    // Terminal API handlers
    this.messageHandlers.set('terminal.execute', (data: { command: string }) => {
      extensionEvents.emit('terminal:execute', data.command);
    });

    this.messageHandlers.set('terminal.write', (data: { text: string }) => {
      extensionEvents.emit('terminal:write', data.text);
    });

    // UI API handlers
    this.messageHandlers.set('ui.showNotification', (data: { message: string; type: string }) => {
      extensionEvents.emit('ui:notification', data.message, data.type);
    });

    this.messageHandlers.set('ui.showQuickPick', (data: { items: string[]; options?: any }) => {
      // Emit event for UI to handle
      return new Promise((resolve) => {
        extensionEvents.emit('ui:quickPick', data.items, data.options, resolve);
      });
    });

    this.messageHandlers.set('ui.showInputBox', (data: { options?: any }) => {
      return new Promise((resolve) => {
        extensionEvents.emit('ui:inputBox', data.options, resolve);
      });
    });

    // File API handlers
    this.messageHandlers.set('files.read', (data: { path: string }) => {
      if (this.storeRef) {
        const files = this.storeRef.getState().files;
        const findFile = (nodes: any[], path: string): any => {
          for (const node of nodes) {
            if (node.path === path) return node;
            if (node.children) {
              const found = findFile(node.children, path);
              if (found) return found;
            }
          }
          return null;
        };
        const file = findFile(files, data.path);
        return file?.content || null;
      }
      return null;
    });

    this.messageHandlers.set('files.write', (data: { path: string; content: string }) => {
      if (this.storeRef) {
        this.storeRef.getState().updateFileContent?.(data.path, data.content);
      }
    });

    this.messageHandlers.set('files.list', (data: { path: string }) => {
      if (this.storeRef) {
        const files = this.storeRef.getState().files;
        const findFolder = (nodes: any[], path: string): any[] => {
          for (const node of nodes) {
            if (node.path === path && node.children) return node.children.map((n: any) => n.path);
            if (node.children) {
              const found = findFolder(node.children, path);
              if (found.length) return found;
            }
          }
          return [];
        };
        return findFolder(files, data.path);
      }
      return [];
    });

    // Storage API handlers
    this.messageHandlers.set('storage.get', (data: { key: string; extensionId: string }) => {
      const stored = localStorage.getItem(`ext:${data.extensionId}:${data.key}`);
      return stored ? JSON.parse(stored) : null;
    });

    this.messageHandlers.set('storage.set', (data: { key: string; value: any; extensionId: string }) => {
      localStorage.setItem(`ext:${data.extensionId}:${data.key}`, JSON.stringify(data.value));
    });
  }

  // Setup event bridge to forward editor events to extensions
  private setupEventBridge() {
    // Forward text changes to extensions
    extensionEvents.on('editor:textChanged', (content: string, changes: any) => {
      this.broadcastToExtensions('onTextChange', { content, changes });
    });

    // Forward selection changes
    extensionEvents.on('editor:selectionChanged', (selection: any) => {
      this.broadcastToExtensions('onSelectionChange', { selection });
    });

    // Forward file events
    extensionEvents.on('file:opened', (file: any) => {
      this.broadcastToExtensions('onFileOpen', { file });
    });

    extensionEvents.on('file:saved', (file: any) => {
      this.broadcastToExtensions('onFileSave', { file });
    });

    extensionEvents.on('file:closed', (file: any) => {
      this.broadcastToExtensions('onFileClose', { file });
    });
  }

  // Broadcast event to all active extensions
  private broadcastToExtensions(event: string, data: any) {
    this.runtimes.forEach((runtime) => {
      if (runtime.status === 'active' && runtime.worker) {
        runtime.worker.postMessage({
          type: 'event',
          event,
          data
        });
      }
    });
  }

  // Create sandboxed runtime for extension
  async activateExtension(manifest: ExtensionManifest): Promise<boolean> {
    const { id } = manifest;

    // Check if already active
    if (this.runtimes.has(id) && this.runtimes.get(id)!.status === 'active') {
      console.log(`[ExtensionHost] Extension ${id} already active`);
      return true;
    }

    console.log(`[ExtensionHost] Activating extension: ${id}`);

    // Create context
    const context: ExtensionContext = {
      extensionId: id,
      subscriptions: [],
      workspaceState: new Map(),
      globalState: new Map()
    };

    // Create runtime
    const runtime: ExtensionRuntime = {
      id,
      worker: null,
      context,
      status: 'activating'
    };

    this.runtimes.set(id, runtime);

    try {
      // Create Web Worker with sandboxed code
      const workerCode = this.createWorkerCode(manifest);
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      const worker = new Worker(workerUrl);
      runtime.worker = worker;

      // Setup message handler
      worker.onmessage = async (e) => {
        const { type, callId, method, data } = e.data;

        if (type === 'api-call') {
          // Handle API call from extension
          const handler = this.messageHandlers.get(method);
          if (handler) {
            try {
              const result = await handler(data);
              worker.postMessage({ type: 'api-response', callId, result });
            } catch (error: any) {
              worker.postMessage({ type: 'api-response', callId, error: error.message });
            }
          } else {
            worker.postMessage({ type: 'api-response', callId, error: `Unknown method: ${method}` });
          }
        } else if (type === 'log') {
          console.log(`[${id}]`, ...data.args);
        } else if (type === 'error') {
          console.error(`[${id}] Error:`, data.message);
          extensionEvents.emit('extension:error', { extensionId: id, error: data.message });
        } else if (type === 'activated') {
          runtime.status = 'active';
          console.log(`[ExtensionHost] Extension ${id} activated successfully`);
          extensionEvents.emit('extension:activated', { extensionId: id });
        } else if (type === 'command-registered') {
          extensionEvents.emit('extension:commandRegistered', { 
            extensionId: id, 
            commandId: data.commandId,
            label: data.label 
          });
        }
      };

      worker.onerror = (error) => {
        console.error(`[ExtensionHost] Worker error for ${id}:`, error);
        runtime.status = 'error';
        runtime.error = error.message;
        extensionEvents.emit('extension:error', { extensionId: id, error: error.message });
      };

      // Send activation message
      worker.postMessage({
        type: 'activate',
        manifest,
        extensionId: id
      });

      // Cleanup URL
      URL.revokeObjectURL(workerUrl);

      return true;
    } catch (error: any) {
      console.error(`[ExtensionHost] Failed to activate ${id}:`, error);
      runtime.status = 'error';
      runtime.error = error.message;
      return false;
    }
  }

  // Create Web Worker code with sandboxed environment
  private createWorkerCode(manifest: ExtensionManifest): string {
    return `
// Extension Worker Sandbox for: ${manifest.id}
// This code runs in an isolated Web Worker

const extensionId = '${manifest.id}';
const registeredCommands = new Map();
const registeredEventHandlers = new Map();
let callIdCounter = 0;
const pendingCalls = new Map();

// Promisified API call
function callApi(method, data = {}) {
  return new Promise((resolve, reject) => {
    const callId = ++callIdCounter;
    pendingCalls.set(callId, { resolve, reject });
    self.postMessage({ type: 'api-call', callId, method, data: { ...data, extensionId } });
  });
}

// Extension API (exposed to extension code)
const api = {
  editor: {
    getContent: () => callApi('editor.getContent'),
    setContent: (content) => callApi('editor.setContent', { content }),
    getSelection: () => callApi('editor.getSelection'),
    insertText: (text, position) => callApi('editor.insertText', { text, position }),
    replaceSelection: (text) => callApi('editor.replaceSelection', { text }),
    format: () => callApi('editor.format'),
    addDecoration: (range, options) => callApi('editor.addDecoration', { range, options }),
    removeDecoration: (ids) => callApi('editor.removeDecoration', { ids })
  },
  terminal: {
    execute: (command) => callApi('terminal.execute', { command }),
    write: (text) => callApi('terminal.write', { text })
  },
  ui: {
    showNotification: (message, type = 'info') => callApi('ui.showNotification', { message, type }),
    showQuickPick: (items, options) => callApi('ui.showQuickPick', { items, options }),
    showInputBox: (options) => callApi('ui.showInputBox', { options })
  },
  files: {
    read: (path) => callApi('files.read', { path }),
    write: (path, content) => callApi('files.write', { path, content }),
    list: (path) => callApi('files.list', { path })
  },
  storage: {
    get: (key) => callApi('storage.get', { key, extensionId }),
    set: (key, value) => callApi('storage.set', { key, value, extensionId })
  }
};

// Context object for extension
const context = {
  subscriptions: [],
  registerCommand: (commandId, handler, label) => {
    registeredCommands.set(commandId, handler);
    self.postMessage({ type: 'command-registered', data: { commandId, label } });
    return { dispose: () => registeredCommands.delete(commandId) };
  },
  onTextChange: (handler) => {
    registeredEventHandlers.set('onTextChange', handler);
    return { dispose: () => registeredEventHandlers.delete('onTextChange') };
  },
  onSelectionChange: (handler) => {
    registeredEventHandlers.set('onSelectionChange', handler);
    return { dispose: () => registeredEventHandlers.delete('onSelectionChange') };
  },
  onFileOpen: (handler) => {
    registeredEventHandlers.set('onFileOpen', handler);
    return { dispose: () => registeredEventHandlers.delete('onFileOpen') };
  },
  onFileSave: (handler) => {
    registeredEventHandlers.set('onFileSave', handler);
    return { dispose: () => registeredEventHandlers.delete('onFileSave') };
  },
  api
};

// Console proxy
const console = {
  log: (...args) => self.postMessage({ type: 'log', data: { args } }),
  warn: (...args) => self.postMessage({ type: 'log', data: { args: ['[WARN]', ...args] } }),
  error: (...args) => self.postMessage({ type: 'error', data: { message: args.join(' ') } })
};

// Message handler
self.onmessage = async (e) => {
  const { type, callId, result, error, event, data } = e.data;

  if (type === 'activate') {
    try {
      // Execute extension code
      ${manifest.main}
      
      // Call activate if module exports it
      if (typeof module !== 'undefined' && module.exports && module.exports.activate) {
        await module.exports.activate(context);
      }
      
      self.postMessage({ type: 'activated' });
    } catch (err) {
      self.postMessage({ type: 'error', data: { message: err.message || String(err) } });
    }
  } else if (type === 'api-response') {
    const pending = pendingCalls.get(callId);
    if (pending) {
      pendingCalls.delete(callId);
      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    }
  } else if (type === 'event') {
    // Handle events from editor
    const handler = registeredEventHandlers.get(event);
    if (handler) {
      try {
        await handler(data);
      } catch (err) {
        console.error('Event handler error:', err);
      }
    }
  } else if (type === 'execute-command') {
    const handler = registeredCommands.get(data.commandId);
    if (handler) {
      try {
        await handler(data.args);
      } catch (err) {
        console.error('Command error:', err);
      }
    }
  } else if (type === 'deactivate') {
    if (typeof module !== 'undefined' && module.exports && module.exports.deactivate) {
      try {
        await module.exports.deactivate();
      } catch (err) {
        console.error('Deactivate error:', err);
      }
    }
    self.close();
  }
};

// Module system for extension code
const module = { exports: {} };
const exports = module.exports;
`;
  }

  // Deactivate extension
  async deactivateExtension(extensionId: string): Promise<void> {
    const runtime = this.runtimes.get(extensionId);
    if (!runtime) return;

    console.log(`[ExtensionHost] Deactivating extension: ${extensionId}`);

    if (runtime.worker) {
      runtime.worker.postMessage({ type: 'deactivate' });
      // Give it time to cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      runtime.worker.terminate();
    }

    // Dispose subscriptions
    runtime.context.subscriptions.forEach(sub => sub.dispose());

    runtime.status = 'disposed';
    this.runtimes.delete(extensionId);

    extensionEvents.emit('extension:deactivated', { extensionId });
  }

  // Hot reload extension
  async reloadExtension(manifest: ExtensionManifest): Promise<boolean> {
    console.log(`[ExtensionHost] Hot reloading extension: ${manifest.id}`);
    await this.deactivateExtension(manifest.id);
    return this.activateExtension(manifest);
  }

  // Execute command on extension
  executeCommand(extensionId: string, commandId: string, args?: any) {
    const runtime = this.runtimes.get(extensionId);
    if (runtime?.worker && runtime.status === 'active') {
      runtime.worker.postMessage({
        type: 'execute-command',
        data: { commandId, args }
      });
    }
  }

  // Get extension status
  getStatus(extensionId: string): ExtensionRuntime['status'] | 'not-found' {
    const runtime = this.runtimes.get(extensionId);
    return runtime?.status || 'not-found';
  }

  // Get all active extensions
  getActiveExtensions(): string[] {
    const active: string[] = [];
    this.runtimes.forEach((runtime, id) => {
      if (runtime.status === 'active') {
        active.push(id);
      }
    });
    return active;
  }

  // Dispose all extensions
  async dispose(): Promise<void> {
    const ids = Array.from(this.runtimes.keys());
    await Promise.all(ids.map(id => this.deactivateExtension(id)));
  }
}

// Singleton instance
export const extensionHost = new ExtensionHostService();

// Helper to connect editor to extension host
export function connectEditorToExtensions(editor: any, monaco: any) {
  extensionHost.setEditorRef(editor);

  // Forward text changes
  editor.onDidChangeModelContent((e: any) => {
    const content = editor.getValue();
    extensionEvents.emit('editor:textChanged', content, e.changes);
  });

  // Forward selection changes
  editor.onDidChangeCursorSelection((e: any) => {
    const model = editor.getModel();
    if (model) {
      const selection = editor.getSelection();
      extensionEvents.emit('editor:selectionChanged', {
        start: model.getOffsetAt(selection.getStartPosition()),
        end: model.getOffsetAt(selection.getEndPosition()),
        text: model.getValueInRange(selection)
      });
    }
  });

  console.log('[ExtensionHost] Editor connected');
}

// Helper to connect store to extension host
export function connectStoreToExtensions(store: any) {
  extensionHost.setStoreRef(store);
  console.log('[ExtensionHost] Store connected');
}
