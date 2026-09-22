const crypto = require('crypto');
const mongoose = require('mongoose');
const MenuItem = require('../menu/menuItem.model');
const Category = require('../category/category.model');
const Order = require('../order/order.model');
const Table = require('../table/table.model');
const TableSession = require('../table/tableSession.model');
const TableSessionAudit = require('../table/tableSessionAudit.model');
const Customer = require('../customer/customer.model');
const Reservation = require('../reservation/reservation.model');
const Restaurant = require('../tenant/tenant.model');
const ApiError = require('../../utils/ApiError');
const { evaluateOperatingStatus } = require('../../utils/schedule.util');
const socketConfig = require('../../config/socket.config');
const redisConfig = require('../../config/redis.config');
const aiService = require('../ai/ai.service');
const { decryptQrToken, encryptQrToken } = require('../../utils/encryption.util');

const isMatchingPhone = (phone1, phone2) => {
  if (!phone1 || !phone2) return false;
  const p1 = String(phone1).replace(/\D/g, '').slice(-10);
  const p2 = String(phone2).replace(/\D/g, '').slice(-10);
  return Boolean(p1 && p2 && p1 === p2);
};


// ==========================================
// 1. RESOLVE QR CODE TARGET & CONTEXT
// ==========================================
const resolveQrCode = async (restaurantId, { tableId, type }) => {
  let table = null;
  let activeSession = null;

  // Handle encrypted QR token resolution
  if (tableId && typeof tableId === 'string' && tableId.startsWith('enc_')) {
    const decrypted = decryptQrToken(tableId);
    if (!decrypted) {
      throw ApiError.badRequest('Invalid or tampered QR code token.');
    }
    if (typeof decrypted === 'object') {
      if (decrypted.tableId) tableId = decrypted.tableId;
      if (decrypted.restaurantId && (!restaurantId || restaurantId === 'general' || restaurantId === 'undefined' || restaurantId === 'null')) {
        restaurantId = decrypted.restaurantId;
      }
    } else if (typeof decrypted === 'string') {
      tableId = decrypted;
    }
  }

  if (tableId) {
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      throw ApiError.badRequest('Invalid table identifier.');
    }

    const tableQuery = { _id: tableId, isDeleted: false };
    if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null' && restaurantId !== 'general') {
      tableQuery.restaurant = restaurantId;
    }

    table = await Table.findOne(tableQuery)
      .populate('restaurant', 'name logo openingHours currency');

    if (table && table.mergedInto) {
      const primaryTable = await Table.findOne({ _id: table.mergedInto, isDeleted: false })
        .populate('restaurant', 'name logo openingHours currency');
      if (primaryTable) {
        table = primaryTable;
      }
    }

    if (table) {
      restaurantId = table.restaurant?._id || table.restaurant;
      activeSession = await TableSession.findOne({ table: table._id, status: 'active' });
    }
  }

  let defaultRestaurant = null;
  if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null' || restaurantId === 'general') {
    defaultRestaurant = await Restaurant.findOne({ isActive: { $ne: false } }).select('name logo openingHours currency').lean();
    if (defaultRestaurant) {
      restaurantId = defaultRestaurant._id;
    }
  }

  const isInactive = table ? (!table.isActive || table.status === 'Inactive') : false;
  const restaurantObj = table?.restaurant || defaultRestaurant;
  const operatingStatus = evaluateOperatingStatus(restaurantObj?.openingHours || []);

  const isClosed = Boolean(operatingStatus?.isClosed);
  const derivedTableStatus = isClosed
    ? 'Maintenance'
    : (isInactive ? 'Inactive' : (table ? table.status : 'Available'));

  return {
    restaurantId,
    tableId: table ? table._id : null,
    tableNumber: table ? table.tableNumber : null,
    tableStatus: derivedTableStatus,
    isInactive: isInactive || isClosed,
    currentHostName: activeSession ? activeSession.hostName : (table ? table.currentHostName : ''),
    activeSessionId: activeSession ? activeSession._id : null,
    table: table ? {
      _id: table._id,
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      status: derivedTableStatus,
      isActive: table.isActive && !isClosed,
      currentHostName: activeSession ? activeSession.hostName : table.currentHostName,
    } : null,
    restaurant: restaurantObj || null,
    operatingStatus,
    type: type || (table ? 'table' : 'digital_menu'),
  };
};

