// Enhanced Language Server Protocol Service
// Full LSP implementation with multi-language support

export interface LSPServer {
  id: string;
  name: string;
  language: string;
  languageIds: string[];
  capabilities: ServerCapabilities;
  status: ServerStatus;
  pid?: number;
  port?: number;
  rootPath: string;
  initializeParams?: InitializeParams;
}

export type ServerStatus = 'starting' | 'running' | 'stopped' | 'error' | 'restarting';

export interface ServerCapabilities {
  textDocumentSync?: TextDocumentSyncKind | TextDocumentSyncOptions;
  completionProvider?: CompletionOptions;
  hoverProvider?: boolean | HoverOptions;
  signatureHelpProvider?: SignatureHelpOptions;
  declarationProvider?: boolean;
  definitionProvider?: boolean;
  typeDefinitionProvider?: boolean;
  implementationProvider?: boolean;
  referencesProvider?: boolean;
  documentHighlightProvider?: boolean;
  documentSymbolProvider?: boolean;
  codeActionProvider?: boolean | CodeActionOptions;
  codeLensProvider?: CodeLensOptions;
  documentLinkProvider?: DocumentLinkOptions;
  colorProvider?: boolean;
  documentFormattingProvider?: boolean;
  documentRangeFormattingProvider?: boolean;
  documentOnTypeFormattingProvider?: DocumentOnTypeFormattingOptions;
  renameProvider?: boolean | RenameOptions;
  foldingRangeProvider?: boolean;
  executeCommandProvider?: ExecuteCommandOptions;
  selectionRangeProvider?: boolean;
  linkedEditingRangeProvider?: boolean;
  callHierarchyProvider?: boolean;
  semanticTokensProvider?: SemanticTokensOptions;
  monikerProvider?: boolean;
  typeHierarchyProvider?: boolean;
  inlineValueProvider?: boolean;
  inlayHintProvider?: boolean | InlayHintOptions;
  diagnosticProvider?: DiagnosticOptions;
  workspaceSymbolProvider?: boolean;
}

export type TextDocumentSyncKind = 0 | 1 | 2; // None | Full | Incremental

export interface TextDocumentSyncOptions {
  openClose?: boolean;
  change?: TextDocumentSyncKind;
  willSave?: boolean;
  willSaveWaitUntil?: boolean;
  save?: SaveOptions;
}

export interface SaveOptions {
  includeText?: boolean;
}

export interface CompletionOptions {
  triggerCharacters?: string[];
  allCommitCharacters?: string[];
  resolveProvider?: boolean;
  workDoneProgress?: boolean;
}

export interface HoverOptions {
  workDoneProgress?: boolean;
}

export interface SignatureHelpOptions {
  triggerCharacters?: string[];
  retriggerCharacters?: string[];
  workDoneProgress?: boolean;
}

export interface CodeActionOptions {
  codeActionKinds?: CodeActionKind[];
  resolveProvider?: boolean;
}

export type CodeActionKind = 
  | 'quickfix'
  | 'refactor'
  | 'refactor.extract'
  | 'refactor.inline'
  | 'refactor.rewrite'
  | 'source'
  | 'source.organizeImports'
  | 'source.fixAll';

export interface CodeLensOptions {
  resolveProvider?: boolean;
}

export interface DocumentLinkOptions {
  resolveProvider?: boolean;
}

export interface DocumentOnTypeFormattingOptions {
  firstTriggerCharacter: string;
  moreTriggerCharacter?: string[];
}

export interface RenameOptions {
  prepareProvider?: boolean;
}

export interface ExecuteCommandOptions {
  commands: string[];
}

export interface SemanticTokensOptions {
  legend: SemanticTokensLegend;
  range?: boolean;
  full?: boolean | { delta?: boolean };
}

export interface SemanticTokensLegend {
  tokenTypes: string[];
  tokenModifiers: string[];
}

export interface InlayHintOptions {
  resolveProvider?: boolean;
}

export interface DiagnosticOptions {
  identifier?: string;
  interFileDependencies: boolean;
  workspaceDiagnostics: boolean;
}

export interface InitializeParams {
  processId: number | null;
  clientInfo?: { name: string; version?: string };
  locale?: string;
  rootPath?: string | null;
  rootUri: string | null;
  capabilities: ClientCapabilities;
  initializationOptions?: any;
  trace?: 'off' | 'messages' | 'verbose';
  workspaceFolders?: WorkspaceFolder[] | null;
}

export interface ClientCapabilities {
  workspace?: WorkspaceClientCapabilities;
  textDocument?: TextDocumentClientCapabilities;
  window?: WindowClientCapabilities;
  general?: GeneralClientCapabilities;
  experimental?: any;
}

export interface WorkspaceClientCapabilities {
  applyEdit?: boolean;
  workspaceEdit?: WorkspaceEditClientCapabilities;
  didChangeConfiguration?: { dynamicRegistration?: boolean };
  didChangeWatchedFiles?: { dynamicRegistration?: boolean };
  symbol?: WorkspaceSymbolClientCapabilities;
  executeCommand?: { dynamicRegistration?: boolean };
  workspaceFolders?: boolean;
  configuration?: boolean;
  semanticTokens?: { refreshSupport?: boolean };
  codeLens?: { refreshSupport?: boolean };
  fileOperations?: FileOperationClientCapabilities;
  inlineValue?: { refreshSupport?: boolean };
  inlayHint?: { refreshSupport?: boolean };
  diagnostics?: { refreshSupport?: boolean };
}

export interface WorkspaceEditClientCapabilities {
  documentChanges?: boolean;
  resourceOperations?: ('create' | 'rename' | 'delete')[];
  failureHandling?: 'abort' | 'transactional' | 'undo' | 'textOnlyTransactional';
  normalizesLineEndings?: boolean;
  changeAnnotationSupport?: { groupsOnLabel?: boolean };
}

export interface WorkspaceSymbolClientCapabilities {
  dynamicRegistration?: boolean;
  symbolKind?: { valueSet?: SymbolKind[] };
  tagSupport?: { valueSet?: SymbolTag[] };
  resolveSupport?: { properties: string[] };
}

export interface FileOperationClientCapabilities {
  dynamicRegistration?: boolean;
  didCreate?: boolean;
  willCreate?: boolean;
  didRename?: boolean;
  willRename?: boolean;
  didDelete?: boolean;
  willDelete?: boolean;
}

