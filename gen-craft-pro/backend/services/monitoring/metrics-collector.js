/**
 * GenCraft Pro — Metrics Collector
 * Phase 6: Monitoring & Observability
 * 
 * Collects and aggregates system metrics from sandboxes,
 * deployments, and infrastructure. Powers the monitoring dashboard.
 */

class MetricsCollector {
  constructor() {
    // Time-series data store (production: Prometheus/InfluxDB/CloudWatch)
    this.metrics = new Map();     // metricKey -> dataPoint[]
    this.gauges = new Map();      // current values
    this.counters = new Map();    // cumulative counters
    this.histograms = new Map();  // distribution data

    this.collectionInterval = null;
    this.maxDataPointsPerMetric = 1440; // 24h at 1-minute resolution
  }

  /**
   * Record a gauge value (current state)
   */
  gauge(name, value, labels = {}) {
    const key = this._metricKey(name, labels);
    this.gauges.set(key, { name, value, labels, timestamp: Date.now() });
    this._appendTimeSeries(key, value);
  }

  /**
   * Increment a counter
   */
  increment(name, value = 1, labels = {}) {
    const key = this._metricKey(name, labels);
    const current = this.counters.get(key) || { name, value: 0, labels };
    current.value += value;
    current.timestamp = Date.now();
    this.counters.set(key, current);
    this._appendTimeSeries(key, current.value);
  }

  /**
   * Record a value in a histogram (for percentile calculations)
   */
  observe(name, value, labels = {}) {
    const key = this._metricKey(name, labels);
    const histogram = this.histograms.get(key) || {
      name,
      labels,
      values: [],
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
    };

    histogram.values.push(value);
    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);
    histogram.timestamp = Date.now();

    // Keep only last 1000 observations for percentile calc
    if (histogram.values.length > 1000) {
      histogram.values = histogram.values.slice(-1000);
    }

