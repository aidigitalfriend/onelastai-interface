import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import taskRunnerService, {
  Task,
  TaskExecution,
  TaskTemplate,
  TestRun,
  TestSuite,
  TestCase,
  TestFramework,
  CoverageReport,
  AutomationRule,
} from '../services/taskRunner';

type TabType = 'tasks' | 'tests' | 'coverage' | 'automation' | 'history';

export const TaskRunnerPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [tasks, setTasks] = useState<Task[]>(taskRunnerService.getAllTasks());
  const [templates, setTemplates] = useState<TaskTemplate[]>(taskRunnerService.getTaskTemplates());
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [activeExecution, setActiveExecution] = useState<TaskExecution | null>(null);
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(taskRunnerService.getAutomationRules());
  const [selectedFramework, setSelectedFramework] = useState<TestFramework>('jest');
  const [showTemplates, setShowTemplates] = useState(false);
  const [taskFilter, setTaskFilter] = useState('');
  const [testFilter, setTestFilter] = useState('');
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [runWithCoverage, setRunWithCoverage] = useState(false);
  const [isConnected, setIsConnected] = useState(taskRunnerService.isConnected());
  const outputRef = useRef<HTMLDivElement>(null);

  const frameworks = taskRunnerService.getTestFrameworks();

  useEffect(() => {
    const unsubscribe = taskRunnerService.on('*', (event) => {
      switch (event.type) {
        case 'taskStart':
        case 'taskEnd':
          setExecutions([...taskRunnerService.getExecutionHistory()]);
          setActiveExecution(event.data.execution);
          break;
        case 'taskOutput':
          setActiveExecution(prev => prev ? { ...prev } : null);
          break;
        case 'testStart':
        case 'testEnd':
        case 'testResult':
          setTestRun(event.data.testRun ? { ...event.data.testRun } : null);
          if (event.data.testRun?.coverage) {
            setCoverage(event.data.testRun.coverage);
          }
          break;
      }
    });

    // Check connection status periodically
    const interval = setInterval(() => {
      setIsConnected(taskRunnerService.isConnected());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeExecution?.output.length]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'tasks', label: 'Tasks', icon: '📋' },
    { id: 'tests', label: 'Tests', icon: '🧪' },
    { id: 'coverage', label: 'Coverage', icon: '📊' },
    { id: 'automation', label: 'Automation', icon: '⚙️' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  const handleRunTask = async (taskId: string) => {
    try {
      await taskRunnerService.executeTask(taskId);
    } catch (error) {
      console.error('Task execution failed:', error);
    }
  };

  const handleCancelTask = (executionId: string) => {
    taskRunnerService.cancelTask(executionId);
  };

  const handleRunTests = async () => {
    try {
      await taskRunnerService.runTests(selectedFramework, {
        coverage: runWithCoverage,
        filter: testFilter || undefined,
      });
    } catch (error) {
      console.error('Test run failed:', error);
    }
  };

  const handleCancelTests = () => {
    if (testRun) {
      taskRunnerService.cancelTestRun(testRun.id);
    }
  };

  const handleRerunFailed = async () => {
    await taskRunnerService.rerunFailedTests();
  };

  const toggleSuiteExpand = (suiteId: string) => {
    const newExpanded = new Set(expandedSuites);
    if (newExpanded.has(suiteId)) {
      newExpanded.delete(suiteId);
    } else {
      newExpanded.add(suiteId);
    }
    setExpandedSuites(newExpanded);
  };

  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(taskFilter.toLowerCase()) ||
    task.type.toLowerCase().includes(taskFilter.toLowerCase())
  );

  const tasksByGroup = filteredTasks.reduce((acc, task) => {
    const group = task.group || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <span className="animate-spin">⏳</span>;
      case 'success':
      case 'passed':
      case 'completed': return <span className="text-green-400">✓</span>;
      case 'failed': return <span className="text-red-400">✗</span>;
      case 'cancelled': return <span className="text-yellow-400">⊘</span>;
      case 'skipped': return <span className="text-gray-400">○</span>;
      default: return <span className="text-gray-500">○</span>;
    }
  };

  const getCoverageColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCoverageBarColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderTestCase = (test: TestCase, depth: number = 0) => (
    <div
      key={test.id}
      className={`flex items-center gap-2 py-1 px-2 text-xs hover:bg-[#2a2d2e] ${
        test.status === 'failed' ? 'bg-red-900/20' : ''
      }`}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
    >
      {getStatusIcon(test.status)}
      <span className={test.status === 'failed' ? 'text-red-300' : 'text-gray-300'}>
        {test.name}
      </span>
      {test.duration !== undefined && (
        <span className="text-gray-600 ml-auto">{test.duration}ms</span>
      )}
    </div>
  );

  const renderTestSuite = (suite: TestSuite) => {
    const isExpanded = expandedSuites.has(suite.id);
    const passedCount = suite.tests.filter(t => t.status === 'passed').length;
    const failedCount = suite.tests.filter(t => t.status === 'failed').length;

    return (
      <div key={suite.id} className="border-b border-[#3c3c3c]">
        <div
          className={`flex items-center gap-2 py-2 px-2 cursor-pointer hover:bg-[#2a2d2e] ${
            suite.status === 'failed' ? 'bg-red-900/10' : ''
          }`}
          onClick={() => toggleSuiteExpand(suite.id)}
        >
          <span className="text-gray-400 text-xs">
            {isExpanded ? '▼' : '▶'}
          </span>
          {getStatusIcon(suite.status)}
          <span className="text-white text-sm font-medium">{suite.name}</span>
          <span className="text-gray-500 text-xs ml-auto">
            {passedCount > 0 && <span className="text-green-400 mr-2">{passedCount} passed</span>}
            {failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
          </span>
          {suite.duration !== undefined && (
            <span className="text-gray-600 text-xs">{suite.duration}ms</span>
          )}
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {suite.tests.map(test => renderTestCase(test, 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderCoverageBar = (percentage: number, label: string) => (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={getCoverageColor(percentage)}>{percentage}%</span>
      </div>
      <div className="h-2 bg-[#3c3c3c] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full ${getCoverageBarColor(percentage)}`}
        />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <span className="text-lg">🚀</span>
        <span className="font-medium text-sm">Task Runner</span>
        {/* Connection status indicator */}
        <div className="flex items-center gap-1 ml-2" title={isConnected ? 'Connected to task server' : 'Using simulation mode'}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-orange-400'}`} />
          <span className="text-[10px] text-gray-500">{isConnected ? 'Live' : 'Sim'}</span>
        </div>
        {activeExecution?.status === 'running' && (
          <span className="ml-auto flex items-center gap-1 text-xs text-blue-400">
            <span className="animate-spin">⏳</span>
            Running...
          </span>
        )}
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
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Task Search & Actions */}
            <div className="p-2 border-b border-[#3c3c3c] flex gap-2">
              <input
                type="text"
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                placeholder="Filter tasks..."
                className="flex-1 bg-[#3c3c3c] text-white text-xs px-2 py-1 rounded outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
              >
                + Add Task
              </button>
            </div>

            {/* Task Templates Dropdown */}
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-[#252526] border-b border-[#3c3c3c]"
                >
                  <div className="p-2 max-h-48 overflow-auto">
                    <div className="text-xs text-gray-400 mb-2">Quick Add Templates</div>
                    <div className="grid grid-cols-2 gap-1">
                      {templates.slice(0, 12).map(template => (
                        <button
                          key={template.id}
                          onClick={() => {
                            taskRunnerService.addTask({
                              id: `${template.id}-${Date.now()}`,
                              name: template.name,
                              type: template.type,
                              command: template.command,
                              args: template.args,
                              description: template.description,
                              group: template.category,
                            });
                            setTasks([...taskRunnerService.getAllTasks()]);
                            setShowTemplates(false);
                          }}
                          className="flex items-center gap-2 p-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-xs text-left"
                        >
                          <span>{template.icon}</span>
                          <span className="truncate">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Task List */}
            <div className="flex-1 overflow-auto">
              {Object.entries(tasksByGroup).map(([group, groupTasks]) => (
                <div key={group}>
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-[#2d2d2d] text-xs font-medium text-gray-300 sticky top-0">
                    <span className="capitalize">{group}</span>
                    <span className="text-gray-600">({groupTasks.length})</span>
                  </div>
                  {groupTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#2a2d2e] group"
                    >
                      <span className="text-gray-500">
                        {task.type === 'build' && '🔨'}
                        {task.type === 'test' && '🧪'}
                        {task.type === 'lint' && '🔍'}
                        {task.type === 'watch' && '👁️'}
                        {task.type === 'deploy' && '🚀'}
                        {task.type === 'install' && '📦'}
                        {task.type === 'clean' && '🗑️'}
                        {task.type === 'format' && '✨'}
                        {task.type === 'custom' && '⚡'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{task.name}</div>
                        {task.description && (
                          <div className="text-xs text-gray-500 truncate">{task.description}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRunTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-green-600/20 rounded text-green-400 text-xs"
                        title="Run task"
                      >
                        ▶
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Task Output */}
            {activeExecution && (
              <div className="h-48 border-t border-[#3c3c3c] flex flex-col">
                <div className="flex items-center justify-between px-2 py-1 bg-[#252526] border-b border-[#3c3c3c]">
                  <div className="flex items-center gap-2 text-xs">
                    {getStatusIcon(activeExecution.status)}
                    <span className="text-white">{activeExecution.task.name}</span>
                  </div>
                  {activeExecution.status === 'running' && (
                    <button
                      onClick={() => handleCancelTask(activeExecution.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div
                  ref={outputRef}
                  className="flex-1 overflow-auto p-2 font-mono text-xs bg-[#1e1e1e]"
                >
                  {activeExecution.output.map((line, i) => (
                    <div key={i} className={line.includes('✓') ? 'text-green-400' : line.includes('✗') ? 'text-red-400' : 'text-gray-300'}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Test Controls */}
            <div className="p-2 border-b border-[#3c3c3c] space-y-2">
              <div className="flex gap-2">
                <select
                  value={selectedFramework}
                  onChange={(e) => setSelectedFramework(e.target.value as TestFramework)}
                  className="flex-1 bg-[#3c3c3c] text-white text-xs px-2 py-1.5 rounded outline-none"
                >
                  {Object.entries(frameworks).map(([key, fw]) => (
                    <option key={key} value={key}>
                      {fw.icon} {fw.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRunTests}
                  disabled={testRun?.status === 'running'}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-xs font-medium flex items-center gap-1"
                >
                  {testRun?.status === 'running' ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Running...
                    </>
                  ) : (
                    <>▶ Run Tests</>
                  )}
                </button>
                {testRun?.status === 'running' && (
                  <button
                    onClick={handleCancelTests}
                    className="px-2 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs"
                  >
                    Stop
                  </button>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={testFilter}
                  onChange={(e) => setTestFilter(e.target.value)}
                  placeholder="Filter tests..."
                  className="flex-1 bg-[#3c3c3c] text-white text-xs px-2 py-1 rounded outline-none"
                />
                <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runWithCoverage}
                    onChange={(e) => setRunWithCoverage(e.target.checked)}
                    className="w-3 h-3"
                  />
                  Coverage
                </label>
                {testRun && testRun.summary.failed > 0 && (
                  <button
                    onClick={handleRerunFailed}
                    className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
                  >
                    Rerun Failed
                  </button>
                )}
              </div>
            </div>

            {/* Test Summary */}
            {testRun && (
              <div className="px-2 py-2 bg-[#252526] border-b border-[#3c3c3c]">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-400">
                    Tests: <span className="text-white">{testRun.summary.total}</span>
                  </span>
                  <span className="text-green-400">
                    ✓ {testRun.summary.passed}
                  </span>
                  {testRun.summary.failed > 0 && (
                    <span className="text-red-400">
                      ✗ {testRun.summary.failed}
                    </span>
                  )}
                  {testRun.summary.skipped > 0 && (
                    <span className="text-gray-400">
                      ○ {testRun.summary.skipped}
                    </span>
                  )}
                  <span className="text-gray-500 ml-auto">
                    {testRun.summary.duration}ms
                  </span>
                </div>
                {/* Progress bar */}
                {testRun.summary.total > 0 && (
                  <div className="mt-2 h-1.5 bg-[#3c3c3c] rounded-full overflow-hidden flex">
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(testRun.summary.passed / testRun.summary.total) * 100}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(testRun.summary.failed / testRun.summary.total) * 100}%` }}
                    />
                    <div
                      className="bg-gray-500 transition-all"
                      style={{ width: `${(testRun.summary.skipped / testRun.summary.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Test Results */}
            <div className="flex-1 overflow-auto">
              {testRun ? (
                testRun.suites.map(suite => renderTestSuite(suite))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Select a test framework and click "Run Tests" to start
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coverage Tab */}
        {activeTab === 'coverage' && (
          <div className="flex-1 overflow-auto p-3">
            {coverage ? (
              <>
                {/* Summary */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-white mb-3">Coverage Summary</h3>
                  {renderCoverageBar(coverage.summary.lines.percentage, 'Lines')}
                  {renderCoverageBar(coverage.summary.statements.percentage, 'Statements')}
                  {renderCoverageBar(coverage.summary.functions.percentage, 'Functions')}
                  {renderCoverageBar(coverage.summary.branches.percentage, 'Branches')}
                </div>

                {/* File Coverage */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">File Coverage</h3>
                  <div className="space-y-1">
                    {coverage.files.map(file => (
                      <div
                        key={file.file}
                        className="flex items-center gap-2 p-2 bg-[#252526] rounded text-xs"
                      >
                        <span className="text-[#4fc1ff] flex-1 truncate">{file.file}</span>
                        <span className={getCoverageColor(file.lines.percentage)}>
                          {file.lines.percentage}%
                        </span>
                        <div className="w-16 h-1.5 bg-[#3c3c3c] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getCoverageBarColor(file.lines.percentage)}`}
                            style={{ width: `${file.lines.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 text-sm py-8">
                <p>No coverage data available</p>
                <p className="text-xs mt-2">Run tests with coverage enabled to see results</p>
              </div>
            )}
          </div>
        )}

        {/* Automation Tab */}
        {activeTab === 'automation' && (
          <div className="flex-1 overflow-auto">
            <div className="p-2 border-b border-[#3c3c3c]">
              <button
                onClick={() => {
                  const rule: AutomationRule = {
                    id: `rule-${Date.now()}`,
                    name: 'New Rule',
                    enabled: true,
                    trigger: { type: 'fileChange', pattern: '**/*.{ts,tsx}' },
                    tasks: [],
                  };
                  taskRunnerService.addAutomationRule(rule);
                  setAutomationRules([...taskRunnerService.getAutomationRules()]);
                }}
                className="w-full px-3 py-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-xs flex items-center justify-center gap-2"
              >
                <span>+</span>
                <span>Add Automation Rule</span>
              </button>
            </div>

            {automationRules.length > 0 ? (
              <div className="p-2 space-y-2">
                {automationRules.map(rule => (
                  <div
                    key={rule.id}
                    className={`p-3 bg-[#252526] rounded border ${
                      rule.enabled ? 'border-green-500/30' : 'border-[#3c3c3c]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => {
                          taskRunnerService.toggleAutomationRule(rule.id);
                          setAutomationRules([...taskRunnerService.getAutomationRules()]);
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-white font-medium">{rule.name}</span>
                      <button
                        onClick={() => {
                          taskRunnerService.removeAutomationRule(rule.id);
                          setAutomationRules([...taskRunnerService.getAutomationRules()]);
                        }}
                        className="ml-auto text-gray-500 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-xs text-gray-400">
                      <span className="mr-2">Trigger:</span>
                      <span className="text-blue-400">{rule.trigger.type}</span>
                      {rule.trigger.pattern && (
                        <span className="text-gray-500 ml-1">({rule.trigger.pattern})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                <p>No automation rules defined</p>
                <p className="text-xs mt-2">Add rules to automate tasks on file changes, git hooks, etc.</p>
              </div>
            )}

            {/* Pre-defined Automation Templates */}
            <div className="p-2 border-t border-[#3c3c3c] mt-4">
              <div className="text-xs text-gray-400 mb-2">Quick Templates</div>
              <div className="space-y-1">
                {[
                  { name: 'Lint on Save', trigger: { type: 'fileChange' as const, pattern: '**/*.{ts,tsx,js,jsx}' }, tasks: ['eslint'] },
                  { name: 'Test on Change', trigger: { type: 'fileChange' as const, pattern: '**/*.test.{ts,tsx}' }, tasks: ['jest'] },
                  { name: 'Format Pre-Commit', trigger: { type: 'gitHook' as const, gitEvent: 'pre-commit' as const }, tasks: ['prettier'] },
                  { name: 'Build on Push', trigger: { type: 'gitHook' as const, gitEvent: 'pre-push' as const }, tasks: ['npm-build'] },
                ].map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const rule: AutomationRule = {
                        id: `rule-${Date.now()}`,
                        name: template.name,
                        enabled: true,
                        trigger: template.trigger,
                        tasks: template.tasks,
                      };
                      taskRunnerService.addAutomationRule(rule);
                      setAutomationRules([...taskRunnerService.getAutomationRules()]);
                    }}
                    className="w-full flex items-center gap-2 p-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-xs text-left"
                  >
                    <span className="text-blue-400">+</span>
                    <span className="text-white">{template.name}</span>
                    <span className="text-gray-500 ml-auto">{template.trigger.type}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-auto">
            <div className="p-2 border-b border-[#3c3c3c] flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {executions.length} executions
              </span>
              <button
                onClick={() => {
                  taskRunnerService.clearHistory();
                  setExecutions([...taskRunnerService.getExecutionHistory()]);
                }}
                className="text-xs text-gray-500 hover:text-red-400"
              >
                Clear History
              </button>
            </div>
            {executions.length > 0 ? (
              <div>
                {executions.map(exec => (
                  <div
                    key={exec.id}
                    onClick={() => setActiveExecution(exec)}
                    className={`flex items-center gap-2 px-2 py-2 hover:bg-[#2a2d2e] cursor-pointer border-b border-[#3c3c3c] ${
                      activeExecution?.id === exec.id ? 'bg-[#094771]' : ''
                    }`}
                  >
                    {getStatusIcon(exec.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{exec.task.name}</div>
                      <div className="text-xs text-gray-500">
                        {exec.startTime.toLocaleTimeString()}
                        {exec.endTime && ` • ${((exec.endTime.getTime() - exec.startTime.getTime()) / 1000).toFixed(1)}s`}
                      </div>
                    </div>
                    {exec.exitCode !== undefined && (
                      <span className={`text-xs ${exec.exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        exit {exec.exitCode}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No task execution history
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-t border-[#3c3c3c] text-xs">
        <div className="flex items-center gap-3 text-gray-400">
          <span>Tasks: {tasks.length}</span>
          {testRun && (
            <span>
              Tests: {testRun.summary.passed}/{testRun.summary.total}
            </span>
          )}
          {coverage && (
            <span className={getCoverageColor(coverage.summary.lines.percentage)}>
              Coverage: {coverage.summary.lines.percentage}%
            </span>
          )}
        </div>
        <div className="text-gray-500">
          {selectedFramework && frameworks[selectedFramework]?.icon} {frameworks[selectedFramework]?.name}
        </div>
      </div>
    </div>
  );
};

export default TaskRunnerPanel;
