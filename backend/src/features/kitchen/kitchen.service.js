const KitchenTicket = require('./kitchenTicket.model');
const MenuItem = require('../menu/menuItem.model');
const Order = require('../order/order.model');
const ApiError = require('../../utils/ApiError');
const socketConfig = require('../../config/socket.config');

/**
 * Helper to update rolling average preparation time for a menu item based on actual observed durations.
 */
const updateRollingPrepDuration = async (menuItemId, actualDuration) => {

  if (!menuItemId || !actualDuration || actualDuration <= 0) return;
  try {
    const item = await MenuItem.findById(menuItemId);
    if (!item) return;
    const current = item.preparationTime || 15;
    const updated = Math.max(1, Math.round(current * 0.8 + actualDuration * 0.2));
    item.preparationTime = updated;
    await item.save();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[KDS] Rolling prep duration update failed:', err.message);
  }
};

/**
 * Automatically groups confirmed order items by their menu items' kitchenStation,
 * creating separate KitchenTickets. Called when an order becomes "Accepted".
 */
const createTicketsFromOrder = async (restaurantId, order) => {
  if (!order || !order.items || order.items.length === 0) return [];

  // Group order items by kitchen station
  const stationGroups = {};

  for (const item of order.items) {
    const menuItem = await MenuItem.findById(item.menuItem);
    const station = menuItem?.kitchenStation || 'Main Kitchen';
    const priority = menuItem?.priority || 'medium';
    const prepTime = menuItem?.preparationTime || 15;

    if (!stationGroups[station]) {
      stationGroups[station] = [];
    }

    stationGroups[station].push({
      orderItemId: item._id,
      menuItem: item.menuItem,
      itemName: item.itemName,
      quantity: item.quantity,
      modifiers: item.modifiers,
      specialInstructions: item.specialInstructions,
      kitchenStatus: 'Preparing',
      priority,
      preparationTime: prepTime,
      preparingAt: new Date(),
    });
  }

  const createdTickets = [];
  const stationsList = Object.keys(stationGroups);

  for (const station of stationsList) {
    const suffix = station.toUpperCase().replace(/\s+/g, '_');
    const ticketNumber = `${order.orderNumber}-${suffix}`;

    try {
      // Verify if ticket already exists (prevents duplicates on re-acceptance)
      const exists = await KitchenTicket.exists({ ticketNumber, restaurant: restaurantId });
      if (!exists) {
        const ticket = await KitchenTicket.create({
          ticketNumber,
          restaurant: restaurantId,
          order: order._id,
          table: order.table,
          orderType: order.orderType,
          station,
          status: 'Preparing',
          items: stationGroups[station],
          notes: order.notes || '',
        });
        createdTickets.push(ticket);
      }
    } catch (err) {
      if (err.code === 11000) {
        // eslint-disable-next-line no-console
        console.warn(`[KDS] Duplicate ticket creation suppressed for ${ticketNumber}:`, err.message);
      } else {
        throw err;
      }
    }
  }

  // Broadcast to kitchen clients
  if (createdTickets.length > 0) {
    const populatedTickets = await KitchenTicket.find({
      _id: { $in: createdTickets.map((t) => t._id) },
    }).populate('table', 'tableNumber tableName');

    socketConfig.broadcastEvent(restaurantId, 'kitchen:tickets_created', populatedTickets.length > 0 ? populatedTickets : createdTickets);

    // Trigger Orchestration Agent Queue Rescoring asynchronously
    try {
      const kitchenOrchestrator = require('./kitchenOrchestrator.service');
      kitchenOrchestrator.rescoreKitchenQueue(restaurantId).catch(() => null);
    } catch (err) {
      // Non-blocking
    }
  }

  return createdTickets;
};

/**
 * Lists tickets with sorting by priority ('high' first) and creation date.
 */
const listTickets = async (restaurantId, { station, status, priority, search = '' }) => {
  const query = { restaurant: restaurantId };

  if (station) query.station = station;
  if (status) {
    query.status = status;
  } else {
    // Default active tickets: filter out Served tickets
    query.status = { $ne: 'Served' };
  }
  if (priority) query['items.priority'] = priority;

  if (search) {
    query.$or = [
      { ticketNumber: { $regex: search, $options: 'i' } },
      { 'items.itemName': { $regex: search, $options: 'i' } },
    ];
  }

  // Active tickets sorted by sequenceOrder & calculatedPriorityScore descending
  const tickets = await KitchenTicket.find(query)
    .populate('table', 'tableNumber tableName')
    .populate({
      path: 'order',
      select: 'orderNumber table orderType',
      populate: { path: 'table', select: 'tableNumber tableName' },
    })
    .sort({
      calculatedPriorityScore: -1,
      createdAt: 1,
    });

  return tickets;
};

