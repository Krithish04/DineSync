const mongoose = require('mongoose');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const customerExperienceService = require('./customerExperience.service');

const validateObjectId = (id, name = 'ID') => {
  if (id && (!mongoose.Types.ObjectId.isValid(id) || typeof id !== 'string')) {
    throw ApiError.badRequest(`Invalid ${name} format.`);
  }
};

const resolveQrCode = asyncHandler(async (req, res) => {
  const { tableId, type } = req.query;
  validateObjectId(req.params.restaurantId, 'restaurantId');
  validateObjectId(tableId, 'tableId');

  const data = await customerExperienceService.resolveQrCode(req.params.restaurantId, { tableId, type });
  return new ApiResponse(200, data, 'QR code resolved successfully').send(res);
});

const getPublicMenu = asyncHandler(async (req, res) => {
  const { categoryId, dietary, search, isPopular, isFeatured } = req.query;
  validateObjectId(req.params.restaurantId, 'restaurantId');
  validateObjectId(categoryId, 'categoryId');

  const data = await customerExperienceService.getPublicMenu(req.params.restaurantId, {
    categoryId, dietary, search, isPopular, isFeatured,
  });
  return new ApiResponse(200, data, 'Public digital menu fetched successfully').send(res);
});

const getActiveTableSession = asyncHandler(async (req, res) => {
  validateObjectId(req.params.restaurantId, 'restaurantId');
  validateObjectId(req.params.tableId, 'tableId');

  const hostToken = req.cookies?.hostToken || req.headers['x-host-token'];
  const data = await customerExperienceService.getActiveTableSession(req.params.restaurantId, req.params.tableId, hostToken);
  return new ApiResponse(200, data, 'Active table session fetched successfully').send(res);
});

const placeCustomerOrder = asyncHandler(async (req, res) => {
  const customerId = req.user ? req.user.id : null;
  const hostToken = req.cookies?.hostToken || req.headers['x-host-token'] || req.body.hostToken;
  const payload = {
    ...req.body,
    hostToken,
  };
  const order = await customerExperienceService.placeCustomerOrder(req.params.restaurantId, payload, customerId);
  return new ApiResponse(201, { order }, 'Customer order placed successfully').send(res);
});

