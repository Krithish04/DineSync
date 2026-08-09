const mongoose = require('mongoose');
const Order = require('./order.model');
const MenuItem = require('../menu/menuItem.model');
const Table = require('../table/table.model');
const ApiError = require('../../utils/ApiError');
const socketConfig = require('../../config/socket.config');

/**
 * Automates totals calculations for an array of input items:
 * Subtotal = Sum(Quantity * (unitPrice + ModifiersPrice))
 * GST Tax = Sum(Quantity * (unitPrice + ModifiersPrice) * menuItem.gst / 100)
 * Service Charge = Subtotal * 0.05 (5%)
 * Grand Total = Subtotal - Discount + Tax + Service Charge
 */
const calculateOrderTotals = async (restaurantId, itemsInput, discount = 0) => {
  let subtotal = 0;
  let tax = 0;
  const processedItems = [];

  for (const item of itemsInput) {
    const menuItem = await MenuItem.findOne({
      _id: item.menuItem,
      restaurant: restaurantId,
    });

    if (!menuItem) {
      throw ApiError.notFound(`Menu item not found.`);
    }

    if (!menuItem.isAvailable) {
      throw ApiError.badRequest(`Menu item "${menuItem.name}" is currently out of stock/unavailable.`);
    }

    // Sum modifier prices
    let modifiersPrice = 0;
    const itemModifiers = item.modifiers || [];
    itemModifiers.forEach((mod) => {
      modifiersPrice += mod.price;
    });

    const unitPrice = menuItem.price;
    const totalUnitCost = unitPrice + modifiersPrice;
    const itemSubtotal = totalUnitCost * item.quantity;
    
    // Calculate GST based on menu item specific tax rate
    const itemTax = (itemSubtotal * (menuItem.gst || 0)) / 100;

    subtotal += itemSubtotal;
    tax += itemTax;

    processedItems.push({
      menuItem: menuItem._id,
      itemName: menuItem.name,
      quantity: item.quantity,
      unitPrice,
      modifiers: itemModifiers,
      specialInstructions: item.specialInstructions || '',
      kitchenStatus: item.kitchenStatus || 'Pending',
    });
  }

  const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100; // 5% Service Charge
  const grandTotal = Math.max(0, Math.round((subtotal - discount + tax + serviceCharge) * 100) / 100);

  return {
    processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    serviceCharge,
    grandTotal,
  };
};

/**
 * Creates a new order.
 */
const createOrder = async (restaurantId, payload, userId = null) => {
  // If Dine-In or QR Order, check table validity
  if (['Dine-In', 'QR Order'].includes(payload.orderType)) {
    if (!payload.table) {
      throw ApiError.badRequest('Table selection is required for Dine-In/QR orders.');
    }
    const table = await Table.findOne({ _id: payload.table, restaurant: restaurantId, isDeleted: false });
    if (!table) {
      throw ApiError.notFound('Table not found.');
    }
    if (!table.isActive) {
      throw ApiError.badRequest('Selected table is currently inactive.');
    }
  }

  // Calculate billing totals
  const { processedItems, subtotal, tax, serviceCharge, grandTotal } = await calculateOrderTotals(
    restaurantId,
    payload.items,
    payload.discount
  );

  const order = await Order.create({
    ...payload,
    restaurant: restaurantId,
    items: processedItems,
    subtotal,
    tax,
    serviceCharge,
    grandTotal,
    createdBy: userId,
  });

  // If table is bound, auto update status
  if (['Dine-In', 'QR Order'].includes(order.orderType) && order.table) {
    await Table.updateOne({ _id: order.table }, { status: 'Occupied' });
  }

  // Auto split tickets to Kitchen if order starts as Accepted
  if (order.orderStatus === 'Accepted') {
    const kitchenService = require('../kitchen/kitchen.service');
    await kitchenService.createTicketsFromOrder(restaurantId, order);
  }

  // Broadcast real-time event
  socketConfig.broadcastEvent(restaurantId, 'order:created', order);

  return order;
};

/**
 * Lists orders with pagination and filters.
 */
