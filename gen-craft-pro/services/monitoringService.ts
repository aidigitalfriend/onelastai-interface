/**
 * MonitoringService — Application monitoring client
 * Logs, metrics, errors, alerts, and auto-recovery
 * 
 * Phase 6: Auto-detect problems, auto-fix them
 */

export type MetricType = 'cpu' | 'memory' | 'requests' | 'errors' | 'latency' | 'bandwidth';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertChannel = 'email' | 'webhook' | 'slack' | 'in-app';

export interface AppLog {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source: string;
  message: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface MetricSeries {
  type: MetricType;
  label: string;
  unit: string;
  data: MetricDataPoint[];
  current: number;
  avg: number;
  max: number;
  min: number;
}

export interface AppError {
  id: string;
  type: string;
  message: string;
  stackTrace?: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  deploymentId?: string;
  affectedUsers?: number;
  metadata?: Record<string, any>;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastCheck: string;
  uptime: number;          // percentage
  details?: string;
}

export interface Alert {
  id: string;
  projectId: string;
  name: string;
  type: AlertSeverity;
  condition: string;
  threshold: number;
  channel: AlertChannel;
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  resolvedAt?: string;
  createdAt: string;
}

export interface MonitoringOverview {
  health: HealthCheck[];
  activeAlerts: number;
  errorRate: number;
  uptimePercent: number;
  avgLatency: number;
  requestsPerMinute: number;
  activeSandboxes: number;
  activeBuilds: number;
}

export interface RecoveryAction {
  id: string;
  type: 'restart' | 'rollback' | 'scale-up' | 'clear-cache' | 'fix-config';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  reason: string;
  deploymentId?: string;
  triggeredBy: 'auto' | 'manual';
  createdAt: string;
  completedAt?: string;
}

class MonitoringService {
  private baseUrl = '/api/monitoring';

  /**
   * Get monitoring dashboard overview
   */
  async getOverview(projectId?: string): Promise<MonitoringOverview> {
    const url = projectId
      ? `${this.baseUrl}?projectId=${projectId}`
      : this.baseUrl;

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      return {
        health: [],
        activeAlerts: 0,
        errorRate: 0,
        uptimePercent: 99.9,
        avgLatency: 0,
        requestsPerMinute: 0,
        activeSandboxes: 0,
        activeBuilds: 0,
      };
    }

    return response.json();
  }

  /**
   * Stream application logs via Server-Sent Events
   */
  streamLogs(
    deploymentId: string,
    onLog: (log: AppLog) => void,
    filters?: { level?: string; source?: string }
  ): EventSource {
    let url = `${this.baseUrl}/logs?deploymentId=${deploymentId}`;
    if (filters?.level) url += `&level=${filters.level}`;
    if (filters?.source) url += `&source=${filters.source}`;

    const es = new EventSource(url, {
      withCredentials: true,
    } as EventSourceInit);

    es.onmessage = (event) => {
      try {
        const log: AppLog = JSON.parse(event.data);
        onLog(log);
      } catch (e) {
        console.error('[MonitoringService] Failed to parse log:', e);
      }
    };

    return es;
  }

  /**
   * Get historical logs
   */
  async getLogs(
    deploymentId: string,
    options?: { level?: string; since?: string; limit?: number }
  ): Promise<AppLog[]> {
    let url = `${this.baseUrl}/logs/history?deploymentId=${deploymentId}`;
    if (options?.level) url += `&level=${options.level}`;
    if (options?.since) url += `&since=${options.since}`;
    if (options?.limit) url += `&limit=${options.limit}`;

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Get metrics data
   */
  async getMetrics(
    deploymentId: string,
    types: MetricType[] = ['cpu', 'memory', 'requests', 'latency'],
    period: '1h' | '6h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<MetricSeries[]> {
    const response = await fetch(
      `${this.baseUrl}/metrics?deploymentId=${deploymentId}&types=${types.join(',')}&period=${period}`,
      { credentials: 'include' }
    );

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Get error tracking data
   */
  async getErrors(
    projectId: string,
    status?: AppError['status']
  ): Promise<AppError[]> {
    let url = `${this.baseUrl}/errors?projectId=${projectId}`;
    if (status) url += `&status=${status}`;

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Update error status (acknowledge, resolve, ignore)
   */
  async updateError(errorId: string, status: AppError['status']): Promise<void> {
    const response = await fetch(`${this.baseUrl}/errors/${errorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update error: ${response.status}`);
    }
  }

  /**
   * Get health checks
   */
  async getHealth(projectId: string): Promise<HealthCheck[]> {
    const response = await fetch(`${this.baseUrl}/health?projectId=${projectId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Get alert rules
   */
  async getAlerts(projectId: string): Promise<Alert[]> {
    const response = await fetch(`${this.baseUrl}/alerts?projectId=${projectId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Create an alert rule
   */
  async createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'lastTriggered'>): Promise<Alert> {
    const response = await fetch(`${this.baseUrl}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(alert),
    });

    if (!response.ok) {
      throw new Error(`Failed to create alert: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update an alert rule
   */
  async updateAlert(alertId: string, updates: Partial<Alert>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/alerts/${alertId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update alert: ${response.status}`);
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteAlert(alertId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/alerts/${alertId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete alert: ${response.status}`);
    }
  }

  /**
   * Get recent recovery actions
   */
  async getRecoveryActions(projectId: string): Promise<RecoveryAction[]> {
    const response = await fetch(`${this.baseUrl}/recovery?projectId=${projectId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Trigger a manual recovery action
   */
  async triggerRecovery(
    deploymentId: string,
    type: RecoveryAction['type']
  ): Promise<RecoveryAction> {
    const response = await fetch(`${this.baseUrl}/recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ deploymentId, type, triggeredBy: 'manual' }),
    });

    if (!response.ok) {
      throw new Error(`Recovery action failed: ${response.status}`);
    }

    return response.json();
  }
}

export const monitoringService = new MonitoringService();
export default monitoringService;
