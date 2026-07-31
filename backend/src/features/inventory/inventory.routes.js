const express = require('express');
const inventoryController = require('./inventory.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const {
  createSupplierSchema,
  createIngredientSchema,
  createRecipeSchema,
  createPurchaseSchema,
  adjustStockSchema,
} = require('./inventory.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

// Suppliers
router
  .route('/suppliers')
  .post(canManage, validateBody(createSupplierSchema), inventoryController.createSupplier)
  .get(inventoryController.listSuppliers);

router
  .route('/suppliers/:supplierId')
  .get(inventoryController.getSupplier)
  .patch(canManage, validateBody(createSupplierSchema.partial()), inventoryController.updateSupplier)
  .delete(canManage, inventoryController.deleteSupplier);

// Ingredients
router
  .route('/ingredients')
  .post(canManage, validateBody(createIngredientSchema), inventoryController.createIngredient)
  .get(inventoryController.listIngredients);

router
  .route('/ingredients/:ingredientId')
  .get(inventoryController.getIngredient)
  .patch(canManage, validateBody(createIngredientSchema.partial()), inventoryController.updateIngredient)
  .delete(canManage, inventoryController.deleteIngredient);

// Recipes
router
  .route('/recipes')
  .post(canManage, validateBody(createRecipeSchema), inventoryController.upsertRecipe);

router.get('/recipes/menu-item/:menuItemId', inventoryController.getRecipeForMenuItem);

// Purchases
router
  .route('/purchases')
  .post(canManage, validateBody(createPurchaseSchema), inventoryController.createPurchase)
  .get(inventoryController.listPurchases);

// Stock
router.post('/stock/adjust', canManage, validateBody(adjustStockSchema), inventoryController.adjustStock);
router.get('/stock/transactions', inventoryController.listStockTransactions);
router.get('/stats', inventoryController.getInventoryStats);

module.exports = router;
