const assert = require('assert');
const redisConfig = require('../../src/config/redis.config');

describe('Redis Cache Integration Unit Tests', () => {
  it('should store and retrieve cached values cleanly', async () => {
    const key = 'test:cache:item:123';
    const payload = { id: '123', name: 'Truffle Pasta', price: 24.50 };

    await redisConfig.setCache(key, payload, 60);

    const cached = await redisConfig.getCache(key);
    assert.ok(cached, 'Cache should return stored object');
    assert.strictEqual(cached.id, '123');
    assert.strictEqual(cached.name, 'Truffle Pasta');
    assert.strictEqual(cached.price, 24.50);

    await redisConfig.delCache(key);
    const deleted = await redisConfig.getCache(key);
    assert.strictEqual(deleted, null, 'Cache key should be deleted');
  });

  it('should perform pattern-based cache clearing correctly', async () => {
    const restaurantId = 'rest_test_999999';
    const key1 = `menu:${restaurantId}:list:{"page":1}`;
    const key2 = `menu:${restaurantId}:item:item_001`;
    const keyOther = 'menu:other_rest_111:list:{"page":1}';

    await redisConfig.setCache(key1, { items: ['item1'] }, 60);
    await redisConfig.setCache(key2, { name: 'Burger' }, 60);
    await redisConfig.setCache(keyOther, { items: ['other'] }, 60);

    assert.ok(await redisConfig.getCache(key1));
    assert.ok(await redisConfig.getCache(key2));
    assert.ok(await redisConfig.getCache(keyOther));

    // Clear all menu cache keys for rest_test_999999
    await redisConfig.clearCachePattern(`menu:${restaurantId}:*`);

    assert.strictEqual(await redisConfig.getCache(key1), null, 'key1 should be cleared');
    assert.strictEqual(await redisConfig.getCache(key2), null, 'key2 should be cleared');
    assert.strictEqual(await redisConfig.getCache(keyOther) !== null, true, 'Other restaurant cache should remain intact');

    // Clean up
    await redisConfig.delCache(keyOther);
  });
});
