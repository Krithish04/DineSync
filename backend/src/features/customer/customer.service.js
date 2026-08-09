const Customer = require('./customer.model');
const LoyaltyTransaction = require('./loyaltyTransaction.model');
const MenuItem = require('../menu/menuItem.model');
const Order = require('../order/order.model');
const Reservation = require('../reservation/reservation.model');
const ApiError = require('../../utils/ApiError');

// ==========================================
// CUSTOMER CRUD
// ==========================================

const createCustomer = async (restaurantId, payload) => {
  // Validate unique phoneNumber per restaurant
  const exists = await Customer.exists({
    restaurant: restaurantId,
    phoneNumber: payload.phoneNumber,
    isDeleted: false,
  });
  if (exists) {
    throw ApiError.badRequest(`Customer with phone number "${payload.phoneNumber}" already exists.`);
  }

  // Handle referredBy code linkage
  let referrer = null;
  if (payload.referredByCode) {
    referrer = await Customer.findOne({
      restaurant: restaurantId,
      referralCode: payload.referredByCode.toUpperCase(),
      isDeleted: false,
    });
    if (referrer) {
      payload.referredBy = referrer._id;
    }
  }

  const customer = await Customer.create({
    ...payload,
    restaurant: restaurantId,
  });

  // Award Referral Points if linked successfully
  if (referrer) {
    // Referrer gets 100 points
    referrer.loyaltyPoints += 100;
    await referrer.save();

    await LoyaltyTransaction.create({
      restaurant: restaurantId,
      customer: referrer._id,
      transactionType: 'Referral',
      points: 100,
      reason: `Referral bonus for inviting ${customer.fullName}`,
    });

    // New customer gets 50 points
    customer.loyaltyPoints += 50;
    await customer.save();

    await LoyaltyTransaction.create({
      restaurant: restaurantId,
      customer: customer._id,
      transactionType: 'Referral',
      points: 50,
      reason: `Sign up bonus via referral from ${referrer.fullName}`,
    });
  }

  return customer;
};

const listCustomers = async (restaurantId, { search = '', tier }) => {
  const query = { restaurant: restaurantId, isDeleted: false };
  if (tier) query.membershipTier = tier;

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  return Customer.find(query)
    .populate('preferredBranch', 'name code')
    .sort({ fullName: 1 });
};

const getCustomer = async (restaurantId, customerId) => {
  const customer = await Customer.findOne({ _id: customerId, restaurant: restaurantId, isDeleted: false })
    .populate('preferredBranch', 'name')
    .populate('favoriteItems', 'name price');
  if (!customer) throw ApiError.notFound('Customer file not found.');
  return customer;
};

const updateCustomer = async (restaurantId, customerId, updates) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, restaurant: restaurantId, isDeleted: false },
    updates,
    { new: true }
  );
  if (!customer) throw ApiError.notFound('Customer not found.');
  return customer;
};

const deleteCustomer = async (restaurantId, customerId) => {
  const customer = await Customer.findOne({ _id: customerId, restaurant: restaurantId, isDeleted: false });
  if (!customer) throw ApiError.notFound('Customer not found.');
  customer.isDeleted = true;
  customer.deletedAt = new Date();
  await customer.save();
  return { deleted: true };
};

// ==========================================
// LOYALTY RULES & OPERATIONS
// ==========================================

const TIER_MULTIPLIERS = {
  Bronze: 1.0,
  Silver: 1.2,
  Gold: 1.5,
  Platinum: 2.0,
};

const evaluateTier = (totalSpent) => {
  if (totalSpent >= 75000) return 'Platinum';
  if (totalSpent >= 30000) return 'Gold';
  if (totalSpent >= 10000) return 'Silver';
  return 'Bronze';
};

/**
 * Accrues loyalty points upon order checkout completion.
 * Increments Spent counters, evaluate membership upgrades.
 */
const earnPointsForOrder = async (restaurantId, customerId, order) => {
  try {
    if (!order || !customerId) return null;

    const Order = require('../order/order.model');
    const orderId = order._id || order;
    const freshOrder = await Order.findById(orderId);

    if (!freshOrder || freshOrder.loyaltyAccrued) {
      return { pointsEarned: 0, upgraded: false, alreadyAccrued: true };
    }

    const customer = await Customer.findOne({ _id: customerId, restaurant: restaurantId, isDeleted: false });
    if (!customer) return null;

    const multiplier = TIER_MULTIPLIERS[customer.membershipTier] || 1.0;
    const pointsEarned = Math.round((freshOrder.grandTotal || 0) * multiplier);

    customer.loyaltyPoints += pointsEarned;
    customer.totalSpent += (freshOrder.grandTotal || 0);
    customer.visitCount += 1;
    customer.averageOrderValue = Math.round((customer.totalSpent / customer.visitCount) * 100) / 100;

    // Auto Upgrade Evaluation
    const oldTier = customer.membershipTier;
    const newTier = evaluateTier(customer.totalSpent);
    customer.membershipTier = newTier;

    await customer.save();

    // Mark order as accrued to prevent double counting
    freshOrder.loyaltyAccrued = true;
    await freshOrder.save();

    // Log Loyalty history transaction
    await LoyaltyTransaction.create({
      restaurant: restaurantId,
      customer: customerId,
      transactionType: 'Earned',
      points: pointsEarned,
      order: freshOrder._id,
      reason: `Points earned from Order #${freshOrder.orderNumber} (Tier: ${oldTier}${oldTier !== newTier ? ` upgraded to ${newTier}` : ''})`,
    });

    return { pointsEarned, upgraded: oldTier !== newTier, newTier };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Loyalty] earnPointsForOrder failed:', err.stack || err);
    if (process.env.NODE_ENV !== 'production') {
      throw err;
    }
    return null;
  }
};

