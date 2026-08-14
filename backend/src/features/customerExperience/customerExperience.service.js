const crypto = require('crypto');
const MenuItem = require('../menu/menuItem.model');
const Category = require('../category/category.model');
const Order = require('../order/order.model');
const Table = require('../table/table.model');
const TableSession = require('../table/tableSession.model');
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
  let activeSession = null;

  if (tableId) {
    const tableQuery = { _id: tableId, isDeleted: false };
    if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
      tableQuery.restaurant = restaurantId;
    }

    table = await Table.findOne(tableQuery)
      .populate('restaurant', 'name logo currency');

    if (table && table.mergedInto) {
      const primaryTable = await Table.findOne({ _id: table.mergedInto, isDeleted: false })
        .populate('restaurant', 'name logo currency');
      if (primaryTable) {
        table = primaryTable;
      }
    }

    if (table) {
      restaurantId = table.restaurant?._id || table.restaurant;
      activeSession = await TableSession.findOne({ table: table._id, status: 'active' });
    }
  }

  if (!table && (!restaurantId || restaurantId === 'undefined')) {
    throw ApiError.notFound('Invalid or expired QR code.');
  }

  const isInactive = table ? (!table.isActive || table.status === 'Inactive') : false;

  return {
    restaurantId,
    tableId: table ? table._id : null,
    tableNumber: table ? table.tableNumber : null,
    tableStatus: isInactive ? 'Inactive' : (table ? table.status : 'Available'),
    isInactive,
    currentHostName: activeSession ? activeSession.hostName : (table ? table.currentHostName : ''),
    activeSessionId: activeSession ? activeSession._id : null,
    table: table ? {
      _id: table._id,
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      status: isInactive ? 'Inactive' : table.status,
      isActive: table.isActive,
      currentHostName: activeSession ? activeSession.hostName : table.currentHostName,
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
// 3. GET ACTIVE TABLE SESSION DETAILS (PUBLIC SUMMARY)
// ==========================================
const getActiveTableSession = async (restaurantId, tableId, callerHostToken = null) => {
  if (!tableId) return { session: null, orders: [], orderSummary: [] };

  const tableObj = await Table.findById(tableId);
  const targetTableId = (tableObj && tableObj.mergedInto) ? tableObj.mergedInto : tableId;

  const session = await TableSession.findOne({ table: targetTableId, status: 'active' }).lean();

  if (!session) {
    return { session: null, orders: [], orderSummary: [] };
  }

  const orders = await Order.find({
    session: session._id,
    orderStatus: { $ne: 'Cancelled' },
  })
    .sort({ createdAt: 1 })
    .populate('items.menuItem', 'name price imageCover')
    .lean();

  const totalAmount = session.totalAmount || orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  // Lightweight summary for non-host diners (WITHOUT host phone or hostToken)
  const orderSummary = orders.map((o) => ({
    orderId: o._id,
    orderNumber: o.orderNumber,
    orderStatus: o.orderStatus,
    createdAt: o.createdAt,
    items: (o.items || []).map((i) => ({
      name: i.itemName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      kitchenStatus: i.kitchenStatus,
    })),
  }));

  const isHost = Boolean(callerHostToken && session.hostToken === callerHostToken);

  return {
    session: {
      sessionId: session._id,
      tableId: session.table,
      hostName: session.hostName, // Name ONLY - no phone number or hostToken!
      startedAt: session.startedAt,
      status: session.status,
    },
    // Only expose full order billing objects if caller is the verified table host
    orders: isHost ? orders : [],
    orderSummary,
    hostName: session.hostName,
    startedAt: session.startedAt,
    orderCount: orders.length,
    totalAmount,
    isHost,
  };
};

// ==========================================
// 4. PUBLIC ORDER PLACEMENT (STRICT HOST AUTHORIZATION)
// ==========================================
const placeCustomerOrder = async (restaurantId, payload, authenticatedUserId = null) => {
  const { tableId, sessionId: providedSessionId, hostToken: providedHostToken, items, customerName, customerPhone, notes, orderType } = payload;

  let activeSession = null;
  if (tableId) {
    const table = await Table.findOne({ _id: tableId, restaurant: restaurantId, isDeleted: false });
    const targetTableId = (table && table.mergedInto) ? table.mergedInto : tableId;

    if (table) {
      if (table.isActive === false || table.status === 'Inactive') {
        throw ApiError.badRequest('This dining table is currently inactive and cannot accept orders.');
      }
    }

    if (providedSessionId) {
      activeSession = await TableSession.findOne({ _id: providedSessionId, status: 'active' });
    }
    if (!activeSession) {
      activeSession = await TableSession.findOne({ table: targetTableId, status: 'active' });
    }

    if (!activeSession) {
      throw ApiError.forbidden('No active table session found. Please scan QR code and start a table session.');
    }

    // STRICT HOST TOKEN AUTHORIZATION CHECK
    if (!providedHostToken || providedHostToken !== activeSession.hostToken) {
      throw ApiError.forbidden(
        `This table is currently ordering under ${activeSession.hostName || 'another diner'}. You can view the menu, but only the table host can place orders.`
      );
    }
  }

  if (!items || items.length === 0) {
    throw ApiError.badRequest('Order items are required.');
  }

  let customerDoc = null;
  const targetCustomerId = authenticatedUserId || payload.customerId;
  if (targetCustomerId) {
    customerDoc = await Customer.findOne({ _id: targetCustomerId, isDeleted: false });
  }

  if (!customerDoc && activeSession?.currentHostPhone) {
    customerDoc = await Customer.findOne({ restaurant: restaurantId, phoneNumber: activeSession.currentHostPhone, isDeleted: false });
  }

  if (!customerDoc && customerPhone) {
    customerDoc = await Customer.findOne({ restaurant: restaurantId, phoneNumber: customerPhone, isDeleted: false });
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
    session: activeSession ? activeSession._id : null,
    customer: customerDoc ? customerDoc._id : null,
    orderType: orderType || (tableId ? 'Dine-In' : 'Takeaway'),
    orderStatus: 'Accepted',
    paymentStatus: 'Pending',
    items: processedItems,
    subtotal,
    tax,
    serviceCharge,
    grandTotal,
    notes: notes || '',
  });

  // Automatically split and generate KitchenTickets for KDS since QR orders route directly to kitchen
  const kitchenService = require('../kitchen/kitchen.service');
  await kitchenService.createTicketsFromOrder(restaurantId, order);

  if (activeSession) {
    activeSession.totalAmount = (activeSession.totalAmount || 0) + grandTotal;
    await activeSession.save();
  }

  if (tableId) {
    await Table.updateOne(
      { _id: tableId },
      {
        status: 'Occupied',
        currentHostName: customerName || activeSession?.hostName || 'Diner',
        currentHostPhone: customerPhone || activeSession?.hostPhone || '',
      }
    );
    socketConfig.broadcastEvent(restaurantId, 'table:updated', {
      tableId,
      status: 'Occupied',
      hostName: customerName || activeSession?.hostName,
      hostPhone: customerPhone || activeSession?.hostPhone,
    });
  }

  socketConfig.broadcastEvent(restaurantId, 'order:created', order);

  return order.populate([
    { path: 'table', select: 'tableNumber' },
    { path: 'customer', select: 'fullName phoneNumber loyaltyPoints membershipTier' },
  ]);
};

// ==========================================
// 5. CLAIM / RELEASE / SETTLE TABLE HOST SESSION
// ==========================================
const claimTableHost = async (restaurantId, payload, authenticatedUser = null) => {
  const { tableId, hostName, hostPhone } = payload;
  if (!tableId) {
    throw ApiError.badRequest('Table ID is required to claim table session.');
  }

  let table = await Table.findOne({ _id: tableId, restaurant: restaurantId, isDeleted: false });
  if (!table) {
    throw ApiError.notFound('Table not found.');
  }

  if (table.mergedInto) {
    const primaryTable = await Table.findOne({ _id: table.mergedInto, restaurant: restaurantId, isDeleted: false });
    if (primaryTable) {
      table = primaryTable;
    }
  }

  const effectiveTableId = table._id;

  if (table.isActive === false || table.status === 'Inactive') {
    throw ApiError.badRequest('This dining table is currently inactive and cannot be claimed.');
  }

  let activeSession = await TableSession.findOne({ table: effectiveTableId, status: 'active' });

  if (activeSession) {
    const isSameHost =
      (hostPhone && activeSession.hostPhone === hostPhone) ||
      (authenticatedUser && String(activeSession.customer) === String(authenticatedUser.id || authenticatedUser._id));

    if (isSameHost) {
      if (!activeSession.hostToken) {
        activeSession.hostToken = crypto.randomBytes(24).toString('hex');
        await activeSession.save();
      }
      return { session: activeSession, table, hostToken: activeSession.hostToken };
    }

    throw ApiError.conflict(
      `Table #${table.tableNumber} is currently occupied by ${activeSession.hostName || 'another diner'}. You can view the menu in View-Only mode.`
    );
  }

  let customerDoc = null;
  if (authenticatedUser) {
    customerDoc = await Customer.findById(authenticatedUser.id || authenticatedUser._id);
  }
  if (!customerDoc && hostPhone) {
    customerDoc = await Customer.findOne({ restaurant: restaurantId, phoneNumber: hostPhone, isDeleted: false });
  }
  if (!customerDoc && hostPhone) {
    customerDoc = await Customer.create({
      restaurant: restaurantId,
      fullName: hostName || 'Guest',
      phoneNumber: hostPhone,
    });
  }

  if (!customerDoc) {
    throw ApiError.badRequest('Host customer identity could not be verified.');
  }

  const generatedHostToken = crypto.randomBytes(24).toString('hex');

  activeSession = await TableSession.create({
    restaurant: restaurantId,
    table: table._id,
    customer: customerDoc._id,
    hostName: hostName || customerDoc.fullName || 'Diner',
    hostPhone: hostPhone || customerDoc.phoneNumber || '',
    hostToken: generatedHostToken,
    status: 'active',
    startedAt: new Date(),
  });

  table.status = 'Occupied';
  table.currentHostName = activeSession.hostName;
  table.currentHostPhone = activeSession.hostPhone;
  await table.save();

  socketConfig.broadcastEvent(restaurantId, 'table:session-started', {
    sessionId: activeSession._id,
    tableId: table._id,
    tableNumber: table.tableNumber,
    hostName: activeSession.hostName,
    hostPhone: activeSession.hostPhone,
    startedAt: activeSession.startedAt,
  });

  socketConfig.broadcastEvent(restaurantId, 'table:updated', {
    tableId: table._id,
    tableNumber: table.tableNumber,
    status: 'Occupied',
    hostName: activeSession.hostName,
    hostPhone: activeSession.hostPhone,
  });

  return { session: activeSession, table, hostToken: generatedHostToken };
};

const settleTableSession = async (restaurantId, sessionId, payload = {}) => {
  const session = await TableSession.findOne({ _id: sessionId, status: 'active' });
  if (!session) {
    throw ApiError.badRequest('Active table session not found or already settled.');
  }

  const { paymentMethod = 'UPI', transactionReference = '' } = payload;

  session.status = 'settled';
  session.endedAt = new Date();
  await session.save();

  const orders = await Order.find({ session: session._id, orderStatus: { $ne: 'Cancelled' } });
  const billingService = require('../billing/billing.service');
  const Payment = require('../billing/payment.model');
  const invoices = [];
  let sessionGrandTotal = 0;

  for (const ord of orders) {
    ord.paymentStatus = 'Paid';
    ord.orderStatus = 'Completed';
    ord.paymentMethod = paymentMethod;
    if (transactionReference) {
      ord.paymentDetails = { transactionId: transactionReference, paidAt: new Date() };
    }
    await ord.save();

    // Auto-generate invoice with cashier = null for self-checkout
    const invoice = await billingService.generateInvoice(restaurantId, { orderId: ord._id }, null);
    invoice.invoiceStatus = 'Paid';
    await invoice.save();

    const existingPayment = await Payment.findOne({ invoice: invoice._id, restaurant: restaurantId });
    if (!existingPayment) {
      await Payment.create({
        restaurant: restaurantId,
        invoice: invoice._id,
        paymentMethod,
        amount: invoice.grandTotal,
        transactionReference: transactionReference || '',
        paymentStatus: 'Success',
      });
    }

    invoices.push(invoice);
    sessionGrandTotal += (invoice.grandTotal || 0);

    // Accrue loyalty points and update totalSpent / visitCount for customer
    if (ord.customer) {
      try {
        const customerService = require('../customer/customer.service');
        await customerService.earnPointsForOrder(restaurantId, ord.customer, ord);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Loyalty] earnPointsForOrder failed during settleTableSession:', err.stack || err);
        if (process.env.NODE_ENV !== 'production') {
          throw err;
        }
      }
    }
  }

  session.totalAmount = sessionGrandTotal;
  await session.save();

  if (session.table) {
    const table = await Table.findById(session.table);
    if (table) {
      table.status = 'Available';
      table.currentHostName = '';
      table.currentHostPhone = '';
      await table.save();

      socketConfig.broadcastEvent(restaurantId, 'bill:settled', {
        sessionId: session._id,
        tableId: table._id,
        tableNumber: table.tableNumber,
        hostName: session.hostName,
        paymentMethod,
        totalAmount: sessionGrandTotal,
        timestamp: new Date(),
      });

      socketConfig.broadcastEvent(restaurantId, 'table:session-ended', {
        sessionId: session._id,
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: 'settled',
        paymentMethod,
        totalAmount: sessionGrandTotal,
      });

      socketConfig.broadcastEvent(restaurantId, 'table:updated', {
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: 'Available',
        currentHostName: '',
        currentHostPhone: '',
        forceLogout: true,
      });
    }
  }

  return {
    session,
    orders,
    invoices,
    totalAmount: sessionGrandTotal,
    endedAt: session.endedAt,
  };
};

