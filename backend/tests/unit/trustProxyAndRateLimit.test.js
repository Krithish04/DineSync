const assert = require('assert');
const express = require('express');
const rateLimit = require('express-rate-limit');
const app = require('../../src/app');
const env = require('../../src/config/env.config');
const redisConfig = require('../../src/config/redis.config');

describe('Express Trust Proxy & Rate Limiter Identity Resolution Unit Tests', () => {
  it('should configure trust proxy on the main Express app according to environment setting', () => {
    const configuredValue = app.get('trust proxy');
    assert.ok(configuredValue !== undefined && configuredValue !== false, 'app.get("trust proxy") must be configured and not false');
    assert.strictEqual(configuredValue, env.TRUST_PROXY, 'app trust proxy setting must match env.TRUST_PROXY');
  });

  it('should resolve client IP correctly and handle X-Forwarded-For headers without ERL validation errors', async () => {
    const testApp = express();
    testApp.set('trust proxy', 1); // 1 hop (Nginx)

    let capturedIp = null;
    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests' },
    });

    testApp.get('/test-proxy-ip', testLimiter, (req, res) => {
      capturedIp = req.ip;
      res.status(200).json({ ip: req.ip });
    });

    // Mock Express request/response execution with X-Forwarded-For header
    const simulateRequest = (xForwardedForHeader) => {
      return new Promise((resolve) => {
        const req = Object.assign(new (require('events').EventEmitter)(), {
          method: 'GET',
          url: '/test-proxy-ip',
          headers: {
            'x-forwarded-for': xForwardedForHeader,
          },
          connection: { remoteAddress: '127.0.0.1' },
          socket: { remoteAddress: '127.0.0.1' },
        });

        let statusCode = 200;
        let responseBody = null;

        const res = {
          setHeader: () => {},
          getHeader: () => {},
          status: (code) => {
            statusCode = code;
            return res;
          },
          json: (body) => {
            responseBody = body;
            resolve({ statusCode, responseBody });
          },
          send: (body) => {
            responseBody = body;
            resolve({ statusCode, responseBody });
          },
        };

        testApp(req, res);
      });
    };

    // Client A request with X-Forwarded-For header
    const resA1 = await simulateRequest('203.0.113.50');
    assert.strictEqual(resA1.statusCode, 200);
    assert.strictEqual(capturedIp, '203.0.113.50', 'req.ip must resolve to the real client IP in X-Forwarded-For');

    // Client B request with distinct X-Forwarded-For header
    const resB1 = await simulateRequest('198.51.100.99');
    assert.strictEqual(resB1.statusCode, 200);
    assert.strictEqual(capturedIp, '198.51.100.99', 'req.ip must resolve to Client B real IP');

    // Client A request #2 (up to limit of 2)
    const resA2 = await simulateRequest('203.0.113.50');
    assert.strictEqual(resA2.statusCode, 200);

    // Client A request #3 (exceeds limit of 2 for Client A)
    const resA3 = await simulateRequest('203.0.113.50');
    assert.strictEqual(resA3.statusCode, 429, 'Client A must be rate limited after exceeding threshold');

    // Client B request #2 (Client B has only used 1 request, so must still be allowed)
    const resB2 = await simulateRequest('198.51.100.99');
    assert.strictEqual(resB2.statusCode, 200, 'Client B must NOT be rate limited by Client A requests');
  });

  it('should verify OTP Redis rate limiting keys independently by contact identity and table ID', async () => {
    const phone1 = '+919999911111';
    const phone2 = '+919999922222';
    const table1 = 'table_test_rate_101';
    const limit = 2;
    const windowSecs = 30;

    // Phone 1 requests
    const p1_req1 = await redisConfig.checkRateLimit(`otp:send:${phone1}`, limit, windowSecs);
    const p1_req2 = await redisConfig.checkRateLimit(`otp:send:${phone1}`, limit, windowSecs);
    const p1_req3 = await redisConfig.checkRateLimit(`otp:send:${phone1}`, limit, windowSecs);

    assert.strictEqual(p1_req1.allowed, true);
    assert.strictEqual(p1_req2.allowed, true);
    assert.strictEqual(p1_req3.allowed, false, 'Phone 1 must be rate limited on 3rd attempt');

    // Phone 2 request (different contact) must succeed
    const p2_req1 = await redisConfig.checkRateLimit(`otp:send:${phone2}`, limit, windowSecs);
    assert.strictEqual(p2_req1.allowed, true, 'Phone 2 must have independent rate limit window');

    // Table 1 request
    const t1_req1 = await redisConfig.checkRateLimit(`otp:send:table:${table1}`, limit, windowSecs);
    assert.strictEqual(t1_req1.allowed, true, 'Table 1 must have independent rate limit window');
  });
});