/**
 * Syncs ticket items state to parent Order document.
 * Advances order status to "Ready" if all items are Ready, or "Served" if all items are Served.
 * Also handles "Delayed" status updates and dispatches customer delay notifications.
 */
const syncTicketStateToOrder = async (restaurantId, orderId) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, isDeleted: false });
  if (!order) return;

  // Retrieve all kitchen tickets for this order
  const tickets = await KitchenTicket.find({ order: orderId, restaurant: restaurantId });

  // Map item statuses and check for ticket delays
  const itemStatusMap = {};
  let anyDelayed = false;

  tickets.forEach((ticket) => {
    if (ticket.status === 'Delayed') anyDelayed = true;
    ticket.items.forEach((item) => {
      itemStatusMap[item.orderItemId.toString()] = item.kitchenStatus;
      if (item.kitchenStatus === 'Delayed') anyDelayed = true;
    });
  });

  // Update order item statuses
  let allReady = true;
  let allServed = true;
  let anyPreparing = false;

  order.items.forEach((item) => {
    const kStatus = itemStatusMap[item._id.toString()];
    if (kStatus) {
      item.kitchenStatus = kStatus;
    }

    if (item.kitchenStatus !== 'Ready') allReady = false;
    if (item.kitchenStatus !== 'Served') allServed = false;
    if (item.kitchenStatus === 'Preparing') anyPreparing = true;
  });

  // Shift orderStatus if conditions met
  const oldStatus = order.orderStatus;
  if (allServed) {
    order.orderStatus = 'Served';
  } else if (allReady) {
    order.orderStatus = 'Ready';
  } else if (anyDelayed) {
    order.orderStatus = 'Delayed';
  } else if (anyPreparing && oldStatus === 'Accepted') {
    order.orderStatus = 'Preparing';
  }

  await order.save();

  // Broadcast real-time Socket.IO events to customer and staff
  socketConfig.broadcastEvent(restaurantId, 'order:updated', order);
  socketConfig.broadcastEvent(restaurantId, 'order:kitchen_status', order);

  // Dispatch Delay notification & alert if kitchen marked order Delayed
  if (order.orderStatus === 'Delayed' && oldStatus !== 'Delayed') {
    try {
      const notificationService = require('../notification/notification.service');
      await notificationService.dispatchNotification(restaurantId, {
        title: 'Order Preparation Delayed ⏳',
        message: `Notice for Order #${order.orderNumber}: The kitchen is experiencing a slight delay preparing your items. Thank you for your patience!`,
        category: 'Order',
        priority: 'Warning',
        channels: ['In-App'],
      }).catch(() => null);

      socketConfig.broadcastEvent(restaurantId, 'order:delay_alert', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        tableId: order.table ? order.table.toString() : null,
        message: `Chef reported a slight preparation delay for Order #${order.orderNumber}.`,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[KDS] Delay notification error:', err);
    }
  }
};

/**
 * Updates full ticket status (e.g. Accept all, Ready all).
 */
