const mongoose = require('mongoose');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const Customer = require('../customer/customer.model');
const Order = require('../order/order.model');
const Table = require('../table/table.model');
const TableSession = require('../table/tableSession.model');
const Restaurant = require('../tenant/tenant.model');
const { evaluateOperatingStatus } = require('../../utils/schedule.util');
const otpService = require('../auth/otp.service');
const { signToken } = require('../../utils/jwt.util');
const { ROLES } = require('../../constants/roles.constant');

/**
 * Helper to validate restaurant ObjectId
 */
const getValidRestaurantId = (rawId) => {
  if (!rawId || rawId === 'null' || rawId === 'undefined') return null;
  return mongoose.Types.ObjectId.isValid(rawId) ? rawId : null;
};

/**
 * Sends a 6-digit OTP code to the provided phone number.
 */
const sendCustomerOtp = asyncHandler(async (req, res) => {
  const rawRestId = req.params.restaurantId || req.body.restaurantId;
  const restaurantId = getValidRestaurantId(rawRestId);
  const { phone, tableId } = req.body;

  if (!phone || phone.replace(/\D/g, '').length < 10) {
    throw ApiError.badRequest('A valid 10-digit mobile number is required.');
  }

  const cleanPhone = otpService.normalizePhone(phone) || phone.trim();

  // Operating hours check: Block login & OTP when restaurant is closed
  let targetRestId = restaurantId;
  if (!targetRestId && tableId) {
    const tDoc = await Table.findById(tableId).select('restaurant').lean();
    if (tDoc) targetRestId = tDoc.restaurant;
  }
  if (targetRestId) {
    const restDoc = await Restaurant.findById(targetRestId).select('openingHours').lean();
    if (restDoc?.openingHours && restDoc.openingHours.length > 0) {
      const operatingStatus = evaluateOperatingStatus(restDoc.openingHours);
      if (operatingStatus.isClosed) {
        throw ApiError.badRequest(operatingStatus.statusMessage || 'The restaurant is currently closed. Table ordering and logins are unavailable during off-hours.');
      }
    }
  }

  if (tableId) {
    const table = await Table.findOne({ _id: tableId, isDeleted: false });
    if (table) {
      if (table.isActive === false || table.status === 'Inactive') {
        throw ApiError.badRequest('This dining table is currently inactive and not accepting logins.');
      }
      if (table.status === 'Occupied') {
        const activeSession = await TableSession.findOne({ table: table._id, status: 'active' });
        if (!activeSession) {
          // Stale table status: Auto-clear stale occupied status since no active session exists
          table.status = 'Available';
          table.currentHostName = '';
          table.currentHostPhone = '';
          await table.save();
        } else if (activeSession.hostPhone && activeSession.hostPhone !== cleanPhone && table.currentHostPhone && table.currentHostPhone !== cleanPhone) {
          throw ApiError.badRequest(`Table #${table.tableNumber} is currently occupied by ${activeSession.hostName || table.currentHostName || 'another diner'}. You can view the menu in View-Only mode.`);
        }
      }
    }
  }

  const result = await otpService.createAndSendOtp({
    phone: cleanPhone,
    restaurantId,
    purpose: otpService.OTP_PURPOSES.CUSTOMER_LOGIN,
  });

  return new ApiResponse(
    200,
    { expiresAt: result.expiresAt, devOtp: result.devOtp },
    'Verification OTP sent successfully.'
  ).send(res);
});

/**
 * Verifies OTP code, finds or creates Customer record, and returns signed JWT token.
 */