// ==========================================
// 2. GET PUBLIC DIGITAL MENU & CATEGORIES
// ==========================================
const getPublicMenu = async (restaurantId, { categoryId, dietary, search, isPopular, isFeatured }) => {
  let targetRestId = restaurantId;
  if (!targetRestId || targetRestId === 'general' || targetRestId === 'undefined' || targetRestId === 'null') {
    const defaultRest = await Restaurant.findOne({ isActive: { $ne: false } }).select('_id').lean();
    if (defaultRest) {
      targetRestId = defaultRest._id;
    }
  }

  const categoryQuery = { restaurant: targetRestId, isActive: true };
  const itemQuery = { restaurant: targetRestId, isAvailable: true, isDeleted: false };

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

  const [categories, items, aiRecs, restaurant] = await Promise.all([
    Category.find(categoryQuery).sort({ displayOrder: 1, name: 1 }).lean(),
    MenuItem.find(itemQuery).populate('category', 'name').sort({ name: 1 }).lean(),
    aiService.getSmartMenuRecommendations(targetRestId).catch(() => null),
    Restaurant.findById(targetRestId).select('name logo openingHours currency').lean(),
  ]);

  const operatingStatus = evaluateOperatingStatus(restaurant?.openingHours || []);

  return {
    categories,
    items,
    aiRecommendations: aiRecs?.best_selling_items || [],
    restaurant: restaurant || null,
    operatingStatus,
  };
};

