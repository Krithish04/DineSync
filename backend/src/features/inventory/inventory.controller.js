const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const inventoryService = require('./inventory.service');

// Suppliers
const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await inventoryService.createSupplier(req.params.restaurantId, req.body);
  return new ApiResponse(201, { supplier }, 'Supplier created successfully').send(res);
});

const listSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await inventoryService.listSuppliers(req.params.restaurantId);
  return new ApiResponse(200, { suppliers }, 'Suppliers fetched successfully').send(res);
});

const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await inventoryService.getSupplier(req.params.restaurantId, req.params.supplierId);
  return new ApiResponse(200, { supplier }, 'Supplier details fetched successfully').send(res);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await inventoryService.updateSupplier(
    req.params.restaurantId,
    req.params.supplierId,
    req.body
  );
  return new ApiResponse(200, { supplier }, 'Supplier updated successfully').send(res);
});

const deleteSupplier = asyncHandler(async (req, res) => {
  await inventoryService.deleteSupplier(req.params.restaurantId, req.params.supplierId);
  return new ApiResponse(200, null, 'Supplier deleted successfully').send(res);
});

// Ingredients
const createIngredient = asyncHandler(async (req, res) => {
  const ingredient = await inventoryService.createIngredient(req.params.restaurantId, req.body);
  return new ApiResponse(201, { ingredient }, 'Ingredient created successfully').send(res);
});

const listIngredients = asyncHandler(async (req, res) => {
  const branch = req.query.branch || undefined;
  const category = req.query.category || undefined;
  const search = req.query.search || '';

  const ingredients = await inventoryService.listIngredients(req.params.restaurantId, {
    branch,
    category,
    search,
  });

  return new ApiResponse(200, { ingredients }, 'Ingredients fetched successfully').send(res);
});

const getIngredient = asyncHandler(async (req, res) => {
  const ingredient = await inventoryService.getIngredient(req.params.restaurantId, req.params.ingredientId);
  return new ApiResponse(200, { ingredient }, 'Ingredient details fetched successfully').send(res);
});

const updateIngredient = asyncHandler(async (req, res) => {
  const ingredient = await inventoryService.updateIngredient(
    req.params.restaurantId,
    req.params.ingredientId,
    req.body
  );
  return new ApiResponse(200, { ingredient }, 'Ingredient updated successfully').send(res);
});

const deleteIngredient = asyncHandler(async (req, res) => {
  await inventoryService.deleteIngredient(req.params.restaurantId, req.params.ingredientId);
  return new ApiResponse(200, null, 'Ingredient deleted successfully').send(res);
});

// Recipes
const upsertRecipe = asyncHandler(async (req, res) => {
  const recipe = await inventoryService.upsertRecipe(req.params.restaurantId, req.body);
  return new ApiResponse(200, { recipe }, 'Recipe saved successfully').send(res);
});

const getRecipeForMenuItem = asyncHandler(async (req, res) => {
  const recipe = await inventoryService.getRecipeForMenuItem(
    req.params.restaurantId,
    req.params.menuItemId
  );
  return new ApiResponse(200, { recipe }, 'Recipe details fetched successfully').send(res);
});

// Purchases
const createPurchase = asyncHandler(async (req, res) => {
  const purchase = await inventoryService.createPurchase(req.params.restaurantId, req.body, req.user?._id);
  return new ApiResponse(201, { purchase }, 'Purchase invoice submitted successfully').send(res);
});

const listPurchases = asyncHandler(async (req, res) => {
  const branch = req.query.branch || undefined;
  const supplier = req.query.supplier || undefined;

  const purchases = await inventoryService.listPurchases(req.params.restaurantId, {
    branch,
    supplier,
  });

  return new ApiResponse(200, { purchases }, 'Purchases logs fetched successfully').send(res);
});

// Stock operations
const adjustStock = asyncHandler(async (req, res) => {
  const result = await inventoryService.adjustStock(req.params.restaurantId, req.body, req.user?._id);
  return new ApiResponse(200, result, 'Stock adjusted successfully').send(res);
});

const listStockTransactions = asyncHandler(async (req, res) => {
  const branch = req.query.branch || undefined;
  const ingredient = req.query.ingredient || undefined;

  const transactions = await inventoryService.listStockTransactions(req.params.restaurantId, {
    branch,
    ingredient,
  });

  return new ApiResponse(200, { transactions }, 'Stock history fetched successfully').send(res);
});

const getInventoryStats = asyncHandler(async (req, res) => {
  const branch = req.query.branch || undefined;
  const stats = await inventoryService.getInventoryStats(req.params.restaurantId, branch);
  return new ApiResponse(200, { stats }, 'Inventory statistics fetched successfully').send(res);
});

module.exports = {
  createSupplier,
  listSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
  createIngredient,
  listIngredients,
  getIngredient,
  updateIngredient,
  deleteIngredient,
  upsertRecipe,
  getRecipeForMenuItem,
  createPurchase,
  listPurchases,
  adjustStock,
  listStockTransactions,
  getInventoryStats,
};