const releaseTableSession = async (restaurantId, payload = {}) => {
  const { sessionId, tableId } = payload;
  let session = null;

  if (sessionId) {
    session = await TableSession.findOne({ _id: sessionId, status: 'active' });
  } else if (tableId) {
    session = await TableSession.findOne({ table: tableId, status: 'active' });
  }

  if (session) {
    session.status = 'released';
    session.endedAt = new Date();
    await session.save();
  }

  const targetTableId = tableId || session?.table;
  let table = null;

  if (targetTableId) {
    table = await Table.findById(targetTableId);
    if (table) {
      table.status = 'Available';
      table.currentHostName = '';
      table.currentHostPhone = '';
      await table.save();

      socketConfig.broadcastEvent(restaurantId, 'table:session-ended', {
        sessionId: session?._id,
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: 'released',
      });

      socketConfig.broadcastEvent(restaurantId, 'table:updated', {
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: 'Available',
        currentHostName: '',
        currentHostPhone: '',
        forceLogout: true,
      });
    }
  }

  return { released: true, session, table };
};

const releaseTableHost = async (restaurantId, payload) => {
  return releaseTableSession(restaurantId, payload);
};

// ==========================================
// 6. TRACK & PAY LIVE CUSTOMER ORDER
// ==========================================
const trackLiveOrder = async (restaurantId, orderId, authContext = {}) => {
  const { customerId, hostToken } = authContext;
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId })
    .populate('table', 'tableNumber')
    .populate('items.menuItem', 'name price imageCover');

  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  // Validate requester ownership: matching customer ID, matching hostToken, or matching table active session
  let isAuthorized = false;

  if (customerId && order.customer && String(order.customer) === String(customerId)) {
    isAuthorized = true;
  } else if (hostToken && order.session) {
    const session = await TableSession.findById(order.session);
    if (session && session.hostToken === hostToken) {
      isAuthorized = true;
    }
  } else if (hostToken && order.table) {
    const activeSession = await TableSession.findOne({ table: order.table, status: 'active' });
    if (activeSession && activeSession.hostToken === hostToken) {
      isAuthorized = true;
    }
  } else if (order.table) {
    // Check if table has an active session for view-only diners at the same table
    const activeSession = await TableSession.findOne({ table: order.table, status: 'active' });
    if (activeSession && String(activeSession._id) === String(order.session)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    throw ApiError.forbidden('You do not have permission to view or track this order.');
  }

  return { order };
};

