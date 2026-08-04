const MenuItem = require('../menu/menuItem.model');
const Category = require('../category/category.model');
const Order = require('../order/order.model');
const Table = require('../table/table.model');
const Customer = require('../customer/customer.model');
const Feedback = require('../customer/feedback.model');
const ApiError = require('../../utils/ApiError');
const socketConfig = require('../../config/socket.config');
const aiService = require('../ai/ai.service');

// ==========================================
// 1. RESOLVE QR CODE TARGET & CONTEXT
// ==========================================
const resolveQrCode = async (restaurantId, { tableId, type }) => {
  let table = null;

  if (tableId) {
    const tableQuery = { _id: tableId, isDeleted: false };
    if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
      tableQuery.restaurant = restaurantId;
    }

    table = await Table.findOne(tableQuery)
      .populate('restaurant', 'name logo currency');

    if (table) {
      restaurantId = table.restaurant?._id || table.restaurant;
    }
  }

  if (!table && (!restaurantId || restaurantId === 'undefined')) {
    throw ApiError.notFound('Invalid or expired QR code.');
  }

  return {
    restaurantId,
    tableId: table ? table._id : null,
    tableNumber: table ? table.tableNumber : null,
    tableStatus: table ? table.status : 'Available',
    table: table ? {
      _id: table._id,
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      status: table.status,
    } : null,
    restaurant: table?.restaurant || null,
    type: type || (table ? 'table' : 'digital_menu'),
  };
};

// ==========================================
// 2. GET PUBLIC DIGITAL MENU & CATEGORIES
// ==========================================
const getPublicMenu = async (restaurantId, { categoryId, dietary, search, isPopular, isFeatured }) => {
  const categoryQuery = { restaurant: restaurantId, isActive: true };
  const itemQuery = { restaurant: restaurantId, isAvailable: true, isDeleted: false };

  if (categoryId) itemQuery.category = categoryId;
  if (dietary) itemQuery.dietaryType = dietary;
  if (isPopular === 'true') itemQuery.isPopular = true;
  if (isFeatured === 'true') itemQuery.isRecommended = true;

  if (search) {
    itemQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [categories, items, aiRecs] = await Promise.all([
    Category.find(categoryQuery).sort({ displayOrder: 1, name: 1 }),
    MenuItem.find(itemQuery).populate('category', 'name').sort({ name: 1 }),
    aiService.getSmartMenuRecommendations(restaurantId).catch(() => null),
  ]);

  return {
    categories,
    items,
    aiRecommendations: aiRecs?.best_selling_items || [],
  };
};

// ==========================================
// 3. PUBLIC ORDER PLACEMENT
// ==========================================
const placeCustomerOrder = async (restaurantId, payload) => {
  const { tableId, orderType, items, customerName, customerPhone, notes } = payload;

  if (!items || items.length === 0) {
    throw ApiError.badRequest('Order items are required.');
  }

  // Find or create customer by phone number if provided
  let customerDoc = null;
  if (customerPhone) {
    customerDoc = await Customer.findOne({ restaurant: restaurantId, phoneNumber: customerPhone });
    if (!customerDoc && customerName) {
      customerDoc = await Customer.create({
        restaurant: restaurantId,
        fullName: customerName,
        phoneNumber: customerPhone,
      });
    }
  }

  let subtotal = 0;
  const processedItems = [];

  for (const item of items) {
    const menuItem = await MenuItem.findOne({ _id: item.menuItemId, restaurant: restaurantId, isAvailable: true });
    if (!menuItem) {
      throw ApiError.notFound(`Menu item not found or unavailable.`);
    }

    const itemUnitPrice = menuItem.price;
    const modifierTotal = (item.modifiers || []).reduce((sum, m) => sum + (m.price || 0), 0);
    const lineUnitPrice = itemUnitPrice + modifierTotal;
    const lineTotal = lineUnitPrice * item.quantity;
    subtotal += lineTotal;

    processedItems.push({
      menuItem: menuItem._id,
      itemName: menuItem.name,
      quantity: item.quantity,
      unitPrice: lineUnitPrice,
      modifiers: item.modifiers || [],
      specialInstructions: item.specialInstructions || '',
      kitchenStatus: 'Pending',
    });
  }

  const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100;
  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const grandTotal = Math.round(subtotal + serviceCharge + tax);

  const order = await Order.create({
    restaurant: restaurantId,
    table: tableId || null,
    customer: customerDoc ? customerDoc._id : null,
    orderType: orderType || (tableId ? 'Dine-In' : 'Takeaway'),
    orderStatus: 'Pending',
    paymentStatus: 'Pending',
    items: processedItems,
    subtotal,
    tax,
    serviceCharge,
    grandTotal,
    notes: notes || '',
  });

  // If table-bound, mark table occupied and broadcast update to Manager dashboard
  if (tableId) {
    await Table.updateOne({ _id: tableId }, { status: 'Occupied' });
    socketConfig.broadcastEvent(restaurantId, 'table:updated', {
      tableId,
      status: 'Occupied',
      hostName: customerName,
      hostPhone: customerPhone,
    });
  }

  // Broadcast real-time Socket.IO event to Kitchen & Cashiers
  socketConfig.broadcastEvent(restaurantId, 'order:created', order);

  return order.populate([
    { path: 'table', select: 'tableNumber' },
    { path: 'customer', select: 'fullName phoneNumber loyaltyPoints membershipTier' },
  ]);
};

// ==========================================
// 4. CLAIM / RELEASE TABLE HOST SESSION
// ==========================================
const claimTableHost = async (restaurantId, { tableId, hostName, hostPhone }) => {
  if (!tableId) return null;
  const table = await Table.findOne({ _id: tableId, restaurant: restaurantId });
  if (!table) return null;

  table.status = 'Occupied';
  await table.save();

  // Broadcast real-time Socket.IO event to Manager & POS dashboards
  socketConfig.broadcastEvent(restaurantId, 'table:updated', {
    tableId: table._id,
    tableNumber: table.tableNumber,
    status: 'Occupied',
    hostName,
    hostPhone,
  });

  return table;
};

const releaseTableHost = async (restaurantId, { tableId }) => {
  if (!tableId) return null;
  const table = await Table.findOne({ _id: tableId, restaurant: restaurantId });
  if (!table) return null;

  table.status = 'Available';
  await table.save();

  // Broadcast real-time Socket.IO event to Manager & POS dashboards
  socketConfig.broadcastEvent(restaurantId, 'table:updated', {
    tableId: table._id,
    tableNumber: table.tableNumber,
    status: 'Available',
  });

  return table;
};

// ==========================================
// 5. TRACK & PAY LIVE CUSTOMER ORDER
// ==========================================
const trackLiveOrder = async (restaurantId, orderId) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId })
    .populate('table', 'tableNumber')
    .populate('items.menuItem', 'name price imageCover');

  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  return { order };
};