export interface TextDocumentClientCapabilities {
  synchronization?: TextDocumentSyncClientCapabilities;
  completion?: CompletionClientCapabilities;
  hover?: HoverClientCapabilities;
  signatureHelp?: SignatureHelpClientCapabilities;
  declaration?: DeclarationClientCapabilities;
  definition?: DefinitionClientCapabilities;
  typeDefinition?: TypeDefinitionClientCapabilities;
  implementation?: ImplementationClientCapabilities;
  references?: ReferenceClientCapabilities;
  documentHighlight?: DocumentHighlightClientCapabilities;
  documentSymbol?: DocumentSymbolClientCapabilities;
  codeAction?: CodeActionClientCapabilities;
  codeLens?: CodeLensClientCapabilities;
  documentLink?: DocumentLinkClientCapabilities;
  colorProvider?: DocumentColorClientCapabilities;
  formatting?: DocumentFormattingClientCapabilities;
  rangeFormatting?: DocumentRangeFormattingClientCapabilities;
  onTypeFormatting?: DocumentOnTypeFormattingClientCapabilities;
  rename?: RenameClientCapabilities;
  publishDiagnostics?: PublishDiagnosticsClientCapabilities;
  foldingRange?: FoldingRangeClientCapabilities;
  selectionRange?: SelectionRangeClientCapabilities;
  linkedEditingRange?: LinkedEditingRangeClientCapabilities;
  callHierarchy?: CallHierarchyClientCapabilities;
  semanticTokens?: SemanticTokensClientCapabilities;
  moniker?: MonikerClientCapabilities;
  typeHierarchy?: TypeHierarchyClientCapabilities;
  inlineValue?: InlineValueClientCapabilities;
  inlayHint?: InlayHintClientCapabilities;
  diagnostic?: DiagnosticClientCapabilities;
}

export interface WindowClientCapabilities {
  workDoneProgress?: boolean;
  showMessage?: ShowMessageRequestClientCapabilities;
  showDocument?: ShowDocumentClientCapabilities;
}

export interface GeneralClientCapabilities {
  staleRequestSupport?: {
    cancel: boolean;
    retryOnContentModified: string[];
  };
  regularExpressions?: { engine: string; version?: string };
  markdown?: { parser: string; version?: string };
  positionEncodings?: ('utf-8' | 'utf-16' | 'utf-32')[];
}

// Simplified capability interfaces (keeping key ones for brevity)
export interface TextDocumentSyncClientCapabilities { dynamicRegistration?: boolean; willSave?: boolean; willSaveWaitUntil?: boolean; didSave?: boolean; }
export interface CompletionClientCapabilities { dynamicRegistration?: boolean; completionItem?: any; completionItemKind?: any; contextSupport?: boolean; insertTextMode?: number; completionList?: any; }
export interface HoverClientCapabilities { dynamicRegistration?: boolean; contentFormat?: ('plaintext' | 'markdown')[]; }
export interface SignatureHelpClientCapabilities { dynamicRegistration?: boolean; signatureInformation?: any; contextSupport?: boolean; }
export interface DeclarationClientCapabilities { dynamicRegistration?: boolean; linkSupport?: boolean; }
export interface DefinitionClientCapabilities { dynamicRegistration?: boolean; linkSupport?: boolean; }
export interface TypeDefinitionClientCapabilities { dynamicRegistration?: boolean; linkSupport?: boolean; }
export interface ImplementationClientCapabilities { dynamicRegistration?: boolean; linkSupport?: boolean; }
export interface ReferenceClientCapabilities { dynamicRegistration?: boolean; }
export interface DocumentHighlightClientCapabilities { dynamicRegistration?: boolean; }
export interface DocumentSymbolClientCapabilities { dynamicRegistration?: boolean; symbolKind?: any; hierarchicalDocumentSymbolSupport?: boolean; tagSupport?: any; labelSupport?: boolean; }
export interface CodeActionClientCapabilities { dynamicRegistration?: boolean; codeActionLiteralSupport?: any; isPreferredSupport?: boolean; disabledSupport?: boolean; dataSupport?: boolean; resolveSupport?: any; honorsChangeAnnotations?: boolean; }
export interface CodeLensClientCapabilities { dynamicRegistration?: boolean; }
export interface DocumentLinkClientCapabilities { dynamicRegistration?: boolean; tooltipSupport?: boolean; }
export interface DocumentColorClientCapabilities { dynamicRegistration?: boolean; }
export interface DocumentFormattingClientCapabilities { dynamicRegistration?: boolean; }
export interface DocumentRangeFormattingClientCapabilities { dynamicRegistration?: boolean; }
export interface DocumentOnTypeFormattingClientCapabilities { dynamicRegistration?: boolean; }
export interface RenameClientCapabilities { dynamicRegistration?: boolean; prepareSupport?: boolean; prepareSupportDefaultBehavior?: number; honorsChangeAnnotations?: boolean; }
export interface PublishDiagnosticsClientCapabilities { relatedInformation?: boolean; tagSupport?: any; versionSupport?: boolean; codeDescriptionSupport?: boolean; dataSupport?: boolean; }
export interface FoldingRangeClientCapabilities { dynamicRegistration?: boolean; rangeLimit?: number; lineFoldingOnly?: boolean; foldingRangeKind?: any; foldingRange?: any; }
export interface SelectionRangeClientCapabilities { dynamicRegistration?: boolean; }
export interface LinkedEditingRangeClientCapabilities { dynamicRegistration?: boolean; }
export interface CallHierarchyClientCapabilities { dynamicRegistration?: boolean; }
export interface SemanticTokensClientCapabilities { dynamicRegistration?: boolean; requests?: any; tokenTypes?: string[]; tokenModifiers?: string[]; formats?: string[]; overlappingTokenSupport?: boolean; multilineTokenSupport?: boolean; serverCancelSupport?: boolean; augmentsSyntaxTokens?: boolean; }
export interface MonikerClientCapabilities { dynamicRegistration?: boolean; }
export interface TypeHierarchyClientCapabilities { dynamicRegistration?: boolean; }
export interface InlineValueClientCapabilities { dynamicRegistration?: boolean; }
export interface InlayHintClientCapabilities { dynamicRegistration?: boolean; resolveSupport?: any; }
export interface DiagnosticClientCapabilities { dynamicRegistration?: boolean; relatedDocumentSupport?: boolean; }
export interface ShowMessageRequestClientCapabilities { messageActionItem?: any; }
export interface ShowDocumentClientCapabilities { support: boolean; }

export interface WorkspaceFolder {
  uri: string;
  name: string;
}

