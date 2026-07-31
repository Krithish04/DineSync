const Order = require('../order/order.model');
const Invoice = require('../billing/invoice.model');
const Payment = require('../billing/payment.model');
const Reservation = require('../reservation/reservation.model');
const Customer = require('../customer/customer.model');
const LoyaltyTransaction = require('../customer/loyaltyTransaction.model');
const Ingredient = require('../inventory/ingredient.model');
const Purchase = require('../inventory/purchase.model');
const StockTransaction = require('../inventory/stockTransaction.model');
const Employee = require('../employee/employee.model');
const Attendance = require('../employee/attendance.model');
const Leave = require('../employee/leave.model');
const mongoose = require('mongoose');
const { getCache, setCache } = require('../../utils/cache.util');

// ==========================================
// HELPERS
// ==========================================

/**
 * Builds a date range filter given optional startDate / endDate strings.
 * Falls back to the current month if neither is supplied.
 */
const buildDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })();
  const end = endDate ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })() : new Date();
  return { $gte: start, $lte: end };
};

// ==========================================
// EXECUTIVE DASHBOARD
// ==========================================

const getExecutiveDashboard = async (restaurantId, branchId = null) => {
  const cacheKey = `executive_dash_${restaurantId}_${branchId || 'all'}`;
  const cachedData = getCache(cacheKey);
  if (cachedData) return cachedData;

  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const matchBase = { restaurant };
  if (branchId) matchBase.branch = new mongoose.Types.ObjectId(branchId);

  const invBase = { ...matchBase, invoiceStatus: 'Paid' };

  const [
    revenueToday,
    revenueMonth,
    ordersToday,
    activeTables,
    reservationsToday,
    topSellingItems,
    inventoryAlerts,
    attendanceToday,
  ] = await Promise.all([
    // Revenue Today
    Invoice.aggregate([
      { $match: { ...invBase, invoiceDate: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),

    // Revenue This Month
    Invoice.aggregate([
      { $match: { ...invBase, invoiceDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),

    // Orders Today
    Order.countDocuments({
      ...matchBase,
      isDeleted: false,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    }),

    // Active Tables (occupied orders)
    Order.countDocuments({
      ...matchBase,
      isDeleted: false,
      orderType: 'Dine-In',
      orderStatus: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'] },
    }),

    // Reservations Today
    Reservation.countDocuments({
      ...matchBase,
      isDeleted: false,
      reservationDate: todayStart.toISOString().slice(0, 10),
    }),

    // Top Selling Items (last 30 days)
    Order.aggregate([
      {
        $match: {
          ...matchBase,
          isDeleted: false,
          orderStatus: 'Completed',
          createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          itemName: { $first: '$items.itemName' },
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
    ]),

    // Low Stock / Out of Stock Alerts
    Ingredient.find(
      { restaurant, isDeleted: false, $expr: { $lte: ['$currentStock', '$reorderLevel'] } },
      { ingredientName: 1, currentStock: 1, reorderLevel: 1, unit: 1 }
    ).limit(10).lean(),

    // Employee Attendance Today
    Attendance.countDocuments({
      restaurant,
      date: todayStart.toISOString().slice(0, 10),
      status: 'Present',
    }),
  ]);

  const result = {
    revenueToday: revenueToday[0]?.total || 0,
    revenueThisMonth: revenueMonth[0]?.total || 0,
    ordersToday,
    activeTables,
    reservationsToday,
    topSellingItems,
    inventoryAlerts,
    employeesPresentToday: attendanceToday,
  };

  setCache(cacheKey, result, 60);
  return result;
};

// ==========================================
// SALES REPORTS
// ==========================================

const getSalesSummary = async (restaurantId, { startDate, endDate, branchId, groupBy = 'day' }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, invoiceStatus: 'Paid', invoiceDate: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  const dateFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'year' ? '%Y' : groupBy === 'week' ? '%Y-W%V' : '%Y-%m-%d';

  const [timeline, totals] = await Promise.all([
    Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$invoiceDate' } },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
          avgTicket: { $avg: '$grandTotal' },
          totalTax: { $sum: { $add: ['$cgst', '$sgst', '$igst'] } },
          totalDiscount: { $sum: { $add: ['$discount', '$couponDiscount', '$loyaltyDiscount'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalOrders: { $sum: 1 },
          avgTicket: { $avg: '$grandTotal' },
          totalTax: { $sum: { $add: ['$cgst', '$sgst', '$igst'] } },
          totalDiscount: { $sum: { $add: ['$discount', '$couponDiscount', '$loyaltyDiscount'] } },
        },
      },
    ]),
  ]);

  return { timeline, totals: totals[0] || {} };
};

const getSalesByBranch = async (restaurantId, { startDate, endDate }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  return Invoice.aggregate([
    { $match: { restaurant, invoiceStatus: 'Paid', invoiceDate: dateRange } },
    {
      $group: {
        _id: '$branch',
        totalRevenue: { $sum: '$grandTotal' },
        totalOrders: { $sum: 1 },
        avgTicket: { $avg: '$grandTotal' },
      },
    },
    {
      $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' },
    },
    { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        branchName: '$branch.name',
        branchCode: '$branch.code',
        totalRevenue: 1, totalOrders: 1, avgTicket: 1,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);
};

const getSalesByCategory = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, isDeleted: false, orderStatus: 'Completed', createdAt: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  return Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'menuitems',
        localField: 'items.menuItem',
        foreignField: '_id',
        as: 'menuItemData',
      },
    },
    { $unwind: { path: '$menuItemData', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'categories',
        localField: 'menuItemData.category',
        foreignField: '_id',
        as: 'categoryData',
      },
    },
    { $unwind: { path: '$categoryData', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$categoryData._id',
        categoryName: { $first: '$categoryData.name' },
        totalQty: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);
};

const getSalesByItem = async (restaurantId, { startDate, endDate, branchId, limit = 20 }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, isDeleted: false, orderStatus: 'Completed', createdAt: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  return Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.menuItem',
        itemName: { $first: '$items.itemName' },
        totalQty: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        avgPrice: { $avg: '$items.unitPrice' },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: Number(limit) },
  ]);
};

const getHourlySales = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, invoiceStatus: 'Paid', invoiceDate: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  return Invoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $hour: '$invoiceDate' },
        revenue: { $sum: '$grandTotal' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { hour: '$_id', revenue: 1, orders: 1, _id: 0 } },
  ]);
};

