const KitchenTicket = require('./kitchenTicket.model');
const MenuItem = require('../menu/menuItem.model');
const Order = require('../order/order.model');
const ApiError = require('../../utils/ApiError');
const socketConfig = require('../../config/socket.config');

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
      kitchenStatus: 'Pending',
      priority,
      preparationTime: prepTime,
    });
  }

  const createdTickets = [];
  const stationsList = Object.keys(stationGroups);

  for (const station of stationsList) {
    const suffix = station.toUpperCase().replace(/\s+/g, '_');
    const ticketNumber = `${order.orderNumber}-${suffix}`;

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
        status: 'Pending',
        items: stationGroups[station],
        notes: order.notes || '',
      });
      createdTickets.push(ticket);
    }
  }

  // Broadcast to kitchen clients
  if (createdTickets.length > 0) {
    socketConfig.broadcastEvent(restaurantId, 'kitchen:tickets_created', createdTickets);
  }

  return createdTickets;
};

/**
 * Lists tickets with sorting by priority ('high' first) and creation date.
 */
const listTickets = async (restaurantId, { station, status, priority, search = '' }) => {
  const query = { restaurant: restaurantId };

  if (station) query.station = station;
  if (status) query.status = status;
  if (priority) query.status = priority;

  if (search) {
    query.$or = [
      { ticketNumber: { $regex: search, $options: 'i' } },
      { 'items.itemName': { $regex: search, $options: 'i' } },
    ];
  }

  // Active tickets sorted by priority and age
  const tickets = await KitchenTicket.find(query)
    .populate('table', 'tableNumber tableName')
    .sort({
      createdAt: 1,
    });

  // Sort priority in JS
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  tickets.sort((a, b) => {
    const priorityA = Math.max(...a.items.map((i) => priorityWeight[i.priority] || 2));
    const priorityB = Math.max(...b.items.map((i) => priorityWeight[i.priority] || 2));
    return priorityB - priorityA; // high priority first
  });

  return tickets;
};

/**
 * Syncs ticket items state to parent Order document.
 * Advances order status to "Ready" if all items are Ready, or "Served" if all items are Served.
 */
const syncTicketStateToOrder = async (restaurantId, orderId) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, isDeleted: false });
  if (!order) return;

  // Retrieve all kitchen tickets for this order
  const tickets = await KitchenTicket.find({ order: orderId, restaurant: restaurantId });

  // Map item statuses
  const itemStatusMap = {};
  tickets.forEach((ticket) => {
    ticket.items.forEach((item) => {
      itemStatusMap[item.orderItemId.toString()] = item.kitchenStatus;
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
  } else if (anyPreparing && oldStatus === 'Accepted') {
    order.orderStatus = 'Preparing';
  }

  await order.save();

  if (order.orderStatus !== oldStatus) {
    socketConfig.broadcastEvent(restaurantId, 'order:updated', order);
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

  ticket.items.forEach((item) => {
    item.kitchenStatus = newStatus;
    if (newStatus === 'Preparing') {
      item.preparingAt = now;
    } else if (newStatus === 'Ready') {
      item.readyAt = now;
      if (item.preparingAt) {
        item.actualDuration = Math.round(((now - item.preparingAt) / 60000) * 100) / 100;
      }
    } else if (newStatus === 'Served') {
      item.servedAt = now;
    } else if (newStatus === 'Delayed') {
      item.delayedAt = now;
    }
  });

  await ticket.save();

  // Deduct stock on items readiness
  if (newStatus === 'Ready') {
    try {
      const inventoryService = require('../inventory/inventory.service');
      for (const item of ticket.items) {
        await inventoryService.consumeStockForMenuItem(restaurantId, item.menuItem, item.quantity);
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
    }
  } else if (newStatus === 'Served') {
    item.servedAt = now;
  } else if (newStatus === 'Delayed') {
    item.delayedAt = now;
  }

  // Deduct stock for this item if marked Ready
  if (newStatus === 'Ready') {
    try {
      const inventoryService = require('../inventory/inventory.service');
      await inventoryService.consumeStockForMenuItem(restaurantId, item.menuItem, item.quantity);
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

  return ticket;
};

/**
 * Fetch KDS Dashboard statistics.
 */
const getKitchenStats = async (restaurantId) => {
  const query = { restaurant: restaurantId };

  const [pending, preparing, ready, delayed, readyItems] = await Promise.all([
    KitchenTicket.countDocuments({ ...query, status: 'Pending' }),
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
    pendingTickets: pending,
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