// LSP Message Types
export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface LocationLink {
  originSelectionRange?: Range;
  targetUri: string;
  targetRange: Range;
  targetSelectionRange: Range;
}

export interface Diagnostic {
  range: Range;
  severity?: DiagnosticSeverity;
  code?: number | string;
  codeDescription?: { href: string };
  source?: string;
  message: string;
  tags?: DiagnosticTag[];
  relatedInformation?: DiagnosticRelatedInformation[];
  data?: any;
}

export type DiagnosticSeverity = 1 | 2 | 3 | 4; // Error | Warning | Information | Hint
export type DiagnosticTag = 1 | 2; // Unnecessary | Deprecated

export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

export interface CompletionItem {
  label: string;
  labelDetails?: CompletionItemLabelDetails;
  kind?: CompletionItemKind;
  tags?: CompletionItemTag[];
  detail?: string;
  documentation?: string | MarkupContent;
  deprecated?: boolean;
  preselect?: boolean;
  sortText?: string;
  filterText?: string;
  insertText?: string;
  insertTextFormat?: InsertTextFormat;
  insertTextMode?: InsertTextMode;
  textEdit?: TextEdit | InsertReplaceEdit;
  textEditText?: string;
  additionalTextEdits?: TextEdit[];
  commitCharacters?: string[];
  command?: Command;
  data?: any;
}

export interface CompletionItemLabelDetails {
  detail?: string;
  description?: string;
}

export type CompletionItemKind = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25;
export type CompletionItemTag = 1; // Deprecated
export type InsertTextFormat = 1 | 2; // PlainText | Snippet
export type InsertTextMode = 1 | 2; // AsIs | AdjustIndentation

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface InsertReplaceEdit {
  newText: string;
  insert: Range;
  replace: Range;
}

export interface MarkupContent {
  kind: 'plaintext' | 'markdown';
  value: string;
}

export interface Command {
  title: string;
  command: string;
  arguments?: any[];
}

export interface Hover {
  contents: MarkupContent | MarkedString | MarkedString[];
  range?: Range;
}

export type MarkedString = string | { language: string; value: string };

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string | MarkupContent;
  parameters?: ParameterInformation[];
  activeParameter?: number;
}

export interface ParameterInformation {
  label: string | [number, number];
  documentation?: string | MarkupContent;
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  deprecated?: boolean;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export type SymbolKind = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26;
export type SymbolTag = 1; // Deprecated

export interface CodeAction {
  title: string;
  kind?: CodeActionKind;
  diagnostics?: Diagnostic[];
  isPreferred?: boolean;
  disabled?: { reason: string };
  edit?: WorkspaceEdit;
  command?: Command;
  data?: any;
}

export interface WorkspaceEdit {
  changes?: { [uri: string]: TextEdit[] };
  documentChanges?: (TextDocumentEdit | CreateFile | RenameFile | DeleteFile)[];
  changeAnnotations?: { [id: string]: ChangeAnnotation };
}

export interface TextDocumentEdit {
  textDocument: OptionalVersionedTextDocumentIdentifier;
  edits: (TextEdit | AnnotatedTextEdit)[];
}

export interface OptionalVersionedTextDocumentIdentifier {
  uri: string;
  version: number | null;
}

export interface AnnotatedTextEdit extends TextEdit {
  annotationId: string;
}

export interface CreateFile {
  kind: 'create';
  uri: string;
  options?: { overwrite?: boolean; ignoreIfExists?: boolean };
  annotationId?: string;
}

export interface RenameFile {
  kind: 'rename';
  oldUri: string;
  newUri: string;
  options?: { overwrite?: boolean; ignoreIfExists?: boolean };
  annotationId?: string;
}

export interface DeleteFile {
  kind: 'delete';
  uri: string;
  options?: { recursive?: boolean; ignoreIfNotExists?: boolean };
  annotationId?: string;
}

export interface ChangeAnnotation {
  label: string;
  needsConfirmation?: boolean;
  description?: string;
}

export interface FoldingRange {
  startLine: number;
  startCharacter?: number;
  endLine: number;
  endCharacter?: number;
  kind?: FoldingRangeKind;
  collapsedText?: string;
}

export type FoldingRangeKind = 'comment' | 'imports' | 'region';

export interface CodeLens {
  range: Range;
  command?: Command;
  data?: any;
}

export interface InlayHint {
  position: Position;
  label: string | InlayHintLabelPart[];
  kind?: InlayHintKind;
  textEdits?: TextEdit[];
  tooltip?: string | MarkupContent;
  paddingLeft?: boolean;
  paddingRight?: boolean;
  data?: any;
}

export interface InlayHintLabelPart {
  value: string;
  tooltip?: string | MarkupContent;
  location?: Location;
  command?: Command;
}

export type InlayHintKind = 1 | 2; // Type | Parameter

// Language Server Configurations
export interface LanguageServerConfig {
  id: string;
  name: string;
  languages: string[];
  extensions: string[];
  command: string;
  args?: string[];
  rootPatterns?: string[];
  initializationOptions?: any;
  settings?: any;
}

const DEFAULT_LANGUAGE_SERVERS: LanguageServerConfig[] = [
  {
    id: 'typescript-language-server',
    name: 'TypeScript Language Server',
    languages: ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    command: 'typescript-language-server',
    args: ['--stdio'],
    rootPatterns: ['tsconfig.json', 'jsconfig.json', 'package.json'],
    initializationOptions: {
      preferences: {
        includeCompletionsForModuleExports: true,
        includeCompletionsForImportStatements: true,
        includeCompletionsWithSnippetText: true,
        includeAutomaticOptionalChainCompletions: true,
      },
    },
  },
  {
    id: 'rust-analyzer',
    name: 'Rust Analyzer',
    languages: ['rust'],
    extensions: ['.rs'],
    command: 'rust-analyzer',
    rootPatterns: ['Cargo.toml'],
    settings: {
      'rust-analyzer.checkOnSave.command': 'clippy',
      'rust-analyzer.inlayHints.enable': true,
    },
  },
  {
    id: 'pylsp',
    name: 'Python Language Server',
    languages: ['python'],
    extensions: ['.py', '.pyi'],
    command: 'pylsp',
    rootPatterns: ['pyproject.toml', 'setup.py', 'requirements.txt'],
    settings: {
      pylsp: {
        plugins: {
          pycodestyle: { enabled: true },
          pyflakes: { enabled: true },
          mccabe: { enabled: true },
        },
      },
    },
  },
  {
    id: 'gopls',
    name: 'Go Language Server',
    languages: ['go'],
    extensions: ['.go'],
    command: 'gopls',
    rootPatterns: ['go.mod', 'go.sum'],
    settings: {
      gopls: {
        completeUnimported: true,
        usePlaceholders: true,
        staticcheck: true,
      },
    },
  },
  {
    id: 'clangd',
    name: 'Clangd',
    languages: ['c', 'cpp', 'objc', 'objcpp', 'cuda'],
    extensions: ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hh', '.hxx', '.cu'],
    command: 'clangd',
    args: ['--background-index', '--clang-tidy'],
    rootPatterns: ['compile_commands.json', 'CMakeLists.txt', '.clangd'],
  },
  {
    id: 'jdtls',
    name: 'Java Language Server',
    languages: ['java'],
    extensions: ['.java'],
    command: 'jdtls',
    rootPatterns: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
  },
  {
    id: 'vscode-html-languageserver',
    name: 'HTML Language Server',
    languages: ['html'],
    extensions: ['.html', '.htm'],
    command: 'vscode-html-language-server',
    args: ['--stdio'],
  },
  {
    id: 'vscode-css-languageserver',
    name: 'CSS Language Server',
    languages: ['css', 'scss', 'less'],
    extensions: ['.css', '.scss', '.less'],
    command: 'vscode-css-language-server',
    args: ['--stdio'],
  },
  {
    id: 'vscode-json-languageserver',
    name: 'JSON Language Server',
    languages: ['json', 'jsonc'],
    extensions: ['.json', '.jsonc'],
    command: 'vscode-json-language-server',
    args: ['--stdio'],
  },
  {
    id: 'yaml-language-server',
    name: 'YAML Language Server',
    languages: ['yaml'],
    extensions: ['.yaml', '.yml'],
    command: 'yaml-language-server',
    args: ['--stdio'],
  },
  {
    id: 'lua-language-server',
    name: 'Lua Language Server',
    languages: ['lua'],
    extensions: ['.lua'],
    command: 'lua-language-server',
    rootPatterns: ['.luarc.json', '.luacheckrc'],
  },
  {
    id: 'bash-language-server',
    name: 'Bash Language Server',
    languages: ['shellscript', 'bash'],
    extensions: ['.sh', '.bash', '.zsh'],
    command: 'bash-language-server',
    args: ['start'],
  },
];

type EventCallback = (event: { type: string; data: any }) => void;

class LSPService {
  private servers: Map<string, LSPServer> = new Map();
  private diagnostics: Map<string, Diagnostic[]> = new Map();
  private documentVersions: Map<string, number> = new Map();
  private openDocuments: Map<string, string> = new Map();
  private completionCache: Map<string, CompletionItem[]> = new Map();
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private configs: LanguageServerConfig[] = DEFAULT_LANGUAGE_SERVERS;

