const Supplier = require('./supplier.model');
const Ingredient = require('./ingredient.model');
const Recipe = require('./recipe.model');
const Purchase = require('./purchase.model');
const StockTransaction = require('./stockTransaction.model');
const ApiError = require('../../utils/ApiError');

// ==========================================
// SUPPLIER CRUD
// ==========================================

const createSupplier = async (restaurantId, payload) => {
  const exists = await Supplier.exists({ restaurant: restaurantId, supplierName: payload.supplierName, isDeleted: false });
  if (exists) {
    throw ApiError.badRequest(`Supplier name "${payload.supplierName}" already exists.`);
  }

  return Supplier.create({
    ...payload,
    restaurant: restaurantId,
  });
};

const listSuppliers = async (restaurantId) => {
  return Supplier.find({ restaurant: restaurantId, isDeleted: false }).sort({ supplierName: 1 });
};

const getSupplier = async (restaurantId, supplierId) => {
  const supplier = await Supplier.findOne({ _id: supplierId, restaurant: restaurantId, isDeleted: false });
  if (!supplier) throw ApiError.notFound('Supplier not found.');
  return supplier;
};

const updateSupplier = async (restaurantId, supplierId, updates) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: supplierId, restaurant: restaurantId, isDeleted: false },
    updates,
    { new: true }
  );
  if (!supplier) throw ApiError.notFound('Supplier not found.');
  return supplier;
};

const deleteSupplier = async (restaurantId, supplierId) => {
  const supplier = await Supplier.findOne({ _id: supplierId, restaurant: restaurantId, isDeleted: false });
  if (!supplier) throw ApiError.notFound('Supplier not found.');
  supplier.isDeleted = true;
  supplier.deletedAt = new Date();
  await supplier.save();
  return { deleted: true };
};

// ==========================================
// INGREDIENT CRUD
// ==========================================

const createIngredient = async (restaurantId, payload) => {
  const exists = await Ingredient.exists({
    restaurant: restaurantId,
    ingredientName: payload.ingredientName,
    isDeleted: false,
  });
  if (exists) {
    throw ApiError.badRequest(`Ingredient "${payload.ingredientName}" already exists.`);
  }

  return Ingredient.create({
    ...payload,
    restaurant: restaurantId,
  });
};

const listIngredients = async (restaurantId, { category, search = '' }) => {
  const query = { restaurant: restaurantId, isDeleted: false };
  if (category) query.category = category;

  if (search) {
    query.ingredientName = { $regex: search, $options: 'i' };
  }

  return Ingredient.find(query)
    .populate('supplier', 'supplierName contactPerson phone')
    .sort({ ingredientName: 1 });
};

const getIngredient = async (restaurantId, ingredientId) => {
  const ingredient = await Ingredient.findOne({ _id: ingredientId, restaurant: restaurantId, isDeleted: false })
    .populate('supplier', 'supplierName contactPerson phone');
  if (!ingredient) throw ApiError.notFound('Ingredient not found.');
  return ingredient;
};

const updateIngredient = async (restaurantId, ingredientId, updates) => {
  const ingredient = await Ingredient.findOneAndUpdate(
    { _id: ingredientId, restaurant: restaurantId, isDeleted: false },
    updates,
    { new: true }
  ).populate('supplier', 'supplierName');
  if (!ingredient) throw ApiError.notFound('Ingredient not found.');
  return ingredient;
};

const deleteIngredient = async (restaurantId, ingredientId) => {
  const ingredient = await Ingredient.findOne({ _id: ingredientId, restaurant: restaurantId, isDeleted: false });
  if (!ingredient) throw ApiError.notFound('Ingredient not found.');
  ingredient.isDeleted = true;
  ingredient.deletedAt = new Date();
  await ingredient.save();
  return { deleted: true };
};

// ==========================================
// RECIPE (INGREDIENT MAPPING) CRUD
// ==========================================

const upsertRecipe = async (restaurantId, payload) => {
  // Try to find if recipe already exists for this menuItem
  let recipe = await Recipe.findOne({ restaurant: restaurantId, menuItem: payload.menuItem });
  if (recipe) {
    recipe.ingredients = payload.ingredients;
    await recipe.save();
  } else {
    recipe = await Recipe.create({
      ...payload,
      restaurant: restaurantId,
    });
  }
  return recipe.populate('ingredients.ingredient', 'ingredientName unit');
};

const getRecipeForMenuItem = async (restaurantId, menuItemId) => {
  return Recipe.findOne({ restaurant: restaurantId, menuItem: menuItemId })
    .populate('ingredients.ingredient', 'ingredientName unit');
};

// ==========================================
// PURCHASE CRUD & OPERATIONS
// ==========================================