    this.histograms.set(key, histogram);
    this._appendTimeSeries(key, value);
  }

  /**
   * Collect system metrics for a project
   */
  collectProjectMetrics(projectId, metrics) {
    const {
      cpuPercent = 0,
      memoryUsedMB = 0,
      memoryTotalMB = 0,
      diskUsedMB = 0,
      diskTotalMB = 0,
      networkInBytes = 0,
      networkOutBytes = 0,
      activeConnections = 0,
      requestsPerMinute = 0,
      responseTimeMs = 0,
      errorRate = 0,
    } = metrics;

    const labels = { projectId };

    this.gauge('cpu_usage_percent', cpuPercent, labels);
    this.gauge('memory_used_mb', memoryUsedMB, labels);
    this.gauge('memory_total_mb', memoryTotalMB, labels);
    this.gauge('disk_used_mb', diskUsedMB, labels);
    this.gauge('disk_total_mb', diskTotalMB, labels);
    this.gauge('network_in_bytes', networkInBytes, labels);
    this.gauge('network_out_bytes', networkOutBytes, labels);
    this.gauge('active_connections', activeConnections, labels);
    this.gauge('requests_per_minute', requestsPerMinute, labels);
    this.gauge('error_rate_percent', errorRate, labels);
    this.observe('response_time_ms', responseTimeMs, labels);
  }

  /**
   * Query metrics with time range
   */
  queryTimeSeries(name, labels = {}, options = {}) {
    const {
      startTime = Date.now() - 60 * 60 * 1000, // Last hour
      endTime = Date.now(),
      resolution = 60000, // 1 minute
    } = options;

    const key = this._metricKey(name, labels);
    const dataPoints = this.metrics.get(key) || [];

    // Filter by time range
    const filtered = dataPoints.filter(
      dp => dp.timestamp >= startTime && dp.timestamp <= endTime
    );

    // Downsample if needed
    if (resolution > 0 && filtered.length > 0) {
      return this._downsample(filtered, resolution);
    }

    return filtered;
  }

  /**
   * Get current values for all gauges matching a pattern
   */
  getCurrentValues(namePattern, labels = {}) {
    const results = [];

    for (const [key, gauge] of this.gauges.entries()) {
      if (!gauge.name.includes(namePattern)) continue;

      const labelsMatch = Object.entries(labels).every(
        ([k, v]) => gauge.labels[k] === v
      );
      if (!labelsMatch) continue;

      results.push(gauge);
    }

    return results;
  }

  /**
   * Get histogram summary (percentiles)
   */
  getHistogramSummary(name, labels = {}) {
    const key = this._metricKey(name, labels);
    const histogram = this.histograms.get(key);
    if (!histogram) return null;

    const sorted = [...histogram.values].sort((a, b) => a - b);

    return {
      name: histogram.name,
      labels: histogram.labels,
      count: histogram.count,
      sum: histogram.sum,
      avg: histogram.count > 0 ? histogram.sum / histogram.count : 0,
      min: histogram.min === Infinity ? 0 : histogram.min,
      max: histogram.max === -Infinity ? 0 : histogram.max,
      p50: this._percentile(sorted, 50),
      p90: this._percentile(sorted, 90),
      p95: this._percentile(sorted, 95),
      p99: this._percentile(sorted, 99),
    };
  }

  /**
   * Get dashboard summary for a project
   */
  getDashboard(projectId) {
    const labels = { projectId };

    return {
      projectId,
      timestamp: new Date().toISOString(),
      cpu: this._latestGauge('cpu_usage_percent', labels),
      memory: {
        used: this._latestGauge('memory_used_mb', labels),
        total: this._latestGauge('memory_total_mb', labels),
      },
      disk: {
        used: this._latestGauge('disk_used_mb', labels),
        total: this._latestGauge('disk_total_mb', labels),
      },
      network: {
        in: this._latestGauge('network_in_bytes', labels),
        out: this._latestGauge('network_out_bytes', labels),
      },
      requests: this._latestGauge('requests_per_minute', labels),
      connections: this._latestGauge('active_connections', labels),
      errorRate: this._latestGauge('error_rate_percent', labels),
      responseTime: this.getHistogramSummary('response_time_ms', labels),
    };
  }

  /**
   * Start periodic collection
   */
  startCollection(intervalMs = 60000) {
    if (this.collectionInterval) return;

    this.collectionInterval = setInterval(() => {
      // In production: collect from Docker stats, node process metrics, etc.
      const processMetrics = process.memoryUsage();
      this.gauge('system.memory.rss', processMetrics.rss / 1024 / 1024, { source: 'backend' });
      this.gauge('system.memory.heap', processMetrics.heapUsed / 1024 / 1024, { source: 'backend' });
      this.gauge('system.uptime', process.uptime(), { source: 'backend' });
    }, intervalMs);

    console.log(`[MetricsCollector] Started collection every ${intervalMs}ms`);
  }

  /**
   * Stop collection
   */
  stopCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus() {
    const lines = [];

    for (const [, gauge] of this.gauges) {
      const labels = this._formatLabels(gauge.labels);
      lines.push(`${gauge.name}${labels} ${gauge.value} ${gauge.timestamp}`);
    }

    for (const [, counter] of this.counters) {
      const labels = this._formatLabels(counter.labels);
      lines.push(`${counter.name}_total${labels} ${counter.value} ${counter.timestamp}`);
    }

    return lines.join('\n');
  }

  // ── Private ──

  _metricKey(name, labels) {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  _appendTimeSeries(key, value) {
    const points = this.metrics.get(key) || [];
    points.push({ value, timestamp: Date.now() });

    if (points.length > this.maxDataPointsPerMetric) {
      points.splice(0, points.length - this.maxDataPointsPerMetric);
    }

    this.metrics.set(key, points);
  }

  _latestGauge(name, labels) {
    const key = this._metricKey(name, labels);
    const gauge = this.gauges.get(key);
    return gauge ? gauge.value : 0;
  }

  _percentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.ceil(sorted.length * (p / 100)) - 1;
    return sorted[Math.max(0, idx)];
  }

  _downsample(dataPoints, resolution) {
    const buckets = new Map();

    for (const dp of dataPoints) {
      const bucket = Math.floor(dp.timestamp / resolution) * resolution;
      if (!buckets.has(bucket)) {
        buckets.set(bucket, { values: [], timestamp: bucket });
      }
      buckets.get(bucket).values.push(dp.value);
    }

    return [...buckets.values()].map(b => ({
      timestamp: b.timestamp,
      value: b.values.reduce((s, v) => s + v, 0) / b.values.length,
      min: Math.min(...b.values),
      max: Math.max(...b.values),
      count: b.values.length,
    }));
  }

  _formatLabels(labels) {
    const entries = Object.entries(labels);
    if (!entries.length) return '';
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }
}

const metricsCollector = new MetricsCollector();
module.exports = { metricsCollector, MetricsCollector };