const verifyCustomerOtp = asyncHandler(async (req, res) => {
  const rawRestId = req.params.restaurantId || req.body.restaurantId;
  const restaurantId = getValidRestaurantId(rawRestId);
  const { phone, code, fullName, tableId } = req.body;

  if (!phone || !code) {
    throw ApiError.badRequest('Phone number and verification OTP are required.');
  }

  const cleanPhone = otpService.normalizePhone(phone) || phone.trim();

  // Operating hours check: Block login & OTP when restaurant is closed
  let targetRestId = restaurantId;
  if (!targetRestId && tableId) {
    const tDoc = await Table.findById(tableId).select('restaurant').lean();
    if (tDoc) targetRestId = tDoc.restaurant;
  }
  if (targetRestId) {
    const restDoc = await Restaurant.findById(targetRestId).select('openingHours').lean();
    if (restDoc?.openingHours && restDoc.openingHours.length > 0) {
      const operatingStatus = evaluateOperatingStatus(restDoc.openingHours);
      if (operatingStatus.isClosed) {
        throw ApiError.badRequest(operatingStatus.statusMessage || 'The restaurant is currently closed. Table ordering and logins are unavailable during off-hours.');
      }
    }
  }

  if (tableId) {
    const table = await Table.findOne({ _id: tableId, isDeleted: false });
    if (table) {
      if (table.isActive === false || table.status === 'Inactive') {
        throw ApiError.badRequest('This dining table is currently inactive and not accepting logins.');
      }
      if (table.status === 'Occupied') {
        const activeSession = await TableSession.findOne({ table: table._id, status: 'active' });
        if (!activeSession) {
          // Stale table status: Auto-clear stale occupied status since no active session exists
          table.status = 'Available';
          table.currentHostName = '';
          table.currentHostPhone = '';
          await table.save();
        } else if (activeSession.hostPhone && activeSession.hostPhone !== cleanPhone && table.currentHostPhone && table.currentHostPhone !== cleanPhone) {
          throw ApiError.badRequest(`Table #${table.tableNumber} is currently occupied by ${activeSession.hostName || table.currentHostName || 'another diner'}. You can view the menu in View-Only mode.`);
        }
      }
    }
  }

  await otpService.verifyOtp({
    phone: cleanPhone,
    restaurantId,
    purpose: otpService.OTP_PURPOSES.CUSTOMER_LOGIN,
    code,
  });

  // Find or create customer document for this restaurant + phone (including restoring soft-deleted accounts)
  const customerQuery = { phoneNumber: cleanPhone };
  if (restaurantId) {
    customerQuery.restaurant = restaurantId;
  }
  let customer = await Customer.findOne(customerQuery);

  if (!customer) {
    const customerPayload = {
      phoneNumber: cleanPhone,
      fullName: fullName && fullName.trim() ? fullName.trim() : 'Guest',
    };
    if (restaurantId) {
      customerPayload.restaurant = restaurantId;
    }
    customer = await Customer.create(customerPayload);
  } else {
    let needsSave = false;
    if (customer.isDeleted) {
      customer.isDeleted = false;
      customer.deletedAt = null;
      needsSave = true;
    }
    if (fullName && fullName.trim() && (!customer.fullName || customer.fullName === 'Guest')) {
      customer.fullName = fullName.trim();
      needsSave = true;
    }
    if (needsSave) {
      await customer.save();
    }
  }

  const token = signToken({
    id: customer._id.toString(),
    role: ROLES.CUSTOMER,
    restaurantId: customer.restaurant ? customer.restaurant.toString() : restaurantId,
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return new ApiResponse(
    200,
    {
      token,
      customer: {
        _id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        email: customer.email,
        membershipTier: customer.membershipTier,
        loyaltyPoints: customer.loyaltyPoints,
        visitCount: customer.visitCount,
        totalSpent: customer.totalSpent,
      },
    },
    'Customer authentication successful.'
  ).send(res);
});

/**
 * Returns current authenticated Customer's profile & loyalty status.
 */
const getCustomerProfile = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const customer = await Customer.findById(customerId).select(
    '-isDeleted -deletedAt'
  );

  if (!customer) {
    throw ApiError.notFound('Customer profile not found.');
  }

  return new ApiResponse(200, { customer }, 'Customer profile fetched successfully.').send(res);
});

/**
 * Returns current authenticated Customer's paginated order history.
 */
const getCustomerOrders = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const restaurantId = req.params.restaurantId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const query = {
    customer: customerId,
    ...(restaurantId ? { restaurant: restaurantId } : {}),
  };

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('table', 'tableNumber')
      .lean(),
    Order.countDocuments(query),
  ]);

  return new ApiResponse(
    200,
    {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
    'Customer order history fetched successfully.'
  ).send(res);
});

module.exports = {
  sendCustomerOtp,
  verifyCustomerOtp,
  getCustomerProfile,
  getCustomerOrders,
};
