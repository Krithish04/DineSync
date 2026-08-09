const Invoice = require('./invoice.model');
const Payment = require('./payment.model');
const Order = require('../order/order.model');
const Table = require('../table/table.model');
const Customer = require('../customer/customer.model');
const ApiError = require('../../utils/ApiError');
const socketConfig = require('../../config/socket.config');

// ==========================================
// INVOICE OPERATIONS
// ==========================================

const generateInvoice = async (restaurantId, payload, cashierId) => {
  const order = await Order.findOne({ _id: payload.orderId, restaurant: restaurantId, isDeleted: false });
  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  const subtotal = order.subtotal || 0;
  const discount = payload.discount || 0;
  const couponDiscount = payload.couponDiscount || 0;
  const loyaltyDiscount = payload.loyaltyDiscount || 0;

  const totalDiscount = discount + couponDiscount + loyaltyDiscount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);

  // Apply service charge: 5% of subtotal
  const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100;

  // Apply automatic GST calculations: 2.5% CGST + 2.5% SGST (5% total)
  const cgst = Math.round(taxableAmount * 0.025 * 100) / 100;
  const sgst = Math.round(taxableAmount * 0.025 * 100) / 100;
  const igst = 0;

  const rawGrandTotal = taxableAmount + serviceCharge + cgst + sgst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundingAdjustment = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  // Check if invoice already exists for this order to prevent duplicate invoices
  let invoice = await Invoice.findOne({ order: order._id, restaurant: restaurantId });

  if (invoice) {
    // Update existing invoice parameters
    if (cashierId !== undefined) {
      invoice.cashier = cashierId || null;
    }
    invoice.subtotal = subtotal;
    invoice.discount = discount;
    invoice.couponDiscount = couponDiscount;
    invoice.loyaltyDiscount = loyaltyDiscount;
    invoice.serviceCharge = serviceCharge;
    invoice.cgst = cgst;
    invoice.sgst = sgst;
    invoice.igst = igst;
    invoice.roundingAdjustment = roundingAdjustment;
    invoice.grandTotal = grandTotal;
    invoice.notes = payload.notes || '';
    invoice.invoiceStatus = 'Generated';
    await invoice.save();
  } else {
    // Create new invoice
    invoice = await Invoice.create({
      restaurant: restaurantId,
      order: order._id,
      customer: order.customer || null,
      table: order.table || null,
      cashier: cashierId || null,
      invoiceStatus: 'Generated',
      subtotal,
      discount,
      couponDiscount,
      loyaltyDiscount,
      serviceCharge,
      cgst,
      sgst,
      igst,
      roundingAdjustment,
      grandTotal,
      notes: payload.notes || '',
    });
  }

  // Also sync final grandTotal and discounts back to parent order to align them
  order.discount = totalDiscount;
  order.grandTotal = grandTotal;
  await order.save();

  return invoice.populate([
    { path: 'customer', select: 'fullName phoneNumber customerId' },
    { path: 'table', select: 'tableNumber' },
    { path: 'cashier', select: 'name role' },
  ]);
};

const listInvoices = async (restaurantId, { status, search = '' }) => {
  const query = { restaurant: restaurantId };
  if (status) query.invoiceStatus = status;

  if (search) {
    query.invoiceNumber = { $regex: search, $options: 'i' };
  }

  return Invoice.find(query)
    .populate('customer', 'fullName phoneNumber')
    .populate('table', 'tableNumber')
    .populate('cashier', 'name')
    .sort({ invoiceDate: -1 });
};

const getInvoice = async (restaurantId, invoiceId) => {
  const invoice = await Invoice.findOne({ _id: invoiceId, restaurant: restaurantId }).populate([
    { path: 'customer', select: 'fullName phoneNumber customerId loyaltyPoints membershipTier' },
    { path: 'table', select: 'tableNumber tableName' },
    { path: 'cashier', select: 'name role' },
    { path: 'order' },
  ]);

  if (!invoice) throw ApiError.notFound('Invoice details not found.');
  return invoice;
};

// ==========================================
// PAYMENT TRANSACTIONS & PROCESS
// ==========================================

