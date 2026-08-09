const Order = require('./order.model');
const env = require('../../config/env.config');
const socketConfig = require('../../config/socket.config');

/**
 * Periodically checks for orders with status 'Ready' whose readyAt (or updatedAt)
 * timestamp exceeds the AUTO_SERVE_MINUTES threshold, and automatically transitions
 * them to 'Served'.
 */
const runAutoServeJob = async () => {
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

    // Log audit trail for visibility & debugging
    // eslint-disable-next-line no-console
    console.log(
      `[Auto-Serve Cron] Order #${order.orderNumber} (${tableDisplay}, ID: ${order._id}) auto-transitioned from Ready -> Served after ${elapsedMins}m (Threshold: ${thresholdMinutes}m).`
    );

    // Broadcast live Socket.IO update to all connected clients (Customer Tracking, Manager Board, KDS)
    socketConfig.broadcastEvent(order.restaurant, 'order:updated', order);
  }

  return { count: autoServedCount };
};

module.exports = {
  runAutoServeJob,
};