// ==========================================
// 3. GET ACTIVE TABLE SESSION DETAILS (PUBLIC SUMMARY)
// ==========================================
const getActiveTableSession = async (restaurantId, tableId, callerHostToken = null, callerPhone = null) => {
  if (!tableId) return { session: null, orders: [], orderSummary: [], reservation: null };

  if (tableId && typeof tableId === 'string' && tableId.startsWith('enc_')) {
    const decrypted = decryptQrToken(tableId);
    if (decrypted) {
      if (typeof decrypted === 'object' && decrypted.tableId) tableId = decrypted.tableId;
      else if (typeof decrypted === 'string') tableId = decrypted;
    }
  }

  const tableObj = await Table.findById(tableId);
  const targetTableId = (tableObj && tableObj.mergedInto) ? tableObj.mergedInto : tableId;

  const Reservation = require('../reservation/reservation.model');
  const reservationDoc = await Reservation.findOne({
    restaurant: restaurantId,
    table: targetTableId,
    reservationStatus: { $in: ['Pending', 'Confirmed', 'Seated'] },
    isDeleted: false,
  })
    .sort({ reservationDate: 1, reservationTime: 1 })
    .lean();

  const session = await TableSession.findOne({ table: targetTableId, status: 'active' }).lean();

  if (!session) {
    return { session: null, orders: [], orderSummary: [], reservation: reservationDoc || null };
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

  const cleanPhone = callerPhone ? callerPhone.trim() : null;
  const isHost = Boolean(
    (callerHostToken && session.hostToken === callerHostToken) ||
    (cleanPhone && isMatchingPhone(session.hostPhone, cleanPhone))
  );
  const isCoOrderer = Boolean(cleanPhone && (session.coOrderers || []).some((c) => c.phone === cleanPhone));

  return {
    session: {
      sessionId: session._id,
      tableId: session.table,
      hostName: session.hostName, // Name ONLY - no phone number or hostToken!
      startedAt: session.startedAt,
      status: session.status,
      coOrderers: (session.coOrderers || []).map((c) => ({ name: c.name, approvedAt: c.approvedAt })),
    },
    // Only expose full order billing objects if caller is verified host or approved co-orderer
    orders: (isHost || isCoOrderer) ? orders : [],
    orderSummary,
    reservation: reservationDoc || null,
    hostName: session.hostName,
    startedAt: session.startedAt,
    orderCount: orders.length,
    totalAmount,
    isHost,
    isCoOrderer,
  };
};

// ==========================================
// 4. PUBLIC ORDER PLACEMENT (STRICT HOST OR CO-ORDERER AUTHORIZATION)
// ==========================================
const placeCustomerOrder = async (restaurantId, payload, authenticatedUserId = null) => {
  const { tableId, sessionId: providedSessionId, hostToken: providedHostToken, items, customerName, customerPhone, notes, orderType } = payload;

  // Validate Restaurant Opening Hours
  const restaurant = await Restaurant.findById(restaurantId).select('openingHours').lean();
  if (restaurant?.openingHours && restaurant.openingHours.length > 0) {
    const status = evaluateOperatingStatus(restaurant.openingHours);
    if (status.isClosed) {
      throw ApiError.badRequest(`Cannot place order: ${status.statusMessage}`);
    }
  }

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

    // HOST OR APPROVED CO-ORDERER AUTHORIZATION CHECK
    const cleanPhone = customerPhone ? customerPhone.trim() : '';
    const isHostTokenValid = Boolean(providedHostToken && providedHostToken === activeSession.hostToken);
    const isHostPhoneValid = Boolean(cleanPhone && isMatchingPhone(activeSession.hostPhone, cleanPhone));
    const isCoOrdererApproved = Boolean(cleanPhone && (activeSession.coOrderers || []).some((c) => isMatchingPhone(c.phone, cleanPhone)));

    if (!isHostTokenValid && !isHostPhoneValid && !isCoOrdererApproved) {
      throw ApiError.forbidden(
        `This table is currently ordering under ${activeSession.hostName || 'another diner'}. You can view the menu, but only the table host or approved co-orderers can place orders.`
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
    customerPhone: customerPhone || customerDoc?.phoneNumber || activeSession?.hostPhone || '',
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

  const populatedOrder = await order.populate([
    { path: 'table', select: 'tableNumber' },
    { path: 'customer', select: 'fullName phoneNumber loyaltyPoints membershipTier' },
  ]);

  const orderObj = populatedOrder.toObject ? populatedOrder.toObject() : { ...populatedOrder };
  const encryptedTrackingToken = encryptQrToken({ orderId: order._id.toString(), restaurantId: restaurantId.toString() });
  orderObj.encryptedTrackingToken = encryptedTrackingToken;
  orderObj.trackingUrl = `/menu/orders/${encryptedTrackingToken}/track`;

  return orderObj;
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

  const targetRestId = restaurantId || table.restaurant;
  if (targetRestId) {
    const restDoc = await Restaurant.findById(targetRestId).select('openingHours').lean();
    if (restDoc?.openingHours && restDoc.openingHours.length > 0) {
      const operatingStatus = evaluateOperatingStatus(restDoc.openingHours);
      if (operatingStatus.isClosed) {
        throw ApiError.badRequest(operatingStatus.statusMessage || 'The restaurant is currently closed. Table ordering and logins are unavailable during off-hours.');
      }
    }
  }

  if (table.isActive === false || table.status === 'Inactive') {
    throw ApiError.badRequest('This dining table is currently inactive and cannot be claimed.');
  }

  let activeSession = await TableSession.findOne({ table: effectiveTableId, status: 'active' });

  // If table is marked Available or Cleaning, any pre-existing active session is stale from a prior customer and MUST be released
  if (activeSession && (table.status === 'Available' || table.status === 'Cleaning')) {
    activeSession.status = 'released';
    activeSession.endedAt = new Date();
    await activeSession.save();
    activeSession = null;
  }

  // Auto-release orphaned session missing both hostPhone and customer profile
  if (activeSession && !activeSession.hostPhone && !activeSession.customer) {
    activeSession.status = 'released';
    activeSession.endedAt = new Date();
    await activeSession.save();
    activeSession = null;
  }

  if (activeSession) {
    const isSameHost =
      (hostPhone && isMatchingPhone(activeSession.hostPhone, hostPhone)) ||
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

  // ATOMIC REDIS LOCK: Prevent near-simultaneous QR scans from both becoming Host
  const lockKey = effectiveTableId.toString();
  const lockOwner = hostPhone || (authenticatedUser ? String(authenticatedUser.id || authenticatedUser._id) : 'guest_claim');
  const lockAcquired = await redisConfig.acquireTableLock(lockKey, lockOwner, 900);

  if (!lockAcquired) {
    throw ApiError.conflict(
      `Table #${table.tableNumber} is currently occupied or processing another scan. You can view the menu in View-Only mode.`
    );
  }

  try {
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

    // Auto-link advance date/time reservation if host's phone matches an active booking for today
    const rawPhone = hostPhone || customerDoc?.phoneNumber;
    if (rawPhone) {
      const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const activeReservations = await Reservation.find({
          restaurant: restaurantId,
          table: table._id,
          reservationDate: todayStr,
          reservationStatus: { $in: ['Pending', 'Confirmed'] },
          isDeleted: false,
        });

        const matchingReservation = activeReservations.find((r) => {
          const rPhone = String(r.customerPhone || '').replace(/\D/g, '').slice(-10);
          return rPhone === cleanPhone;
        });

        if (matchingReservation) {
          matchingReservation.reservationStatus = 'Seated';
          await matchingReservation.save();
          socketConfig.broadcastEvent(restaurantId.toString(), 'reservation:updated', matchingReservation);
        }
      }
    }

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
  } catch (err) {
    // Release atomic lock if session creation fails
    await redisConfig.releaseTableLock(lockKey);
    throw err;
  }
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
    await redisConfig.releaseTableLock(session.table.toString());
    const table = await Table.findById(session.table);
    if (table) {
      table.status = 'Cleaning';
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
        status: 'Cleaning',
        currentHostName: '',
        currentHostPhone: '',
        forceLogout: true,
      });

      socketConfig.broadcastEvent(restaurantId, 'staff:cleaning-required', {
        tableId: table._id,
        tableNumber: table.tableNumber,
        message: `Table #${table.tableNumber} requires cleaning following bill payment.`,
        timestamp: new Date(),
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

  const targetTableId = tableId || session?.table;
  let table = null;

  if (targetTableId) {
    table = await Table.findById(targetTableId);
  }

  // OPTION A FALLBACK: If active co-orderers exist, promote the longest-standing co-orderer to Host
  if (session && session.coOrderers && session.coOrderers.length > 0) {
    const sortedCoOrderers = [...session.coOrderers].sort(
      (a, b) => new Date(a.approvedAt || 0) - new Date(b.approvedAt || 0)
    );
    const nextHost = sortedCoOrderers.shift();
    session.coOrderers = sortedCoOrderers;
    session.hostName = nextHost.name || 'Diner';
    session.hostPhone = nextHost.phone || '';
    if (nextHost.customer) {
      session.customer = nextHost.customer;
    }
    await session.save();

    if (table) {
      table.status = 'Occupied';
      table.currentHostName = session.hostName;
      table.currentHostPhone = session.hostPhone;
      await table.save();
    }

    try {
      const TableSessionAudit = require('../table/tableSessionAudit.model');
      await TableSessionAudit.create({
        restaurant: restaurantId,
        table: table._id,
        session: session._id,
        action: TableSessionAudit.AUDIT_ACTIONS.HOST_PROMOTED,
        actorPhone: nextHost.phone,
        actorName: nextHost.name,
        reason: 'Original host session ended. Longest-standing co-orderer promoted to Host (Option A Fallback).',
      });
    } catch (auditErr) {
      // eslint-disable-next-line no-console
      console.error('[TableAudit] Failed to log HOST_PROMOTED audit event:', auditErr);
    }

    socketConfig.broadcastEvent(restaurantId, 'table:host-promoted', {
      sessionId: session._id,
      tableId: table._id,
      newHostName: session.hostName,
      newHostPhone: session.hostPhone,
    });

    socketConfig.broadcastEvent(restaurantId, 'table:updated', {
      tableId: table._id,
      tableNumber: table.tableNumber,
      status: 'Occupied',
      currentHostName: session.hostName,
      currentHostPhone: session.hostPhone,
    });

    return { promoted: true, session, table, newHostPhone: session.hostPhone };
  }

  if (session) {
    session.status = 'released';
    session.endedAt = new Date();
    await session.save();
  }

  if (table) {
    await redisConfig.releaseTableLock(table._id.toString());
    table.status = 'Cleaning';
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
      status: 'Cleaning',
      currentHostName: '',
      currentHostPhone: '',
      forceLogout: true,
    });

    socketConfig.broadcastEvent(restaurantId, 'staff:cleaning-required', {
      tableId: table._id,
      tableNumber: table.tableNumber,
      message: `Table #${table.tableNumber} requires cleaning following session end.`,
      timestamp: new Date(),
    });
  }

  return { session, table };
};

const requestTableAccess = async (restaurantId, tableId, payload) => {
  const { requesterPhone, requesterName } = payload;
  if (!requesterPhone) {
    throw ApiError.badRequest('Verified phone number is required to request table access.');
  }

  const session = await TableSession.findOne({ table: tableId, status: 'active' });
  if (!session) {
    throw ApiError.notFound('No active host session found on this table.');
  }

  const table = await Table.findById(tableId);
  const cleanPhone = requesterPhone.trim();
  const maskedPhone = `•••• ${cleanPhone.slice(-4)}`;

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  try {
    const TableSessionAudit = require('../table/tableSessionAudit.model');
    await TableSessionAudit.create({
      restaurant: restaurantId,
      table: tableId,
      session: session._id,
      action: TableSessionAudit.AUDIT_ACTIONS.ACCESS_REQUESTED,
      actorPhone: cleanPhone,
      actorName: requesterName || 'Diner',
      targetHostPhone: session.hostPhone,
      reason: `Guest ${maskedPhone} requested ordering access on Table #${table?.tableNumber || ''}.`,
    });
  } catch (auditErr) {
    // eslint-disable-next-line no-console
    console.error('[TableAudit] Failed to log ACCESS_REQUESTED audit event:', auditErr);
  }

  // Broadcast real-time event to Host session room
  socketConfig.broadcastEvent(restaurantId, 'access:requested', {
    requestId,
    tableId,
    tableNumber: table?.tableNumber || '',
    requesterName: requesterName || 'Guest',
    requesterPhone: cleanPhone,
    maskedPhone,
    timestamp: new Date().toISOString(),
  });

  return { requestId, tableId, maskedPhone, status: 'pending' };
};

const respondTableAccess = async (restaurantId, tableId, payload) => {
  const { requestId, requesterPhone, requesterName, decision } = payload; // decision: 'approve' | 'deny'
  if (!requesterPhone || !decision) {
    throw ApiError.badRequest('Requester phone number and decision are required.');
  }

  const session = await TableSession.findOne({ table: tableId, status: 'active' });
  if (!session) {
    throw ApiError.notFound('Active table session not found.');
  }

  const isApproved = decision === 'approve';
  const cleanPhone = requesterPhone.trim();

  if (isApproved) {
    const existingIndex = session.coOrderers.findIndex((c) => c.phone === cleanPhone);
    if (existingIndex === -1) {
      session.coOrderers.push({
        name: requesterName || 'Co-Orderer',
        phone: cleanPhone,
        approvedAt: new Date(),
      });
      await session.save();
    }
  }

  try {
    const TableSessionAudit = require('../table/tableSessionAudit.model');
    await TableSessionAudit.create({
      restaurant: restaurantId,
      table: tableId,
      session: session._id,
      action: isApproved
        ? TableSessionAudit.AUDIT_ACTIONS.CO_ORDERER_APPROVED
        : TableSessionAudit.AUDIT_ACTIONS.CO_ORDERER_DENIED,
      actorPhone: session.hostPhone,
      actorName: session.hostName,
      targetHostPhone: cleanPhone,
      reason: `Host ${isApproved ? 'approved' : 'denied'} ordering access for diner ${cleanPhone.slice(-4)}.`,
    });
  } catch (auditErr) {
    // eslint-disable-next-line no-console
    console.error('[TableAudit] Failed to log access response audit event:', auditErr);
  }

  socketConfig.broadcastEvent(restaurantId, 'access:responded', {
    requestId,
    tableId,
    requesterPhone: cleanPhone,
    approved: isApproved,
    status: isApproved ? 'approved' : 'denied',
  });

  return { requestId, tableId, approved: isApproved, status: isApproved ? 'approved' : 'denied' };
};

const requestHostTransfer = async (restaurantId, tableId, payload) => {
  const { requesterPhone, requesterName, latitude, longitude } = payload;
  if (!requesterPhone) {
    throw ApiError.badRequest('Requester phone number is required.');
  }

  const cleanPhone = requesterPhone.trim();
  const session = await TableSession.findOne({ table: tableId, status: 'active' });
  if (!session) {
    throw ApiError.notFound('Active table session not found.');
  }

  const table = await Table.findById(tableId).select('tableNumber').lean();
  const Restaurant = require('../restaurant/restaurant.model');
  const restaurant = await Restaurant.findById(restaurantId).select('location name').lean();

  // Geolocation Security Guard check
  const locationUtil = require('../../utils/location.util');
  if (latitude && longitude && restaurant?.location?.coordinates) {
    const [restLon, restLat] = restaurant.location.coordinates;
    const isInside = locationUtil.isWithinGeofence(latitude, longitude, restLat, restLon, 100);
    if (!isInside) {
      throw ApiError.forbidden('Host transfer unavailable: You must be physically inside the restaurant boundaries.');
    }
  }

  const maskedPhone = cleanPhone.length > 4 ? `+91 ***** ${cleanPhone.slice(-4)}` : cleanPhone;
  const requestId = `transfer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    const TableSessionAudit = require('../table/tableSessionAudit.model');
    await TableSessionAudit.create({
      restaurant: restaurantId,
      table: tableId,
      session: session._id,
      action: TableSessionAudit.AUDIT_ACTIONS.ACCESS_REQUESTED,
      actorPhone: cleanPhone,
      actorName: requesterName || 'Diner',
      targetHostPhone: session.hostPhone,
      reason: `Guest ${maskedPhone} requested Host Transfer on Table #${table?.tableNumber || ''}.`,
    });
  } catch (auditErr) {
    // eslint-disable-next-line no-console
    console.error('[TableAudit] Failed to log host transfer request audit event:', auditErr);
  }

  // Broadcast real-time host transfer request to BOTH Host room AND Manager room
  socketConfig.broadcastEvent(restaurantId, 'host_transfer:requested', {
    requestId,
    tableId,
    tableNumber: table?.tableNumber || '',
    currentHostName: session.hostName,
    currentHostPhone: session.hostPhone,
    requesterName: requesterName || 'Diner',
    requesterPhone: cleanPhone,
    maskedPhone,
    timestamp: new Date().toISOString(),
  });

  return { requestId, tableId, maskedPhone, status: 'pending' };
};

