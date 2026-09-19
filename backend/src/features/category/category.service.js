const Category = require('./category.model');
const ApiError = require('../../utils/ApiError');
const mongoose = require('mongoose');
const { getCache, setCache, clearCachePattern } = require('../../config/redis.config');

/**
 * Creates a new category for a restaurant tenant.
 */
const createCategory = async (restaurantId, payload) => {
  const existingByName = await Category.findOne({
    restaurant: restaurantId,
    name: { $regex: new RegExp(`^${payload.name}$`, 'i') },
  });

  if (existingByName) {
    throw ApiError.conflict('A category with this name already exists.');
  }

  const category = await Category.create({
    ...payload,
    restaurant: restaurantId,
  });

  await clearCachePattern(`category:${restaurantId}:*`);

  return category;
};

/**
 * Lists categories for a restaurant. Supports optional pagination, search, and active filters.
 */
const listCategories = async (restaurantId, params = {}) => {
  const { page, limit, search = '', isActive } = params;

  const cacheKey = `category:${restaurantId}:list:${JSON.stringify(params)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const query = { restaurant: restaurantId };

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  let response;
  // If page/limit are not provided, return all categories sorted by displayOrder
  if (!page && !limit) {
    const items = await Category.find(query).sort({ displayOrder: 1, name: 1 });
    response = { items, pagination: null };
  } else {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Category.find(query)
        .sort({ displayOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit),
      Category.countDocuments(query),
    ]);

    response = {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  await setCache(cacheKey, response, 3600);
  return response;
};

/**
 * Fetches a single category.
 */
const getCategory = async (restaurantId, categoryId) => {
  const cacheKey = `category:${restaurantId}:item:${categoryId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const category = await Category.findOne({ _id: categoryId, restaurant: restaurantId });
  if (!category) {
    throw ApiError.notFound('Category not found.');
  }

  await setCache(cacheKey, category, 3600);
  return category;
};

/**
 * Updates a category.
 */
const updateCategory = async (restaurantId, categoryId, updates) => {
  const category = await Category.findOne({ _id: categoryId, restaurant: restaurantId });
  if (!category) {
    throw ApiError.notFound('Category not found.');
  }

  if (updates.name && updates.name.toLowerCase() !== category.name.toLowerCase()) {
    const existing = await Category.findOne({
      restaurant: restaurantId,
      name: { $regex: new RegExp(`^${updates.name}$`, 'i') },
      _id: { $ne: categoryId },
    });
    if (existing) {
      throw ApiError.conflict('Another category with this name already exists.');
    }
  }

  Object.assign(category, updates);
  await category.save();

  await clearCachePattern(`category:${restaurantId}:*`);

  return category;
};

/**
 * Deletes a category. Prevents deletion if menu items belong to it.
 */
const deleteCategory = async (restaurantId, categoryId) => {
  const category = await Category.findOne({ _id: categoryId, restaurant: restaurantId });
  if (!category) {
    throw ApiError.notFound('Category not found.');
  }

  // Lazy require MenuItem model to avoid circular dependency
  const MenuItem = mongoose.model('MenuItem');
  if (MenuItem) {
    const hasMenuItems = await MenuItem.exists({ category: categoryId, restaurant: restaurantId });
    if (hasMenuItems) {
      throw ApiError.conflict('Cannot delete category because it contains active menu items.');
    }
  }

  await Category.deleteOne({ _id: categoryId, restaurant: restaurantId });
  await clearCachePattern(`category:${restaurantId}:*`);
};

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