const listOrders = async (
  restaurantId,
  { page = 1, limit = 20, orderStatus, paymentStatus, orderType, search = '' }
) => {
  const query = { restaurant: restaurantId, isDeleted: false };

  if (orderStatus) query.orderStatus = orderStatus;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (orderType) query.orderType = orderType;

  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'items.itemName': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('table', 'tableNumber tableName'),
    Order.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Gets a single order.
 */
const getOrder = async (restaurantId, orderId) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, isDeleted: false })
    .populate('table', 'tableNumber tableName');

  if (!order) {
    throw ApiError.notFound('Order not found.');
  }
  return order;
};

/**
 * Updates order details (e.g. adding items, notes).
 */
const updateOrder = async (restaurantId, orderId, updates) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, isDeleted: false });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  // If order items are changing, re-calculate totals
  if (updates.items) {
    const { processedItems, subtotal, tax, serviceCharge, grandTotal } = await calculateOrderTotals(
      restaurantId,
      updates.items,
      updates.discount !== undefined ? updates.discount : order.discount
    );
    updates.items = processedItems;
    updates.subtotal = subtotal;
    updates.tax = tax;
    updates.serviceCharge = serviceCharge;
    updates.grandTotal = grandTotal;
  } else if (updates.discount !== undefined) {
    // If only discount changed, recalculate grandTotal based on existing subtotal/tax
    updates.serviceCharge = order.subtotal * 0.05;
    updates.grandTotal = Math.max(0, order.subtotal - updates.discount + order.tax + updates.serviceCharge);
  }

  Object.assign(order, updates);
  await order.save();

  // Populate references
  await order.populate('table', 'tableNumber tableName');

  // Broadcast update
  socketConfig.broadcastEvent(restaurantId, 'order:updated', order);

  return order;
};

/**
 * Specific status advancement.
 */
const updateOrderStatus = async (restaurantId, orderId, newStatus) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, isDeleted: false });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  order.orderStatus = newStatus;
  
  // Kitchen status sync
  if (newStatus === 'Accepted') {
    const kitchenService = require('../kitchen/kitchen.service');
    await kitchenService.createTicketsFromOrder(restaurantId, order);
  } else if (newStatus === 'Preparing') {
    order.items.forEach((item) => {
      if (item.kitchenStatus === 'Pending') item.kitchenStatus = 'Preparing';
    });
  } else if (newStatus === 'Ready') {
    if (!order.readyAt) order.readyAt = new Date();
    order.items.forEach((item) => {
      if (['Pending', 'Preparing'].includes(item.kitchenStatus)) item.kitchenStatus = 'Ready';
    });
  } else if (newStatus === 'Served') {
    if (!order.servedAt) order.servedAt = new Date();
    order.items.forEach((item) => {
      item.kitchenStatus = 'Served';
    });
  }

  await order.save();

  // If completed/cancelled, release table status
  if (['Completed', 'Cancelled'].includes(newStatus) && order.table) {
    // Recheck if any other active orders exist for this table before freeing it
    const activeOrders = await Order.exists({
      table: order.table,
      orderStatus: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'] },
      isDeleted: false,
      _id: { $ne: orderId },
    });
    if (!activeOrders) {
      await Table.updateOne({ _id: order.table }, { status: 'Available' });
    }
  }

  await order.populate('table', 'tableNumber tableName');

  // Broadcast Socket events based on status
  if (newStatus === 'Cancelled') {
    socketConfig.broadcastEvent(restaurantId, 'order:cancelled', order);
  } else {
    socketConfig.broadcastEvent(restaurantId, 'order:updated', order);
    socketConfig.broadcastEvent(restaurantId, 'order:kitchen_status', order);
  }

  return order;
};

/**
 * Specific payment status advancement.
 */