const respondHostTransfer = async (restaurantId, tableId, payload) => {
  const { requestId, requesterPhone, requesterName, decision, responderRole, responderName, responderPhone } = payload;
  if (!requesterPhone || !decision) {
    throw ApiError.badRequest('Requester phone number and decision are required.');
  }

  const session = await TableSession.findOne({ table: tableId, status: 'active' });
  if (!session) {
    throw ApiError.notFound('Active table session not found.');
  }

  const cleanPhone = requesterPhone.trim();
  const isApproved = decision === 'approve';

  if (!isApproved) {
    socketConfig.broadcastEvent(restaurantId, 'host_transfer:responded', {
      requestId,
      tableId,
      requesterPhone: cleanPhone,
      approved: false,
      status: 'denied',
      responderRole: responderRole || 'Host',
    });
    return { requestId, tableId, approved: false, status: 'denied' };
  }

  // Store previous host info
  const previousHostPhone = session.hostPhone;
  const previousHostName = session.hostName;

  // Find or create customer record for new host
  let customer = await Customer.findOne({ restaurant: restaurantId, phoneNumber: cleanPhone, isDeleted: false });
  if (!customer) {
    customer = await Customer.create({
      restaurant: restaurantId,
      name: requesterName || 'Host Diner',
      phoneNumber: cleanPhone,
      isPhoneVerified: true,
      authProvider: 'phone',
    });
  }

  // Preserve previous host as co-orderer so they retain order/view access if they remain at the table
  const existingCoIndex = session.coOrderers.findIndex((c) => c.phone === previousHostPhone);
  if (existingCoIndex === -1) {
    session.coOrderers.push({
      name: previousHostName,
      phone: previousHostPhone,
      approvedAt: new Date(),
    });
  }

  // Promote 3rd person to Host
  session.customer = customer._id;
  session.hostName = requesterName || customer.name || 'Host Diner';
  session.hostPhone = cleanPhone;
  session.hostToken = require('crypto').randomBytes(16).toString('hex');
  session.lastActivityAt = new Date();
  await session.save();

  try {
    const TableSessionAudit = require('../table/tableSessionAudit.model');
    await TableSessionAudit.create({
      restaurant: restaurantId,
      table: tableId,
      session: session._id,
      action: TableSessionAudit.AUDIT_ACTIONS.HOST_HANDOFF_APPROVED,
      actorPhone: responderPhone || session.hostPhone,
      actorName: responderName || responderRole || 'Host/Manager',
      targetHostPhone: cleanPhone,
      reason: `Host Transfer approved by ${responderRole || 'Host'}. New Host: ${cleanPhone.slice(-4)}. Previous host ${previousHostPhone.slice(-4)} signed out.`,
    });
  } catch (auditErr) {
    // eslint-disable-next-line no-console
    console.error('[TableAudit] Failed to log host transfer audit event:', auditErr);
  }

  // Emit Socket.IO demotion event to previous host forcing sign-out
  socketConfig.broadcastEvent(restaurantId, 'host:demoted', {
    tableId,
    previousHostPhone,
    newHostName: session.hostName,
    newHostPhone: cleanPhone,
    message: `Host role transferred to ${session.hostName}. You have been signed out as Host.`,
  });

  // Broadcast new host session to table & manager rooms
  socketConfig.broadcastEvent(restaurantId, 'host_transfer:responded', {
    requestId,
    tableId,
    requesterPhone: cleanPhone,
    approved: true,
    status: 'approved',
    newHostName: session.hostName,
    newHostPhone: cleanPhone,
    hostToken: session.hostToken,
    responderRole: responderRole || 'Host',
  });

  return {
    requestId,
    tableId,
    approved: true,
    status: 'approved',
    hostName: session.hostName,
    hostPhone: session.hostPhone,
    hostToken: session.hostToken,
  };
};

