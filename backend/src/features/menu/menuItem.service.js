const MenuItem = require('./menuItem.model');
const Category = require('../category/category.model');
const ApiError = require('../../utils/ApiError');

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

  const menuItem = await MenuItem.create({
    ...payload,
    restaurant: restaurantId,
  });

  return menuItem;
};

/**
 * Lists menu items with filters, search, sorting, and pagination.
 */
const listMenuItems = async (
  restaurantId,
  {
    page = 1,
    limit = 20,
    search = '',
    category,
    dietaryType,
    isAvailable,
    isFeatured,
    isRecommended,
    branchId,
    sortBy = 'name',
    sortOrder = 'asc',
  } = {}
) => {
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

  // Branch isolation check: If branchId is specified, return items available in that specific branch
  // or items where availableBranches is empty (meaning available in all branches)
  if (branchId) {
    query.$or = [
      { availableBranches: branchId },
      { availableBranches: { $size: 0 } },
    ];
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

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Fetches a single menu item.
 */
const getMenuItem = async (restaurantId, menuItemId) => {
  const menuItem = await MenuItem.findOne({ _id: menuItemId, restaurant: restaurantId }).populate(
    'category',
    'name isActive'
  );

  if (!menuItem) {
    throw ApiError.notFound('Menu item not found.');
  }

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

  Object.assign(menuItem, updates);
  await menuItem.save();

  // Populate category field for the updated document returned
  await menuItem.populate('category', 'name isActive');

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
};

module.exports = {
  createMenuItem,
  listMenuItems,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
