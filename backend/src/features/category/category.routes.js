const express = require('express');
const categoryController = require('./category.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const { createCategorySchema, updateCategorySchema } = require('./category.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

router
  .route('/')
  .post(canManage, validateBody(createCategorySchema), categoryController.createCategory)
  .get(categoryController.listCategories);

router
  .route('/:categoryId')
  .get(categoryController.getCategory)
  .patch(canManage, validateBody(updateCategorySchema), categoryController.updateCategory)
  .delete(canManage, categoryController.deleteCategory);

module.exports = router;
