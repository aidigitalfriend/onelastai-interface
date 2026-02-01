// Remote Development Service
// SSH, WSL, Containers, and Docker integration

export type RemoteConnectionType = 'ssh' | 'wsl' | 'container' | 'tunnel' | 'codespaces';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key' | 'agent';
  privateKeyPath?: string;
  passphrase?: string;
  jumpHost?: SSHConfig;
  forwardAgent: boolean;
  keepAliveInterval: number;
}

export interface WSLConfig {
  distribution: string;
  defaultUser?: string;
  mountPoint: string;
  networkingMode: 'nat' | 'mirrored';
  features: {
    systemd: boolean;
    gui: boolean;
    nested: boolean;
  };
}

export interface ContainerConfig {
  image: string;
  tag: string;
  name?: string;
  runtime: 'docker' | 'podman' | 'containerd';
  volumes: VolumeMount[];
  ports: PortMapping[];
  environment: Record<string, string>;
  network?: string;
  privileged: boolean;
  workDir: string;
  command?: string[];
  devcontainer?: DevContainerConfig;
}

export interface VolumeMount {
  source: string;
  target: string;
  readonly: boolean;
  type: 'bind' | 'volume' | 'tmpfs';
}

export interface PortMapping {
  hostPort: number;
  containerPort: number;
  protocol: 'tcp' | 'udp';
}

export interface DevContainerConfig {
  name: string;
  image?: string;
  build?: {
    dockerfile: string;
    context: string;
    args?: Record<string, string>;
  };
  features?: Record<string, any>;
  customizations?: {
    vscode?: {
      extensions?: string[];
      settings?: Record<string, any>;
    };
  };
  forwardPorts?: number[];
  postCreateCommand?: string;
  postStartCommand?: string;
  remoteUser?: string;
}

export interface RemoteConnection {
  id: string;
  type: RemoteConnectionType;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  config: SSHConfig | WSLConfig | ContainerConfig;
  createdAt: Date;
  lastConnected?: Date;
  error?: string;
  stats?: ConnectionStats;
}

export interface ConnectionStats {
  latency: number;
  bytesIn: number;
  bytesOut: number;
  uptime: number;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: 'created' | 'running' | 'paused' | 'exited' | 'dead';
  state: string;
  ports: PortMapping[];
  created: Date;
  started?: Date;
  stats?: {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    networkRx: number;
    networkTx: number;
  };
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  created: Date;
  size: number;
  layers: number;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  created: Date;
  size?: number;
  labels?: Record<string, string>;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  ipam?: {
    subnet: string;
    gateway: string;
  };
  containers: string[];
}

// Notebook Support Types
export interface NotebookDocument {
  id: string;
  name: string;
  path: string;
  language: 'python' | 'julia' | 'r' | 'javascript' | 'typescript';
  cells: NotebookCell[];
  metadata: NotebookMetadata;
  kernelSpec?: KernelSpec;
  dirty: boolean;
  lastSaved?: Date;
}

export interface NotebookCell {
  id: string;
  type: 'code' | 'markdown' | 'raw';
  source: string;
  outputs: CellOutput[];
  executionCount?: number;
  metadata?: Record<string, any>;
  executionState?: 'idle' | 'running' | 'queued' | 'error';
}

export interface CellOutput {
  type: 'stream' | 'execute_result' | 'display_data' | 'error';
  data?: Record<string, any>;
  text?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export interface NotebookMetadata {
  kernelspec: {
    name: string;
    display_name: string;
    language: string;
  };
  language_info?: {
    name: string;
    version: string;
    mimetype: string;
    file_extension: string;
  };
}

export interface KernelSpec {
  name: string;
  displayName: string;
  language: string;
  interruptMode: string;
  env?: Record<string, string>;
}

export interface Kernel {
  id: string;
  name: string;
  spec: KernelSpec;
  status: 'starting' | 'idle' | 'busy' | 'restarting' | 'dead';
  executionCount: number;
  lastActivity: Date;
  connections: number;
}

// Database Explorer Types
export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis' | 'mssql';
  host: string;
  port: number;
  database: string;
  username?: string;
  ssl: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;
  tables?: DatabaseTable[];
}