const createPurchase = async (restaurantId, payload, userId = null) => {
  // Validate items and calculate totalAmount
  let totalAmount = 0;
  const items = [];

  for (const item of payload.items) {
    const ingredient = await Ingredient.findOne({ _id: item.ingredient, restaurant: restaurantId, isDeleted: false });
    if (!ingredient) {
      throw ApiError.notFound(`Ingredient not found.`);
    }

    const amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
    totalAmount += amount;

    items.push({
      ingredient: item.ingredient,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount,
    });
  }

  const purchase = await Purchase.create({
    ...payload,
    restaurant: restaurantId,
    items,
    totalAmount: Math.round(totalAmount * 100) / 100,
  });

  // Automatically increase stock of ingredients and log transactions
  for (const item of items) {
    const ingredient = await Ingredient.findById(item.ingredient);
    ingredient.currentStock += item.quantity;
    
    // Update purchase price with newest value
    ingredient.purchasePrice = item.unitPrice;
    await ingredient.save();

    await StockTransaction.create({
      restaurant: restaurantId,
      ingredient: item.ingredient,
      transactionType: 'Purchase',
      quantity: item.quantity,
      reason: `Purchased via Invoice #${payload.invoiceNumber || purchase.purchaseNumber}`,
      createdBy: userId,
    });
  }

  return purchase.populate('supplier', 'supplierName');
};

const listPurchases = async (restaurantId, { supplier }) => {
  const query = { restaurant: restaurantId, isDeleted: false };
  if (supplier) query.supplier = supplier;

  return Purchase.find(query)
    .populate('supplier', 'supplierName phone')
    .sort({ purchaseDate: -1 });
};

// ==========================================
// STOCK ADJUSTMENTS & AUDITING
// ==========================================

const adjustStock = async (restaurantId, payload, userId = null) => {
  const { ingredient: ingredientId, transactionType, quantity, reason } = payload;

  const ingredient = await Ingredient.findOne({ _id: ingredientId, restaurant: restaurantId, isDeleted: false });
  if (!ingredient) {
    throw ApiError.notFound('Ingredient not found.');
  }

  const newStock = ingredient.currentStock + quantity;
  if (newStock < 0) {
    throw ApiError.badRequest(`Deduction exceeds current stock. Stock cannot go below zero (Current: ${ingredient.currentStock} ${ingredient.unit}).`);
  }

  ingredient.currentStock = Math.round(newStock * 1000) / 1000;
  await ingredient.save();

  // Log transaction
  const transaction = await StockTransaction.create({
    restaurant: restaurantId,
    ingredient: ingredientId,
    transactionType,
    quantity,
    reason: reason || 'Manual stock adjustment',
    createdBy: userId,
  });

  return { ingredient, transaction };
};

/**
 * Automates inventory deductions when a kitchen ticket is completed/marked Ready.
 * Finds mapped Recipe and subtracts ingredient stock values.
 */
const consumeStockForMenuItem = async (restaurantId, menuItemId, qtyPrepared) => {
  const recipe = await Recipe.findOne({ restaurant: restaurantId, menuItem: menuItemId });
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return;

  for (const mapping of recipe.ingredients) {
    const ingredient = await Ingredient.findOne({ _id: mapping.ingredient, restaurant: restaurantId, isDeleted: false });
    if (ingredient) {
      const consumedQty = mapping.quantityNeeded * qtyPrepared;
      const newStock = Math.max(0, ingredient.currentStock - consumedQty);
      
      ingredient.currentStock = Math.round(newStock * 1000) / 1000;
      await ingredient.save();

      // Log Consumption Audit Trail
      await StockTransaction.create({
        restaurant: restaurantId,
        ingredient: ingredient._id,
        transactionType: 'Consumption',
        quantity: -consumedQty,
        reason: `Auto consumption for preparing menu item.`,
      });
    }
  }
};

const listStockTransactions = async (restaurantId, { ingredient }) => {
  const query = { restaurant: restaurantId };
  if (ingredient) query.ingredient = ingredient;

  return StockTransaction.find(query)
    .populate('ingredient', 'ingredientName unit')
    .populate('createdBy', 'name role')
    .sort({ createdAt: -1 });
};

// ==========================================
// KDS REPORTING & DASHBOARD METRICS
// ==========================================

const getInventoryStats = async (restaurantId) => {
  const query = { restaurant: restaurantId, isDeleted: false };
  const purchaseQuery = { restaurant: restaurantId, isDeleted: false };

  // Monthly Purchases counter boundary
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [ingredients, monthlyPurchases] = await Promise.all([
    Ingredient.find(query),
    Purchase.find({
      ...purchaseQuery,
      purchaseDate: { $gte: startOfMonth },
    }),
  ]);

  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  ingredients.forEach((ing) => {
    totalValue += ing.currentStock * ing.purchasePrice;
    if (ing.currentStock <= 0) {
      outOfStockCount += 1;
    } else if (ing.currentStock <= ing.reorderLevel) {
      lowStockCount += 1;
    }
  });

  const purchasesThisMonthAmount = monthlyPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  return {
    totalIngredients: ingredients.length,
    lowStockItems: lowStockCount,
    outOfStockItems: outOfStockCount,
    purchasesThisMonth: Math.round(purchasesThisMonthAmount * 100) / 100,
    inventoryValue: Math.round(totalValue * 100) / 100,
  };
};

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
  consumeStockForMenuItem,
  listStockTransactions,
  getInventoryStats,
};