const processPayment = async (restaurantId, payload, cashierId) => {
  const { invoiceId, paymentMethod, amount, transactionReference, splitPayments = [] } = payload;

  const invoice = await Invoice.findOne({ _id: invoiceId, restaurant: restaurantId });
  if (!invoice) {
    throw ApiError.notFound('Invoice not found.');
  }

  if (invoice.invoiceStatus === 'Paid') {
    throw ApiError.badRequest('This invoice has already been paid.');
  }

  const createdPayments = [];

  if (paymentMethod === 'Split Payment') {
    // Validate split sum
    const totalSplit = splitPayments.reduce((sum, sp) => sum + sp.amount, 0);
    if (Math.abs(totalSplit - invoice.grandTotal) > 1.0) {
      throw ApiError.badRequest(`Split payments sum (₹${totalSplit}) does not match invoice total (₹${invoice.grandTotal}).`);
    }

    // Save individual payments
    for (const sp of splitPayments) {
      const p = await Payment.create({
        restaurant: restaurantId,
        invoice: invoiceId,
        paymentMethod: sp.paymentMethod,
        amount: sp.amount,
        transactionReference: sp.transactionReference || '',
        paymentStatus: 'Success',
        receivedBy: cashierId,
      });
      createdPayments.push(p);
    }
  } else {
    // Single payment
    const p = await Payment.create({
      restaurant: restaurantId,
      invoice: invoiceId,
      paymentMethod,
      amount,
      transactionReference: transactionReference || '',
      paymentStatus: 'Success',
      receivedBy: cashierId,
    });
    createdPayments.push(p);
  }

  // Update Invoice status to Paid
  invoice.invoiceStatus = 'Paid';
  await invoice.save();

  // Update parent Order status
  const order = await Order.findOne({ _id: invoice.order, restaurant: restaurantId });
  if (order) {
    order.paymentStatus = 'Paid';
    order.orderStatus = 'Completed';
    await order.save();

    // Free table associated with order (if Dine-In)
    if (order.table) {
      const activeOrders = await Order.exists({
        table: order.table,
        orderStatus: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'] },
        isDeleted: false,
        _id: { $ne: order._id },
      });
      if (!activeOrders) {
        await Table.updateOne({ _id: order.table }, { status: 'Available' });
      }
    }

    // Accrue loyalty points for customer if linked
    if (order.customer) {
      try {
        const customerService = require('../customer/customer.service');
        await customerService.earnPointsForOrder(restaurantId, order.customer, order);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Loyalty] Accrual during invoice pay failed:', err.stack || err);
        if (process.env.NODE_ENV !== 'production') {
          throw err;
        }
      }
    }

    // Broadcast Real-Time updates
    socketConfig.broadcastEvent(restaurantId, 'order:payment_completed', order);
    socketConfig.broadcastEvent(restaurantId, 'order:updated', order);
  }

  return { invoice, payments: createdPayments };
};

const refundInvoice = async (restaurantId, invoiceId, cashierId) => {
  const invoice = await Invoice.findOne({ _id: invoiceId, restaurant: restaurantId });
  if (!invoice) {
    throw ApiError.notFound('Invoice details not found.');
  }

  if (invoice.invoiceStatus !== 'Paid') {
    throw ApiError.badRequest('Only fully paid invoices can be refunded.');
  }

  // Update status to Refunded
  invoice.invoiceStatus = 'Refunded';
  await invoice.save();

  // Refund all success payments
  await Payment.updateMany({ invoice: invoiceId }, { paymentStatus: 'Refunded' });

  // Update Order payment status
  const order = await Order.findOne({ _id: invoice.order, restaurant: restaurantId });
  if (order) {
    order.paymentStatus = 'Refunded';
    await order.save();

    // Deduct accrued loyalty points from customer
    if (order.customer) {
      const customer = await Customer.findOne({ _id: order.customer, restaurant: restaurantId });
      if (customer) {
        // Evaluate points earned earlier
        const customerService = require('../customer/customer.service');
        const multiplier = 1.0; // simple baseline deduct
        const pointsDeducted = Math.round(order.grandTotal * multiplier);

        customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - pointsDeducted);
        customer.totalSpent = Math.max(0, customer.totalSpent - order.grandTotal);
        await customer.save();

        const LoyaltyTransaction = require('../customer/loyaltyTransaction.model');
        await LoyaltyTransaction.create({
          restaurant: restaurantId,
          customer: customer._id,
          transactionType: 'Adjustment',
          points: -pointsDeducted,
          reason: `Points reversed due to Invoice #${invoice.invoiceNumber} refund.`,
        });
      }
    }

    socketConfig.broadcastEvent(restaurantId, 'order:updated', order);
  }

  return invoice;
};

// ==========================================
// STATISTICS & REPORTS
// ==========================================