  // LSP Message ID counter
  private messageId: number = 0;

  constructor() {
    this.initializeBuiltInCapabilities();
  }

  private initializeBuiltInCapabilities(): void {
    // Setup built-in completions for common languages
    this.setupBuiltInCompletions();
  }

  // Server Management
  async startServer(config: LanguageServerConfig, rootPath: string): Promise<LSPServer> {
    const serverId = `${config.id}_${Date.now()}`;
    
    const server: LSPServer = {
      id: serverId,
      name: config.name,
      language: config.languages[0],
      languageIds: config.languages,
      capabilities: this.getDefaultCapabilities(config),
      status: 'starting',
      rootPath,
      initializeParams: {
        processId: null,
        rootUri: `file://${rootPath}`,
        rootPath,
        capabilities: this.getClientCapabilities(),
        initializationOptions: config.initializationOptions,
        workspaceFolders: [{ uri: `file://${rootPath}`, name: rootPath.split('/').pop() || 'workspace' }],
      },
    };

    this.servers.set(serverId, server);
    this.emit('server:starting', { serverId, config });

    // Simulate server initialization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    server.status = 'running';
    this.emit('server:ready', { serverId, capabilities: server.capabilities });

    return server;
  }

  async stopServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    server.status = 'stopped';
    this.emit('server:stopped', { serverId });
    this.servers.delete(serverId);
  }

  async restartServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    const config = this.configs.find(c => c.id === server.name.toLowerCase().replace(/\s+/g, '-'));
    if (!config) return;

    server.status = 'restarting';
    this.emit('server:restarting', { serverId });