export interface DatabaseTable {
  name: string;
  schema?: string;
  type: 'table' | 'view' | 'materialized_view';
  rowCount?: number;
  columns: DatabaseColumn[];
  indexes?: DatabaseIndex[];
  primaryKey?: string[];
  foreignKeys?: ForeignKey[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  comment?: string;
}

export interface DatabaseIndex {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
  onUpdate: string;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  error?: string;
}

type EventCallback = (event: { type: string; data: any }) => void;

class RemoteDevelopmentService {
  private connections: Map<string, RemoteConnection> = new Map();
  private containers: DockerContainer[] = [];
  private images: DockerImage[] = [];
  private volumes: DockerVolume[] = [];
  private networks: DockerNetwork[] = [];
  private notebooks: Map<string, NotebookDocument> = new Map();
  private kernels: Map<string, Kernel> = new Map();
  private databaseConnections: Map<string, DatabaseConnection> = new Map();
  private listeners: Map<string, Set<EventCallback>> = new Map();

  constructor() {
    this.initializeMockData();
  }

  // Remote Connections
  async createConnection(type: RemoteConnectionType, name: string, config: any): Promise<RemoteConnection> {
    const connection: RemoteConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      status: 'disconnected',
      config,
      createdAt: new Date(),
    };

    this.connections.set(connection.id, connection);
    this.emit('connectionCreated', connection);
    return connection;
  }

  async connect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error('Connection not found');

    connection.status = 'connecting';
    this.emit('connectionStatusChanged', connection);

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success
    if (Math.random() > 0.1) {
      connection.status = 'connected';
      connection.lastConnected = new Date();
      connection.stats = {
        latency: Math.floor(Math.random() * 100) + 10,
        bytesIn: 0,
        bytesOut: 0,
        uptime: 0,
        cpuUsage: Math.random() * 50,
        memoryUsage: Math.random() * 70,
        diskUsage: Math.random() * 60,
      };
    } else {
      connection.status = 'error';
      connection.error = 'Connection refused';
    }

    this.emit('connectionStatusChanged', connection);
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error('Connection not found');