const updatePaymentStatus = async (restaurantId, orderId, paymentStatus, redeemPoints = 0) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, isDeleted: false });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  const oldPaymentStatus = order.paymentStatus;
  order.paymentStatus = paymentStatus;

  if (paymentStatus === 'Paid' && oldPaymentStatus !== 'Paid') {
    order.orderStatus = 'Completed';

    // Ensure Paid Invoice exists for BI reporting
    const billingService = require('../billing/billing.service');
    await billingService.ensurePaidInvoiceForOrder(restaurantId, order, order.paymentMethod || 'UPI', order.paymentDetails?.transactionId);

    // Free table
    if (order.table) {
      const activeOrders = await Order.exists({
        table: order.table,
        orderStatus: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'] },
        isDeleted: false,
        _id: { $ne: orderId },
      });
      if (!activeOrders) {
        await Table.updateOne({ _id: order.table }, { status: 'Available' });
      }
    }

    // Loyalty Points Accrual & Redemption
    if (order.customer) {
      const customerService = require('../customer/customer.service');
      
      if (redeemPoints > 0) {
        try {
          const discountAmount = await customerService.redeemPointsForOrder(
            restaurantId,
            order.customer,
            redeemPoints,
            order._id
          );
          
          order.discount = (order.discount || 0) + discountAmount;
          order.grandTotal = Math.max(0, order.grandTotal - discountAmount);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Loyalty] Redemption failed:', err.message);
        }
      }

      try {
        await customerService.earnPointsForOrder(restaurantId, order.customer, order);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Loyalty] Point accrual failed:', err.stack || err);
        if (process.env.NODE_ENV !== 'production') {
          throw err;
        }
      }
    }
  }

  await order.save();
  await order.populate('table', 'tableNumber tableName');

  // Broadcast payment event
  if (paymentStatus === 'Paid') {
    socketConfig.broadcastEvent(restaurantId, 'order:payment_completed', order);
  }
  socketConfig.broadcastEvent(restaurantId, 'order:updated', order);

  return order;
};

/**
 * Splits an existing order:
 * Type 1: 'equal' -> returns per-head split value
 * Type 2: 'items' -> creates a brand new separate order moving selected items/quantities off original
 */
const splitBill = async (restaurantId, orderId, splitPayload) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, isDeleted: false });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  if (splitPayload.splitType === 'equal') {
    const splitAmount = Math.round((order.grandTotal / splitPayload.splitCount) * 100) / 100;
    return { splitType: 'equal', splitAmount, splitCount: splitPayload.splitCount };
  }

  // Item-wise splitting
  const newOrderItemsInput = [];

  for (const splitItem of splitPayload.splitItems) {
    const targetItem = order.items.id(splitItem.itemId);
    if (!targetItem) {
      throw ApiError.badRequest('Invalid item ID in split payload.');
    }
    if (splitItem.quantity > targetItem.quantity) {
      throw ApiError.badRequest(`Cannot split quantity ${splitItem.quantity} for "${targetItem.itemName}". Maximum available is ${targetItem.quantity}.`);
    }

    newOrderItemsInput.push({
      menuItem: targetItem.menuItem,
      itemName: targetItem.itemName,
      quantity: splitItem.quantity,
      modifiers: targetItem.modifiers,
      specialInstructions: targetItem.specialInstructions,
    });

    // Deduct quantity from original order item
    targetItem.quantity -= splitItem.quantity;
  }

  // Remove items from original order that now have 0 quantity
  order.items = order.items.filter((item) => item.quantity > 0);
  if (order.items.length === 0) {
    throw ApiError.badRequest('Cannot split all items off. At least one item must remain on the original order.');
  }

  // Recalculate original order totals
  const origTotals = await calculateOrderTotals(restaurantId, order.items, order.discount);
  order.items = origTotals.processedItems;
  order.subtotal = origTotals.subtotal;
  order.tax = origTotals.tax;
  order.serviceCharge = origTotals.serviceCharge;
  order.grandTotal = origTotals.grandTotal;
  await order.save();

  // Create brand new separate order document
  const { processedItems, subtotal, tax, serviceCharge, grandTotal } = await calculateOrderTotals(
    restaurantId,
    newOrderItemsInput,
    0
  );

  const newOrder = await Order.create({
    restaurant: restaurantId,
    table: order.table,
    reservation: order.reservation,
    customer: order.customer,
    orderType: order.orderType,
    items: processedItems,
    subtotal,
    tax,
    serviceCharge,
    grandTotal,
    notes: `Split from order: ${order.orderNumber}`,
  });

  await order.populate('table', 'tableNumber tableName');
  await newOrder.populate('table', 'tableNumber tableName');

  // Broadcast updates
  socketConfig.broadcastEvent(restaurantId, 'order:updated', order);
  socketConfig.broadcastEvent(restaurantId, 'order:created', newOrder);

  return { splitType: 'items', originalOrder: order, splitOrder: newOrder };
};