const payCustomerOrder = async (restaurantId, orderId, { paymentMethod, transactionReference }) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  order.paymentStatus = 'Paid';
  order.orderStatus = 'Completed';
  order.paymentMethod = paymentMethod || 'UPI';
  if (transactionReference) {
    order.paymentDetails = { transactionId: transactionReference, paidAt: new Date() };
  }
  await order.save();

  // Ensure Paid Invoice exists for BI reporting
  const billingService = require('../billing/billing.service');
  await billingService.ensurePaidInvoiceForOrder(restaurantId, order, paymentMethod || 'UPI', transactionReference);

  // Accrue loyalty points and update totalSpent / visitCount for customer
  if (order.customer) {
    try {
      const customerService = require('../customer/customer.service');
      await customerService.earnPointsForOrder(restaurantId, order.customer, order);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Loyalty] earnPointsForOrder failed during payCustomerOrder:', err.stack || err);
      if (process.env.NODE_ENV !== 'production') {
        throw err;
      }
    }
  }

  socketConfig.broadcastEvent(restaurantId, 'order:payment_completed', order);
  socketConfig.broadcastEvent(restaurantId, 'order:updated', order);

  return { order };
};

const cancelCustomerOrder = async (restaurantId, orderId) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  if (order.orderStatus !== 'Pending' && order.orderStatus !== 'Received' && order.orderStatus !== 'Accepted') {
    throw ApiError.badRequest('Order cannot be cancelled at this stage.');
  }

  order.orderStatus = 'Cancelled';
  await order.save();

  socketConfig.broadcastEvent(restaurantId, 'order:updated', order);

  return { order };
};