const claimTableHost = asyncHandler(async (req, res) => {
  const data = await customerExperienceService.claimTableHost(req.params.restaurantId, req.body, req.user);
  if (data?.hostToken) {
    res.cookie('hostToken', data.hostToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }
  return new ApiResponse(200, data, 'Table session claimed successfully').send(res);
});

const settleTableSession = asyncHandler(async (req, res) => {
  const data = await customerExperienceService.settleTableSession(req.params.restaurantId, req.params.sessionId, req.body);
  res.clearCookie('hostToken');
  return new ApiResponse(200, data, 'Table session settled successfully').send(res);
});

const releaseTableSession = asyncHandler(async (req, res) => {
  const data = await customerExperienceService.releaseTableSession(req.params.restaurantId, {
    sessionId: req.params.sessionId,
    tableId: req.body?.tableId || req.query?.tableId,
  });
  res.clearCookie('hostToken');
  return new ApiResponse(200, data, 'Table session released successfully').send(res);
});

const releaseTableHost = asyncHandler(async (req, res) => {
  const data = await customerExperienceService.releaseTableHost(req.params.restaurantId, req.body);
  res.clearCookie('hostToken');
  return new ApiResponse(200, data, 'Table host released successfully').send(res);
});

const trackLiveOrder = asyncHandler(async (req, res) => {
  const customerId = req.user ? req.user.id : null;
  const hostToken = req.cookies?.hostToken || req.headers['x-host-token'];
  const data = await customerExperienceService.trackLiveOrder(req.params.restaurantId, req.params.orderId, {
    customerId,
    hostToken,
  });
  return new ApiResponse(200, data, 'Order live tracking details fetched').send(res);
});

const payCustomerOrder = asyncHandler(async (req, res) => {
  const data = await customerExperienceService.payCustomerOrder(req.params.restaurantId, req.params.orderId, req.body);
  return new ApiResponse(200, data, 'Customer self-checkout payment completed').send(res);
});

const cancelCustomerOrder = asyncHandler(async (req, res) => {
  const data = await customerExperienceService.cancelCustomerOrder(req.params.restaurantId, req.params.orderId);
  return new ApiResponse(200, data, 'Customer order cancelled successfully').send(res);
});

const submitCustomerFeedback = asyncHandler(async (req, res) => {
  const customerId = req.user ? (req.user.id || req.user._id) : null;
  const feedback = await customerExperienceService.submitCustomerFeedback(req.params.restaurantId, req.body, customerId);
  return new ApiResponse(201, { feedback }, 'Customer feedback submitted successfully').send(res);
});

const requestAssistance = asyncHandler(async (req, res) => {
  const data = await customerExperienceService.requestAssistance(req.params.restaurantId, req.body);
  return new ApiResponse(200, data, 'Assistance requested successfully').send(res);
});

const getActiveTableOrders = asyncHandler(async (req, res) => {
  const hostToken = req.cookies?.hostToken || req.headers['x-host-token'];
  const data = await customerExperienceService.getActiveTableOrders(req.params.restaurantId, req.params.tableId, hostToken);
  return new ApiResponse(200, data, 'Active table orders fetched successfully').send(res);
});

const createCustomerReservation = asyncHandler(async (req, res) => {
  const customerId = req.user ? req.user.id : null;
  const data = await customerExperienceService.createCustomerReservation(req.params.restaurantId, req.body, customerId);
  return new ApiResponse(201, data, 'Table reservation request submitted successfully').send(res);
});

const getMyCustomerReservations = asyncHandler(async (req, res) => {
  const customerId = req.user ? req.user.id : null;
  const data = await customerExperienceService.getMyCustomerReservations(req.params.restaurantId, customerId);
  return new ApiResponse(200, data, 'Customer reservations fetched successfully').send(res);
});

const checkTableReservationLock = asyncHandler(async (req, res) => {
  const aiReservationService = require('../reservation/aiReservation.service');
  const data = await aiReservationService.checkTableLockStatus(req.params.restaurantId, req.params.tableId);
  return new ApiResponse(200, data, 'Table reservation lock status fetched').send(res);
});

const verifyReservationPhone = asyncHandler(async (req, res) => {
  const aiReservationService = require('../reservation/aiReservation.service');
  const data = await aiReservationService.verifyGuestPhoneToUnlock(req.params.restaurantId, {
    tableId: req.params.tableId,
    phoneNumber: req.body.phoneNumber,
  });
  return new ApiResponse(200, data, 'Reservation verified and digital menu unlocked').send(res);
});

const requestHostHandoff = asyncHandler(async (req, res) => {
  const customerExperienceService = require('./customerExperience.service');
  const data = await customerExperienceService.requestHostHandoff(
    req.params.restaurantId,
    req.body,
    req.user || null
  );
  return new ApiResponse(200, data, 'Host transfer request processed').send(res);
});

const getTableSessionAuditLogs = asyncHandler(async (req, res) => {
  const customerExperienceService = require('./customerExperience.service');
  const data = await customerExperienceService.getTableSessionAuditLogs(
    req.params.restaurantId,
    req.query.tableId || null
  );
  return new ApiResponse(200, data, 'Table session audit logs fetched successfully').send(res);
});

const requestTableAccess = asyncHandler(async (req, res) => {
  const customerExperienceService = require('./customerExperience.service');
  const data = await customerExperienceService.requestTableAccess(
    req.params.restaurantId,
    req.params.tableId,
    req.body
  );
  return new ApiResponse(200, data, 'Table access request sent successfully').send(res);
});

const respondTableAccess = asyncHandler(async (req, res) => {
  const customerExperienceService = require('./customerExperience.service');
  const data = await customerExperienceService.respondTableAccess(
    req.params.restaurantId,
    req.params.tableId,
    req.body
  );
  return new ApiResponse(200, data, 'Table access decision processed successfully').send(res);
});

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
  checkTableReservationLock,
  verifyReservationPhone,
  requestHostHandoff,
  getTableSessionAuditLogs,
  requestTableAccess,
  respondTableAccess,
};