    connection.status = 'disconnected';
    connection.stats = undefined;
    this.emit('connectionStatusChanged', connection);
  }

  deleteConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.emit('connectionDeleted', { id: connectionId });
    }
  }

  getConnections(): RemoteConnection[] {
    return Array.from(this.connections.values());
  }

  getConnection(id: string): RemoteConnection | undefined {
    return this.connections.get(id);
  }

  // Docker Operations
  async listContainers(): Promise<DockerContainer[]> {
    return [...this.containers];
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.containers.find(c => c.id === containerId);
    if (container) {
      container.status = 'running';
      container.started = new Date();
      this.emit('containerStatusChanged', container);
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    const container = this.containers.find(c => c.id === containerId);
    if (container) {
      container.status = 'exited';
      this.emit('containerStatusChanged', container);
    }
  }

  async restartContainer(containerId: string): Promise<void> {
    await this.stopContainer(containerId);
    await new Promise(resolve => setTimeout(resolve, 500));
    await this.startContainer(containerId);
  }

  async removeContainer(containerId: string): Promise<void> {
    const index = this.containers.findIndex(c => c.id === containerId);
    if (index !== -1) {
      this.containers.splice(index, 1);
      this.emit('containerRemoved', { id: containerId });
    }
  }

  async pullImage(image: string, tag: string = 'latest'): Promise<void> {
    this.emit('imagePullStarted', { image, tag });
    
    // Simulate pull progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.emit('imagePullProgress', { image, tag, progress });
    }

    const newImage: DockerImage = {
      id: `sha256:${Math.random().toString(36).substr(2, 64)}`,
      repository: image,
      tag,
      created: new Date(),
      size: Math.floor(Math.random() * 1000000000) + 50000000,
      layers: Math.floor(Math.random() * 20) + 5,
    };

    this.images.push(newImage);
    this.emit('imagePulled', newImage);
  }

  async listImages(): Promise<DockerImage[]> {
    return [...this.images];
  }

  async listVolumes(): Promise<DockerVolume[]> {
    return [...this.volumes];
  }

  async listNetworks(): Promise<DockerNetwork[]> {
    return [...this.networks];
  }

  async createContainer(config: ContainerConfig): Promise<DockerContainer> {
    const container: DockerContainer = {
      id: Math.random().toString(36).substr(2, 12),
      name: config.name || `container_${Date.now()}`,
      image: `${config.image}:${config.tag}`,
      status: 'created',
      state: 'created',
      ports: config.ports,
      created: new Date(),
    };

    this.containers.push(container);
    this.emit('containerCreated', container);
    return container;
  }

  async execInContainer(containerId: string, command: string[]): Promise<string> {
    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 500));
    return `Executed: ${command.join(' ')}\nOutput from container ${containerId}`;
  }

  async getContainerLogs(containerId: string, tail: number = 100): Promise<string[]> {
    return [
      `[2024-01-24 10:00:00] Container ${containerId} started`,
      `[2024-01-24 10:00:01] Application initializing...`,
      `[2024-01-24 10:00:02] Listening on port 3000`,
      `[2024-01-24 10:00:05] Request received: GET /health`,
      `[2024-01-24 10:00:10] Database connection established`,
    ];
  }

  // WSL Operations
  getWSLDistributions(): { name: string; version: string; default: boolean }[] {
    return [
      { name: 'Ubuntu-22.04', version: '2', default: true },
      { name: 'Debian', version: '2', default: false },
      { name: 'Alpine', version: '2', default: false },
    ];
  }

  // Notebook Operations
  async createNotebook(name: string, language: NotebookDocument['language']): Promise<NotebookDocument> {
    const notebook: NotebookDocument = {
      id: `nb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      path: `/notebooks/${name}.ipynb`,
      language,
      cells: [
        {
          id: 'cell_1',
          type: 'code',
          source: '',
          outputs: [],
          executionState: 'idle',
        },
      ],
      metadata: {
        kernelspec: {
          name: language,
          display_name: language.charAt(0).toUpperCase() + language.slice(1),
          language,
        },
      },
      dirty: false,
    };

    this.notebooks.set(notebook.id, notebook);
    this.emit('notebookCreated', notebook);
    return notebook;
  }

  async openNotebook(path: string): Promise<NotebookDocument> {
    // Simulate loading a notebook
    const notebook: NotebookDocument = {
      id: `nb_${Date.now()}`,
      name: path.split('/').pop() || 'Untitled',
      path,
      language: 'python',
      cells: [
        {
          id: 'cell_1',
          type: 'markdown',
          source: '# Data Analysis Notebook\n\nThis notebook demonstrates data analysis capabilities.',
          outputs: [],
        },
        {
          id: 'cell_2',
          type: 'code',
          source: 'import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt',
          outputs: [],
          executionCount: 1,
          executionState: 'idle',
        },
        {
          id: 'cell_3',
          type: 'code',
          source: '# Load sample data\ndf = pd.DataFrame({\n    "x": np.random.randn(100),\n    "y": np.random.randn(100)\n})\ndf.head()',
          outputs: [
            {
              type: 'execute_result',
              data: {
                'text/html': '<table><tr><th>x</th><th>y</th></tr></table>',
                'text/plain': '   x         y\n0  0.123    0.456\n...',
              },
            },
          ],
          executionCount: 2,
          executionState: 'idle',
        },
      ],
      metadata: {
        kernelspec: {
          name: 'python3',
          display_name: 'Python 3',
          language: 'python',
        },
      },
      dirty: false,
    };

    this.notebooks.set(notebook.id, notebook);
    return notebook;
  }

  async executeCell(notebookId: string, cellId: string): Promise<CellOutput[]> {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) throw new Error('Notebook not found');

    const cell = notebook.cells.find(c => c.id === cellId);
    if (!cell || cell.type !== 'code') throw new Error('Code cell not found');

    cell.executionState = 'running';
    this.emit('cellExecutionStarted', { notebookId, cellId });

    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    cell.executionCount = (cell.executionCount || 0) + 1;
    cell.executionState = 'idle';

    // Generate mock output
    const outputs: CellOutput[] = [];
    
    if (cell.source.includes('print')) {
      outputs.push({
        type: 'stream',
        text: 'Hello, World!\n',
      });
    }
    
    if (cell.source.includes('df') || cell.source.includes('DataFrame')) {
      outputs.push({
        type: 'execute_result',
        data: {
          'text/html': '<table border="1"><tr><th>col1</th><th>col2</th></tr><tr><td>1</td><td>2</td></tr></table>',
          'text/plain': '   col1  col2\n0     1     2',
        },
      });
    }

    if (cell.source.includes('plt.')) {
      outputs.push({
        type: 'display_data',
        data: {
          'image/png': 'base64_encoded_image_data_here',
          'text/plain': '<Figure size 640x480 with 1 Axes>',
        },
      });
    }

    cell.outputs = outputs;
    this.emit('cellExecutionCompleted', { notebookId, cellId, outputs });
    return outputs;
  }

  async interruptKernel(kernelId: string): Promise<void> {
    const kernel = this.kernels.get(kernelId);
    if (kernel) {
      kernel.status = 'idle';
      this.emit('kernelInterrupted', { kernelId });
    }
  }

  async restartKernel(kernelId: string): Promise<void> {
    const kernel = this.kernels.get(kernelId);
    if (kernel) {
      kernel.status = 'restarting';
      this.emit('kernelRestarting', { kernelId });

      await new Promise(resolve => setTimeout(resolve, 2000));

      kernel.status = 'idle';
      kernel.executionCount = 0;
      this.emit('kernelRestarted', { kernelId });
    }
  }

  getNotebooks(): NotebookDocument[] {
    return Array.from(this.notebooks.values());
  }

  getKernels(): Kernel[] {
    return Array.from(this.kernels.values());
  }

  // Database Operations
  async createDatabaseConnection(config: Omit<DatabaseConnection, 'id' | 'status' | 'tables'>): Promise<DatabaseConnection> {
    const connection: DatabaseConnection = {
      ...config,
      id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'disconnected',
    };

    this.databaseConnections.set(connection.id, connection);
    this.emit('databaseConnectionCreated', connection);
    return connection;
  }

  async connectDatabase(connectionId: string): Promise<void> {
    const connection = this.databaseConnections.get(connectionId);
    if (!connection) throw new Error('Database connection not found');

    connection.status = 'connecting';
    this.emit('databaseStatusChanged', connection);

    await new Promise(resolve => setTimeout(resolve, 1000));

    connection.status = 'connected';
    connection.tables = this.generateMockTables(connection.type);
    this.emit('databaseStatusChanged', connection);
  }

  async disconnectDatabase(connectionId: string): Promise<void> {
    const connection = this.databaseConnections.get(connectionId);
    if (connection) {
      connection.status = 'disconnected';
      connection.tables = undefined;
      this.emit('databaseStatusChanged', connection);
    }
  }

  async executeQuery(connectionId: string, query: string): Promise<QueryResult> {
    const connection = this.databaseConnections.get(connectionId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('Not connected to database');
    }

    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));

    // Generate mock results based on query
    const isSelect = query.toLowerCase().trim().startsWith('select');
    
    if (isSelect) {
      return {
        columns: ['id', 'name', 'email', 'created_at'],
        rows: [
          [1, 'John Doe', 'john@example.com', '2024-01-01'],
          [2, 'Jane Smith', 'jane@example.com', '2024-01-02'],
          [3, 'Bob Wilson', 'bob@example.com', '2024-01-03'],
        ],
        rowCount: 3,
        executionTime: Date.now() - startTime,
      };
    }

    return {
      columns: [],
      rows: [],
      rowCount: 1,
      executionTime: Date.now() - startTime,
    };
  }

  getDatabaseConnections(): DatabaseConnection[] {
    return Array.from(this.databaseConnections.values());
  }

  private generateMockTables(dbType: DatabaseConnection['type']): DatabaseTable[] {
    return [
      {
        name: 'users',
        type: 'table',
        rowCount: 1500,
        columns: [
          { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true, isForeignKey: false, isUnique: true },
          { name: 'email', type: 'varchar(255)', nullable: false, isPrimaryKey: false, isForeignKey: false, isUnique: true },
          { name: 'name', type: 'varchar(100)', nullable: true, isPrimaryKey: false, isForeignKey: false, isUnique: false },
          { name: 'created_at', type: 'timestamp', nullable: false, isPrimaryKey: false, isForeignKey: false, isUnique: false },
        ],
        primaryKey: ['id'],
      },
      {
        name: 'orders',
        type: 'table',
        rowCount: 5000,
        columns: [
          { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true, isForeignKey: false, isUnique: true },
          { name: 'user_id', type: 'integer', nullable: false, isPrimaryKey: false, isForeignKey: true, isUnique: false },
          { name: 'total', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false, isForeignKey: false, isUnique: false },
          { name: 'status', type: 'varchar(50)', nullable: false, isPrimaryKey: false, isForeignKey: false, isUnique: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [{ name: 'fk_user', columns: ['user_id'], referencedTable: 'users', referencedColumns: ['id'], onDelete: 'CASCADE', onUpdate: 'CASCADE' }],
      },
      {
        name: 'products',
        type: 'table',
        rowCount: 250,
        columns: [
          { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true, isForeignKey: false, isUnique: true },
          { name: 'name', type: 'varchar(200)', nullable: false, isPrimaryKey: false, isForeignKey: false, isUnique: false },
          { name: 'price', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false, isForeignKey: false, isUnique: false },
          { name: 'inventory', type: 'integer', nullable: false, isPrimaryKey: false, isForeignKey: false, isUnique: false },
        ],
        primaryKey: ['id'],
      },
    ];
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

  // Initialize mock data
  private initializeMockData(): void {
    // Mock SSH connections
    this.connections.set('conn_1', {
      id: 'conn_1',
      type: 'ssh',
      name: 'Production Server',
      status: 'disconnected',
      config: {
        host: 'prod.example.com',
        port: 22,
        username: 'deploy',
        authMethod: 'key',
        privateKeyPath: '~/.ssh/id_rsa',
        forwardAgent: true,
        keepAliveInterval: 60,
      } as SSHConfig,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });

    this.connections.set('conn_2', {
      id: 'conn_2',
      type: 'wsl',
      name: 'Ubuntu WSL',
      status: 'disconnected',
      config: {
        distribution: 'Ubuntu-22.04',
        mountPoint: '/mnt/c',
        networkingMode: 'mirrored',
        features: { systemd: true, gui: false, nested: false },
      } as WSLConfig,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    // Mock Docker containers
    this.containers = [
      {
        id: 'abc123def456',
        name: 'web-app',
        image: 'node:18-alpine',
        status: 'running',
        state: 'running',
        ports: [{ hostPort: 3000, containerPort: 3000, protocol: 'tcp' }],
        created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        started: new Date(Date.now() - 1 * 60 * 60 * 1000),
        stats: { cpuPercent: 2.5, memoryUsage: 128000000, memoryLimit: 512000000, networkRx: 1500000, networkTx: 800000 },
      },
      {
        id: 'def789ghi012',
        name: 'postgres-db',
        image: 'postgres:15',
        status: 'running',
        state: 'running',
        ports: [{ hostPort: 5432, containerPort: 5432, protocol: 'tcp' }],
        created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        started: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        stats: { cpuPercent: 0.8, memoryUsage: 256000000, memoryLimit: 1024000000, networkRx: 500000, networkTx: 300000 },
      },
      {
        id: 'ghi345jkl678',
        name: 'redis-cache',
        image: 'redis:7-alpine',
        status: 'exited',
        state: 'exited',
        ports: [{ hostPort: 6379, containerPort: 6379, protocol: 'tcp' }],
        created: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ];

    // Mock Docker images
    this.images = [
      { id: 'sha256:abc123', repository: 'node', tag: '18-alpine', created: new Date(), size: 180000000, layers: 8 },
      { id: 'sha256:def456', repository: 'postgres', tag: '15', created: new Date(), size: 380000000, layers: 12 },
      { id: 'sha256:ghi789', repository: 'redis', tag: '7-alpine', created: new Date(), size: 40000000, layers: 5 },
      { id: 'sha256:jkl012', repository: 'nginx', tag: 'latest', created: new Date(), size: 140000000, layers: 6 },
    ];

    // Mock volumes
    this.volumes = [
      { name: 'postgres-data', driver: 'local', mountpoint: '/var/lib/docker/volumes/postgres-data', created: new Date(), size: 500000000 },
      { name: 'redis-data', driver: 'local', mountpoint: '/var/lib/docker/volumes/redis-data', created: new Date(), size: 50000000 },
    ];

    // Mock networks
    this.networks = [
      { id: 'net123', name: 'bridge', driver: 'bridge', scope: 'local', containers: [] },
      { id: 'net456', name: 'app-network', driver: 'bridge', scope: 'local', ipam: { subnet: '172.20.0.0/16', gateway: '172.20.0.1' }, containers: ['abc123def456', 'def789ghi012'] },
    ];

    // Mock kernels
    this.kernels.set('kernel_python', {
      id: 'kernel_python',
      name: 'python3',
      spec: { name: 'python3', displayName: 'Python 3', language: 'python', interruptMode: 'signal' },
      status: 'idle',
      executionCount: 0,
      lastActivity: new Date(),
      connections: 1,
    });

    // Mock database connections
    this.databaseConnections.set('db_1', {
      id: 'db_1',
      name: 'Local PostgreSQL',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      username: 'postgres',
      ssl: false,
      status: 'disconnected',
    });

    this.databaseConnections.set('db_2', {
      id: 'db_2',
      name: 'Production MySQL',
      type: 'mysql',
      host: 'db.example.com',
      port: 3306,
      database: 'production',
      username: 'admin',
      ssl: true,
      status: 'disconnected',
    });
  }
}

export const remoteDevelopmentService = new RemoteDevelopmentService();
export default remoteDevelopmentService;