/**
 * Deducts points for order discount value (10 points = ₹1).
 */
const redeemPointsForOrder = async (restaurantId, customerId, pointsRequested, orderId = null) => {
  const customer = await Customer.findOne({ _id: customerId, restaurant: restaurantId, isDeleted: false });
  if (!customer) {
    throw ApiError.notFound('Customer not found.');
  }

  if (customer.loyaltyPoints < pointsRequested) {
    throw ApiError.badRequest(`Insufficient points. Customer only has ${customer.loyaltyPoints} points available.`);
  }

  // Deduct points
  customer.loyaltyPoints -= pointsRequested;
  await customer.save();

  // Calculate discount rupee amount (10 points = ₹1)
  const discountAmount = Math.round((pointsRequested / 10) * 100) / 100;

  // Log transaction
  await LoyaltyTransaction.create({
    restaurant: restaurantId,
    customer: customerId,
    transactionType: 'Redeemed',
    points: -pointsRequested,
    order: orderId,
    reason: `Redeemed ${pointsRequested} points for ₹${discountAmount} discount at checkout.`,
  });

  return discountAmount;
};

const awardBirthdayReward = async (restaurantId, customerId) => {
  const customer = await Customer.findOne({ _id: customerId, restaurant: restaurantId, isDeleted: false });
  if (!customer) throw ApiError.notFound('Customer not found.');

  customer.loyaltyPoints += 100;
  await customer.save();

  await LoyaltyTransaction.create({
    restaurant: restaurantId,
    customer: customerId,
    transactionType: 'Adjustment',
    points: 100,
    reason: `Birthday reward bonus points.`,
  });

  return customer;
};

const adjustPointsManually = async (restaurantId, customerId, points, reason) => {
  const customer = await Customer.findOne({ _id: customerId, restaurant: restaurantId, isDeleted: false });
  if (!customer) throw ApiError.notFound('Customer not found.');

  if (points < 0 && customer.loyaltyPoints < Math.abs(points)) {
    throw ApiError.badRequest(`Deduction exceeds customer points balance (${customer.loyaltyPoints} pts).`);
  }

  customer.loyaltyPoints += points;
  await customer.save();

  await LoyaltyTransaction.create({
    restaurant: restaurantId,
    customer: customerId,
    transactionType: 'Adjustment',
    points,
    reason: reason || 'Manual adjustment by admin.',
  });

  return customer;
};

const listLoyaltyTransactions = async (restaurantId, { customerId }) => {
  const query = { restaurant: restaurantId };
  if (customerId) query.customer = customerId;

  return LoyaltyTransaction.find(query)
    .populate('customer', 'fullName phoneNumber customerId')
    .sort({ createdAt: -1 });
};

// ==========================================
// ANALYTICS & REPORTS
// ==========================================

const getCustomerStats = async (restaurantId) => {
  const query = { restaurant: restaurantId, isDeleted: false };

  const [allCustomers, monthlyNew] = await Promise.all([
    Customer.find(query),
    // Created in the current calendar month
    Customer.find({
      ...query,
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    }),
  ]);

  let returningCount = 0;
  let loyaltyMembers = 0;

  allCustomers.forEach((c) => {
    if (c.visitCount > 1) returningCount += 1;
    if (c.loyaltyPoints > 0) loyaltyMembers += 1;
  });

  // Fetch top 5 customers by lifetime spend
  const topSpent = [...allCustomers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return {
    totalCustomers: allCustomers.length,
    newCustomersThisMonth: monthlyNew.length,
    returningCustomers: returningCount,
    loyaltyMembers,
    topCustomers: topSpent,
  };
};

const getCustomerReports = async (restaurantId) => {
  const query = { restaurant: restaurantId, isDeleted: false };
  const allCustomers = await Customer.find(query);

  const total = allCustomers.length;
  if (total === 0) {
    return {
      repeatRate: 0,
      averageCLV: 0,
      totalLoyaltyEarned: 0,
      growthTimeline: [],
    };
  }

  let returning = 0;
  let clvSum = 0;
  let pointsSum = 0;

  allCustomers.forEach((c) => {
    if (c.visitCount > 1) returning += 1;
    clvSum += c.totalSpent;
    pointsSum += c.loyaltyPoints;
  });

  // Calculate registrations by month for growth timeline
  const growthMap = {};
  allCustomers.forEach((c) => {
    const month = new Date(c.createdAt).toLocaleDateString([], { month: 'short', year: '2-digit' });
    growthMap[month] = (growthMap[month] || 0) + 1;
  });

  const timeline = Object.keys(growthMap).map((m) => ({
    period: m,
    registrations: growthMap[m],
  }));

  return {
    repeatRate: Math.round((returning / total) * 100 * 10) / 10,
    averageCLV: Math.round((clvSum / total) * 100) / 100,
    totalLoyaltyBalance: pointsSum,
    growthTimeline: timeline,
  };
};

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  earnPointsForOrder,
  redeemPointsForOrder,
  awardBirthdayReward,
  adjustPointsManually,
  listLoyaltyTransactions,
  getCustomerStats,
  getCustomerReports,
};
