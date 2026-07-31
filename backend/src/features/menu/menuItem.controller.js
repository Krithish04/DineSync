const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const menuItemService = require('./menuItem.service');

const createMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await menuItemService.createMenuItem(req.params.restaurantId, req.body);
  return new ApiResponse(201, { menuItem }, 'Menu item created successfully').send(res);
});

const listMenuItems = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  const category = req.query.category || undefined;
  const dietaryType = req.query.dietaryType || undefined;
  const isAvailable = req.query.isAvailable !== undefined ? req.query.isAvailable === 'true' : undefined;
  const isFeatured = req.query.isFeatured !== undefined ? req.query.isFeatured === 'true' : undefined;
  const isRecommended = req.query.isRecommended !== undefined ? req.query.isRecommended === 'true' : undefined;
  const branchId = req.query.branchId || undefined;
  const sortBy = req.query.sortBy || 'name';
  const sortOrder = req.query.sortOrder || 'asc';

  const result = await menuItemService.listMenuItems(req.params.restaurantId, {
    page,
    limit,
    search,
    category,
    dietaryType,
    isAvailable,
    isFeatured,
    isRecommended,
    branchId,
    sortBy,
    sortOrder,
  });

  return new ApiResponse(200, result, 'Menu items fetched successfully').send(res);
});

const getMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await menuItemService.getMenuItem(req.params.restaurantId, req.params.menuItemId);
  return new ApiResponse(200, { menuItem }, 'Menu item fetched successfully').send(res);
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await menuItemService.updateMenuItem(
    req.params.restaurantId,
    req.params.menuItemId,
    req.body
  );
  return new ApiResponse(200, { menuItem }, 'Menu item updated successfully').send(res);
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  await menuItemService.deleteMenuItem(req.params.restaurantId, req.params.menuItemId);
  return new ApiResponse(200, null, 'Menu item deleted successfully').send(res);
});

module.exports = {
  createMenuItem,
  listMenuItems,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
