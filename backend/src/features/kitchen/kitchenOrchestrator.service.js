const crypto = require('crypto');
const axios = require('axios');
const KitchenTicket = require('./kitchenTicket.model');
const Order = require('../order/order.model');
const env = require('../../config/env.config');
const socketConfig = require('../../config/socket.config');

const PRIORITY_WEIGHTS = {
  high: 25,
  medium: 10,
  low: 0,
};

const STARTER_KEYWORDS = ['soup', 'salad', 'appetizer', 'starter', 'wing', 'fries', 'nacho', 'dimsum', 'tikka', 'kebab', 'bread', 'naan', 'garlic'];

function isStarterItem(itemName, explicitStarter) {
  if (explicitStarter) return true;
  if (!itemName) return false;
  const nameLower = itemName.toLowerCase();
  return STARTER_KEYWORDS.some((kw) => nameLower.includes(kw));
}

// In-memory throttling & rate-ceiling tracking state per restaurant
const restaurantAiStateMap = new Map();

/**
 * Computes a deterministic hash fingerprint of active ticket queue state.
 */
function computeQueueFingerprint(tickets) {
  const parts = (tickets || []).map((t) => {
    const itemDigest = (t.items || [])
      .map((i) => `${i._id || i.orderItemId}:${i.kitchenStatus || 'Pending'}:${i.quantity}`)
      .sort()
      .join(',');
    const updated = t.updatedAt ? new Date(t.updatedAt).getTime() : (t.createdAt ? new Date(t.createdAt).getTime() : 0);
    return `${t._id}:${t.status}:${updated}:${itemDigest}`;
  });
  return crypto.createHash('md5').update(parts.sort().join('|')).digest('hex');
}

/**
 * Evaluates whether an AI microservice call should proceed or be throttled / ceiling-blocked.
 */
function evaluateAiInvocation(restaurantId, currentFingerprint, now = Date.now()) {
  const minIntervalMs = env.AI_KITCHEN_RESCORE_MIN_INTERVAL_MS || 60000;
  const maxCallsPerMin = env.AI_KITCHEN_MAX_CALLS_PER_MIN || 5;

  const key = String(restaurantId);
  let state = restaurantAiStateMap.get(key);
  if (!state) {
    state = {
      lastAiCallTime: 0,
      lastFingerprint: null,
      callTimestamps: [],
    };
    restaurantAiStateMap.set(key, state);
  }

  // Filter timestamps to last 60 seconds (sliding window)
  state.callTimestamps = state.callTimestamps.filter((ts) => now - ts < 60000);

  // 1. HARD CEILING CHECK (Max N calls/min) -> Fallback to Local Heuristic
  if (state.callTimestamps.length >= maxCallsPerMin) {
    return {
      allowed: false,
      reason: 'ceiling-exceeded',
      callsInWindow: state.callTimestamps.length,
      maxCallsPerMin,
    };
  }

  // 2. MINIMUM INTERVAL COOLDOWN CHECK
  const elapsedMs = now - state.lastAiCallTime;
  if (state.lastAiCallTime > 0 && elapsedMs < minIntervalMs) {
    return {
      allowed: false,
      reason: 'cooldown-active',
      elapsedMs,
      minIntervalMs,
    };
  }

  // 3. UNCHANGED QUEUE CHECK (Material Change Filter)
  if (state.lastFingerprint && state.lastFingerprint === currentFingerprint) {
    return {
      allowed: false,
      reason: 'unchanged-queue',
    };
  }

  return { allowed: true, state };
}

function recordAiCallSuccess(restaurantId, fingerprint, now = Date.now()) {
  const key = String(restaurantId);
  let state = restaurantAiStateMap.get(key);
  if (!state) {
    state = { lastAiCallTime: 0, lastFingerprint: null, callTimestamps: [] };
    restaurantAiStateMap.set(key, state);
  }
  state.lastAiCallTime = now;
  state.lastFingerprint = fingerprint;
  state.callTimestamps.push(now);
}

function resetThrottlingState() {
  restaurantAiStateMap.clear();
}

function getThrottlingStats(restaurantId, now = Date.now()) {
  const key = String(restaurantId);
  const state = restaurantAiStateMap.get(key);
  if (!state) return { lastAiCallTime: 0, callsInWindow: 0, lastFingerprint: null };
  const callsInWindow = state.callTimestamps.filter((ts) => now - ts < 60000).length;
  return {
    lastAiCallTime: state.lastAiCallTime,
    callsInWindow,
    lastFingerprint: state.lastFingerprint,
  };
}

/**
 * Deterministic local heuristic scoring algorithm (Fallback Path)
 */
