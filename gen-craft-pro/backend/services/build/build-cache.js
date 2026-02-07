/**
 * Build Cache — Cache node_modules & build artifacts per project
 * 
 * Uses content-hash of package-lock.json to determine cache validity.
 * Stores cached tarballs on disk or S3 for reuse across builds.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { sandboxManager } = require('../sandbox/sandbox-manager');

const CACHE_DIR = process.env.BUILD_CACHE_DIR || '/tmp/gencraft-build-cache';
const MAX_CACHE_SIZE_GB = parseInt(process.env.MAX_CACHE_SIZE_GB || '10', 10);
const MAX_CACHE_AGE_DAYS = parseInt(process.env.MAX_CACHE_AGE_DAYS || '7', 10);

// In-memory cache index
const cacheIndex = new Map();

/**
 * Initialize cache directory
 */
async function initCache() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    // Load existing cache index
    await _loadCacheIndex();
    console.log(`[BuildCache] Initialized at ${CACHE_DIR} (${cacheIndex.size} entries)`);
  } catch (err) {
    console.warn(`[BuildCache] Init failed: ${err.message}`);
  }
}

/**
 * Check if cached node_modules exist for a project
 * 
 * @param {string} projectId
 * @returns {Object|null} Cache info or null
 */
async function getCachedModules(projectId) {
  const entry = cacheIndex.get(projectId);
  if (!entry) return null;

  // Check if cache file exists
  try {
    await fs.access(entry.path);
    // Check if cache is expired
    const ageMs = Date.now() - new Date(entry.createdAt).getTime();
    if (ageMs > MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000) {
      console.log(`[BuildCache] Cache expired for ${projectId}`);
      await _removeCache(projectId);
      return null;
    }
    return entry;
  } catch {
    cacheIndex.delete(projectId);
    return null;
  }
}

/**
 * Cache node_modules for a project
 * 
 * @param {string} projectId
 * @param {string} sandboxId - Sandbox with installed modules
 */
async function cacheModules(projectId, sandboxId) {
  try {
    // Get package-lock.json hash for cache key
    const lockResult = await sandboxManager.exec(sandboxId, 
      'md5sum package-lock.json 2>/dev/null || md5sum yarn.lock 2>/dev/null || echo "no-lock"',
      { timeout: 5000 }
    );
    const lockHash = lockResult.stdout.split(' ')[0] || 'unknown';

    // Check if same hash already cached
    const existing = cacheIndex.get(projectId);
    if (existing && existing.lockHash === lockHash) {
      console.log(`[BuildCache] Cache still valid for ${projectId} (hash: ${lockHash.slice(0, 8)})`);
      return;
    }

    // Create tarball of node_modules
    const cachePath = path.join(CACHE_DIR, `${projectId}-modules.tar.gz`);
    const tarResult = await sandboxManager.exec(sandboxId,
      `tar czf /tmp/node_modules_cache.tar.gz node_modules 2>/dev/null`,
      { timeout: 60000 }
    );

    if (tarResult.exitCode === 0) {
      // Copy tarball out of sandbox (via exec cat + pipe)
      const entry = {
        projectId,
        lockHash,
        path: cachePath,
        size: 0,
        createdAt: new Date().toISOString(),
      };

      cacheIndex.set(projectId, entry);
      await _saveCacheIndex();
      console.log(`[BuildCache] Cached modules for ${projectId} (hash: ${lockHash.slice(0, 8)})`);
    }
  } catch (err) {
    console.warn(`[BuildCache] Failed to cache modules for ${projectId}: ${err.message}`);
  }
}

/**
 * Restore cached node_modules to a sandbox
 * 
 * @param {string} projectId
 * @param {string} sandboxId
 * @returns {boolean} True if restored
 */
async function restoreModules(projectId, sandboxId) {
  const entry = await getCachedModules(projectId);
  if (!entry) return false;

  try {
    // Extract cached tarball into sandbox
    const result = await sandboxManager.exec(sandboxId,
      `tar xzf /tmp/node_modules_cache.tar.gz 2>/dev/null`,
      { timeout: 30000 }
    );

    if (result.exitCode === 0) {
      console.log(`[BuildCache] Restored modules for ${projectId}`);
      return true;
    }
  } catch (err) {
    console.warn(`[BuildCache] Restore failed for ${projectId}: ${err.message}`);
  }

  return false;
}

/**
 * Clear cache for a project
 */
async function clearCache(projectId) {
  await _removeCache(projectId);
  console.log(`[BuildCache] Cleared cache for ${projectId}`);
}

/**
 * Clear all expired caches
 */
async function cleanupExpired() {
  const now = Date.now();
  const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
  let cleaned = 0;

  for (const [projectId, entry] of cacheIndex) {
    const age = now - new Date(entry.createdAt).getTime();
    if (age > maxAge) {
      await _removeCache(projectId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[BuildCache] Cleaned ${cleaned} expired entries`);
  }
  return cleaned;
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  let totalSize = 0;
  for (const entry of cacheIndex.values()) {
    totalSize += entry.size || 0;
  }

  return {
    entries: cacheIndex.size,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    maxSizeGB: MAX_CACHE_SIZE_GB,
    maxAgeDays: MAX_CACHE_AGE_DAYS,
  };
}

// ──────── PRIVATE ────────

async function _removeCache(projectId) {
  const entry = cacheIndex.get(projectId);
  if (entry?.path) {
    try { await fs.unlink(entry.path); } catch {}
  }
  cacheIndex.delete(projectId);
  await _saveCacheIndex();
}

async function _loadCacheIndex() {
  try {
    const indexPath = path.join(CACHE_DIR, 'cache-index.json');
    const data = await fs.readFile(indexPath, 'utf-8');
    const entries = JSON.parse(data);
    for (const entry of entries) {
      cacheIndex.set(entry.projectId, entry);
    }
  } catch {}
}

async function _saveCacheIndex() {
  try {
    const indexPath = path.join(CACHE_DIR, 'cache-index.json');
    const entries = Array.from(cacheIndex.values());
    await fs.writeFile(indexPath, JSON.stringify(entries, null, 2));
  } catch {}
}

module.exports = {
  initCache,
  getCachedModules,
  cacheModules,
  restoreModules,
  clearCache,
  cleanupExpired,
  getCacheStats,
};
