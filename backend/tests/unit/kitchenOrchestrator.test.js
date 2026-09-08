const assert = require('assert');
const { computeLocalHeuristicSchedule } = require('../../src/features/kitchen/kitchenOrchestrator.service');

describe('Kitchen Orchestration Agent Unit Tests', () => {
  it('should balance station queues and calculate sequence order correctly', () => {
    const mockTickets = [
      {
        _id: 'ticket_1',
        ticketNumber: 'ORD-101-MAIN',
        station: 'Main Kitchen',
        status: 'Preparing',
        createdAt: new Date(Date.now() - 5 * 60000), // 5 mins ago
        items: [
          { itemName: 'Paneer Butter Masala', priority: 'medium', preparationTime: 15 },
        ],
      },
      {
        _id: 'ticket_2',
        ticketNumber: 'ORD-102-MAIN',
        station: 'Main Kitchen',
        status: 'Pending',
        createdAt: new Date(Date.now() - 12 * 60000), // 12 mins ago (aged)
        items: [
          { itemName: 'Dal Makhani', priority: 'high', preparationTime: 15 },
        ],
      },
      {
        _id: 'ticket_3',
        ticketNumber: 'ORD-101-BAR',
        station: 'Bar',
        status: 'Preparing',
        createdAt: new Date(Date.now() - 2 * 60000),
        items: [
          { itemName: 'Mango Lassi', priority: 'medium', preparationTime: 5 },
        ],
      },
    ];

    const result = computeLocalHeuristicSchedule(mockTickets);

    assert.strictEqual(result.totalActiveTickets, 3);
    assert.ok(result.stationQueues['Main Kitchen']);
    assert.ok(result.stationQueues['Bar']);

    // Main Kitchen ticket_2 (aged 12m + high priority) should be ranked #1 in Main Kitchen queue
    const mainQueue = result.stationQueues['Main Kitchen'];
    assert.strictEqual(mainQueue[0].ticketId, 'ticket_2');
    assert.strictEqual(mainQueue[0].sequenceOrder, 1);
  });

  it('should prioritize starters over main course items in course coordination', () => {
    const mockTickets = [
      {
        _id: 'ticket_main',
        order: 'order_99',
        ticketNumber: 'ORD-99-MAIN',
        station: 'Main Kitchen',
        status: 'Pending',
        createdAt: new Date(Date.now() - 3 * 60000),
        items: [
          { itemName: 'Chicken Biryani', priority: 'medium', preparationTime: 20 },
        ],
      },
      {
        _id: 'ticket_starter',
        order: 'order_99',
        ticketNumber: 'ORD-99-STARTER',
        station: 'Main Kitchen',
        status: 'Pending',
        createdAt: new Date(Date.now() - 3 * 60000),
        items: [
          { itemName: 'Paneer Tikka Starter', priority: 'medium', preparationTime: 10, isStarter: true },
        ],
      },
    ];

    const result = computeLocalHeuristicSchedule(mockTickets);
    const queue = result.stationQueues['Main Kitchen'];

    // Starter ticket should get course coordination boost and rank first
    assert.strictEqual(queue[0].ticketId, 'ticket_starter');
    assert.strictEqual(queue[0].sequenceOrder, 1);
  });

  it('should flag tickets proactively as at-risk or late based on elapsed SLA duration', () => {
    const mockTickets = [
      {
        _id: 'ticket_normal',
        ticketNumber: 'ORD-1',
        station: 'Main Kitchen',
        status: 'Preparing',
        createdAt: new Date(Date.now() - 2 * 60000), // 2 mins ago (15m prep) -> on-track
        items: [{ itemName: 'Butter Naan', priority: 'medium', preparationTime: 15 }],
      },
      {
        _id: 'ticket_at_risk',
        ticketNumber: 'ORD-2',
        station: 'Main Kitchen',
        status: 'Preparing',
        createdAt: new Date(Date.now() - 14 * 60000), // 14 mins ago (15m prep) -> at-risk
        items: [{ itemName: 'Mix Veg', priority: 'medium', preparationTime: 15 }],
      },
      {
        _id: 'ticket_late',
        ticketNumber: 'ORD-3',
        station: 'Main Kitchen',
        status: 'Preparing',
        createdAt: new Date(Date.now() - 22 * 60000), // 22 mins ago (15m prep) -> late
        items: [{ itemName: 'Tandoori Roti', priority: 'medium', preparationTime: 15 }],
      },
    ];

    const result = computeLocalHeuristicSchedule(mockTickets);
    const queue = result.stationQueues['Main Kitchen'];

    const normal = queue.find((t) => t.ticketId === 'ticket_normal');
    const atRisk = queue.find((t) => t.ticketId === 'ticket_at_risk');
    const late = queue.find((t) => t.ticketId === 'ticket_late');

    assert.strictEqual(normal.priorityFlag, 'on-track');
    assert.strictEqual(atRisk.priorityFlag, 'at-risk');
    assert.strictEqual(late.priorityFlag, 'late');
    assert.strictEqual(result.atRiskCount, 1);
    assert.strictEqual(result.lateCount, 1);
  });
});