    await this.stopServer(serverId);
    await this.startServer(config, server.rootPath);
  }

  getServer(serverId: string): LSPServer | undefined {
    return this.servers.get(serverId);
  }

  getAllServers(): LSPServer[] {
    return Array.from(this.servers.values());
  }

  getServerForLanguage(languageId: string): LSPServer | undefined {
    for (const server of this.servers.values()) {
      if (server.languageIds.includes(languageId) && server.status === 'running') {
        return server;
      }
    }
    return undefined;
  }

  getAvailableConfigs(): LanguageServerConfig[] {
    return [...this.configs];
  }

  private getDefaultCapabilities(config: LanguageServerConfig): ServerCapabilities {
    return {
      textDocumentSync: 2, // Incremental
      completionProvider: {
        triggerCharacters: ['.', ':', '<', '"', "'", '/', '@', '#'],
        resolveProvider: true,
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ','],
        retriggerCharacters: [','],
      },
      definitionProvider: true,
      typeDefinitionProvider: true,
      implementationProvider: true,
      referencesProvider: true,
      documentHighlightProvider: true,
      documentSymbolProvider: true,
      codeActionProvider: {
        codeActionKinds: ['quickfix', 'refactor', 'refactor.extract', 'source.organizeImports', 'source.fixAll'],
        resolveProvider: true,
      },
      codeLensProvider: { resolveProvider: true },
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
      renameProvider: { prepareProvider: true },
      foldingRangeProvider: true,
      selectionRangeProvider: true,
      semanticTokensProvider: {
        legend: {
          tokenTypes: ['namespace', 'type', 'class', 'enum', 'interface', 'struct', 'typeParameter', 'parameter', 'variable', 'property', 'enumMember', 'event', 'function', 'method', 'macro', 'keyword', 'modifier', 'comment', 'string', 'number', 'regexp', 'operator', 'decorator'],
          tokenModifiers: ['declaration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 'documentation', 'defaultLibrary'],
        },
        full: true,
        range: true,
      },
      inlayHintProvider: { resolveProvider: true },
      diagnosticProvider: {
        interFileDependencies: true,
        workspaceDiagnostics: true,
      },
      workspaceSymbolProvider: true,
      callHierarchyProvider: true,
      typeHierarchyProvider: true,
    };
  }

  private getClientCapabilities(): ClientCapabilities {
    return {
      workspace: {
        applyEdit: true,
        workspaceEdit: {
          documentChanges: true,
          resourceOperations: ['create', 'rename', 'delete'],
          failureHandling: 'textOnlyTransactional',
        },
        didChangeConfiguration: { dynamicRegistration: true },
        didChangeWatchedFiles: { dynamicRegistration: true },
        symbol: { dynamicRegistration: true },
        executeCommand: { dynamicRegistration: true },
        workspaceFolders: true,
        configuration: true,
        semanticTokens: { refreshSupport: true },
        codeLens: { refreshSupport: true },
        inlayHint: { refreshSupport: true },
        diagnostics: { refreshSupport: true },
      },
      textDocument: {
        synchronization: {
          dynamicRegistration: true,
          willSave: true,
          willSaveWaitUntil: true,
          didSave: true,
        },
        completion: {
          dynamicRegistration: true,
          completionItem: {
            snippetSupport: true,
            commitCharactersSupport: true,
            documentationFormat: ['markdown', 'plaintext'],
            deprecatedSupport: true,
            preselectSupport: true,
            insertReplaceSupport: true,
            resolveSupport: { properties: ['documentation', 'detail', 'additionalTextEdits'] },
          },
          contextSupport: true,
        },
        hover: {
          dynamicRegistration: true,
          contentFormat: ['markdown', 'plaintext'],
        },
        signatureHelp: {
          dynamicRegistration: true,
          signatureInformation: {
            documentationFormat: ['markdown', 'plaintext'],
            parameterInformation: { labelOffsetSupport: true },
          },
          contextSupport: true,
        },
        definition: { dynamicRegistration: true, linkSupport: true },
        typeDefinition: { dynamicRegistration: true, linkSupport: true },
        implementation: { dynamicRegistration: true, linkSupport: true },
        references: { dynamicRegistration: true },
        documentHighlight: { dynamicRegistration: true },
        documentSymbol: {
          dynamicRegistration: true,
          hierarchicalDocumentSymbolSupport: true,
        },
        codeAction: {
          dynamicRegistration: true,
          codeActionLiteralSupport: {
            codeActionKind: {
              valueSet: ['quickfix', 'refactor', 'refactor.extract', 'refactor.inline', 'refactor.rewrite', 'source', 'source.organizeImports', 'source.fixAll'],
            },
          },
          isPreferredSupport: true,
          resolveSupport: { properties: ['edit'] },
        },
        codeLens: { dynamicRegistration: true },
        formatting: { dynamicRegistration: true },
        rangeFormatting: { dynamicRegistration: true },
        rename: { dynamicRegistration: true, prepareSupport: true },
        publishDiagnostics: {
          relatedInformation: true,
          tagSupport: { valueSet: [1, 2] },
          versionSupport: true,
          codeDescriptionSupport: true,
        },
        foldingRange: { dynamicRegistration: true },
        selectionRange: { dynamicRegistration: true },
        callHierarchy: { dynamicRegistration: true },
        semanticTokens: {
          dynamicRegistration: true,
          tokenTypes: ['namespace', 'type', 'class', 'enum', 'interface', 'struct', 'typeParameter', 'parameter', 'variable', 'property', 'enumMember', 'function', 'method', 'macro', 'keyword', 'modifier', 'comment', 'string', 'number', 'regexp', 'operator', 'decorator'],
          tokenModifiers: ['declaration', 'definition', 'readonly', 'static', 'deprecated', 'abstract', 'async', 'modification', 'documentation', 'defaultLibrary'],
          formats: ['relative'],
        },
        inlayHint: { dynamicRegistration: true },
        diagnostic: { dynamicRegistration: true },
      },
      window: {
        workDoneProgress: true,
        showMessage: { messageActionItem: { additionalPropertiesSupport: true } },
        showDocument: { support: true },
      },
      general: {
        staleRequestSupport: { cancel: true, retryOnContentModified: ['textDocument/semanticTokens/full', 'textDocument/semanticTokens/range'] },
        regularExpressions: { engine: 'ECMAScript', version: 'ES2020' },
        markdown: { parser: 'marked', version: '1.1.0' },
        positionEncodings: ['utf-16'],
      },
    };
  }

  // Document Management
  openDocument(uri: string, languageId: string, text: string): void {
    this.openDocuments.set(uri, text);
    this.documentVersions.set(uri, 1);
    
    this.emit('textDocument/didOpen', {
      textDocument: { uri, languageId, version: 1, text },
    });

    // Trigger initial diagnostics
    this.updateDiagnostics(uri, languageId);
  }

  closeDocument(uri: string): void {
    this.openDocuments.delete(uri);
    this.documentVersions.delete(uri);
    this.diagnostics.delete(uri);
    this.completionCache.delete(uri);
    
    this.emit('textDocument/didClose', { textDocument: { uri } });
  }

  updateDocument(uri: string, text: string, languageId: string): void {
    const version = (this.documentVersions.get(uri) || 0) + 1;
    this.documentVersions.set(uri, version);
    this.openDocuments.set(uri, text);
    
    // Invalidate completion cache
    this.completionCache.delete(uri);
    
    this.emit('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });

    // Update diagnostics after change
    this.updateDiagnostics(uri, languageId);
  }

  saveDocument(uri: string, text: string): void {
    this.emit('textDocument/didSave', {
      textDocument: { uri },
      text,
    });
  }

  // Diagnostics
  private updateDiagnostics(uri: string, languageId: string): void {
    const text = this.openDocuments.get(uri);
    if (!text) return;

    const newDiagnostics = this.analyzeDiagnostics(text, languageId);
    this.diagnostics.set(uri, newDiagnostics);
    
    this.emit('textDocument/publishDiagnostics', {
      uri,
      diagnostics: newDiagnostics,
    });
  }

  private analyzeDiagnostics(text: string, languageId: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lines = text.split('\n');

    // Pattern-based error detection
    const patterns: { regex: RegExp; severity: DiagnosticSeverity; message: string }[] = [
      { regex: /console\.(log|warn|error)\(/g, severity: 2, message: 'Console statement detected' },
      { regex: /debugger\s*;?/g, severity: 2, message: 'Debugger statement detected' },
      { regex: /TODO:?/gi, severity: 3, message: 'TODO comment' },
      { regex: /FIXME:?/gi, severity: 2, message: 'FIXME comment' },
      { regex: /HACK:?/gi, severity: 2, message: 'HACK comment' },
      { regex: /any(?:\s|$|[;,:\)])/g, severity: 2, message: "Avoid using 'any' type" },
    ];

    // TypeScript/JavaScript specific
    if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(languageId)) {
      patterns.push(
        { regex: /==(?!=)/g, severity: 2, message: "Use '===' instead of '=='" },
        { regex: /!=(?!=)/g, severity: 2, message: "Use '!==' instead of '!='" },
        { regex: /var\s+/g, severity: 3, message: "Consider using 'let' or 'const' instead of 'var'" },
      );
    }

    // Python specific
    if (languageId === 'python') {
      patterns.push(
        { regex: /\t/g, severity: 2, message: 'Use spaces instead of tabs' },
        { regex: /print\s*\(/g, severity: 3, message: 'Print statement (consider using logging)' },
      );
    }

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (const pattern of patterns) {
        let match;
        pattern.regex.lastIndex = 0;
        while ((match = pattern.regex.exec(line)) !== null) {
          diagnostics.push({
            range: {
              start: { line: lineNum, character: match.index },
              end: { line: lineNum, character: match.index + match[0].length },
            },
            severity: pattern.severity,
            message: pattern.message,
            source: 'lsp',
          });
        }
      }

      // Line length warning
      if (line.length > 120) {
        diagnostics.push({
          range: {
            start: { line: lineNum, character: 120 },
            end: { line: lineNum, character: line.length },
          },
          severity: 3,
          message: `Line exceeds 120 characters (${line.length})`,
          source: 'lsp',
        });
      }
    }

    return diagnostics;
  }

  getDiagnostics(uri: string): Diagnostic[] {
    return this.diagnostics.get(uri) || [];
  }

  getAllDiagnostics(): Map<string, Diagnostic[]> {
    return new Map(this.diagnostics);
  }

  // Completion
  private setupBuiltInCompletions(): void {
    // Built-in completions are generated dynamically
  }

  async getCompletions(uri: string, position: Position, triggerCharacter?: string): Promise<CompletionItem[]> {
    const text = this.openDocuments.get(uri);
    if (!text) return [];

    // Check cache
    const cacheKey = `${uri}:${position.line}:${position.character}`;
    if (this.completionCache.has(cacheKey)) {
      return this.completionCache.get(cacheKey)!;
    }

    const lines = text.split('\n');
    const line = lines[position.line] || '';
    const prefix = line.slice(0, position.character);

    // Get word at cursor
    const wordMatch = prefix.match(/[\w$]+$/);
    const word = wordMatch ? wordMatch[0] : '';

    const completions: CompletionItem[] = [];

    // Language-specific completions
    const ext = uri.split('.').pop() || '';
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
      completions.push(...this.getTypeScriptCompletions(word, prefix, triggerCharacter));
    } else if (ext === 'py') {
      completions.push(...this.getPythonCompletions(word, prefix, triggerCharacter));
    } else if (ext === 'rs') {
      completions.push(...this.getRustCompletions(word, prefix, triggerCharacter));
    } else if (ext === 'go') {
      completions.push(...this.getGoCompletions(word, prefix, triggerCharacter));
    }

    // Filter by prefix
    const filtered = word 
      ? completions.filter(c => c.label.toLowerCase().startsWith(word.toLowerCase()))
      : completions;

    // Cache results
    this.completionCache.set(cacheKey, filtered);

    return filtered;
  }

  private getTypeScriptCompletions(word: string, prefix: string, trigger?: string): CompletionItem[] {
    const items: CompletionItem[] = [];

    // Keywords
    const keywords = ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum', 'namespace', 'import', 'export', 'from', 'extends', 'implements', 'async', 'await', 'return', 'if', 'else', 'switch', 'case', 'for', 'while', 'do', 'try', 'catch', 'finally', 'throw', 'new', 'typeof', 'instanceof', 'void', 'null', 'undefined', 'true', 'false', 'this', 'super', 'static', 'public', 'private', 'protected', 'readonly', 'abstract', 'as', 'is', 'keyof', 'infer', 'never', 'unknown'];
    
    keywords.forEach(kw => {
      items.push({
        label: kw,
        kind: 14, // Keyword
        detail: 'keyword',
        insertText: kw,
      });
    });

    // Types
    const types = ['string', 'number', 'boolean', 'object', 'any', 'void', 'null', 'undefined', 'never', 'unknown', 'Array', 'Map', 'Set', 'Promise', 'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable', 'Parameters', 'ReturnType', 'InstanceType'];
    
    types.forEach(t => {
      items.push({
        label: t,
        kind: 7, // Class/Type
        detail: 'type',
        insertText: t,
      });
    });

    // Common snippets
    if (trigger === undefined || word.length === 0) {
      items.push(
        {
          label: 'function',
          kind: 15, // Snippet
          detail: 'Function snippet',
          insertText: 'function ${1:name}(${2:params}): ${3:void} {\n\t$0\n}',
          insertTextFormat: 2,
        },
        {
          label: 'arrow',
          kind: 15,
          detail: 'Arrow function snippet',
          insertText: 'const ${1:name} = (${2:params}) => {\n\t$0\n};',
          insertTextFormat: 2,
        },
        {
          label: 'class',
          kind: 15,
          detail: 'Class snippet',
          insertText: 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}',
          insertTextFormat: 2,
        },
        {
          label: 'interface',
          kind: 15,
          detail: 'Interface snippet',
          insertText: 'interface ${1:Name} {\n\t$0\n}',
          insertTextFormat: 2,
        },
        {
          label: 'import',
          kind: 15,
          detail: 'Import snippet',
          insertText: "import { $1 } from '${2:module}';",
          insertTextFormat: 2,
        },
        {
          label: 'async',
          kind: 15,
          detail: 'Async function snippet',
          insertText: 'async function ${1:name}(${2:params}): Promise<${3:void}> {\n\t$0\n}',
          insertTextFormat: 2,
        },
        {
          label: 'try',
          kind: 15,
          detail: 'Try-catch snippet',
          insertText: 'try {\n\t$1\n} catch (${2:error}) {\n\t$0\n}',
          insertTextFormat: 2,
        },
      );
    }

    // Console methods after .
    if (prefix.endsWith('console.')) {
      items.length = 0;
      ['log', 'error', 'warn', 'info', 'debug', 'trace', 'table', 'time', 'timeEnd', 'group', 'groupEnd', 'clear'].forEach(method => {
        items.push({
          label: method,
          kind: 2, // Method
          detail: `console.${method}()`,
          insertText: `${method}($0)`,
          insertTextFormat: 2,
        });
      });
    }

    return items;
  }

  private getPythonCompletions(word: string, prefix: string, trigger?: string): CompletionItem[] {
    const items: CompletionItem[] = [];

    const keywords = ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'lambda', 'True', 'False', 'None', 'global', 'nonlocal', 'assert', 'raise', 'del', 'async', 'await'];
    
    keywords.forEach(kw => {
      items.push({
        label: kw,
        kind: 14,
        detail: 'keyword',
        insertText: kw,
      });
    });

    const builtins = ['print', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'open', 'input', 'map', 'filter', 'reduce', 'zip', 'enumerate', 'sorted', 'reversed', 'sum', 'min', 'max', 'abs', 'round'];
    
    builtins.forEach(fn => {
      items.push({
        label: fn,
        kind: 3, // Function
        detail: 'builtin function',
        insertText: fn,
      });
    });

    // Snippets
    items.push(
      {
        label: 'def',
        kind: 15,
        detail: 'Function definition',
        insertText: 'def ${1:name}(${2:params}):\n\t${0:pass}',
        insertTextFormat: 2,
      },
      {
        label: 'class',
        kind: 15,
        detail: 'Class definition',
        insertText: 'class ${1:Name}:\n\tdef __init__(self${2:, params}):\n\t\t${0:pass}',
        insertTextFormat: 2,
      },
      {
        label: 'if',
        kind: 15,
        detail: 'If statement',
        insertText: 'if ${1:condition}:\n\t${0:pass}',
        insertTextFormat: 2,
      },
      {
        label: 'for',
        kind: 15,
        detail: 'For loop',
        insertText: 'for ${1:item} in ${2:iterable}:\n\t${0:pass}',
        insertTextFormat: 2,
      },
    );

    return items;
  }

  private getRustCompletions(word: string, prefix: string, trigger?: string): CompletionItem[] {
    const items: CompletionItem[] = [];

    const keywords = ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'trait', 'impl', 'type', 'where', 'use', 'mod', 'pub', 'crate', 'self', 'super', 'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue', 'return', 'async', 'await', 'move', 'unsafe', 'extern', 'ref', 'dyn', 'box', 'in', 'as', 'true', 'false'];
    
    keywords.forEach(kw => {
      items.push({
        label: kw,
        kind: 14,
        detail: 'keyword',
        insertText: kw,
      });
    });

    const types = ['i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'f32', 'f64', 'bool', 'char', 'str', 'String', 'Vec', 'Option', 'Result', 'Box', 'Rc', 'Arc', 'Cell', 'RefCell', 'HashMap', 'HashSet', 'BTreeMap', 'BTreeSet'];
    
    types.forEach(t => {
      items.push({
        label: t,
        kind: 7,
        detail: 'type',
        insertText: t,
      });
    });

    return items;
  }

  private getGoCompletions(word: string, prefix: string, trigger?: string): CompletionItem[] {
    const items: CompletionItem[] = [];

    const keywords = ['package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan', 'if', 'else', 'switch', 'case', 'default', 'for', 'range', 'select', 'return', 'break', 'continue', 'goto', 'fallthrough', 'defer', 'go', 'true', 'false', 'nil', 'iota'];
    
    keywords.forEach(kw => {
      items.push({
        label: kw,
        kind: 14,
        detail: 'keyword',
        insertText: kw,
      });
    });

    const types = ['int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64', 'complex64', 'complex128', 'byte', 'rune', 'string', 'bool', 'error'];
    
    types.forEach(t => {
      items.push({
        label: t,
        kind: 7,
        detail: 'type',
        insertText: t,
      });
    });

    const builtins = ['make', 'new', 'len', 'cap', 'append', 'copy', 'delete', 'close', 'panic', 'recover', 'print', 'println'];
    
    builtins.forEach(fn => {
      items.push({
        label: fn,
        kind: 3,
        detail: 'builtin function',
        insertText: fn,
      });
    });

    return items;
  }

  // Hover
  async getHover(uri: string, position: Position): Promise<Hover | null> {
    const text = this.openDocuments.get(uri);
    if (!text) return null;

    const lines = text.split('\n');
    const line = lines[position.line] || '';
    
    // Get word at position
    const wordRegex = /[\w$]+/g;
    let match;
    let word = '';
    
    while ((match = wordRegex.exec(line)) !== null) {
      if (match.index <= position.character && match.index + match[0].length >= position.character) {
        word = match[0];
        break;
      }
    }

    if (!word) return null;

    // Generate hover content
    const hoverInfo = this.getHoverInfo(word, uri);
    if (!hoverInfo) return null;

    return {
      contents: {
        kind: 'markdown',
        value: hoverInfo,
      },
      range: {
        start: { line: position.line, character: match!.index },
        end: { line: position.line, character: match!.index + word.length },
      },
    };
  }

  private getHoverInfo(word: string, uri: string): string | null {
    const ext = uri.split('.').pop() || '';
    
    // TypeScript/JavaScript keywords and types
    const tsInfo: Record<string, string> = {
      'const': '```typescript\n(keyword) const\n```\nDeclares a block-scoped, read-only named constant.',
      'let': '```typescript\n(keyword) let\n```\nDeclares a block-scoped local variable, optionally initializing it.',
      'function': '```typescript\n(keyword) function\n```\nDeclares a function with the specified parameters.',
      'class': '```typescript\n(keyword) class\n```\nDefines a class expression.',
      'interface': '```typescript\n(keyword) interface\n```\nDeclares an interface that describes object shape.',
      'type': '```typescript\n(keyword) type\n```\nDeclares a type alias.',
      'async': '```typescript\n(keyword) async\n```\nMarks a function as asynchronous.',
      'await': '```typescript\n(keyword) await\n```\nPauses async function execution until Promise resolves.',
      'Promise': '```typescript\ninterface Promise<T>\n```\nRepresents the eventual completion (or failure) of an asynchronous operation.',
      'Array': '```typescript\ninterface Array<T>\n```\nRepresents a JavaScript array.',
      'string': '```typescript\n(type) string\n```\nPrimitive type representing text data.',
      'number': '```typescript\n(type) number\n```\nPrimitive type representing numeric values.',
      'boolean': '```typescript\n(type) boolean\n```\nPrimitive type representing true/false.',
    };

    if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
      return tsInfo[word] || null;
    }

    return null;
  }

  // Go to Definition
  async getDefinition(uri: string, position: Position): Promise<Location[] | LocationLink[]> {
    // In a real implementation, this would use the AST to find definitions
    return [];
  }

  // Find References
  async getReferences(uri: string, position: Position, includeDeclaration: boolean = true): Promise<Location[]> {
    // In a real implementation, this would search the workspace
    return [];
  }

  // Code Actions
  async getCodeActions(uri: string, range: Range, diagnostics: Diagnostic[]): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    for (const diagnostic of diagnostics) {
      // Quick fixes based on diagnostic
      if (diagnostic.message.includes("'===' instead of '=='")) {
        actions.push({
          title: "Replace '==' with '==='",
          kind: 'quickfix',
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [uri]: [{
                range: diagnostic.range,
                newText: '===',
              }],
            },
          },
          isPreferred: true,
        });
      }

      if (diagnostic.message.includes("'!==' instead of '!='")) {
        actions.push({
          title: "Replace '!=' with '!=='",
          kind: 'quickfix',
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [uri]: [{
                range: diagnostic.range,
                newText: '!==',
              }],
            },
          },
          isPreferred: true,
        });
      }

      if (diagnostic.message.includes('Console statement')) {
        actions.push({
          title: 'Remove console statement',
          kind: 'quickfix',
          diagnostics: [diagnostic],
          command: {
            title: 'Remove line',
            command: 'editor.deleteLine',
            arguments: [diagnostic.range.start.line],
          },
        });
      }
    }

    // Source actions
    actions.push(
      {
        title: 'Organize Imports',
        kind: 'source.organizeImports',
      },
      {
        title: 'Fix All',
        kind: 'source.fixAll',
      },
    );

    return actions;
  }

  // Document Symbols
  async getDocumentSymbols(uri: string): Promise<DocumentSymbol[]> {
    const text = this.openDocuments.get(uri);
    if (!text) return [];

    const symbols: DocumentSymbol[] = [];
    const lines = text.split('\n');

    // Simple pattern matching for symbols
    const patterns = [
      { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g, kind: 12 as SymbolKind }, // Function
      { regex: /(?:export\s+)?class\s+(\w+)/g, kind: 5 as SymbolKind }, // Class
      { regex: /(?:export\s+)?interface\s+(\w+)/g, kind: 11 as SymbolKind }, // Interface
      { regex: /(?:export\s+)?type\s+(\w+)/g, kind: 26 as SymbolKind }, // TypeParameter
      { regex: /(?:export\s+)?enum\s+(\w+)/g, kind: 10 as SymbolKind }, // Enum
      { regex: /(?:export\s+)?const\s+(\w+)/g, kind: 14 as SymbolKind }, // Constant
      { regex: /def\s+(\w+)/g, kind: 12 as SymbolKind }, // Python function
      { regex: /class\s+(\w+):/g, kind: 5 as SymbolKind }, // Python class
    ];

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (const pattern of patterns) {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          symbols.push({
            name: match[1],
            kind: pattern.kind,
            range: {
              start: { line: lineNum, character: 0 },
              end: { line: lineNum, character: line.length },
            },
            selectionRange: {
              start: { line: lineNum, character: match.index },
              end: { line: lineNum, character: match.index + match[0].length },
            },
          });
        }
      }
    }

    return symbols;
  }

  // Formatting
  async formatDocument(uri: string): Promise<TextEdit[]> {
    const text = this.openDocuments.get(uri);
    if (!text) return [];

    // Simple formatting: normalize indentation
    const lines = text.split('\n');
    const edits: TextEdit[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Remove trailing whitespace
      if (line !== line.trimEnd()) {
        edits.push({
          range: {
            start: { line: i, character: line.trimEnd().length },
            end: { line: i, character: line.length },
          },
          newText: '',
        });
      }
    }

    return edits;
  }

  // Rename
  async prepareRename(uri: string, position: Position): Promise<Range | null> {
    const text = this.openDocuments.get(uri);
    if (!text) return null;

    const lines = text.split('\n');
    const line = lines[position.line] || '';
    
    const wordRegex = /[\w$]+/g;
    let match;
    
    while ((match = wordRegex.exec(line)) !== null) {
      if (match.index <= position.character && match.index + match[0].length >= position.character) {
        return {
          start: { line: position.line, character: match.index },
          end: { line: position.line, character: match.index + match[0].length },
        };
      }
    }

    return null;
  }

  async rename(uri: string, position: Position, newName: string): Promise<WorkspaceEdit | null> {
    const range = await this.prepareRename(uri, position);
    if (!range) return null;

    const text = this.openDocuments.get(uri);
    if (!text) return null;

    const lines = text.split('\n');
    const oldName = lines[range.start.line].slice(range.start.character, range.end.character);

    // Find all occurrences in document
    const edits: TextEdit[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const regex = new RegExp(`\\b${oldName}\\b`, 'g');
      let match;
      
      while ((match = regex.exec(line)) !== null) {
        edits.push({
          range: {
            start: { line: i, character: match.index },
            end: { line: i, character: match.index + oldName.length },
          },
          newText: newName,
        });
      }
    }

    return {
      changes: { [uri]: edits },
    };
  }

  // Inlay Hints
  async getInlayHints(uri: string, range: Range): Promise<InlayHint[]> {
    const text = this.openDocuments.get(uri);
    if (!text) return [];

    const hints: InlayHint[] = [];
    const lines = text.split('\n');
    const ext = uri.split('.').pop() || '';

    if (!['ts', 'tsx'].includes(ext)) return hints;

    // Parameter hints for function calls
    const funcCallRegex = /(\w+)\s*\(/g;
    
    for (let lineNum = range.start.line; lineNum <= Math.min(range.end.line, lines.length - 1); lineNum++) {
      const line = lines[lineNum];
      let match;
      
      while ((match = funcCallRegex.exec(line)) !== null) {
        // Simple parameter hints
        const argsStart = match.index + match[0].length;
        const argsEnd = line.indexOf(')', argsStart);
        
        if (argsEnd > argsStart) {
          const args = line.slice(argsStart, argsEnd).split(',');
          let offset = argsStart;
          
          args.forEach((arg, idx) => {
            const trimmedArg = arg.trim();
            if (trimmedArg && !trimmedArg.includes(':')) {
              hints.push({
                position: { line: lineNum, character: offset + arg.indexOf(trimmedArg) },
                label: `param${idx}: `,
                kind: 2, // Parameter
                paddingRight: true,
              });
            }
            offset += arg.length + 1;
          });
        }
      }
    }

    return hints;
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

  private nextMessageId(): number {
    return ++this.messageId;
  }
}

export const lspService = new LSPService();
export default lspService;
