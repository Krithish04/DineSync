const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const Customer = require('../customer/customer.model');
const Order = require('../order/order.model');
const Table = require('../table/table.model');
const otpService = require('../auth/otp.service');
const { signToken } = require('../../utils/jwt.util');
const { ROLES } = require('../../constants/roles.constant');

/**
 * Sends a 6-digit OTP code to the provided phone number.
 */
const sendCustomerOtp = asyncHandler(async (req, res) => {
  const restaurantId = req.params.restaurantId || req.body.restaurantId;
  const { phone, tableId } = req.body;

  if (!phone || phone.replace(/\D/g, '').length < 10) {
    throw ApiError.badRequest('A valid 10-digit mobile number is required.');
  }

  if (tableId) {
    const table = await Table.findOne({ _id: tableId, isDeleted: false });
    if (table) {
      if (table.isActive === false || table.status === 'Inactive') {
        throw ApiError.badRequest('This dining table is currently inactive and not accepting logins.');
      }
      if (table.status === 'Occupied' && table.currentHostPhone && table.currentHostPhone !== phone) {
        throw ApiError.badRequest(`Table #${table.tableNumber} is currently occupied by ${table.currentHostName || 'another diner'}. You can view the menu in View-Only mode.`);
      }
    }
  }

  const result = await otpService.createAndSendOtp({
    phone,
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
  const restaurantId = req.params.restaurantId || req.body.restaurantId;
  const { phone, code, fullName, tableId } = req.body;

  if (!phone || !code) {
    throw ApiError.badRequest('Phone number and verification OTP are required.');
  }

  if (tableId) {
    const table = await Table.findOne({ _id: tableId, isDeleted: false });
    if (table) {
      if (table.isActive === false || table.status === 'Inactive') {
        throw ApiError.badRequest('This dining table is currently inactive and not accepting logins.');
      }
      if (table.status === 'Occupied' && table.currentHostPhone && table.currentHostPhone !== phone) {
        throw ApiError.badRequest(`Table #${table.tableNumber} is currently occupied by ${table.currentHostName || 'another diner'}. You can view the menu in View-Only mode.`);
      }
    }
  }

  await otpService.verifyOtp({
    phone,
    restaurantId,
    purpose: otpService.OTP_PURPOSES.CUSTOMER_LOGIN,
    code,
  });

  // Find or create customer document for this restaurant + phone
  let customer = await Customer.findOne({
    restaurant: restaurantId,
    phoneNumber: phone,
    isDeleted: false,
  });

  if (!customer) {
    customer = await Customer.create({
      restaurant: restaurantId,
      phoneNumber: phone,
      fullName: fullName && fullName.trim() ? fullName.trim() : 'Guest',
    });
  } else if (fullName && fullName.trim() && customer.fullName === 'Guest') {
    customer.fullName = fullName.trim();
    await customer.save();
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