// ==========================================
// ORDER REPORTS
// ==========================================

const getOrderSummary = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, isDeleted: false, createdAt: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  const [summary, typeDistribution, peakHours] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 1, 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Refunded'] }, 1, 0] } },
          totalRevenue: { $sum: '$grandTotal' },
          avgOrderValue: { $avg: '$grandTotal' },
        },
      },
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: '$orderType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Order.aggregate([
      { $match: { ...match, orderStatus: 'Completed' } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { hour: '$_id', count: 1, _id: 0 } },
    ]),
  ]);

  return { summary: summary[0] || {}, typeDistribution, peakHours };
};

// ==========================================
// RESERVATION REPORTS
// ==========================================

const getReservationSummary = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);

  // Reservations use string date field (YYYY-MM-DD)
  const start = startDate || new Date(new Date().setDate(1)).toISOString().slice(0, 10);
  const end = endDate || new Date().toISOString().slice(0, 10);

  const match = { restaurant, isDeleted: false, reservationDate: { $gte: start, $lte: end } };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  const [statusBreakdown, peakHours] = await Promise.all([
    Reservation.aggregate([
      { $match: match },
      { $group: { _id: '$reservationStatus', count: { $sum: 1 } } },
    ]),
    Reservation.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $substr: ['$reservationTime', 0, 2] }, // extract hour
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const total = statusBreakdown.reduce((s, r) => s + r.count, 0);
  const noShow = statusBreakdown.find((r) => r._id === 'No Show')?.count || 0;
  const noShowRate = total > 0 ? Math.round((noShow / total) * 10000) / 100 : 0;

  return {
    total,
    statusBreakdown,
    noShowRate,
    peakHours: peakHours.map((h) => ({ hour: `${h._id}:00`, count: h.count })),
  };
};

// ==========================================
// CUSTOMER REPORTS
// ==========================================

const getCustomerSummary = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);

  const [newCustomers, returningData, topCustomers, tierBreakdown] = await Promise.all([
    // New customers in range
    Customer.countDocuments({ restaurant, isDeleted: false, createdAt: dateRange }),

    // Returning = visit count >= 2 in range (approximate via orders)
    Order.aggregate([
      {
        $match: {
          restaurant,
          isDeleted: false,
          orderStatus: 'Completed',
          customer: { $ne: null },
          createdAt: dateRange,
        },
      },
      { $group: { _id: '$customer', visits: { $sum: 1 } } },
      { $match: { visits: { $gte: 2 } } },
      { $count: 'returning' },
    ]),

    // Top customers by total spent
    Customer.find(
      { restaurant, isDeleted: false },
      { fullName: 1, phoneNumber: 1, totalSpent: 1, visitCount: 1, loyaltyPoints: 1, membershipTier: 1 }
    )
      .sort({ totalSpent: -1 })
      .limit(10)
      .lean(),

    // Tier breakdown
    Customer.aggregate([
      { $match: { restaurant, isDeleted: false } },
      { $group: { _id: '$membershipTier', count: { $sum: 1 }, totalSpent: { $sum: '$totalSpent' } } },
    ]),
  ]);

  return {
    newCustomers,
    returningCustomers: returningData[0]?.returning || 0,
    topCustomers,
    tierBreakdown,
  };
};