function computeLocalHeuristicSchedule(tickets, now = new Date()) {
  const activeTickets = tickets.filter((t) => t.status !== 'Served');

  // Group order items by order ID for course coordination
  const orderItemsMap = {};
  activeTickets.forEach((t) => {
    const oId = String(t.order?._id || t.order);
    if (!orderItemsMap[oId]) orderItemsMap[oId] = [];
    (t.items || []).forEach((item) => {
      orderItemsMap[oId].push({
        itemName: item.itemName,
        isStarter: isStarterItem(item.itemName, item.isStarter),
      });
    });
  });

  const stationQueues = {};
  const scoredTickets = [];
  let atRiskCount = 0;
  let lateCount = 0;

  activeTickets.forEach((ticket) => {
    const createdDt = new Date(ticket.createdAt || now);
    const elapsedMins = Math.max(0, (now.getTime() - createdDt.getTime()) / 60000);
    const items = ticket.items || [];
    const maxPrepMins = Math.max(...items.map((i) => i.preparationTime || 15), 15);
    const maxPrioWeight = Math.max(...items.map((i) => PRIORITY_WEIGHTS[i.priority] || 10), 10);

    const oId = String(ticket.order?._id || ticket.order);
    const orderItems = orderItemsMap[oId] || [];
    const hasStarters = orderItems.some((i) => i.isStarter);
    const hasMains = orderItems.some((i) => !i.isStarter);
    const ticketHasStarters = items.some((i) => isStarterItem(i.itemName, i.isStarter));

    let courseMod = 0;
    if (hasStarters && hasMains) {
      if (ticketHasStarters) {
        courseMod += 15.0; // Boost starter tickets
      } else {
        courseMod -= 5.0; // Hold main course slightly
      }
    }

    const ageScore = elapsedMins * 0.8;
    const totalScore = ageScore + maxPrioWeight + courseMod;

    const targetReadyTime = new Date(createdDt.getTime() + (maxPrepMins + 2) * 60000);
    const remainingBudgetMins = (targetReadyTime.getTime() - now.getTime()) / 60000;

    let priorityFlag = 'on-track';
    if (now > targetReadyTime || elapsedMins >= (maxPrepMins + 5)) {
      priorityFlag = 'late';
      lateCount += 1;
    } else if (remainingBudgetMins <= 3.5 || elapsedMins >= (maxPrepMins - 2)) {
      priorityFlag = 'at-risk';
      atRiskCount += 1;
    }

    const scoredTicket = {
      ticketId: String(ticket._id),
      ticketNumber: ticket.ticketNumber,
      orderId: oId,
      station: ticket.station || 'Main Kitchen',
      status: ticket.status,
      priorityFlag,
      calculatedPriorityScore: Math.round(totalScore * 100) / 100,
      targetReadyTime,
      sequenceOrder: 0,
    };

    scoredTickets.push(scoredTicket);

    const stn = ticket.station || 'Main Kitchen';
    if (!stationQueues[stn]) stationQueues[stn] = [];
    stationQueues[stn].push(scoredTicket);
  });

  // Sort station queues by calculatedPriorityScore descending
  Object.keys(stationQueues).forEach((stn) => {
    stationQueues[stn].sort((a, b) => b.calculatedPriorityScore - a.calculatedPriorityScore);
    stationQueues[stn].forEach((t, idx) => {
      t.sequenceOrder = idx + 1;
    });
  });

  return {
    rescoredAt: now.toISOString(),
    totalActiveTickets: scoredTickets.length,
    stationQueues,
    tickets: scoredTickets,
    atRiskCount,
    lateCount,
    source: 'deterministic-heuristic',
  };
}

/**
 * Main Kitchen Orchestration Agent Service with Throttling & Hard Rate Ceiling Safety Net
 */
