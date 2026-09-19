const Redis = require('ioredis');
const env = require('./env.config');

let redisClient = null;
let isRedisConnected = false;

// In-Memory Fallback Stores for graceful single-node operation when Redis is unreachable
const memoryLocks = new Map();
const memoryOtp = new Map();
const memoryRateLimit = new Map();
const memoryCache = new Map();

// Helper to sweep expired in-memory items periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, lock] of memoryLocks.entries()) {
    if (lock.expiresAt && lock.expiresAt <= now) memoryLocks.delete(key);
  }
  for (const [key, item] of memoryOtp.entries()) {
    if (item.expiresAt && item.expiresAt <= now) memoryOtp.delete(key);
  }
  for (const [key, item] of memoryRateLimit.entries()) {
    if (item.resetAt && item.resetAt <= now) memoryRateLimit.delete(key);
  }
  for (const [key, item] of memoryCache.entries()) {
    if (item.expiresAt && item.expiresAt <= now) memoryCache.delete(key);
  }
}, 30000).unref();

const getRedisOptions = (extraOptions = {}) => {
  const options = { ...extraOptions };
  if (env.REDIS_URI && (env.REDIS_URI.startsWith('rediss://') || env.REDIS_URI.includes('upstash.io'))) {
    options.tls = options.tls || { rejectUnauthorized: false };
  }
  return options;
};

const initRedis = () => {
  if (redisClient) return redisClient;

  try {
    const redisOptions = getRedisOptions({
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop auto retrying when offline
        }
        return Math.min(times * 150, 1000);
      },
    });

    redisClient = new Redis(env.REDIS_URI, redisOptions);

    redisClient.on('connect', () => {
      isRedisConnected = true;
      // eslint-disable-next-line no-console
      console.log('[Redis] Connected successfully.');
    });

    redisClient.on('ready', () => {
      isRedisConnected = true;
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      // eslint-disable-next-line no-console
      console.warn('[Redis Degraded Mode]', err.message || 'Server offline');
    });

    redisClient.on('end', () => {
      isRedisConnected = false;
    });

    redisClient.connect().catch((err) => {
      isRedisConnected = false;
      // eslint-disable-next-line no-console
      console.warn('[Redis Connection Warning]', err.message || 'Operating with in-memory fallback');
    });
  } catch (err) {
    isRedisConnected = false;
    // eslint-disable-next-line no-console
    console.warn('[Redis Init Warning]', err.message || 'Operating with in-memory fallback');
  }

  return redisClient;
};

initRedis();

const getRedisClient = () => redisClient;

const isConnected = () => isRedisConnected && redisClient && redisClient.status === 'ready';

/**
 * Creates a duplicate client for pub/sub (e.g. Socket.IO adapter)
 */
const createDuplicateClient = () => {
  const options = getRedisOptions({
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying when offline
      }
      return Math.min(times * 150, 1000);
    },
  });
  const client = new Redis(env.REDIS_URI, options);
  client.on('error', () => {});
  return client;
};

/**
 * ATOMIC TABLE LOCKING (Redis primary, memory-lock fallback if offline)
 */
const acquireTableLock = async (tableId, lockValue, ttlSeconds = 900) => {
  const key = `lock:table:${tableId}`;
  if (isConnected()) {
    try {
      const result = await redisClient.set(key, lockValue, 'NX', 'EX', ttlSeconds);
      return result === 'OK';
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis Lock Error] Key ${key}:`, err.message);
    }
  }

  // Fallback to atomic in-memory lock map when Redis is disconnected
  const now = Date.now();
  const existing = memoryLocks.get(tableId);
  if (existing && existing.expiresAt > now) {
    return false; // Already locked
  }
  memoryLocks.set(tableId, { lockValue, expiresAt: now + ttlSeconds * 1000 });
  return true;
};

/**
 * RELEASE TABLE LOCK
 */
const releaseTableLock = async (tableId, lockValue = null) => {
  const key = `lock:table:${tableId}`;
  if (isConnected()) {
    try {
      if (lockValue) {
        const luaScript = `
          if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
          else
            return 0
          end
        `;
        await redisClient.eval(luaScript, 1, key, lockValue);
      } else {
        await redisClient.del(key);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis Lock Release Warning] Key ${key}:`, err.message);
    }
  }
  memoryLocks.delete(tableId);
  return true;
};

