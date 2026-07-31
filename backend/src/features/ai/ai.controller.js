const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const aiService = require('./ai.service');

const getAiDashboardOverview = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || null;
  const data = await aiService.getAiDashboardOverview(req.params.restaurantId, branchId);
  return new ApiResponse(200, data, 'AI Dashboard overview metrics fetched successfully').send(res);
});

const getSalesForecast = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || null;
  const data = await aiService.getSalesForecast(req.params.restaurantId, branchId);
  return new ApiResponse(200, data, 'Sales forecast predictions fetched successfully').send(res);
});

const getDemandForecast = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || null;
  const data = await aiService.getDemandForecast(req.params.restaurantId, branchId);
  return new ApiResponse(200, data, 'Demand forecast predictions fetched successfully').send(res);
});

const getInventoryForecast = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || null;
  const data = await aiService.getInventoryForecast(req.params.restaurantId, branchId);
  return new ApiResponse(200, data, 'Inventory forecast predictions fetched successfully').send(res);
});

const getCustomerRecommendations = asyncHandler(async (req, res) => {
  const data = await aiService.getCustomerRecommendations(req.params.restaurantId);
  return new ApiResponse(200, data, 'Customer recommendations fetched successfully').send(res);
});

const getSmartMenuRecommendations = asyncHandler(async (req, res) => {
  const data = await aiService.getSmartMenuRecommendations(req.params.restaurantId);
  return new ApiResponse(200, data, 'Smart menu recommendations fetched successfully').send(res);
});

const getWaitTimePrediction = asyncHandler(async (req, res) => {
  const data = await aiService.getWaitTimePrediction(req.params.restaurantId);
  return new ApiResponse(200, data, 'Wait time prediction fetched successfully').send(res);
});

const getFoodWastePrediction = asyncHandler(async (req, res) => {
  const data = await aiService.getFoodWastePrediction(req.params.restaurantId);
  return new ApiResponse(200, data, 'Food waste prediction fetched successfully').send(res);
});

const getSentimentAnalysis = asyncHandler(async (req, res) => {
  const data = await aiService.getSentimentAnalysis(req.params.restaurantId);
  return new ApiResponse(200, data, 'Customer sentiment analysis fetched successfully').send(res);
});

module.exports = {
  getAiDashboardOverview,
  getSalesForecast,
  getDemandForecast,
  getInventoryForecast,
  getCustomerRecommendations,
  getSmartMenuRecommendations,
  getWaitTimePrediction,
  getFoodWastePrediction,
  getSentimentAnalysis,
};