const rescoreKitchenQueue = async (restaurantId, options = {}) => {
  if (!restaurantId) return null;

  try {
    const activeTickets = await KitchenTicket.find({
      restaurant: restaurantId,
      status: { $ne: 'Served' },
    })
      .populate('table', 'tableNumber tableName')
      .populate('order', 'orderNumber orderType orderStatus');

    if (activeTickets.length === 0) {
      return {
        restaurantId,
        totalActiveTickets: 0,
        stationQueues: {},
        tickets: [],
        atRiskCount: 0,
        lateCount: 0,
      };
    }

    const currentFingerprint = computeQueueFingerprint(activeTickets);
    const now = Date.now();
    const decision = evaluateAiInvocation(restaurantId, currentFingerprint, now);

    let scheduleResult = null;
    const aiBaseURL = env.AI_SERVICE_URL || 'http://localhost:8000';

    if (decision.allowed && !options.forceHeuristic) {
      // Primary Model-Based Path via AI Microservice
      try {
        const payload = {
          restaurantId: String(restaurantId),
          currentTime: new Date().toISOString(),
          tickets: activeTickets.map((t) => ({
            ticketId: String(t._id),
            ticketNumber: t.ticketNumber,
            orderId: String(t.order?._id || t.order),
            tableId: t.table?._id ? String(t.table._id) : null,
            tableNumber: t.table?.tableNumber || null,
            station: t.station,
            status: t.status,
            createdAt: t.createdAt.toISOString(),
            items: (t.items || []).map((i) => ({
              orderItemId: String(i.orderItemId || i._id),
              menuItem: String(i.menuItem),
              itemName: i.itemName,
              quantity: i.quantity,
              kitchenStation: t.station,
              priority: i.priority || 'medium',
              preparationTime: i.preparationTime || 15,
              kitchenStatus: i.kitchenStatus || 'Pending',
              specialInstructions: i.specialInstructions || '',
            })),
            notes: t.notes || '',
          })),
        };

        const response = await axios.post(`${aiBaseURL}/api/v1/kitchen/schedule`, payload, {
          timeout: 2500,
        });

        if (response.data && response.data.tickets) {
          scheduleResult = {
            ...response.data,
            source: 'ai-microservice',
          };
          recordAiCallSuccess(restaurantId, currentFingerprint, now);
        }
      } catch (aiErr) {
        // Gracefully fall back to deterministic local heuristic algorithm
        // eslint-disable-next-line no-console
        console.warn('[KitchenOrchestrator] AI scheduling service offline/timed out. Falling back to local heuristic:', aiErr.message);
        scheduleResult = computeLocalHeuristicSchedule(activeTickets);
      }
    } else {
      // Throttled or Rate Ceiling Triggered -> Fallback to Local Heuristic
      if (decision.reason === 'ceiling-exceeded') {
        // eslint-disable-next-line no-console
        console.warn(
          `[KitchenOrchestrator] AI call ceiling reached for restaurant ${restaurantId} (${decision.callsInWindow}/${decision.maxCallsPerMin} calls in 60s). Falling back to local heuristic.`
        );
      }
      scheduleResult = computeLocalHeuristicSchedule(activeTickets);
      scheduleResult.source = `deterministic-heuristic-${decision.reason || 'throttled'}`;
    }

    if (!scheduleResult) {
      scheduleResult = computeLocalHeuristicSchedule(activeTickets);
    }

    // Persist calculated targetReadyTime, priorityFlag, score, and sequenceOrder back to KitchenTicket DB
    const bulkOps = (scheduleResult.tickets || []).map((st) => ({
      updateOne: {
        filter: { _id: st.ticketId },
        update: {
          $set: {
            targetReadyTime: st.targetReadyTime ? new Date(st.targetReadyTime) : null,
            priorityFlag: st.priorityFlag || 'on-track',
            calculatedPriorityScore: st.calculatedPriorityScore || 0,
            sequenceOrder: st.sequenceOrder || 0,
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await KitchenTicket.bulkWrite(bulkOps);
    }

    // Sync order SLA flags if tickets are at-risk or late
    const atRiskOrLateOrderIds = new Set(
      (scheduleResult.tickets || [])
        .filter((t) => t.priorityFlag === 'at-risk' || t.priorityFlag === 'late')
        .map((t) => t.orderId)
    );

    if (atRiskOrLateOrderIds.size > 0) {
      await Order.updateMany(
        { _id: { $in: Array.from(atRiskOrLateOrderIds) }, orderStatus: { $in: ['Accepted', 'Preparing'] } },
        { $set: { orderStatus: 'Delayed' } }
      );
    }

    // Broadcast updated queue & SLA alerts via Socket.IO
    socketConfig.broadcastEvent(restaurantId, 'kitchen:queue_rescored', scheduleResult);

    if (atRiskOrLateOrderIds.size > 0) {
      socketConfig.broadcastEvent(restaurantId, 'order:sla_alert', {
        atRiskCount: scheduleResult.atRiskCount,
        lateCount: scheduleResult.lateCount,
        affectedOrderIds: Array.from(atRiskOrLateOrderIds),
      });
    }

    return scheduleResult;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[KitchenOrchestrator] Re-scoring failed:', err);
    return null;
  }
};

module.exports = {
  rescoreKitchenQueue,
  computeLocalHeuristicSchedule,
  computeQueueFingerprint,
  evaluateAiInvocation,
  recordAiCallSuccess,
  resetThrottlingState,
  getThrottlingStats,
};
