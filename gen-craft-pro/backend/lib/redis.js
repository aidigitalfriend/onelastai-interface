/**
 * GenCraft Pro — Redis Client
 * 
 * Redis connection for session caching, rate limiting,
 * and real-time pubsub. Falls back to in-memory store
 * if Redis is unavailable (development mode).
 */

let Redis;
try {
  Redis = require('ioredis');
} catch {
  Redis = null;
}

class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    this.connected = true;
    
    // Cleanup expired keys every 30s
    this._cleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, expiry] of this.ttls.entries()) {
        if (expiry < now) {
          this.store.delete(key);
          this.ttls.delete(key);
        }
      }
    }, 30000);
  }

  async get(key) {
    const expiry = this.ttls.get(key);
    if (expiry && expiry < Date.now()) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    const val = this.store.get(key);
    return val !== undefined ? val : null;
  }

  async set(key, value, ...args) {
    this.store.set(key, value);
    // Parse EX/PX options
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX' && args[i + 1]) {
        this.ttls.set(key, Date.now() + args[i + 1] * 1000);
      } else if (args[i] === 'PX' && args[i + 1]) {
        this.ttls.set(key, Date.now() + args[i + 1]);
      }
    }
    return 'OK';
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
      this.ttls.delete(key);
    }
    return count;
  }

  async exists(...keys) {
    return keys.filter(k => this.store.has(k)).length;
  }

  async incr(key) {
    const val = parseInt(await this.get(key) || '0', 10) + 1;
    this.store.set(key, String(val));
    return val;
  }

  async expire(key, seconds) {
    if (this.store.has(key)) {
      this.ttls.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async ttl(key) {
    const expiry = this.ttls.get(key);
    if (!expiry) return -1;
    const remaining = Math.ceil((expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return [...this.store.keys()].filter(k => regex.test(k));
  }

  async hset(key, field, value) {
    let hash = this.store.get(key);
    if (!hash || typeof hash !== 'object') hash = {};
    hash[field] = value;
    this.store.set(key, hash);
    return 1;
  }

  async hget(key, field) {
    const hash = this.store.get(key);
    return hash && typeof hash === 'object' ? hash[field] || null : null;
  }

  async hgetall(key) {
    const hash = this.store.get(key);
    return hash && typeof hash === 'object' ? hash : {};
  }

  async hdel(key, ...fields) {
    const hash = this.store.get(key);
    if (!hash || typeof hash !== 'object') return 0;
    let count = 0;
    for (const field of fields) {
      if (field in hash) { delete hash[field]; count++; }
    }
    return count;
  }

  async publish() { return 0; }
  async subscribe() {}
  async unsubscribe() {}
  on() { return this; }

  async quit() {
    clearInterval(this._cleanup);
    this.store.clear();
    this.ttls.clear();
  }

  get status() { return 'ready'; }
}

let redisClient = null;

function getRedis() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  
  if (Redis && redisUrl) {
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 5) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      redisClient.on('connect', () => console.log('✅ Redis connected'));
      redisClient.on('error', (err) => {
        console.warn(`[Redis] Error: ${err.message}`);
        // Fall back to in-memory if Redis fails
        if (!redisClient.connected) {
          console.warn('[Redis] Falling back to in-memory cache');
          redisClient = new InMemoryCache();
        }
      });

      return redisClient;
    } catch (err) {
      console.warn(`[Redis] Init failed: ${err.message}, using in-memory cache`);
    }
  }

  console.log('[Redis] No REDIS_URL configured, using in-memory cache');
  redisClient = new InMemoryCache();
  return redisClient;
}

async function connectRedis() {
  const client = getRedis();
  if (client instanceof InMemoryCache) return client;
  
  try {
    await client.connect();
    return client;
  } catch (err) {
    console.warn(`[Redis] Connection failed: ${err.message}, using in-memory cache`);
    redisClient = new InMemoryCache();
    return redisClient;
  }
}

async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = { getRedis, connectRedis, disconnectRedis, InMemoryCache };