/**
 * Merges multiple source orders (same table context) into a single target order.
 */
const mergeOrders = async (restaurantId, targetOrderId, sourceOrderIds) => {
  const targetOrder = await Order.findOne({ _id: targetOrderId, restaurant: restaurantId, isDeleted: false });
  if (!targetOrder) {
    throw ApiError.notFound('Target order not found.');
  }

  const sourceOrders = await Order.find({
    _id: { $in: sourceOrderIds },
    restaurant: restaurantId,
    isDeleted: false,
  });

  if (sourceOrders.length !== sourceOrderIds.length) {
    throw ApiError.notFound('One or more source orders not found.');
  }

  // Validate merging constraints (must belong to same table)
  for (const src of sourceOrders) {
    if (src.table?.toString() !== targetOrder.table?.toString()) {
      throw ApiError.badRequest('Cannot merge orders across different seating tables.');
    }
  }

  // Merge item arrays
  const mergedItemsInput = [...targetOrder.items];

  for (const src of sourceOrders) {
    for (const srcItem of src.items) {
      // Look for identical item in target items (same menuItem and modifiers)
      const existing = mergedItemsInput.find((tItem) => {
        if (tItem.menuItem.toString() !== srcItem.menuItem.toString()) return false;
        
        // Modifiers match
        if (tItem.modifiers.length !== srcItem.modifiers.length) return false;
        return tItem.modifiers.every((tMod) =>
          srcItem.modifiers.some(
            (sMod) => sMod.groupName === tMod.groupName && sMod.optionName === tMod.optionName
          )
        );
      });

      if (existing) {
        existing.quantity += srcItem.quantity;
      } else {
        mergedItemsInput.push({
          menuItem: srcItem.menuItem,
          itemName: srcItem.itemName,
          quantity: srcItem.quantity,
          modifiers: srcItem.modifiers,
          specialInstructions: srcItem.specialInstructions,
          kitchenStatus: srcItem.kitchenStatus,
        });
      }
    }
  }

  // Recalculate merged totals
  const { processedItems, subtotal, tax, serviceCharge, grandTotal } = await calculateOrderTotals(
    restaurantId,
    mergedItemsInput,
    targetOrder.discount
  );

  targetOrder.items = processedItems;
  targetOrder.subtotal = subtotal;
  targetOrder.tax = tax;
  targetOrder.serviceCharge = serviceCharge;
  targetOrder.grandTotal = grandTotal;
  await targetOrder.save();

  // Cancel/soft-delete merged source orders
  for (const src of sourceOrders) {
    src.isDeleted = true;
    src.deletedAt = new Date();
    src.orderStatus = 'Cancelled';
    src.notes += ` Merged into order: ${targetOrder.orderNumber}`;
    await src.save();

    // Broadcast cancellation
    socketConfig.broadcastEvent(restaurantId, 'order:cancelled', src);
  }

  await targetOrder.populate('table', 'tableNumber tableName');

  // Broadcast updates
  socketConfig.broadcastEvent(restaurantId, 'order:updated', targetOrder);

  return targetOrder;
};

/**
 * Soft deletes an order.
 */
const deleteOrder = async (restaurantId, orderId) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, isDeleted: false });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  order.isDeleted = true;
  order.deletedAt = new Date();
  await order.save();

  // Free table
  if (order.table) {
    const activeOrders = await Order.exists({
      table: order.table,
      orderStatus: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'] },
      isDeleted: false,
      _id: { $ne: orderId },
    });
    if (!activeOrders) {
      await Table.updateOne({ _id: order.table }, { status: 'Available' });
    }
  }

  // Broadcast cancel
  socketConfig.broadcastEvent(restaurantId, 'order:cancelled', order);

  return { deleted: true };
};

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
  splitBill,
  mergeOrders,
  deleteOrder,
};