// ==========================================
// 7. CUSTOMER FEEDBACK SUBMISSION
// ==========================================
const submitCustomerFeedback = async (restaurantId, payload = {}, authenticatedCustomerId = null) => {
  const {
    rating,
    comment,
    reviewText,
    foodRating,
    serviceRating,
    staffRating,
    orderId,
    branchId,
  } = payload;

  let customerDoc = null;

  // 1. Resolve customer from authenticated session
  if (authenticatedCustomerId) {
    customerDoc = await Customer.findOne({ _id: authenticatedCustomerId, isDeleted: false });
  }

  // 2. Resolve order if orderId provided
  let orderDoc = null;
  if (orderId) {
    orderDoc = await Order.findOne({ _id: orderId, restaurant: restaurantId });
    if (orderDoc && !customerDoc && orderDoc.customer) {
      customerDoc = await Customer.findOne({ _id: orderDoc.customer, isDeleted: false });
    }
  }

  // 3. Fallback: Search by phone if provided in payload
  if (!customerDoc && payload.customerPhone) {
    customerDoc = await Customer.findOne({
      restaurant: restaurantId,
      phoneNumber: payload.customerPhone,
      isDeleted: false,
    });
  }

  // 4. Reject feedback submission if no real customer session / document could be identified
  if (!customerDoc) {
    throw ApiError.unauthorized('Customer authentication session is required to submit feedback.');
  }

  const finalRating = rating || foodRating || 5;
  const finalComment = comment || reviewText || '';

  // Sentiment analysis computation
  let sentiment = 'Positive';
  let sentimentScore = 8.5;

  try {
    const aiResult = await aiService.analyzeSentiment(finalComment);
    if (aiResult?.sentiment) {
      sentiment = aiResult.sentiment;
      sentimentScore = aiResult.score !== undefined ? aiResult.score : 8.5;
    }
  } catch {
    if (finalRating <= 2) {
      sentiment = 'Negative';
      sentimentScore = 3.0;
    } else if (finalRating === 3) {
      sentiment = 'Neutral';
      sentimentScore = 6.0;
    }
  }

  const feedback = await Feedback.create({
    restaurant: restaurantId,
    branch: branchId || orderDoc?.branch || null,
    customer: customerDoc._id,
    order: orderDoc?._id || null,
    customerName: customerDoc.fullName || 'Customer',
    customerPhone: customerDoc.phoneNumber,
    rating: finalRating,
    foodRating: foodRating || finalRating,
    serviceRating: serviceRating || finalRating,
    staffRating: staffRating || finalRating,
    reviewText: finalComment,
    comment: finalComment,
    sentiment,
    sentimentScore,
  });

  return feedback;
};

