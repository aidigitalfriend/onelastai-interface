/**
 * Sandbox Storage — Persistent volumes for sandbox containers
 * 
 * Manages:
 *   - Docker volume creation per sandbox
 *   - Volume size limits per plan
 *   - Disk usage monitoring
 *   - Volume cleanup on sandbox destruction
 */

const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const VOLUME_PREFIX = 'gencraft-vol-';

/**
 * Create a Docker volume for a sandbox
 * 
 * @param {string} sandboxId - Sandbox identifier
 * @param {number} maxSizeBytes - Maximum size in bytes
 * @returns {Promise<string>} Volume name
 */
async function createVolume(sandboxId, maxSizeBytes) {
  const volumeName = `${VOLUME_PREFIX}${sandboxId}`;

  try {
    await docker.createVolume({
      Name: volumeName,
      Driver: 'local',
      DriverOpts: {
        type: 'tmpfs',
        device: 'tmpfs',
        o: `size=${maxSizeBytes}`,
      },
      Labels: {
        'gencraft.sandbox': 'true',
        'gencraft.sandboxId': sandboxId,
        'gencraft.maxSize': String(maxSizeBytes),
        'gencraft.createdAt': new Date().toISOString(),
      },
    });

    console.log(`[SandboxStorage] Volume '${volumeName}' created (max: ${formatBytes(maxSizeBytes)})`);
    return volumeName;
  } catch (err) {
    // If volume already exists, return it
    if (err.statusCode === 409) {
      console.log(`[SandboxStorage] Volume '${volumeName}' already exists`);
      return volumeName;
    }
    throw err;
  }
}

/**
 * Destroy a sandbox volume
 * 
 * @param {string} sandboxId
 */
async function destroyVolume(sandboxId) {
  const volumeName = `${VOLUME_PREFIX}${sandboxId}`;
  
  try {
    const volume = docker.getVolume(volumeName);
    await volume.remove({ force: true });
    console.log(`[SandboxStorage] Volume '${volumeName}' destroyed`);
  } catch (err) {
    if (err.statusCode === 404) {
      console.log(`[SandboxStorage] Volume '${volumeName}' not found (already removed)`);
    } else {
      throw err;
    }
  }
}

/**
 * Get volume usage stats
 * 
 * @param {string} sandboxId
 * @returns {Object} { used, limit, percent }
 */
async function getVolumeStats(sandboxId) {
  const volumeName = `${VOLUME_PREFIX}${sandboxId}`;

  try {
    const volume = docker.getVolume(volumeName);
    const info = await volume.inspect();

    const maxSize = parseInt(info.Labels?.['gencraft.maxSize'] || '0', 10);

    // Docker doesn't directly expose volume usage, 
    // so we estimate via container df or system df
    const df = await docker.df();
    const volumeInfo = (df.Volumes || []).find(v => v.Name === volumeName);

    const used = volumeInfo?.UsageData?.Size || 0;

    return {
      used,
      limit: maxSize,
      percent: maxSize > 0 ? ((used / maxSize) * 100).toFixed(1) : 0,
      volumeName,
    };
  } catch (err) {
    return {
      used: 0,
      limit: 0,
      percent: 0,
      volumeName,
      error: err.message,
    };
  }
}

/**
 * List all sandbox volumes
 * 
 * @returns {Array} Volume info list
 */
async function listVolumes() {
  try {
    const { Volumes } = await docker.listVolumes({
      filters: { label: ['gencraft.sandbox=true'] },
    });

    return (Volumes || []).map(v => ({
      name: v.Name,
      sandboxId: v.Labels?.['gencraft.sandboxId'] || 'unknown',
      maxSize: parseInt(v.Labels?.['gencraft.maxSize'] || '0', 10),
      createdAt: v.Labels?.['gencraft.createdAt'] || v.CreatedAt,
      driver: v.Driver,
      mountpoint: v.Mountpoint,
    }));
  } catch {
    return [];
  }
}

/**
 * Cleanup orphaned volumes (no matching sandbox)
 * 
 * @param {Set} activeSandboxIds - Set of active sandbox IDs
 * @returns {number} Number of volumes cleaned up
 */
async function cleanupOrphanedVolumes(activeSandboxIds) {
  const volumes = await listVolumes();
  let cleaned = 0;

  for (const vol of volumes) {
    if (!activeSandboxIds.has(vol.sandboxId)) {
      try {
        await destroyVolume(vol.sandboxId);
        cleaned++;
      } catch {}
    }
  }

  if (cleaned > 0) {
    console.log(`[SandboxStorage] Cleaned up ${cleaned} orphaned volumes`);
  }

  return cleaned;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  createVolume,
  destroyVolume,
  getVolumeStats,
  listVolumes,
  cleanupOrphanedVolumes,
  VOLUME_PREFIX,
};