const getCustomerLoyaltySummary = async (restaurantId, { startDate, endDate }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);

  const [pointsEarned, pointsRedeemed, transactions] = await Promise.all([
    LoyaltyTransaction.aggregate([
      { $match: { restaurant, transactionType: 'Earn', createdAt: dateRange } },
      { $group: { _id: null, total: { $sum: '$points' }, count: { $sum: 1 } } },
    ]),
    LoyaltyTransaction.aggregate([
      { $match: { restaurant, transactionType: 'Redeem', createdAt: dateRange } },
      { $group: { _id: null, total: { $sum: '$points' }, count: { $sum: 1 } } },
    ]),
    LoyaltyTransaction.aggregate([
      { $match: { restaurant, createdAt: dateRange } },
      { $group: { _id: '$transactionType', total: { $sum: '$points' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    pointsEarned: pointsEarned[0]?.total || 0,
    earningTransactions: pointsEarned[0]?.count || 0,
    pointsRedeemed: Math.abs(pointsRedeemed[0]?.total || 0),
    redemptionTransactions: pointsRedeemed[0]?.count || 0,
    breakdown: transactions,
  };
};

// ==========================================
// INVENTORY REPORTS
// ==========================================

const getInventorySummary = async (restaurantId, branchId = null) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const match = { restaurant, isDeleted: false };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  const ingredients = await Ingredient.find(match).lean();
  const outOfStock = ingredients.filter((i) => i.currentStock <= 0);
  const lowStock = ingredients.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderLevel);
  const healthy = ingredients.filter((i) => i.currentStock > i.reorderLevel);
  const totalValue = ingredients.reduce((s, i) => s + i.currentStock * i.purchasePrice, 0);

  return {
    totalIngredients: ingredients.length,
    outOfStock: outOfStock.map((i) => ({ name: i.ingredientName, current: i.currentStock, unit: i.unit })),
    lowStock: lowStock.map((i) => ({
      name: i.ingredientName, current: i.currentStock, reorderLevel: i.reorderLevel, unit: i.unit,
    })),
    healthyCount: healthy.length,
    totalInventoryValue: Math.round(totalValue * 100) / 100,
  };
};

const getPurchaseSummary = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, isDeleted: false, purchaseDate: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  return Purchase.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } },
        totalSpend: { $sum: '$totalAmount' },
        purchases: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const getIngredientConsumption = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, transactionType: 'Consumption', createdAt: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  return StockTransaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$ingredient',
        totalConsumed: { $sum: { $abs: '$quantity' } },
        transactions: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'ingredients',
        localField: '_id',
        foreignField: '_id',
        as: 'ingredient',
      },
    },
    { $unwind: { path: '$ingredient', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        ingredientName: '$ingredient.ingredientName',
        unit: '$ingredient.unit',
        totalConsumed: 1,
        transactions: 1,
      },
    },
    { $sort: { totalConsumed: -1 } },
    { $limit: 30 },
  ]);
};

const getWasteAnalysis = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, transactionType: 'Waste', createdAt: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  return StockTransaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$ingredient',
        totalWasted: { $sum: { $abs: '$quantity' } },
        incidents: { $sum: 1 },
      },
    },
    {
      $lookup: { from: 'ingredients', localField: '_id', foreignField: '_id', as: 'ingredient' },
    },
    { $unwind: { path: '$ingredient', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        ingredientName: '$ingredient.ingredientName',
        unit: '$ingredient.unit',
        purchasePrice: '$ingredient.purchasePrice',
        totalWasted: 1,
        incidents: 1,
        estimatedLoss: { $multiply: ['$totalWasted', '$ingredient.purchasePrice'] },
      },
    },
    { $sort: { estimatedLoss: -1 } },
  ]);
};

// ==========================================
// EMPLOYEE REPORTS
// ==========================================

const getAttendanceSummary = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const start = startDate || new Date(new Date().setDate(1)).toISOString().slice(0, 10);
  const end = endDate || new Date().toISOString().slice(0, 10);
  const match = { restaurant, date: { $gte: start, $lte: end } };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  const [statusBreakdown, avgWorkingHours, totalOvertime] = await Promise.all([
    Attendance.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: { ...match, status: 'Present' } },
      { $group: { _id: null, avg: { $avg: '$workingHours' } } },
    ]),
    Attendance.aggregate([
      { $match: match },
      { $group: { _id: null, totalOvertime: { $sum: '$overtime' } } },
    ]),
  ]);

  return {
    statusBreakdown,
    avgWorkingHours: Math.round((avgWorkingHours[0]?.avg || 0) * 100) / 100,
    totalOvertime: Math.round((totalOvertime[0]?.totalOvertime || 0) * 100) / 100,
  };
};

