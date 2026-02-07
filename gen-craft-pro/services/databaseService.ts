/**
 * DatabaseService — Project database management client
 * Manages per-project PostgreSQL databases
 * 
 * Phase 5: Every project gets its own managed database
 */

export type DatabaseEngine = 'postgres' | 'mysql' | 'sqlite';
export type DatabaseStatus = 'creating' | 'active' | 'suspended' | 'migrating' | 'backing-up' | 'destroying' | 'error';

export interface ProjectDatabase {
  id: string;
  projectId: string;
  engine: DatabaseEngine;
  host: string;
  port: number;
  name: string;
  status: DatabaseStatus;
  sizeBytes: number;
  maxSizeBytes: number;
  connectionString: string;     // masked
  connections: {
    active: number;
    max: number;
  };
  backupSchedule: string;
  lastBackup?: string;
  version: string;
  createdAt: string;
}

export interface DatabaseMigration {
  id: string;
  name: string;
  sql: string;
  status: 'pending' | 'applied' | 'failed' | 'rolled-back';
  appliedAt?: string;
  error?: string;
}

export interface DatabaseBackup {
  id: string;
  databaseId: string;
  sizeBytes: number;
  s3Key: string;
  createdAt: string;
  type: 'manual' | 'scheduled' | 'pre-deploy';
}

export interface DatabaseQuery {
  sql: string;
  params?: any[];
}

export interface DatabaseQueryResult {
  rows: Record<string, any>[];
  rowCount: number;
  duration: number;
  fields: { name: string; type: string }[];
}

export interface DatabaseSchema {
  tables: DatabaseTable[];
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  indexes: string[];
  rowCount: number;
  sizeBytes: number;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimary: boolean;
  isForeign: boolean;
  references?: { table: string; column: string };
}

class DatabaseService {
  private getBaseUrl(projectId: string) {
    return `/api/project/${projectId}/db`;
  }

  /**
   * Create a database for a project
   */
  async createDatabase(projectId: string, engine: DatabaseEngine = 'postgres'): Promise<ProjectDatabase> {
    const response = await fetch(this.getBaseUrl(projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ engine }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Database creation failed' }));
      throw new Error(error.message || `Failed to create database: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get database status
   */
  async getStatus(projectId: string): Promise<ProjectDatabase | null> {
    const response = await fetch(this.getBaseUrl(projectId), {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  /**
   * Destroy a project database
   */
  async destroyDatabase(projectId: string): Promise<void> {
    const response = await fetch(this.getBaseUrl(projectId), {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to destroy database: ${response.status}`);
    }
  }

  /**
   * Run a migration
   */
  async runMigration(projectId: string, name: string, sql: string): Promise<DatabaseMigration> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/migrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, sql }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Migration failed' }));
      throw new Error(error.message || `Migration failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get migration history
   */
  async getMigrations(projectId: string): Promise<DatabaseMigration[]> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/migrate`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Rollback last migration
   */
  async rollbackMigration(projectId: string): Promise<void> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/migrate/rollback`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Migration rollback failed: ${response.status}`);
    }
  }

  /**
   * Create a manual backup
   */
  async createBackup(projectId: string): Promise<DatabaseBackup> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/backup`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Backup failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List backups
   */
  async listBackups(projectId: string): Promise<DatabaseBackup[]> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/backup`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  /**
   * Restore from backup
   */
  async restoreBackup(projectId: string, backupId: string): Promise<void> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/backup/${backupId}/restore`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Restore failed: ${response.status}`);
    }
  }

  /**
   * Get database schema
   */
  async getSchema(projectId: string): Promise<DatabaseSchema> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/schema`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return { tables: [] };
    }

    return response.json();
  }

  /**
   * Execute a query (read-only in production)
   */
  async query(projectId: string, q: DatabaseQuery): Promise<DatabaseQueryResult> {
    const response = await fetch(`${this.getBaseUrl(projectId)}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(q),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Query failed' }));
      throw new Error(error.message || `Query failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Format bytes to human readable
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }
}

export const databaseService = new DatabaseService();
export default databaseService;
