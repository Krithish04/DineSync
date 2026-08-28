const Order = require('./order.model');
const Table = require('../table/table.model');
const TableSession = require('../table/tableSession.model');
const env = require('../../config/env.config');
const socketConfig = require('../../config/socket.config');

const TableSessionAudit = require('../table/tableSessionAudit.model');

/**
 * Cleans up stale table sessions that have been abandoned or where all orders
 * are finished/settled, releasing the table back to 'Available'.
 */
const cleanupStaleTableSessions = async (restaurantId = null) => {
  try {
    const tableQuery = { status: 'Occupied', isDeleted: false };
    if (restaurantId) tableQuery.restaurant = restaurantId;

    const occupiedTables = await Table.find(tableQuery);
    if (!occupiedTables.length) return;

    // 15-minute idle threshold for auto-releasing abandoned dining table sessions without active orders
    const idleThresholdMs = 15 * 60 * 1000;
    const idleCutoff = new Date(Date.now() - idleThresholdMs);

    for (const table of occupiedTables) {
      const activeSession = await TableSession.findOne({ table: table._id, status: 'active' });

      // Check if there are active, unfinished orders for this table
      const unfinishedOrders = await Order.find({
        table: table._id,
        orderStatus: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready'] },
        isDeleted: false,
      });

      const hasUnfinishedOrders = unfinishedOrders.length > 0;
      const lastActivity = activeSession?.lastActivityAt || activeSession?.updatedAt || activeSession?.startedAt || activeSession?.createdAt;
      const isIdlePastThreshold = lastActivity && new Date(lastActivity) < idleCutoff;

      if (!hasUnfinishedOrders && (isIdlePastThreshold || !activeSession)) {
        // Complete any lingering served orders for this table
        await Order.updateMany(
          { table: table._id, orderStatus: 'Served', isDeleted: false },
          { $set: { orderStatus: 'Completed' } }
        );

        table.status = 'Available';
        table.currentHostName = '';
        table.currentHostPhone = '';
        await table.save();

        if (activeSession) {
          activeSession.status = 'released';
          activeSession.endedAt = new Date();
          await activeSession.save();

          // Log audit record
          await TableSessionAudit.create({
            restaurant: table.restaurant,
            table: table._id,
            session: activeSession._id,
            action: TableSessionAudit.AUDIT_ACTIONS.STALE_AUTO_RELEASE,
            actorPhone: activeSession.hostPhone || '',
            actorName: activeSession.hostName || '',
            reason: 'System auto-released abandoned table session after 15 minutes of inactivity with 0 active orders.',
            metadata: { lastActivity },
          }).catch(() => null);

          socketConfig.broadcastEvent(table.restaurant, 'table:session-ended', {
            sessionId: activeSession._id,
            tableId: table._id,
            tableNumber: table.tableNumber,
            status: 'released',
          });
        }

        socketConfig.broadcastEvent(table.restaurant, 'table:updated', {
          tableId: table._id,
          tableNumber: table.tableNumber,
          status: 'Available',
          currentHostName: '',
          currentHostPhone: '',
          forceLogout: true,
        });
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Stale Table Cleanup Error]:', err.message);
  }
};

/**
 * Periodically checks for orders with status 'Ready' whose readyAt (or updatedAt)
 * timestamp exceeds the AUTO_SERVE_MINUTES threshold, and automatically transitions
 * them to 'Served'. Also releases stale table sessions.
 */
const runAutoServeJob = async () => {
  // First clean up any stale or abandoned table sessions
  await cleanupStaleTableSessions();

  const thresholdMinutes = env.AUTO_SERVE_MINUTES || 10;
  const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  // Find all orders ready for auto-serving
  const readyOrders = await Order.find({
    orderStatus: 'Ready',
    isDeleted: false,
    $or: [
      { readyAt: { $lte: cutoffTime } },
      { readyAt: null, updatedAt: { $lte: cutoffTime } },
    ],
  }).populate('table', 'tableNumber');

  if (readyOrders.length === 0) {
    return { count: 0 };
  }

  const autoServedCount = readyOrders.length;

  for (const order of readyOrders) {
    const elapsedMins = order.readyAt
      ? Math.round((Date.now() - new Date(order.readyAt).getTime()) / 60000)
      : Math.round((Date.now() - new Date(order.updatedAt).getTime()) / 60000);

    order.orderStatus = 'Served';
    order.servedAt = new Date();

    // Also sync item kitchen statuses to Served
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item) => {
        if (item.kitchenStatus === 'Ready') {
          item.kitchenStatus = 'Served';
        }
      });
    }

    await order.save();

    const tableDisplay = order.table?.tableNumber ? `Table #${order.table.tableNumber}` : 'Takeaway/QR';

    // eslint-disable-next-line no-console
    console.log(
      `[Auto-Serve Cron] Order #${order.orderNumber} (${tableDisplay}, ID: ${order._id}) auto-transitioned from Ready -> Served after ${elapsedMins}m (Threshold: ${thresholdMinutes}m).`
    );

    // Broadcast live Socket.IO update to all connected clients
    socketConfig.broadcastEvent(order.restaurant, 'order:updated', order);
  }

  return { count: autoServedCount };
};

module.exports = {
  runAutoServeJob,
  cleanupStaleTableSessions,
};
