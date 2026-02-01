import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import remoteDevelopmentService, {
  RemoteConnection,
  DockerContainer,
  DockerImage,
  DockerVolume,
  NotebookDocument,
  NotebookCell,
  DatabaseConnection,
  DatabaseTable,
  QueryResult,
} from '../services/remoteDevelopment';

type TabType = 'connections' | 'docker' | 'notebooks' | 'database';
type DockerSubTab = 'containers' | 'images' | 'volumes';

export const RemoteDevelopmentPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('connections');
  const [dockerSubTab, setDockerSubTab] = useState<DockerSubTab>('containers');
  const [connections, setConnections] = useState<RemoteConnection[]>(remoteDevelopmentService.getConnections());
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [volumes, setVolumes] = useState<DockerVolume[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookDocument[]>(remoteDevelopmentService.getNotebooks());
  const [dbConnections, setDbConnections] = useState<DatabaseConnection[]>(remoteDevelopmentService.getDatabaseConnections());
  const [selectedConnection, setSelectedConnection] = useState<RemoteConnection | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<NotebookDocument | null>(null);
  const [selectedDb, setSelectedDb] = useState<DatabaseConnection | null>(null);
  const [queryText, setQueryText] = useState('SELECT * FROM users LIMIT 10');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [containerLogs, setContainerLogs] = useState<string[]>([]);
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false);

  useEffect(() => {
    loadDockerData();
    
    const unsubscribe = remoteDevelopmentService.on('*', (event) => {
      switch (event.type) {
        case 'connectionStatusChanged':
        case 'connectionCreated':
          setConnections([...remoteDevelopmentService.getConnections()]);
          break;
        case 'containerStatusChanged':
        case 'containerCreated':
        case 'containerRemoved':
          loadDockerData();
          break;
        case 'databaseStatusChanged':
          setDbConnections([...remoteDevelopmentService.getDatabaseConnections()]);
          break;
        case 'notebookCreated':
          setNotebooks([...remoteDevelopmentService.getNotebooks()]);
          break;
      }
    });

    return unsubscribe;
  }, []);

  const loadDockerData = async () => {
    const [c, i, v] = await Promise.all([
      remoteDevelopmentService.listContainers(),
      remoteDevelopmentService.listImages(),
      remoteDevelopmentService.listVolumes(),
    ]);
    setContainers(c);
    setImages(i);
    setVolumes(v);
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'connections', label: 'Remote', icon: '🔗' },
    { id: 'docker', label: 'Docker', icon: '🐳' },
    { id: 'notebooks', label: 'Notebooks', icon: '📓' },
    { id: 'database', label: 'Database', icon: '🗄️' },
  ];

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected':
      case 'running':
        return 'text-green-400';
      case 'connecting':
      case 'starting':
        return 'text-yellow-400';
      case 'error':
      case 'dead':
        return 'text-red-400';
      case 'exited':
      case 'paused':
        return 'text-gray-400';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusDot = (status: string): string => {
    switch (status) {
      case 'connected':
      case 'running':
        return 'bg-green-500';
      case 'connecting':
      case 'starting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
      case 'dead':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConnectionIcon = (type: string): string => {
    switch (type) {
      case 'ssh': return '🔐';
      case 'wsl': return '🪟';
      case 'container': return '📦';
      case 'tunnel': return '🚇';
      case 'codespaces': return '☁️';
      default: return '🔗';
    }
  };

  const handleConnect = async (connectionId: string) => {
    try {
      await remoteDevelopmentService.connect(connectionId);
    } catch (error: any) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    await remoteDevelopmentService.disconnect(connectionId);
  };

  const handleStartContainer = async (containerId: string) => {
    await remoteDevelopmentService.startContainer(containerId);
  };

  const handleStopContainer = async (containerId: string) => {
    await remoteDevelopmentService.stopContainer(containerId);
  };

  const handleRestartContainer = async (containerId: string) => {
    await remoteDevelopmentService.restartContainer(containerId);
  };

  const handleViewLogs = async (containerId: string) => {
    const logs = await remoteDevelopmentService.getContainerLogs(containerId);
    setContainerLogs(logs);
  };

  const handleConnectDb = async (connectionId: string) => {
    await remoteDevelopmentService.connectDatabase(connectionId);
  };

  const handleExecuteQuery = async () => {
    if (!selectedDb || selectedDb.status !== 'connected') return;
    
    setIsExecutingQuery(true);
    try {
      const result = await remoteDevelopmentService.executeQuery(selectedDb.id, queryText);
      setQueryResult(result);
    } catch (error: any) {
      setQueryResult({ columns: [], rows: [], rowCount: 0, executionTime: 0, error: error.message });
    }
    setIsExecutingQuery(false);
  };

  const handleExecuteCell = async (notebookId: string, cellId: string) => {
    await remoteDevelopmentService.executeCell(notebookId, cellId);
    setNotebooks([...remoteDevelopmentService.getNotebooks()]);
  };

  const handleCreateNotebook = async () => {
    const notebook = await remoteDevelopmentService.createNotebook('Untitled', 'python');
    setNotebooks([...remoteDevelopmentService.getNotebooks()]);
    setSelectedNotebook(notebook);
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌐</span>
          <span className="font-medium text-sm">Remote Development</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#3c3c3c] bg-[#252526]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Remote Connections Tab */}
        {activeTab === 'connections' && (
          <div className="flex-1 overflow-auto">
            <div className="p-2 border-b border-[#3c3c3c] bg-[#252526]">
              <button
                onClick={() => setShowNewConnectionModal(true)}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium"
              >
                + New Connection
              </button>
            </div>
            <div className="divide-y divide-[#3c3c3c]">
              {connections.map(conn => (
                <div
                  key={conn.id}
                  onClick={() => setSelectedConnection(conn)}
                  className={`px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] ${
                    selectedConnection?.id === conn.id ? 'bg-[#094771]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(conn.status)}`} />
                    <span className="text-lg">{getConnectionIcon(conn.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{conn.name}</div>
                      <div className="text-xs text-gray-500">{conn.type.toUpperCase()}</div>
                    </div>
                    <div className="flex gap-1">
                      {conn.status === 'disconnected' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConnect(conn.id); }}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                        >
                          Connect
                        </button>
                      ) : conn.status === 'connected' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDisconnect(conn.id); }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <span className="text-xs text-yellow-400 animate-pulse">Connecting...</span>
                      )}
                    </div>
                  </div>
                  {conn.status === 'connected' && conn.stats && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-gray-500">
                      <div>Latency: {conn.stats.latency}ms</div>
                      <div>CPU: {conn.stats.cpuUsage?.toFixed(1)}%</div>
                      <div>Memory: {conn.stats.memoryUsage?.toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* WSL Distributions */}
            <div className="p-3 border-t border-[#3c3c3c]">
              <h3 className="text-xs font-medium text-gray-400 mb-2">WSL Distributions</h3>
              <div className="space-y-1">
                {remoteDevelopmentService.getWSLDistributions().map(dist => (
                  <div key={dist.name} className="flex items-center gap-2 px-2 py-1 bg-[#252526] rounded">
                    <span>🪟</span>
                    <span className="text-sm text-white">{dist.name}</span>
                    {dist.default && <span className="text-[10px] text-blue-400">default</span>}
                    <span className="text-xs text-gray-500 ml-auto">WSL {dist.version}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Docker Tab */}
        {activeTab === 'docker' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Docker Sub-tabs */}
            <div className="flex border-b border-[#3c3c3c] px-2">
              {(['containers', 'images', 'volumes'] as DockerSubTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDockerSubTab(tab)}
                  className={`px-3 py-1 text-xs capitalize ${
                    dockerSubTab === tab ? 'text-white border-b border-blue-500' : 'text-gray-500'
                  }`}
                >
                  {tab} ({tab === 'containers' ? containers.length : tab === 'images' ? images.length : volumes.length})
                </button>
              ))}
            </div>

            {/* Containers */}
            {dockerSubTab === 'containers' && (
              <div className="flex-1 overflow-auto">
                {containers.map(container => (
                  <div
                    key={container.id}
                    onClick={() => { setSelectedContainer(container); handleViewLogs(container.id); }}
                    className={`px-3 py-2 border-b border-[#3c3c3c] cursor-pointer hover:bg-[#2a2d2e] ${
                      selectedContainer?.id === container.id ? 'bg-[#094771]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusDot(container.status)}`} />
                      <div className="flex-1">
                        <div className="text-sm text-white">{container.name}</div>
                        <div className="text-xs text-gray-500">{container.image}</div>
                      </div>
                      <div className="flex gap-1">
                        {container.status === 'running' ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStopContainer(container.id); }}
                              className="p-1 hover:bg-red-600/30 rounded"
                              title="Stop"
                            >
                              ⏹
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestartContainer(container.id); }}
                              className="p-1 hover:bg-yellow-600/30 rounded"
                              title="Restart"
                            >
                              🔄
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartContainer(container.id); }}
                            className="p-1 hover:bg-green-600/30 rounded"
                            title="Start"
                          >
                            ▶
                          </button>
                        )}
                      </div>
                    </div>
                    {container.stats && (
                      <div className="mt-1 flex gap-4 text-[10px] text-gray-500">
                        <span>CPU: {container.stats.cpuPercent.toFixed(1)}%</span>
                        <span>MEM: {formatBytes(container.stats.memoryUsage)}</span>
                        <span>NET: ↓{formatBytes(container.stats.networkRx)} ↑{formatBytes(container.stats.networkTx)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Images */}
            {dockerSubTab === 'images' && (
              <div className="flex-1 overflow-auto">
                {images.map(image => (
                  <div key={image.id} className="px-3 py-2 border-b border-[#3c3c3c] hover:bg-[#2a2d2e]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white">{image.repository}:{image.tag}</div>
                        <div className="text-xs text-gray-500">{image.id.slice(0, 20)}...</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">{formatBytes(image.size)}</div>
                        <div className="text-[10px] text-gray-500">{image.layers} layers</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Volumes */}
            {dockerSubTab === 'volumes' && (
              <div className="flex-1 overflow-auto">
                {volumes.map(volume => (
                  <div key={volume.name} className="px-3 py-2 border-b border-[#3c3c3c] hover:bg-[#2a2d2e]">
                    <div className="text-sm text-white">{volume.name}</div>
                    <div className="text-xs text-gray-500">{volume.mountpoint}</div>
                    {volume.size && <div className="text-xs text-gray-400">{formatBytes(volume.size)}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Container Logs */}
            {selectedContainer && containerLogs.length > 0 && (
              <div className="h-32 border-t border-[#3c3c3c] bg-[#1a1a1a]">
                <div className="px-2 py-1 text-xs text-gray-400 border-b border-[#3c3c3c]">
                  Logs: {selectedContainer.name}
                </div>
                <div className="p-2 overflow-auto h-24 font-mono text-[10px] text-gray-300">
                  {containerLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notebooks Tab */}
        {activeTab === 'notebooks' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-[#3c3c3c] bg-[#252526]">
              <button
                onClick={handleCreateNotebook}
                className="w-full py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs font-medium"
              >
                + New Notebook
              </button>
            </div>
            
            {selectedNotebook ? (
              <div className="flex-1 overflow-auto">
                <div className="p-2 border-b border-[#3c3c3c] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedNotebook(null)} className="text-gray-400 hover:text-white">
                      ←
                    </button>
                    <span className="text-sm text-white">{selectedNotebook.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-400">● Python 3</span>
                  </div>
                </div>
                <div className="p-2 space-y-2">
                  {selectedNotebook.cells.map((cell, index) => (
                    <div key={cell.id} className="bg-[#252526] rounded overflow-hidden">
                      <div className="flex items-center justify-between px-2 py-1 bg-[#2d2d2d] text-[10px]">
                        <span className={cell.type === 'code' ? 'text-blue-400' : 'text-green-400'}>
                          [{cell.type === 'code' ? cell.executionCount || ' ' : 'md'}]
                        </span>
                        {cell.type === 'code' && (
                          <button
                            onClick={() => handleExecuteCell(selectedNotebook.id, cell.id)}
                            disabled={cell.executionState === 'running'}
                            className="px-2 py-0.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded"
                          >
                            {cell.executionState === 'running' ? '⏳' : '▶'} Run
                          </button>
                        )}
                      </div>
                      <div className="p-2">
                        <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
                          {cell.source}
                        </pre>
                      </div>
                      {cell.outputs.length > 0 && (
                        <div className="border-t border-[#3c3c3c] p-2 bg-[#1a1a1a]">
                          {cell.outputs.map((output, i) => (
                            <div key={i} className="text-xs">
                              {output.type === 'stream' && (
                                <pre className="text-gray-300">{output.text}</pre>
                              )}
                              {output.type === 'execute_result' && output.data && (
                                <div 
                                  className="text-gray-300"
                                  dangerouslySetInnerHTML={{ __html: output.data['text/html'] || output.data['text/plain'] || '' }}
                                />
                              )}
                              {output.type === 'error' && (
                                <pre className="text-red-400">{output.traceback?.join('\n')}</pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                {notebooks.length > 0 ? (
                  <div className="divide-y divide-[#3c3c3c]">
                    {notebooks.map(notebook => (
                      <div
                        key={notebook.id}
                        onClick={() => setSelectedNotebook(notebook)}
                        className="px-3 py-2 cursor-pointer hover:bg-[#2a2d2e]"
                      >
                        <div className="flex items-center gap-2">
                          <span>📓</span>
                          <div className="flex-1">
                            <div className="text-sm text-white">{notebook.name}</div>
                            <div className="text-xs text-gray-500">{notebook.cells.length} cells • {notebook.language}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No notebooks. Click "New Notebook" to create one.
                  </div>
                )}

                {/* Sample Notebooks */}
                <div className="p-3 border-t border-[#3c3c3c]">
                  <h3 className="text-xs font-medium text-gray-400 mb-2">Sample Notebooks</h3>
                  <div className="space-y-1">
                    {['Data Analysis', 'Machine Learning', 'Visualization'].map(name => (
                      <button
                        key={name}
                        onClick={async () => {
                          const notebook = await remoteDevelopmentService.openNotebook(`/samples/${name}.ipynb`);
                          setNotebooks([...remoteDevelopmentService.getNotebooks()]);
                          setSelectedNotebook(notebook);
                        }}
                        className="w-full px-2 py-1.5 bg-[#252526] hover:bg-[#3c3c3c] rounded text-left text-xs flex items-center gap-2"
                      >
                        <span>📓</span>
                        {name}.ipynb
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Database Tab */}
        {activeTab === 'database' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-[#3c3c3c] bg-[#252526]">
              <div className="flex gap-2">
                <select className="flex-1 bg-[#3c3c3c] text-white text-xs px-2 py-1.5 rounded">
                  <option>PostgreSQL</option>
                  <option>MySQL</option>
                  <option>SQLite</option>
                  <option>MongoDB</option>
                </select>
                <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs">
                  + Add
                </button>
              </div>
            </div>

            {/* Database Connections List */}
            <div className="flex-none max-h-40 overflow-auto border-b border-[#3c3c3c]">
              {dbConnections.map(db => (
                <div
                  key={db.id}
                  onClick={() => setSelectedDb(db)}
                  className={`px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] ${
                    selectedDb?.id === db.id ? 'bg-[#094771]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(db.status)}`} />
                    <div className="flex-1">
                      <div className="text-sm text-white">{db.name}</div>
                      <div className="text-xs text-gray-500">{db.type} • {db.host}:{db.port}</div>
                    </div>
                    {db.status === 'disconnected' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleConnectDb(db.id); }}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Database Explorer */}
            {selectedDb?.status === 'connected' && selectedDb.tables && (
              <div className="flex-none max-h-40 overflow-auto border-b border-[#3c3c3c] bg-[#252526]">
                <div className="px-2 py-1 text-xs text-gray-400 sticky top-0 bg-[#252526]">Tables</div>
                {selectedDb.tables.map(table => (
                  <details key={table.name} className="group">
                    <summary className="px-3 py-1 cursor-pointer hover:bg-[#3c3c3c] text-sm text-white flex items-center gap-2">
                      <span className="text-gray-500 group-open:rotate-90 transition-transform">▶</span>
                      🗃️ {table.name}
                      <span className="text-xs text-gray-500 ml-auto">{table.rowCount} rows</span>
                    </summary>
                    <div className="pl-6 py-1 space-y-0.5">
                      {table.columns.map(col => (
                        <div key={col.name} className="px-2 py-0.5 text-xs flex items-center gap-2">
                          <span className={col.isPrimaryKey ? 'text-yellow-400' : col.isForeignKey ? 'text-blue-400' : 'text-gray-500'}>
                            {col.isPrimaryKey ? '🔑' : col.isForeignKey ? '🔗' : '○'}
                          </span>
                          <span className="text-gray-300">{col.name}</span>
                          <span className="text-gray-600">{col.type}</span>
                          {col.nullable && <span className="text-gray-600">null</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}

            {/* Query Editor */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-2 border-b border-[#3c3c3c] flex items-center justify-between bg-[#252526]">
                <span className="text-xs text-gray-400">Query Editor</span>
                <button
                  onClick={handleExecuteQuery}
                  disabled={!selectedDb || selectedDb.status !== 'connected' || isExecutingQuery}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-xs flex items-center gap-1"
                >
                  {isExecutingQuery ? '⏳' : '▶'} Execute
                </button>
              </div>
              <textarea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                className="flex-none h-20 w-full bg-[#1e1e1e] text-white text-xs font-mono p-2 resize-none border-b border-[#3c3c3c]"
                placeholder="Enter SQL query..."
              />
              
              {/* Query Results */}
              {queryResult && (
                <div className="flex-1 overflow-auto">
                  {queryResult.error ? (
                    <div className="p-2 text-red-400 text-xs">{queryResult.error}</div>
                  ) : (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-500 border-b border-[#3c3c3c] sticky top-0 bg-[#252526]">
                        {queryResult.rowCount} rows • {queryResult.executionTime}ms
                      </div>
                      <div className="overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-[#252526] sticky top-0">
                            <tr>
                              {queryResult.columns.map(col => (
                                <th key={col} className="px-2 py-1 text-left text-gray-400 border-b border-[#3c3c3c]">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResult.rows.map((row, i) => (
                              <tr key={i} className="hover:bg-[#2a2d2e]">
                                {row.map((cell, j) => (
                                  <td key={j} className="px-2 py-1 text-gray-300 border-b border-[#3c3c3c]">
                                    {String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-t border-[#3c3c3c] text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>🔗 {connections.filter(c => c.status === 'connected').length} connected</span>
          <span>🐳 {containers.filter(c => c.status === 'running').length} running</span>
        </div>
      </div>
    </div>
  );
};

export default RemoteDevelopmentPanel;