const getWorkingHoursReport = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const start = startDate || new Date(new Date().setDate(1)).toISOString().slice(0, 10);
  const end = endDate || new Date().toISOString().slice(0, 10);
  const match = { restaurant, date: { $gte: start, $lte: end } };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  return Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$employee',
        totalWorkingHours: { $sum: '$workingHours' },
        totalOvertime: { $sum: '$overtime' },
        daysPresent: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
      },
    },
    {
      $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' },
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        employeeName: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
        designation: '$employee.designation',
        department: '$employee.department',
        totalWorkingHours: 1, totalOvertime: 1, daysPresent: 1,
      },
    },
    { $sort: { totalWorkingHours: -1 } },
  ]);
};

const getLeaveSummary = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, createdAt: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  return Leave.aggregate([
    { $match: match },
    { $group: { _id: '$leaveStatus', count: { $sum: 1 } } },
  ]);
};

// ==========================================
// FINANCIAL REPORTS
// ==========================================

const getFinancialSummary = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);

  const invMatch = { restaurant, invoiceStatus: 'Paid', invoiceDate: dateRange };
  const refMatch = { restaurant, invoiceStatus: 'Refunded', invoiceDate: dateRange };
  const purchMatch = { restaurant, isDeleted: false, purchaseDate: dateRange };
  if (branchId) {
    const bid = new mongoose.Types.ObjectId(branchId);
    invMatch.branch = bid; refMatch.branch = bid; purchMatch.branch = bid;
  }

  const [revenue, refunds, purchases, taxSummary] = await Promise.all([
    Invoice.aggregate([
      { $match: invMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalSubtotal: { $sum: '$subtotal' },
          totalServiceCharge: { $sum: '$serviceCharge' },
          invoiceCount: { $sum: 1 },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: refMatch },
      { $group: { _id: null, totalRefunded: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]),
    Purchase.aggregate([
      { $match: purchMatch },
      { $group: { _id: null, totalExpenses: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: invMatch },
      {
        $group: {
          _id: null,
          cgst: { $sum: '$cgst' },
          sgst: { $sum: '$sgst' },
          igst: { $sum: '$igst' },
          totalTax: { $sum: { $add: ['$cgst', '$sgst', '$igst'] } },
          totalDiscount: { $sum: { $add: ['$discount', '$couponDiscount', '$loyaltyDiscount'] } },
        },
      },
    ]),
  ]);

  const totalRevenue = revenue[0]?.totalRevenue || 0;
  const totalRefunded = refunds[0]?.totalRefunded || 0;
  const totalExpenses = purchases[0]?.totalExpenses || 0;
  const netRevenue = totalRevenue - totalRefunded;
  const profit = netRevenue - totalExpenses;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalRefunded: Math.round(totalRefunded * 100) / 100,
    netRevenue: Math.round(netRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    grossProfit: Math.round(profit * 100) / 100,
    profitMargin: netRevenue > 0 ? Math.round((profit / netRevenue) * 10000) / 100 : 0,
    taxSummary: taxSummary[0] || {},
    invoiceCount: revenue[0]?.invoiceCount || 0,
    avgTicketSize: revenue[0]?.invoiceCount > 0
      ? Math.round((totalRevenue / revenue[0].invoiceCount) * 100) / 100
      : 0,
  };
};

const getGstReport = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, invoiceStatus: 'Paid', invoiceDate: dateRange };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  return Invoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
        taxableAmount: { $sum: { $subtract: ['$subtotal', { $add: ['$discount', '$couponDiscount', '$loyaltyDiscount'] }] } },
        cgst: { $sum: '$cgst' },
        sgst: { $sum: '$sgst' },
        igst: { $sum: '$igst' },
        totalTax: { $sum: { $add: ['$cgst', '$sgst', '$igst'] } },
        invoices: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const getPaymentMethodSummary = async (restaurantId, { startDate, endDate, branchId }) => {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  const dateRange = buildDateRange(startDate, endDate);
  const match = { restaurant, paymentStatus: 'Success', createdAt: dateRange };

  return Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$paymentMethod',
        totalAmount: { $sum: '$amount' },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

module.exports = {
  getExecutiveDashboard,
  // Sales
  getSalesSummary,
  getSalesByBranch,
  getSalesByCategory,
  getSalesByItem,
  getHourlySales,
  // Orders
  getOrderSummary,
  // Reservations
  getReservationSummary,
  // Customers
  getCustomerSummary,
  getCustomerLoyaltySummary,
  // Inventory
  getInventorySummary,
  getPurchaseSummary,
  getIngredientConsumption,
  getWasteAnalysis,
  // Employees
  getAttendanceSummary,
  getWorkingHoursReport,
  getLeaveSummary,
  // Financial
  getFinancialSummary,
  getGstReport,
  getPaymentMethodSummary,
};