// ==========================================
// 8. CUSTOMER ASSISTANCE SIGNAL
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

  socketConfig.broadcastEvent(restaurantId, 'assistance:requested', payload);

  return { message: 'Assistance request dispatched to restaurant staff.', data: payload };
};

// ==========================================
// 9. GET ACTIVE TABLE ORDERS FOR VIEW-ONLY DINERS
// ==========================================
const getActiveTableOrders = async (restaurantId, tableId, callerHostToken = null) => {
  if (!tableId) return { orders: [] };

  const activeSession = await TableSession.findOne({ table: tableId, status: 'active' });
  if (!activeSession) {
    return { orders: [] };
  }

  const isHost = Boolean(callerHostToken && activeSession.hostToken === callerHostToken);

  const orders = await Order.find({
    restaurant: restaurantId,
    table: tableId,
    orderStatus: { $nin: ['Completed', 'Cancelled'] },
    paymentStatus: { $ne: 'Paid' },
  })
    .sort({ createdAt: -1 })
    .populate('items.menuItem', 'name price imageCover')
    .lean();

  if (isHost) {
    return { orders };
  }

  // Return sanitized summary items for view-only guests
  const sanitizedOrders = orders.map((o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    orderStatus: o.orderStatus,
    createdAt: o.createdAt,
    items: o.items,
  }));

  return { orders: sanitizedOrders };
};

