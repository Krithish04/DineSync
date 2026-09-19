const MenuItem = require('./menuItem.model');
const Category = require('../category/category.model');
const Restaurant = require('../tenant/tenant.model');
const ApiError = require('../../utils/ApiError');
const { getCache, setCache, clearCachePattern } = require('../../config/redis.config');

/**
 * Helper to validate & sanitize kitchenStation against restaurant's configured settings
 */
const getValidKitchenStation = async (restaurantId, targetStation) => {
  const restaurant = await Restaurant.findById(restaurantId);
  const stations = restaurant?.settings?.kitchenStations?.length > 0
    ? restaurant.settings.kitchenStations
    : ['Main Kitchen', 'Tandoor', 'Bar', 'Dessert', 'Beverage'];

  if (targetStation && stations.includes(targetStation)) {
    return targetStation;
  }
  return stations[0] || 'Main Kitchen';
};

/**
 * Creates a new menu item.
 */
const createMenuItem = async (restaurantId, payload) => {
  // Verify category exists and belongs to the restaurant
  const categoryExists = await Category.findOne({
    _id: payload.category,
    restaurant: restaurantId,
  });

  if (!categoryExists) {
    throw ApiError.notFound('Category not found.');
  }

  // Check for duplicate name
  const existingByName = await MenuItem.findOne({
    restaurant: restaurantId,
    name: { $regex: new RegExp(`^${payload.name}$`, 'i') },
  });

  if (existingByName) {
    throw ApiError.conflict('A menu item with this name already exists.');
  }

  // Validate kitchenStation against restaurant settings
  payload.kitchenStation = await getValidKitchenStation(restaurantId, payload.kitchenStation);

  const menuItem = await MenuItem.create({
    ...payload,
    restaurant: restaurantId,
  });

  await clearCachePattern(`menu:${restaurantId}:*`);

  return menuItem;
};

/**
 * Lists menu items with filters, search, sorting, and pagination.
 */
const listMenuItems = async (
  restaurantId,
  params = {}
) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    category,
    dietaryType,
    isAvailable,
    isFeatured,
    isRecommended,
    sortBy = 'name',
    sortOrder = 'asc',
  } = params;

  const cacheKey = `menu:${restaurantId}:list:${JSON.stringify(params)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const query = { restaurant: restaurantId };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { shortDescription: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) {
    query.category = category;
  }

  if (dietaryType) {
    query.dietaryType = dietaryType;
  }

  if (isAvailable !== undefined) {
    query.isAvailable = isAvailable;
  }

  if (isFeatured !== undefined) {
    query.isFeatured = isFeatured;
  }

  if (isRecommended !== undefined) {
    query.isRecommended = isRecommended;
  }

  const skip = (page - 1) * limit;

  // Build sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [items, total] = await Promise.all([
    MenuItem.find(query)
      .populate('category', 'name isActive')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    MenuItem.countDocuments(query),
  ]);

  const response = {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  await setCache(cacheKey, response, 3600);

  return response;
};

/**
 * Fetches a single menu item.
 */
const getMenuItem = async (restaurantId, menuItemId) => {
  const cacheKey = `menu:${restaurantId}:item:${menuItemId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const menuItem = await MenuItem.findOne({ _id: menuItemId, restaurant: restaurantId }).populate(
    'category',
    'name isActive'
  );

  if (!menuItem) {
    throw ApiError.notFound('Menu item not found.');
  }

  await setCache(cacheKey, menuItem, 3600);

  return menuItem;
};

/**
 * Updates an existing menu item.
 */
const updateMenuItem = async (restaurantId, menuItemId, updates) => {
  const menuItem = await MenuItem.findOne({ _id: menuItemId, restaurant: restaurantId });

  if (!menuItem) {
    throw ApiError.notFound('Menu item not found.');
  }

  if (updates.category && updates.category !== menuItem.category.toString()) {
    const categoryExists = await Category.findOne({
      _id: updates.category,
      restaurant: restaurantId,
    });
    if (!categoryExists) {
      throw ApiError.notFound('Category not found.');
    }
  }

  if (updates.name && updates.name.toLowerCase() !== menuItem.name.toLowerCase()) {
    const existing = await MenuItem.findOne({
      restaurant: restaurantId,
      name: { $regex: new RegExp(`^${updates.name}$`, 'i') },
      _id: { $ne: menuItemId },
    });
    if (existing) {
      throw ApiError.conflict('Another menu item with this name already exists.');
    }
  }

  if (updates.kitchenStation) {
    updates.kitchenStation = await getValidKitchenStation(restaurantId, updates.kitchenStation);
  }

  Object.assign(menuItem, updates);
  await menuItem.save();

  // Populate category field for the updated document returned
  await menuItem.populate('category', 'name isActive');

  await clearCachePattern(`menu:${restaurantId}:*`);

  return menuItem;
};

/**
 * Deletes a menu item.
 */
const deleteMenuItem = async (restaurantId, menuItemId) => {
  const result = await MenuItem.deleteOne({ _id: menuItemId, restaurant: restaurantId });
  if (result.deletedCount === 0) {
    throw ApiError.notFound('Menu item not found.');
  }
  await clearCachePattern(`menu:${restaurantId}:*`);
};

module.exports = {
  createMenuItem,
  listMenuItems,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