/**
 * OTP STORAGE (Redis primary, in-memory OTP fallback if offline)
 */
const setOtp = async (key, value, ttlSeconds) => {
  const fullKey = `otp:${key}`;
  if (isConnected()) {
    try {
      const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
      await redisClient.set(fullKey, stringVal, 'EX', ttlSeconds);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis OTP Set Warning] Key ${key}:`, err.message);
    }
  }
  memoryOtp.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return true;
};

const getOtp = async (key) => {
  const fullKey = `otp:${key}`;
  if (isConnected()) {
    try {
      const val = await redisClient.get(fullKey);
      if (val) {
        try {
          return JSON.parse(val);
        } catch (_) {
          return val;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis OTP Get Warning] Key ${key}:`, err.message);
    }
  }
  const item = memoryOtp.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) {
    memoryOtp.delete(key);
    return null;
  }
  return item.value;
};

const deleteOtp = async (key) => {
  const fullKey = `otp:${key}`;
  if (isConnected()) {
    try {
      await redisClient.del(fullKey);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis OTP Del Warning] Key ${key}:`, err.message);
    }
  }
  memoryOtp.delete(key);
  return true;
};

/**
 * RATE LIMIT COUNTER (Redis primary, memory rate limiter fallback if offline)
 */
const checkRateLimit = async (key, maxLimit, windowSeconds) => {
  const fullKey = `rate:${key}`;
  if (isConnected()) {
    try {
      const current = await redisClient.incr(fullKey);
      if (current === 1) {
        await redisClient.expire(fullKey, windowSeconds);
      }
      const ttl = await redisClient.ttl(fullKey);
      return {
        allowed: current <= maxLimit,
        currentCount: current,
        resetSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis RateLimit Warning] Key ${key}:`, err.message);
    }
  }

  // In-memory rate limiting fallback when Redis is offline
  const now = Date.now();
  let item = memoryRateLimit.get(key);
  if (!item || item.resetAt <= now) {
    item = { count: 1, resetAt: now + windowSeconds * 1000 };
  } else {
    item.count += 1;
  }
  memoryRateLimit.set(key, item);
  return {
    allowed: item.count <= maxLimit,
    currentCount: item.count,
    resetSeconds: Math.ceil((item.resetAt - now) / 1000),
  };
};

/**
 * GENERIC DATA CACHING (Redis primary, in-memory Map fallback if offline)
 */
const setCache = async (key, value, ttlSeconds = 3600) => {
  if (isConnected()) {
    try {
      const stringVal = JSON.stringify(value);
      await redisClient.set(key, stringVal, 'EX', ttlSeconds);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis setCache Warning] Key ${key}:`, err.message);
    }
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return true;
};

const getCache = async (key) => {
  if (isConnected()) {
    try {
      const val = await redisClient.get(key);
      if (val) {
        try {
          return JSON.parse(val);
        } catch (_) {
          return val;
        }
      }
      return null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis getCache Warning] Key ${key}:`, err.message);
    }
  }
  const item = memoryCache.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
};

const delCache = async (key) => {
  if (isConnected()) {
    try {
      await redisClient.del(key);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis delCache Warning] Key ${key}:`, err.message);
    }
  }
  memoryCache.delete(key);
  return true;
};

const clearCachePattern = async (pattern) => {
  if (isConnected()) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys && keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis clearCachePattern Warning] Pattern ${pattern}:`, err.message);
    }
  }
  // Convert glob pattern (e.g. "menu:123:*") to regex for in-memory cleanup
  const regexPattern = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
  for (const key of memoryCache.keys()) {
    if (regexPattern.test(key)) {
      memoryCache.delete(key);
    }
  }
  return true;
};

const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    isRedisConnected = false;
  }
};

module.exports = {
  getRedisClient,
  isConnected,
  createDuplicateClient,
  acquireTableLock,
  releaseTableLock,
  setOtp,
  getOtp,
  deleteOtp,
  checkRateLimit,
  setCache,
  getCache,
  delCache,
  clearCachePattern,
  closeRedis,
};