// ==========================================
// 10. CUSTOMER RESERVATION BOOKING & HISTORY
// ==========================================
const createCustomerReservation = async (restaurantId, payload, customerId) => {
  const { reservationDate, reservationTime, numberOfGuests, occasion, specialRequest } = payload;

  if (!reservationDate || !reservationTime) {
    throw ApiError.badRequest('Reservation date and time are required.');
  }

  const numGuests = parseInt(numberOfGuests, 10) || 1;
  if (numGuests < 1) {
    throw ApiError.badRequest('Guest count must be at least 1.');
  }

  const customer = await Customer.findOne({ _id: customerId, restaurant: restaurantId, isDeleted: false });
  if (!customer) {
    throw ApiError.notFound('Customer profile not found. Please log in with mobile OTP.');
  }

  const Reservation = require('../reservation/reservation.model');

  const reservation = await Reservation.create({
    restaurant: restaurantId,
    customer: customer._id,
    customerName: customer.fullName || 'Guest Diner',
    customerPhone: customer.phoneNumber,
    customerEmail: customer.email || '',
    numberOfGuests: numGuests,
    reservationDate,
    reservationTime,
    duration: 90,
    occasion: occasion || 'Other',
    specialRequest: specialRequest || '',
    bookingSource: 'QR',
    reservationStatus: 'Pending',
    table: null,
  });

  socketConfig.broadcastEvent(restaurantId, 'reservation:created', reservation);

  return { reservation };
};

const getMyCustomerReservations = async (restaurantId, customerId) => {
  const Reservation = require('../reservation/reservation.model');
  const reservations = await Reservation.find({
    restaurant: restaurantId,
    customer: customerId,
    isDeleted: false,
  })
    .sort({ reservationDate: -1, reservationTime: -1 })
    .populate('table', 'tableNumber tableName capacity')
    .lean();

  return { reservations };
};

module.exports = {
  resolveQrCode,
  getPublicMenu,
  getActiveTableSession,
  placeCustomerOrder,
  claimTableHost,
  settleTableSession,
  releaseTableSession,
  releaseTableHost,
  trackLiveOrder,
  payCustomerOrder,
  cancelCustomerOrder,
  submitCustomerFeedback,
  requestAssistance,
  getActiveTableOrders,
  createCustomerReservation,
  getMyCustomerReservations,
};
