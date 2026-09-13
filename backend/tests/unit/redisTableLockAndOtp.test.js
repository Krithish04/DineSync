const assert = require('assert');
const redisConfig = require('../../src/config/redis.config');

describe('Redis Table Lock & OTP Rate Limiting Unit Tests', () => {
  it('should enforce atomic table lock acquisition and prevent concurrent double-host claim', async () => {
    const tableId = 'test_table_lock_999999999999999999999999';
    const host1Phone = '+15550001111';
    const host2Phone = '+15550002222';

    // Simulate two near-simultaneous lock acquisitions
    const [result1, result2] = await Promise.all([
      redisConfig.acquireTableLock(tableId, host1Phone, 60),
      redisConfig.acquireTableLock(tableId, host2Phone, 60),
    ]);

    // Exactly one must succeed (true) and one must fail (false)
    const successCount = [result1, result2].filter(Boolean).length;
    const failCount = [result1, result2].filter((r) => r === false).length;

    assert.strictEqual(successCount, 1, 'Exactly one concurrent scan must acquire the atomic table lock');
    assert.strictEqual(failCount, 1, 'The losing concurrent scan must fail lock acquisition');

    // Clean up lock
    await redisConfig.releaseTableLock(tableId);
  });

  it('should release table lock successfully and allow re-acquisition', async () => {
    const tableId = 'test_table_lock_release_888';
    const lockAcquired = await redisConfig.acquireTableLock(tableId, 'host_test', 60);
    assert.strictEqual(lockAcquired, true);

    const released = await redisConfig.releaseTableLock(tableId);
    assert.strictEqual(released, true);

    // Can re-acquire lock after release
    const reacquired = await redisConfig.acquireTableLock(tableId, 'host_test_2', 60);
    assert.strictEqual(reacquired, true);

    await redisConfig.releaseTableLock(tableId);
  });

  it('should track rate limits correctly and reject requests exceeding threshold', async () => {
    const rateKey = 'test_otp_rate_phone_777';
    const limit = 3;
    const windowSecs = 10;

    const res1 = await redisConfig.checkRateLimit(rateKey, limit, windowSecs);
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.currentCount, 1);

    const res2 = await redisConfig.checkRateLimit(rateKey, limit, windowSecs);
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.currentCount, 2);

    const res3 = await redisConfig.checkRateLimit(rateKey, limit, windowSecs);
    assert.strictEqual(res3.allowed, true);
    assert.strictEqual(res3.currentCount, 3);

    const res4 = await redisConfig.checkRateLimit(rateKey, limit, windowSecs);
    assert.strictEqual(res4.allowed, false, 'Fourth request within window must be rejected by rate limiter');
  });

  it('should handle OTP Redis caching set/get/delete operations', async () => {
    const key = 'test_purpose:9998887777';
    const otpData = { codeHash: 'hash123', attempts: 0, maxAttempts: 5, expiresAt: new Date(Date.now() + 60000).toISOString() };

    await redisConfig.setOtp(key, otpData, 60);
    const retrieved = await redisConfig.getOtp(key);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.codeHash, 'hash123');

    await redisConfig.deleteOtp(key);
    const deleted = await redisConfig.getOtp(key);
    assert.strictEqual(deleted, null);
  });
});
