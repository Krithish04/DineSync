/**
 * High-performance in-memory TTL caching engine for DineSync AI
 * Serves heavy aggregation queries in ~2ms with configurable TTL.
 */

const cacheStore = new Map();

/**
 * Gets a cached item if present and unexpired.
 */
const getCache = (key) => {
  const item = cacheStore.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  return item.value;
};

/**
 * Sets a cached item with TTL in seconds (default: 60s).
 */
const setCache = (key, value, ttlSeconds = 60) => {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cacheStore.set(key, { value, expiresAt });
};

/**
 * Clears cache entries matching a prefix or pattern.
 */
const invalidateCachePattern = (pattern) => {
  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
    }
  }
};

const clearCache = () => cacheStore.clear();

module.exports = {
  getCache,
  setCache,
  invalidateCachePattern,
  clearCache,
};