const releaseTableHost = async (restaurantId, payload) => {
  return releaseTableSession(restaurantId, payload);
};

// ==========================================
// 6. TRACK & PAY LIVE CUSTOMER ORDER
// ==========================================
const trackLiveOrder = async (restaurantId, orderId, authContext = {}) => {
  const { customerId, hostToken } = authContext;

  // Resolve encrypted order tracking token
  if (orderId && typeof orderId === 'string' && orderId.startsWith('enc_')) {
    const decrypted = decryptQrToken(orderId);
    if (!decrypted) {
      throw ApiError.badRequest('Invalid or tampered order tracking token.');
    }
    if (typeof decrypted === 'object') {
      if (decrypted.orderId) orderId = decrypted.orderId;
      if (decrypted.restaurantId && (!restaurantId || restaurantId === 'general' || restaurantId === 'undefined' || restaurantId === 'null')) {
        restaurantId = decrypted.restaurantId;
      }
    } else if (typeof decrypted === 'string') {
      orderId = decrypted;
    }
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw ApiError.badRequest('Invalid order identifier.');
  }

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

  // 4. Fallback: Create or resolve guest document if no customer found
  if (!customerDoc) {
    if (payload.customerPhone) {
      customerDoc = await Customer.findOne({
        restaurant: restaurantId,
        phoneNumber: payload.customerPhone,
      });
    }
    if (!customerDoc) {
      customerDoc = await Customer.create({
        restaurant: restaurantId,
        phoneNumber: payload.customerPhone || `guest_${Date.now()}`,
        fullName: payload.customerName || 'Guest Diner',
      });
    }
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

// ==========================================
// 8. HOST HANDOFF AUTO-RESOLUTION & AUDIT LOGS
// ==========================================
const requestHostHandoff = async (restaurantId, payload, authenticatedUser = null) => {
  const { tableId, requesterName, requesterPhone, reason = '' } = payload;
  if (!tableId || !requesterPhone) {
    throw ApiError.badRequest('Table ID and requester phone number are required for host transfer.');
  }

  const otpService = require('../auth/otp.service');
  const cleanPhone = otpService.normalizePhone(requesterPhone) || requesterPhone.trim();

  let table = await Table.findOne({ _id: tableId, restaurant: restaurantId, isDeleted: false });
  if (!table) {
    throw ApiError.notFound('Table not found.');
  }

  const activeSession = await TableSession.findOne({ table: table._id, status: 'active' });
  if (!activeSession) {
    // Table is un-claimed — claim directly!
    return claimTableHost(restaurantId, { tableId, hostName: requesterName, hostPhone: cleanPhone }, authenticatedUser);
  }

  if (isMatchingPhone(activeSession.hostPhone, cleanPhone)) {
    return { status: 'already_host', message: 'You are already the active host of this table.', session: activeSession };
  }

  // Check current active orders for this table
  const activeOrdersCount = await Order.countDocuments({
    table: table._id,
    session: activeSession._id,
    orderStatus: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready'] },
    isDeleted: false,
  });

  const lastActivity = activeSession.lastActivityAt || activeSession.updatedAt || activeSession.createdAt;
  const idleMins = (Date.now() - new Date(lastActivity).getTime()) / 60000;

  // Auto-approve handoff if current host is idle > 10 minutes AND has 0 active/unfinished orders
  const canAutoApprove = activeOrdersCount === 0 && idleMins >= 10;

  if (canAutoApprove) {
    // 1. Mark previous idle session as released
    activeSession.status = 'released';
    activeSession.endedAt = new Date();
    await activeSession.save();

    // 2. Claim table for new host
    const newHost = await claimTableHost(
      restaurantId,
      { tableId, hostName: requesterName, hostPhone: cleanPhone },
      authenticatedUser
    );

    // 3. Log audit entry
    await TableSessionAudit.create({
      restaurant: restaurantId,
      table: table._id,
      session: newHost.session._id,
      action: TableSessionAudit.AUDIT_ACTIONS.HANDOFF_APPROVED,
      actorPhone: cleanPhone,
      actorName: requesterName || 'Diner',
      targetHostPhone: activeSession.hostPhone,
      reason: `Auto-approved host handoff. Previous host idle for ${Math.round(idleMins)}m with 0 active orders.`,
      metadata: { idleMins: Math.round(idleMins), previousHostName: activeSession.hostName },
    }).catch(() => null);

    return {
      status: 'approved',
      autoApproved: true,
      message: `Host status auto-transferred to ${requesterName || 'you'} (previous host was inactive).`,
      session: newHost.session,
      hostToken: newHost.hostToken,
    };
  }

  // Safe-by-default: If current host is active, log HANDOFF_REQUEST for staff review without overriding
  await TableSessionAudit.create({
    restaurant: restaurantId,
    table: table._id,
    session: activeSession._id,
    action: TableSessionAudit.AUDIT_ACTIONS.HANDOFF_REQUEST,
    actorPhone: cleanPhone,
    actorName: requesterName || 'Diner',
    targetHostPhone: activeSession.hostPhone,
    reason: reason || `Requested host transfer. Flagged for review (current host has ${activeOrdersCount} active orders, idle ${Math.round(idleMins)}m).`,
    metadata: { activeOrdersCount, idleMins: Math.round(idleMins), currentHostName: activeSession.hostName },
  }).catch(() => null);

  return {
    status: 'flagged_for_review',
    autoApproved: false,
    message: `Table #${table.tableNumber} is actively managed by ${activeSession.hostName}. Transfer request logged for staff review.`,
    currentHostName: activeSession.hostName,
  };
};

const getTableSessionAuditLogs = async (restaurantId, tableId = null) => {
  const query = { restaurant: restaurantId };
  if (tableId) query.table = tableId;
  const logs = await TableSessionAudit.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('table', 'tableNumber tableName')
    .lean();

  return { logs };
};

const calculateTableTurnoverEstimate = async (restaurantId, tableId) => {
  const activeOrders = await Order.find({
    restaurant: restaurantId,
    table: tableId,
    orderStatus: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'] },
    isDeleted: false,
  }).lean();

  if (activeOrders.length === 0) {
    return { estimatedMinutesRemaining: 0, status: 'Available' };
  }

  let remainingMins = 0;
  activeOrders.forEach((ord) => {
    switch (ord.orderStatus) {
      case 'Pending': remainingMins += 30; break;
      case 'Accepted': remainingMins += 25; break;
      case 'Preparing': remainingMins += 15; break;
      case 'Ready': remainingMins += 10; break;
      case 'Served': remainingMins += 12; break;
      default: remainingMins += 5; break;
    }
  });

  const estimatedMins = Math.min(60, Math.max(5, Math.round(remainingMins / activeOrders.length)));
  return { estimatedMinutesRemaining: estimatedMins, activeOrdersCount: activeOrders.length, status: 'Occupied' };
};

// ==========================================
// GUEST ORDER HISTORY & PRIVACY OPT-OUT
// ==========================================
const getGuestOrderHistory = async (restaurantId, phone) => {
  const defaultHistory = {
    hasHistory: false,
    visitCount: 0,
    topFavoriteItems: [],
    recentOrders: [],
    averageSpend: 0,
    budgetTier: 'mid_range',
    pastDietaryPreferences: [],
  };

  if (!phone || typeof phone !== 'string') {
    return defaultHistory;
  }

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length < 10) {
    return defaultHistory;
  }

  // Query Customer document if exists
  const customerDoc = await Customer.findOne({
    restaurant: restaurantId,
    phoneNumber: { $regex: cleanPhone },
    isDeleted: false,
  }).lean();

  // Find non-cancelled orders by customerPhone OR customer._id
  const orderQuery = {
    restaurant: restaurantId,
    orderStatus: { $ne: 'Cancelled' },
    isDeleted: false,
    $or: [
      { customerPhone: { $regex: cleanPhone } },
      ...(customerDoc ? [{ customer: customerDoc._id }] : []),
    ],
  };

  const orders = await Order.find(orderQuery)
    .sort({ createdAt: -1 })
    .lean();

  if (!orders || orders.length === 0) {
    return defaultHistory;
  }

  const visitCount = orders.length;
  let totalSpent = 0;
  const itemMap = new Map();
  const pastDietary = new Set(customerDoc?.dietaryPreference ? [customerDoc.dietaryPreference] : []);

  for (const ord of orders) {
    totalSpent += ord.grandTotal || 0;
    for (const item of ord.items || []) {
      const key = item.itemName;
      const existing = itemMap.get(key) || {
        menuItemId: item.menuItem,
        itemName: item.itemName,
        quantity: 0,
        unitPrice: item.unitPrice,
      };
      existing.quantity += item.quantity;
      itemMap.set(key, existing);

      // Check item notes/instructions for dietary preferences or allergies mentioned
      const instructions = (item.specialInstructions || '').toLowerCase();
      if (instructions.includes('vegan')) pastDietary.add('vegan');
      if (instructions.includes('no dairy') || instructions.includes('dairy free')) pastDietary.add('dairy_free');
      if (instructions.includes('jain')) pastDietary.add('jain');
      if (instructions.includes('veg') && !instructions.includes('non-veg')) pastDietary.add('veg');
    }
  }

  const averageSpend = Math.round((totalSpent / visitCount) * 100) / 100;
  let budgetTier = 'mid_range';
  if (averageSpend < 300) budgetTier = 'budget_friendly';
  else if (averageSpend > 600) budgetTier = 'premium';

  // Sort top items by order quantity descending
  const topFavoriteItems = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3);

  // Format recent 3 orders
  const recentOrders = orders.slice(0, 3).map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    grandTotal: o.grandTotal,
    itemCount: (o.items || []).length,
    itemsSummary: (o.items || []).map((i) => `${i.quantity}x ${i.itemName}`).join(', '),
  }));

  return {
    hasHistory: true,
    visitCount,
    topFavoriteItems,
    recentOrders,
    averageSpend,
    budgetTier,
    pastDietaryPreferences: Array.from(pastDietary),
  };
};

const forgetGuestHistory = async (restaurantId, phone) => {
  if (!phone || typeof phone !== 'string') {
    return { success: false, message: 'Phone number is required.' };
  }

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, message: 'Valid phone number is required.' };
  }

  // Clear customer notes/preferences and clear customerPhone from order records for AI privacy
  const customerDoc = await Customer.findOne({ restaurant: restaurantId, phoneNumber: { $regex: cleanPhone } });
  if (customerDoc) {
    customerDoc.favoriteItems = [];
    customerDoc.notes = 'Personalization history cleared by diner request';
    await customerDoc.save();
  }

  await Order.updateMany(
    { restaurant: restaurantId, customerPhone: { $regex: cleanPhone } },
    { $set: { customerPhone: '' } }
  );

  return {
    success: true,
    message: 'Your order history and AI personalization data have been cleared from this restaurant.',
  };
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
  requestHostHandoff,
  getTableSessionAuditLogs,
  calculateTableTurnoverEstimate,
  requestTableAccess,
  respondTableAccess,
  requestHostTransfer,
  respondHostTransfer,
  getGuestOrderHistory,
  forgetGuestHistory,
};