const updateTicketStatus = async (restaurantId, ticketId, newStatus) => {
  const ticket = await KitchenTicket.findOne({ _id: ticketId, restaurant: restaurantId });
  if (!ticket) {
    throw ApiError.notFound('Kitchen ticket not found.');
  }

  ticket.status = newStatus;
  const now = new Date();

  for (const item of ticket.items) {
    item.kitchenStatus = newStatus;
    if (newStatus === 'Preparing') {
      item.preparingAt = now;
    } else if (newStatus === 'Ready') {
      item.readyAt = now;
      if (item.preparingAt) {
        item.actualDuration = Math.round(((now - item.preparingAt) / 60000) * 100) / 100;
        await updateRollingPrepDuration(item.menuItem, item.actualDuration);
      }
    } else if (newStatus === 'Served') {
      item.servedAt = now;
    } else if (newStatus === 'Delayed') {
      item.delayedAt = now;
    }
  }

  await ticket.save();

  // Deduct stock on items readiness without double deduction
  if (newStatus === 'Ready' || newStatus === 'Served') {
    try {
      const inventoryService = require('../inventory/inventory.service');
      for (const item of ticket.items) {
        if (!item.deducted) {
          await inventoryService.consumeStockForMenuItem(restaurantId, item.menuItem, item.quantity);
          item.deducted = true;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[KDS] Failed to deduct stock during ticket readiness: ', err);
    }
  }

  // Sync to parent order
  await syncTicketStateToOrder(restaurantId, ticket.order);

  // Broadcast KDS event
  socketConfig.broadcastEvent(restaurantId, 'kitchen:ticket_updated', ticket);

  // Trigger Orchestration Agent Queue Rescoring
  try {
    const kitchenOrchestrator = require('./kitchenOrchestrator.service');
    kitchenOrchestrator.rescoreKitchenQueue(restaurantId).catch(() => null);
  } catch (err) {
    // Non-blocking
  }

  return ticket;
};

/**
 * Updates specific item status inside a ticket (e.g. Accept Paneer Tikka).
 */
const updateTicketItemStatus = async (restaurantId, ticketId, itemId, newStatus) => {
  const ticket = await KitchenTicket.findOne({ _id: ticketId, restaurant: restaurantId });
  if (!ticket) {
    throw ApiError.notFound('Kitchen ticket not found.');
  }

  const item = ticket.items.id(itemId);
  if (!item) {
    throw ApiError.notFound('Item not found in ticket.');
  }

  item.kitchenStatus = newStatus;
  const now = new Date();

  if (newStatus === 'Preparing') {
    item.preparingAt = now;
  } else if (newStatus === 'Ready') {
    item.readyAt = now;
    if (item.preparingAt) {
      item.actualDuration = Math.round(((now - item.preparingAt) / 60000) * 100) / 100;
      await updateRollingPrepDuration(item.menuItem, item.actualDuration);
    }
  } else if (newStatus === 'Served') {
    item.servedAt = now;
  } else if (newStatus === 'Delayed') {
    item.delayedAt = now;
  }

  // Deduct stock for this item if marked Ready/Served without double-deduction
  if ((newStatus === 'Ready' || newStatus === 'Served') && !item.deducted) {
    try {
      const inventoryService = require('../inventory/inventory.service');
      await inventoryService.consumeStockForMenuItem(restaurantId, item.menuItem, item.quantity);
      item.deducted = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[KDS] Failed to deduct stock during item readiness: ', err);
    }
  }

  // Recalculate full ticket status
  const statuses = ticket.items.map((i) => i.kitchenStatus);
  const allSame = statuses.every((s) => s === newStatus);

  if (allSame) {
    ticket.status = newStatus;
  } else if (statuses.some((s) => s === 'Preparing')) {
    ticket.status = 'Preparing';
  } else if (statuses.every((s) => s === 'Ready' || s === 'Served')) {
    ticket.status = 'Ready';
  }

  await ticket.save();

  // Sync to parent order
  await syncTicketStateToOrder(restaurantId, ticket.order);

  // Broadcast KDS event
  socketConfig.broadcastEvent(restaurantId, 'kitchen:ticket_updated', ticket);

  // Trigger Orchestration Agent Queue Rescoring
  try {
    const kitchenOrchestrator = require('./kitchenOrchestrator.service');
    kitchenOrchestrator.rescoreKitchenQueue(restaurantId).catch(() => null);
  } catch (err) {
    // Non-blocking
  }

  return ticket;
};

/**
 * Fetch KDS Dashboard statistics.
 */
const getKitchenStats = async (restaurantId) => {
  const query = { restaurant: restaurantId };

  const [preparing, ready, delayed, readyItems] = await Promise.all([
    KitchenTicket.countDocuments({ ...query, status: 'Preparing' }),
    KitchenTicket.countDocuments({ ...query, status: 'Ready' }),
    KitchenTicket.countDocuments({ ...query, status: 'Delayed' }),

    // Find all items with actualDuration > 0 to average them
    KitchenTicket.find({
      ...query,
      status: { $in: ['Ready', 'Served'] },
      'items.actualDuration': { $gt: 0 },
    }),
  ]);

  // Compute average duration of ready items
  let sumDuration = 0;
  let countItems = 0;

  readyItems.forEach((t) => {
    t.items.forEach((item) => {
      if (item.actualDuration > 0) {
        sumDuration += item.actualDuration;
        countItems += 1;
      }
    });
  });

  const avgPrepTime = countItems > 0 ? Math.round((sumDuration / countItems) * 100) / 100 : 0;

  return {
    preparingTickets: preparing,
    readyTickets: ready,
    delayedTickets: delayed,
    averagePrepTimeMinutes: avgPrepTime,
  };
};

module.exports = {
  createTicketsFromOrder,
  listTickets,
  updateTicketStatus,
  updateTicketItemStatus,
  getKitchenStats,
};

