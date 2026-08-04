const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const customerExperienceService = require('./customerExperience.service');

const resolveQrCode = asyncHandler(async (req, res) => {
  const { tableId, type } = req.query;
  const data = await customerExperienceService.resolveQrCode(req.params.restaurantId, { tableId, type });
  return new ApiResponse(200, data, 'QR code resolved successfully').send(res);
});

const getPublicMenu = asyncHandler(async (req, res) => {
  const { categoryId, dietary, search, isPopular, isFeatured } = req.query;
  const data = await customerExperienceService.getPublicMenu(req.params.restaurantId, {
    categoryId, dietary, search, isPopular, isFeatured,
  });
  return new ApiResponse(200, data, 'Public digital menu fetched successfully').send(res);
});

const placeCustomerOrder = asyncHandler(async (req, res) => {
  const order = await customerExperienceService.placeCustomerOrder(req.params.restaurantId, req.body);
  return new ApiResponse(201, { order }, 'Customer order placed successfully').send(res);
});

const claimTableHost = asyncHandler(async (req, res) => {
  const table = await customerExperienceService.claimTableHost(req.params.restaurantId, req.body);
  return new ApiResponse(200, { table }, 'Table host claimed successfully').send(res);
});

const releaseTableHost = asyncHandler(async (req, res) => {
  const table = await customerExperienceService.releaseTableHost(req.params.restaurantId, req.body);
  return new ApiResponse(200, { table }, 'Table host released successfully').send(res);
});

const trackLiveOrder = asyncHandler(async (req, res) => {
  const data = await customerExperienceService.trackLiveOrder(req.params.restaurantId, req.params.orderId);
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
  const feedback = await customerExperienceService.submitCustomerFeedback(req.params.restaurantId, req.body);
  return new ApiResponse(201, { feedback }, 'Customer feedback submitted successfully').send(res);
});

const requestAssistance = asyncHandler(async (req, res) => {
  const data = await customerExperienceService.requestAssistance(req.params.restaurantId, req.body);
  return new ApiResponse(200, data, 'Assistance requested successfully').send(res);
});

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