const payCustomerOrder = async (restaurantId, orderId, { paymentMethod, transactionReference }) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  order.paymentStatus = 'Paid';
  order.paymentMethod = paymentMethod || 'UPI';
  if (transactionReference) {
    order.paymentDetails = { transactionId: transactionReference, paidAt: new Date() };
  }
  await order.save();

  // Broadcast real-time Socket.IO event to POS & Manager
  socketConfig.broadcastEvent(restaurantId, 'order:updated', order);

  return { order };
};

const cancelCustomerOrder = async (restaurantId, orderId) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  if (order.orderStatus !== 'Pending' && order.orderStatus !== 'Received') {
    throw ApiError.badRequest('Order cannot be cancelled at this stage.');
  }

  order.orderStatus = 'Cancelled';
  await order.save();

  // Broadcast real-time Socket.IO event to Kitchen & POS
  socketConfig.broadcastEvent(restaurantId, 'order:updated', order);

  return { order };
};

// ==========================================
// 6. CUSTOMER FEEDBACK SUBMISSION
// ==========================================
const submitCustomerFeedback = async (restaurantId, { customerName, customerPhone, rating, comment }) => {
  const feedback = await Feedback.create({
    restaurant: restaurantId,
    customerName: customerName || 'Diner',
    customerPhone: customerPhone || '',
    rating: rating || 5,
    comment: comment || '',
  });

  return feedback;
};

// ==========================================
// 7. CUSTOMER ASSISTANCE SIGNAL
// ==========================================
const requestAssistance = async (restaurantId, { tableId, note }) => {
  let tableName = 'Table';

  if (tableId) {
    const table = await Table.findOne({ _id: tableId, restaurant: restaurantId });
    if (table) {
      tableName = table.tableName || `Table ${table.tableNumber}`;
    }
  }

  const payload = {
    tableId: tableId || null,
    tableName,
    note: note || 'Customer requested staff assistance.',
    time: new Date(),
  };

  // Broadcast real-time assistance request to staff and manager dashboards
  socketConfig.broadcastEvent(restaurantId, 'assistance:requested', payload);

  return { message: 'Assistance request dispatched to restaurant staff.', data: payload };
};

module.exports = {
  resolveQrCode,
  getPublicMenu,
  placeCustomerOrder,
  claimTableHost,
  releaseTableHost,
  trackLiveOrder,
  payCustomerOrder,
  cancelCustomerOrder,
  submitCustomerFeedback,
  requestAssistance,
};
