const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const customerService = require('./customer.service');
const Order = require('../order/order.model');
const Reservation = require('../reservation/reservation.model');

const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.params.restaurantId, req.body);
  return new ApiResponse(201, { customer }, 'Customer registered successfully').send(res);
});

const listCustomers = asyncHandler(async (req, res) => {
  const search = req.query.search || '';
  const tier = req.query.tier || undefined;

  const customers = await customerService.listCustomers(req.params.restaurantId, { search, tier });
  return new ApiResponse(200, { customers }, 'Customers fetched successfully').send(res);
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomer(req.params.restaurantId, req.params.customerId);
  
  // Also fetch order and reservation histories for profile timeline
  const [orders, reservations] = await Promise.all([
    Order.find({ customer: req.params.customerId, restaurant: req.params.restaurantId, isDeleted: false })
      .populate('branch', 'name')
      .populate('table', 'tableNumber')
      .sort({ createdAt: -1 }),
    Reservation.find({ customerPhone: customer.phoneNumber, restaurant: req.params.restaurantId, isDeleted: false })
      .populate('table', 'tableNumber')
      .sort({ reservationDate: -1, reservationTime: -1 }),
  ]);

  return new ApiResponse(200, { customer, orders, reservations }, 'Customer profile details fetched successfully').send(res);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(
    req.params.restaurantId,
    req.params.customerId,
    req.body
  );
  return new ApiResponse(200, { customer }, 'Customer updated successfully').send(res);
});

const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.params.restaurantId, req.params.customerId);
  return new ApiResponse(200, null, 'Customer deleted successfully').send(res);
});

const awardBirthdayReward = asyncHandler(async (req, res) => {
  const customer = await customerService.awardBirthdayReward(req.params.restaurantId, req.params.customerId);
  return new ApiResponse(200, { customer }, 'Birthday reward points awarded successfully').send(res);
});

const adjustPoints = asyncHandler(async (req, res) => {
  const customer = await customerService.adjustPointsManually(
    req.params.restaurantId,
    req.params.customerId,
    req.body.points,
    req.body.reason
  );
  return new ApiResponse(200, { customer }, 'Loyalty points adjusted successfully').send(res);
});

const listLoyaltyTransactions = asyncHandler(async (req, res) => {
  const customerId = req.query.customer || undefined;
  const transactions = await customerService.listLoyaltyTransactions(req.params.restaurantId, { customerId });
  return new ApiResponse(200, { transactions }, 'Loyalty history fetched successfully').send(res);
});

const getCustomerStats = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || undefined;
  const stats = await customerService.getCustomerStats(req.params.restaurantId, branchId);
  return new ApiResponse(200, { stats }, 'Customer stats fetched successfully').send(res);
});

const getCustomerReports = asyncHandler(async (req, res) => {
  const reports = await customerService.getCustomerReports(req.params.restaurantId);
  return new ApiResponse(200, { reports }, 'Customer growth reports fetched successfully').send(res);
});

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  awardBirthdayReward,
  adjustPoints,
  listLoyaltyTransactions,
  getCustomerStats,
  getCustomerReports,
};
