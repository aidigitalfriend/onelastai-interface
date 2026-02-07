/**
 * Sandbox Network — Port allocation & network isolation
 * 
 * Manages:
 *   - Dynamic port allocation for sandbox containers
 *   - Docker network creation and management
 *   - Network isolation between sandboxes
 */

const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Port range for sandbox containers
const PORT_RANGE_START = 4001;
const PORT_RANGE_END = 5000;
const NETWORK_NAME = 'gencraft-sandbox-net';

// Track allocated ports
const allocatedPorts = new Set();

/**
 * Initialize the sandbox network
 * Creates the Docker network if it doesn't exist
 */
async function initializeNetwork() {
  try {
    const network = docker.getNetwork(NETWORK_NAME);
    await network.inspect();
    console.log(`[SandboxNet] Network '${NETWORK_NAME}' already exists`);
  } catch {
    console.log(`[SandboxNet] Creating network '${NETWORK_NAME}'`);
    await docker.createNetwork({
      Name: NETWORK_NAME,
      Driver: 'bridge',
      Internal: false,
      EnableIPv6: false,
      Options: {
        'com.docker.network.bridge.enable_ip_masquerade': 'true',
        'com.docker.network.bridge.enable_icc': 'false', // Isolate containers from each other
      },
      Labels: {
        'gencraft.network': 'true',
      },
    });
    console.log(`[SandboxNet] Network '${NETWORK_NAME}' created`);
  }
}

/**
 * Allocate a free port from the port range
 * @returns {Promise<number>} Available port
 */
async function allocatePort() {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!allocatedPorts.has(port)) {
      // Also check if port is actually free on the host
      const isFree = await isPortFree(port);
      if (isFree) {
        allocatedPorts.add(port);
        return port;
      }
    }
  }
  throw new Error('No free ports available for sandbox');
}

/**
 * Release a previously allocated port
 * @param {number} port
 */
function releasePort(port) {
  allocatedPorts.delete(port);
}

/**
 * Check if a port is free on the host
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * Get all currently allocated ports
 * @returns {number[]}
 */
function getAllocatedPorts() {
  return Array.from(allocatedPorts);
}

/**
 * Get network stats for a sandbox container
 * @param {string} containerId
 * @returns {Object} Network statistics
 */
async function getNetworkStats(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });
    const networks = stats.networks || {};

    return Object.entries(networks).reduce((acc, [iface, data]) => {
      acc[iface] = {
        rxBytes: data.rx_bytes || 0,
        txBytes: data.tx_bytes || 0,
        rxPackets: data.rx_packets || 0,
        txPackets: data.tx_packets || 0,
        rxErrors: data.rx_errors || 0,
        txErrors: data.tx_errors || 0,
      };
      return acc;
    }, {});
  } catch {
    return {};
  }
}

/**
 * Cleanup the sandbox network (admin only)
 */
async function cleanupNetwork() {
  try {
    const network = docker.getNetwork(NETWORK_NAME);
    // Disconnect all containers first
    const networkInfo = await network.inspect();
    const containers = networkInfo.Containers || {};
    for (const containerId of Object.keys(containers)) {
      try {
        await network.disconnect({ Container: containerId, Force: true });
      } catch {}
    }
    await network.remove();
    allocatedPorts.clear();
    console.log(`[SandboxNet] Network '${NETWORK_NAME}' removed`);
  } catch (err) {
    console.warn(`[SandboxNet] Cleanup failed: ${err.message}`);
  }
}

module.exports = {
  initializeNetwork,
  allocatePort,
  releasePort,
  isPortFree,
  getAllocatedPorts,
  getNetworkStats,
  cleanupNetwork,
  NETWORK_NAME,
};
