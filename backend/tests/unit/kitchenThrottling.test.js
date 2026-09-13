const assert = require('assert');
const {
  computeQueueFingerprint,
  evaluateAiInvocation,
  recordAiCallSuccess,
  resetThrottlingState,
  getThrottlingStats,
} = require('../../src/features/kitchen/kitchenOrchestrator.service');
const env = require('../../src/config/env.config');

describe('Kitchen Orchestration AI Throttling & Ceiling Unit Tests', () => {
  it('should compute consistent fingerprints for identical queues and detect material changes', () => {
    resetThrottlingState();
    const mockTickets1 = [
      { _id: 't1', status: 'Preparing', updatedAt: new Date('2026-09-09T12:00:00Z'), items: [{ orderItemId: 'i1', kitchenStatus: 'Preparing', quantity: 1 }] },
      { _id: 't2', status: 'Pending', updatedAt: new Date('2026-09-09T12:00:00Z'), items: [{ orderItemId: 'i2', kitchenStatus: 'Pending', quantity: 2 }] },
    ];

    const mockTicketsDuplicate = [
      { _id: 't1', status: 'Preparing', updatedAt: new Date('2026-09-09T12:00:00Z'), items: [{ orderItemId: 'i1', kitchenStatus: 'Preparing', quantity: 1 }] },
      { _id: 't2', status: 'Pending', updatedAt: new Date('2026-09-09T12:00:00Z'), items: [{ orderItemId: 'i2', kitchenStatus: 'Pending', quantity: 2 }] },
    ];

    const mockTicketsModified = [
      { _id: 't1', status: 'Ready', updatedAt: new Date('2026-09-09T12:05:00Z'), items: [{ orderItemId: 'i1', kitchenStatus: 'Ready', quantity: 1 }] },
      { _id: 't2', status: 'Pending', updatedAt: new Date('2026-09-09T12:00:00Z'), items: [{ orderItemId: 'i2', kitchenStatus: 'Pending', quantity: 2 }] },
    ];

    const fp1 = computeQueueFingerprint(mockTickets1);
    const fp2 = computeQueueFingerprint(mockTicketsDuplicate);
    const fp3 = computeQueueFingerprint(mockTicketsModified);

    assert.strictEqual(fp1, fp2, 'Identical queue states must produce identical fingerprints');
    assert.notStrictEqual(fp1, fp3, 'Queue status modification must produce a different fingerprint');
  });

  it('should allow initial AI call and throttle subsequent call when queue is unchanged', () => {
    resetThrottlingState();
    const restaurantId = 'rest_test_unchanged';
    const mockTickets = [
      { _id: 't1', status: 'Preparing', updatedAt: new Date('2026-09-09T12:00:00Z'), items: [] },
    ];
    const fp = computeQueueFingerprint(mockTickets);
    const now = 100000;

    // 1st call -> Allowed
    const res1 = evaluateAiInvocation(restaurantId, fp, now);
    assert.strictEqual(res1.allowed, true, 'First invocation must be allowed');
    recordAiCallSuccess(restaurantId, fp, now);

    // 2nd call at same timestamp with same fingerprint -> Throttled by cooldown / unchanged queue
    const res2 = evaluateAiInvocation(restaurantId, fp, now + 1000);
    assert.strictEqual(res2.allowed, false);
    assert.strictEqual(res2.reason, 'cooldown-active', 'Call within 60s cooldown must be throttled');
  });

  it('should enforce 60-second cooldown minimum interval between AI calls even on queue change', () => {
    resetThrottlingState();
    const restaurantId = 'rest_test_cooldown';
    const fp1 = 'fp_initial_111';
    const fp2 = 'fp_modified_222';
    const startTime = 100000;

    // Call 1 at t=0
    const res1 = evaluateAiInvocation(restaurantId, fp1, startTime);
    assert.strictEqual(res1.allowed, true);
    recordAiCallSuccess(restaurantId, fp1, startTime);

    // Call 2 at t=30s with new fingerprint -> Throttled by cooldown
    const res2 = evaluateAiInvocation(restaurantId, fp2, startTime + 30000);
    assert.strictEqual(res2.allowed, false);
    assert.strictEqual(res2.reason, 'cooldown-active', 'Must enforce 60s cooldown between AI calls');

    // Call 3 at t=65s with new fingerprint -> Allowed (cooldown passed)
    const res3 = evaluateAiInvocation(restaurantId, fp2, startTime + 65000);
    assert.strictEqual(res3.allowed, true, 'Invocation after 60s cooldown must be allowed');
  });

  it('should enforce hard ceiling (max 5 calls/min per restaurant) safety net regardless of activity', () => {
    resetThrottlingState();
    const restaurantId = 'rest_test_ceiling';
    const maxLimit = env.AI_KITCHEN_MAX_CALLS_PER_MIN || 5;
    const baseTime = 500000;

    for (let i = 0; i < maxLimit; i++) {
      const fp = `fp_burst_${i}`;
      const time = baseTime + i * 8000;
      evaluateAiInvocation(restaurantId, fp, time);
    }

    const testNow = baseTime + 40000;
    const { state } = evaluateAiInvocation(restaurantId, 'fp_overflow', testNow);
    if (state) {
      state.callTimestamps = [baseTime, baseTime + 8000, baseTime + 16000, baseTime + 24000, baseTime + 32000];
    }

    const res6 = evaluateAiInvocation(restaurantId, 'fp_overflow_check', testNow);
    assert.strictEqual(res6.allowed, false);
    assert.strictEqual(res6.reason, 'ceiling-exceeded', '6th call in 60s window must hit ceiling safety net');
    assert.strictEqual(res6.callsInWindow, 5);
  });

  it('should simulate peak load profile comparison (20 ticks over 5 mins at 15s interval)', () => {
    resetThrottlingState();
    const simulatedTicks = 20; // 20 ticks * 15s = 5 minutes
    let aiCallCount = 0;
    let heuristicFallbackCount = 0;
    const baseTime = 1000000;

    for (let i = 0; i < simulatedTicks; i++) {
      const currentTime = baseTime + i * 15000; // every 15s
      const queueVersion = Math.floor(i / 5);
      const fp = `simulated_queue_v${queueVersion}`;

      const decision = evaluateAiInvocation('rest_peak_sim', fp, currentTime);
      if (decision.allowed) {
        aiCallCount += 1;
        recordAiCallSuccess('rest_peak_sim', fp, currentTime);
      } else {
        heuristicFallbackCount += 1;
      }
    }

    // Out of 20 interval ticks (which used to make 20 AI calls), verify AI calls are throttled down to ~4
    assert.strictEqual(aiCallCount, 4, 'AI calls should be throttled from 20 down to 4 during 5-minute peak window');
    assert.strictEqual(heuristicFallbackCount, 16, '16 ticks must safely fall back to local heuristic');
  });
});
