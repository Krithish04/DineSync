const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const tenantService = require('./tenant.service');

const getPublicBySlug = asyncHandler(async (req, res) => {
  const restaurant = await tenantService.getPublicBySlug(req.params.slug);
  return new ApiResponse(200, { restaurant }, 'Restaurant fetched successfully').send(res);
});

const listAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const result = await tenantService.listAll({ page, limit });
  return new ApiResponse(200, result, 'Restaurants fetched successfully').send(res);
});

const getById = asyncHandler(async (req, res) => {
  const restaurant = await tenantService.getById(req.params.restaurantId, req.user);
  return new ApiResponse(200, { restaurant }, 'Restaurant fetched successfully').send(res);
});

const deactivate = asyncHandler(async (req, res) => {
  const restaurant = await tenantService.deactivate(req.params.restaurantId, req.user);
  return new ApiResponse(200, { restaurant }, 'Restaurant deactivated successfully').send(res);
});

// --- Profile ---
const getProfile = asyncHandler(async (req, res) => {
  const profile = await tenantService.getProfile(req.params.restaurantId, req.user);
  return new ApiResponse(200, { profile }, 'Restaurant profile fetched successfully').send(res);
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await tenantService.updateProfile(req.params.restaurantId, req.body, req.user);
  return new ApiResponse(200, { profile }, 'Restaurant profile updated successfully').send(res);
});

// --- Settings ---
const getSettings = asyncHandler(async (req, res) => {
  const settings = await tenantService.getSettings(req.params.restaurantId, req.user);
  return new ApiResponse(200, { settings }, 'Restaurant settings fetched successfully').send(res);
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await tenantService.updateSettings(
    req.params.restaurantId,
    req.body,
    req.user
  );
  return new ApiResponse(200, { settings }, 'Restaurant settings updated successfully').send(res);
});

// --- GST ---
const getGst = asyncHandler(async (req, res) => {
  const gst = await tenantService.getGst(req.params.restaurantId, req.user);
  return new ApiResponse(200, { gst }, 'GST details fetched successfully').send(res);
});

const updateGst = asyncHandler(async (req, res) => {
  const gst = await tenantService.updateGst(req.params.restaurantId, req.body, req.user);
  return new ApiResponse(200, { gst }, 'GST details updated successfully').send(res);
});

// --- Opening hours ---
const getOpeningHours = asyncHandler(async (req, res) => {
  const openingHours = await tenantService.getOpeningHours(req.params.restaurantId, req.user);
  return new ApiResponse(200, { openingHours }, 'Opening hours fetched successfully').send(res);
});

const updateOpeningHours = asyncHandler(async (req, res) => {
  const openingHours = await tenantService.updateOpeningHours(
    req.params.restaurantId,
    req.body.openingHours,
    req.user
  );
  return new ApiResponse(200, { openingHours }, 'Opening hours updated successfully').send(res);
});

module.exports = {
  getPublicBySlug,
  listAll,
  getById,
  deactivate,
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
  getGst,
  updateGst,
  getOpeningHours,
  updateOpeningHours,
};
