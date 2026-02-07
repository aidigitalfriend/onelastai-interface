/**
 * GenCraft Pro — Database Repositories
 * 
 * Prisma-backed CRUD operations for all models.
 * Each repository gracefully falls back to in-memory
 * if the database is unavailable (dev mode).
 */

const { getDB } = require('./db');

// In-memory fallback stores (used when DB is unavailable)
const fallback = {
  projects: new Map(),
  files: new Map(),
  sandboxes: new Map(),
  builds: new Map(),
  deployments: new Map(),
  domains: new Map(),
  assets: new Map(),
  alerts: new Map(),
  events: [],
  databases: new Map(),
};

/**
 * Check if DB is available
 */
function isDBAvailable() {
  try {
    const db = getDB();
    return db && db.$connect;
  } catch {
    return false;
  }
}

// ──────── PROJECT REPOSITORY ────────

const projectRepo = {
  async create(data) {
    try {
      const db = getDB();
      return await db.project.create({ data, include: { files: true } });
    } catch (err) {
      console.warn(`[ProjectRepo] DB create failed, using fallback: ${err.message}`);
      const project = { id: data.id || `proj-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      fallback.projects.set(project.id, project);
      return project;
    }
  },

  async findById(id) {
    try {
      const db = getDB();
      return await db.project.findUnique({ where: { id }, include: { files: true } });
    } catch {
      return fallback.projects.get(id) || null;
    }
  },

  async findByUser(userId, options = {}) {
    try {
      const db = getDB();
      return await db.project.findMany({
        where: { userId, status: { not: 'deleted' } },
        include: { files: true },
        orderBy: { updatedAt: 'desc' },
        take: options.limit || 50,
      });
    } catch {
      return Array.from(fallback.projects.values())
        .filter(p => p.userId === userId)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
  },

  async update(id, data) {
    try {
      const db = getDB();
      return await db.project.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
        include: { files: true },
      });
    } catch {
      const existing = fallback.projects.get(id);
      if (existing) {
        Object.assign(existing, data, { updatedAt: new Date() });
        return existing;
      }
      return null;
    }
  },

  async delete(id) {
    try {
      const db = getDB();
      return await db.project.update({ where: { id }, data: { status: 'deleted' } });
    } catch {
      fallback.projects.delete(id);
      return { id, status: 'deleted' };
    }
  },
};

// ──────── FILE REPOSITORY ────────

const fileRepo = {
  async upsert(projectId, filePath, data) {
    try {
      const db = getDB();
      const hash = require('crypto').createHash('md5').update(data.content || '').digest('hex');
      return await db.projectFile.upsert({
        where: { projectId_path: { projectId, path: filePath } },
        create: {
          projectId,
          path: filePath,
          content: data.content || '',
          language: data.language || 'plaintext',
          size: Buffer.byteLength(data.content || '', 'utf-8'),
          hash,
        },
        update: {
          content: data.content,
          language: data.language,
          size: Buffer.byteLength(data.content || '', 'utf-8'),
          hash,
          updatedAt: new Date(),
        },
      });
    } catch {
      const key = `${projectId}:${filePath}`;
      const file = { id: key, projectId, path: filePath, ...data, updatedAt: new Date() };
      fallback.files.set(key, file);
      return file;
    }
  },

  async findByProject(projectId) {
    try {
      const db = getDB();
      return await db.projectFile.findMany({
        where: { projectId },
        orderBy: { path: 'asc' },
      });
    } catch {
      return Array.from(fallback.files.values()).filter(f => f.projectId === projectId);
    }
  },

  async delete(projectId, filePath) {
    try {
      const db = getDB();
      return await db.projectFile.delete({
        where: { projectId_path: { projectId, path: filePath } },
      });
    } catch {
      fallback.files.delete(`${projectId}:${filePath}`);
      return { projectId, path: filePath };
    }
  },
};

// ──────── SANDBOX REPOSITORY ────────

const sandboxRepo = {
  async create(data) {
    try {
      const db = getDB();
      return await db.sandbox.create({ data });
    } catch {
      fallback.sandboxes.set(data.id, { ...data, createdAt: new Date() });
      return data;
    }
  },

  async findById(id) {
    try {
      const db = getDB();
      return await db.sandbox.findUnique({ where: { id } });
    } catch {
      return fallback.sandboxes.get(id) || null;
    }
  },

  async findByUser(userId) {
    try {
      const db = getDB();
      return await db.sandbox.findMany({
        where: { userId, status: { notIn: ['destroyed'] } },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return Array.from(fallback.sandboxes.values()).filter(s => s.userId === userId);
    }
  },

  async update(id, data) {
    try {
      const db = getDB();
      return await db.sandbox.update({ where: { id }, data });
    } catch {
      const existing = fallback.sandboxes.get(id);
      if (existing) Object.assign(existing, data);
      return existing;
    }
  },

  async delete(id) {
    try {
      const db = getDB();
      return await db.sandbox.update({
        where: { id },
        data: { status: 'destroyed', destroyedAt: new Date() },
      });
    } catch {
      fallback.sandboxes.delete(id);
      return { id, status: 'destroyed' };
    }
  },
};

// ──────── BUILD REPOSITORY ────────

const buildRepo = {
  async create(data) {
    try {
      const db = getDB();
      return await db.build.create({ data });
    } catch {
      fallback.builds.set(data.id, { ...data, createdAt: new Date() });
      return data;
    }
  },

  async findById(id) {
    try {
      const db = getDB();
      return await db.build.findUnique({ where: { id } });
    } catch {
      return fallback.builds.get(id) || null;
    }
  },

  async findByProject(projectId, limit = 20) {
    try {
      const db = getDB();
      return await db.build.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch {
      return Array.from(fallback.builds.values())
        .filter(b => b.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    }
  },

  async update(id, data) {
    try {
      const db = getDB();
      return await db.build.update({ where: { id }, data });
    } catch {
      const existing = fallback.builds.get(id);
      if (existing) Object.assign(existing, data);
      return existing;
    }
  },
};

// ──────── DEPLOYMENT REPOSITORY ────────

const deploymentRepo = {
  async create(data) {
    try {
      const db = getDB();
      return await db.deployment.create({ data });
    } catch {
      fallback.deployments.set(data.id, { ...data, createdAt: new Date() });
      return data;
    }
  },

  async findById(id) {
    try {
      const db = getDB();
      return await db.deployment.findUnique({ where: { id }, include: { domains: true } });
    } catch {
      return fallback.deployments.get(id) || null;
    }
  },

  async findByProject(projectId, limit = 20) {
    try {
      const db = getDB();
      return await db.deployment.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { domains: true },
      });
    } catch {
      return Array.from(fallback.deployments.values())
        .filter(d => d.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    }
  },

  async findActive(projectId, environment) {
    try {
      const db = getDB();
      return await db.deployment.findFirst({
        where: { projectId, environment, status: 'live' },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return Array.from(fallback.deployments.values())
        .find(d => d.projectId === projectId && d.environment === environment && d.status === 'live');
    }
  },

  async update(id, data) {
    try {
      const db = getDB();
      return await db.deployment.update({ where: { id }, data });
    } catch {
      const existing = fallback.deployments.get(id);
      if (existing) Object.assign(existing, data);
      return existing;
    }
  },
};

// ──────── DOMAIN REPOSITORY ────────

const domainRepo = {
  async create(data) {
    try {
      const db = getDB();
      return await db.domain.create({ data });
    } catch {
      fallback.domains.set(data.id, { ...data, createdAt: new Date() });
      return data;
    }
  },

  async findById(id) {
    try {
      const db = getDB();
      return await db.domain.findUnique({ where: { id } });
    } catch {
      return fallback.domains.get(id) || null;
    }
  },

  async findByUser(userId) {
    try {
      const db = getDB();
      return await db.domain.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    } catch {
      return Array.from(fallback.domains.values()).filter(d => d.userId === userId);
    }
  },

  async findByDomain(domainName) {
    try {
      const db = getDB();
      return await db.domain.findUnique({ where: { domain: domainName } });
    } catch {
      return Array.from(fallback.domains.values()).find(d => d.domain === domainName) || null;
    }
  },

  async update(id, data) {
    try {
      const db = getDB();
      return await db.domain.update({ where: { id }, data });
    } catch {
      const existing = fallback.domains.get(id);
      if (existing) Object.assign(existing, data);
      return existing;
    }
  },

  async delete(id) {
    try {
      const db = getDB();
      return await db.domain.delete({ where: { id } });
    } catch {
      fallback.domains.delete(id);
      return { id };
    }
  },
};

// ──────── ASSET REPOSITORY ────────

const assetRepo = {
  async create(data) {
    try {
      const db = getDB();
      return await db.asset.create({ data });
    } catch {
      fallback.assets.set(data.id, { ...data, createdAt: new Date() });
      return data;
    }
  },

  async findById(id) {
    try {
      const db = getDB();
      return await db.asset.findUnique({ where: { id } });
    } catch {
      return fallback.assets.get(id) || null;
    }
  },

  async findByProject(projectId, options = {}) {
    try {
      const db = getDB();
      const where = { projectId };
      if (options.type) where.type = options.type;
      return await db.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      let result = Array.from(fallback.assets.values()).filter(a => a.projectId === projectId);
      if (options.type) result = result.filter(a => a.type === options.type);
      return result;
    }
  },

  async findByUser(userId, options = {}) {
    try {
      const db = getDB();
      const where = { userId };
      if (options.projectId) where.projectId = options.projectId;
      if (options.type) where.type = options.type;
      return await db.asset.findMany({ where, orderBy: { createdAt: 'desc' } });
    } catch {
      let result = Array.from(fallback.assets.values()).filter(a => a.userId === userId);
      if (options.projectId) result = result.filter(a => a.projectId === options.projectId);
      if (options.type) result = result.filter(a => a.type === options.type);
      return result;
    }
  },

  async update(id, data) {
    try {
      const db = getDB();
      return await db.asset.update({ where: { id }, data });
    } catch {
      const existing = fallback.assets.get(id);
      if (existing) Object.assign(existing, data);
      return existing;
    }
  },

  async delete(id) {
    try {
      const db = getDB();
      return await db.asset.delete({ where: { id } });
    } catch {
      fallback.assets.delete(id);
      return { id };
    }
  },
};

// ──────── ALERT REPOSITORY ────────

const alertRepo = {
  async create(data) {
    try {
      const db = getDB();
      return await db.alert.create({ data });
    } catch {
      fallback.alerts.set(data.id, { ...data, createdAt: new Date() });
      return data;
    }
  },

  async findById(id) {
    try {
      const db = getDB();
      return await db.alert.findUnique({ where: { id } });
    } catch {
      return fallback.alerts.get(id) || null;
    }
  },

  async findByUser(userId) {
    try {
      const db = getDB();
      return await db.alert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    } catch {
      return Array.from(fallback.alerts.values()).filter(a => a.userId === userId);
    }
  },

  async update(id, data) {
    try {
      const db = getDB();
      return await db.alert.update({ where: { id }, data });
    } catch {
      const existing = fallback.alerts.get(id);
      if (existing) Object.assign(existing, data);
      return existing;
    }
  },

  async delete(id) {
    try {
      const db = getDB();
      return await db.alert.delete({ where: { id } });
    } catch {
      fallback.alerts.delete(id);
      return { id };
    }
  },
};

// ──────── MONITORING EVENT REPOSITORY ────────

const eventRepo = {
  async create(data) {
    try {
      const db = getDB();
      return await db.monitoringEvent.create({ data });
    } catch {
      const event = { id: data.id || `evt-${Date.now()}`, ...data, createdAt: new Date() };
      fallback.events.push(event);
      if (fallback.events.length > 10000) fallback.events.splice(0, fallback.events.length - 10000);
      return event;
    }
  },

  async findByProject(projectId, options = {}) {
    try {
      const db = getDB();
      const where = { projectId };
      if (options.severity) where.severity = options.severity;
      if (options.resolved !== undefined) where.resolved = options.resolved;
      if (options.since) where.createdAt = { gte: options.since };

      return await db.monitoringEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 100,
      });
    } catch {
      let result = fallback.events.filter(e => e.projectId === projectId);
      if (options.severity) result = result.filter(e => e.severity === options.severity);
      if (options.resolved !== undefined) result = result.filter(e => e.resolved === options.resolved);
      return result.slice(-(options.limit || 100));
    }
  },

  async findErrors(projectId, options = {}) {
    try {
      const db = getDB();
      const where = {
        projectId,
        severity: { in: ['error', 'critical'] },
      };
      if (options.resolved !== undefined) where.resolved = options.resolved;
      return await db.monitoringEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 100,
      });
    } catch {
      return fallback.events
        .filter(e => e.projectId === projectId && (e.severity === 'error' || e.severity === 'critical'))
        .slice(-(options.limit || 100));
    }
  },

  async resolve(id) {
    try {
      const db = getDB();
      return await db.monitoringEvent.update({
        where: { id },
        data: { resolved: true, resolvedAt: new Date() },
      });
    } catch {
      const event = fallback.events.find(e => e.id === id);
      if (event) { event.resolved = true; event.resolvedAt = new Date(); }
      return event;
    }
  },
};

// ──────── PROJECT DATABASE REPOSITORY ────────

const projectDBRepo = {
  async create(data) {
    try {
      const db = getDB();
      return await db.projectDatabase.create({ data });
    } catch {
      fallback.databases.set(data.id, { ...data, createdAt: new Date() });
      return data;
    }
  },

  async findByProject(projectId) {
    try {
      const db = getDB();
      return await db.projectDatabase.findUnique({ where: { projectId } });
    } catch {
      return Array.from(fallback.databases.values()).find(d => d.projectId === projectId) || null;
    }
  },

  async findById(id) {
    try {
      const db = getDB();
      return await db.projectDatabase.findUnique({ where: { id } });
    } catch {
      return fallback.databases.get(id) || null;
    }
  },

  async update(id, data) {
    try {
      const db = getDB();
      return await db.projectDatabase.update({ where: { id }, data });
    } catch {
      const existing = fallback.databases.get(id);
      if (existing) Object.assign(existing, data);
      return existing;
    }
  },

  async delete(id) {
    try {
      const db = getDB();
      return await db.projectDatabase.update({
        where: { id },
        data: { status: 'destroyed', destroyedAt: new Date() },
      });
    } catch {
      fallback.databases.delete(id);
      return { id, status: 'destroyed' };
    }
  },
};

module.exports = {
  projectRepo,
  fileRepo,
  sandboxRepo,
  buildRepo,
  deploymentRepo,
  domainRepo,
  assetRepo,
  alertRepo,
  eventRepo,
  projectDBRepo,
  fallback,
};