const getBillingStats = async (restaurantId) => {
  const query = { restaurant: restaurantId, invoiceStatus: 'Paid' };
  const paymentsQuery = { restaurant: restaurantId, paymentStatus: 'Success' };

  const [invoices, paymentsList] = await Promise.all([
    Invoice.find(query),
    Payment.find(paymentsQuery),
  ]);

  let totalSales = 0;
  let totalTax = 0;
  let totalDiscounts = 0;

  invoices.forEach((inv) => {
    totalSales += inv.grandTotal;
    totalTax += (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0);
    totalDiscounts += (inv.discount || 0) + (inv.couponDiscount || 0) + (inv.loyaltyDiscount || 0);
  });

  const invoiceCount = invoices.length;
  const avgTicketSize = invoiceCount > 0 ? Math.round((totalSales / invoiceCount) * 100) / 100 : 0;

  // Breakdown of payment methods
  const methodsMap = {};
  paymentsList.forEach((p) => {
    methodsMap[p.paymentMethod] = (methodsMap[p.paymentMethod] || 0) + p.amount;
  });

  const paymentBreakdown = Object.keys(methodsMap).map((method) => ({
    method,
    amount: Math.round(methodsMap[method] * 100) / 100,
  }));

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    averageTicketSize: avgTicketSize,
    totalTaxCollected: Math.round(totalTax * 100) / 100,
    totalDiscountsGiven: Math.round(totalDiscounts * 100) / 100,
    paymentBreakdown,
  };
};

const getFinanceReports = async (restaurantId) => {
  const query = { restaurant: restaurantId, invoiceStatus: 'Paid' };
  const invoices = await Invoice.find(query);

  const salesMap = {};
  invoices.forEach((inv) => {
    const day = new Date(inv.invoiceDate).toLocaleDateString([], { month: 'short', day: '2-digit' });
    salesMap[day] = (salesMap[day] || 0) + inv.grandTotal;
  });

  const timeline = Object.keys(salesMap).map((day) => ({
    date: day,
    revenue: Math.round(salesMap[day] * 100) / 100,
  }));

  // Fetch refund values
  const refundQuery = { restaurant: restaurantId, invoiceStatus: 'Refunded' };
  const refundedInvoices = await Invoice.find(refundQuery);
  const totalRefunded = refundedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

  return {
    revenueTimeline: timeline,
    refundsTotal: Math.round(totalRefunded * 100) / 100,
  };
};

const ensurePaidInvoiceForOrder = async (restaurantId, order, paymentMethod = 'UPI', transactionReference = '') => {
  if (!order) return null;

  const subtotal = order.subtotal || 0;
  const discount = order.discount || 0;
  const serviceCharge = order.serviceCharge || Math.round(subtotal * 0.05 * 100) / 100;
  const tax = order.tax || Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = order.grandTotal || Math.max(0, Math.round(subtotal + serviceCharge + tax - discount));

  let invoice = await Invoice.findOne({ order: order._id, restaurant: restaurantId });

  if (!invoice) {
    invoice = await Invoice.create({
      restaurant: restaurantId,
      order: order._id,
      customer: order.customer || null,
      table: order.table || null,
      invoiceStatus: 'Paid',
      subtotal,
      discount,
      serviceCharge,
      cgst: Math.round(tax * 0.5 * 100) / 100,
      sgst: Math.round(tax * 0.5 * 100) / 100,
      igst: 0,
      grandTotal,
      notes: order.notes || '',
      invoiceDate: order.createdAt || new Date(),
    });
  } else {
    invoice.invoiceStatus = 'Paid';
    invoice.grandTotal = grandTotal;
    invoice.subtotal = subtotal;
    invoice.serviceCharge = serviceCharge;
    invoice.notes = order.notes || invoice.notes;
    await invoice.save();
  }

  const existingPayment = await Payment.findOne({ invoice: invoice._id, restaurant: restaurantId });
  if (!existingPayment) {
    await Payment.create({
      restaurant: restaurantId,
      invoice: invoice._id,
      paymentMethod: paymentMethod || order.paymentMethod || 'UPI',
      amount: grandTotal,
      transactionReference: transactionReference || '',
      paymentStatus: 'Success',
      createdAt: order.createdAt || new Date(),
    });
  }

  return invoice;
};

module.exports = {
  generateInvoice,
  listInvoices,
  getInvoice,
  processPayment,
  refundInvoice,
  getBillingStats,
  getFinanceReports,
  ensurePaidInvoiceForOrder,
};
