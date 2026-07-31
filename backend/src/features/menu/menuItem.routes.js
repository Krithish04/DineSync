const express = require('express');
const menuItemController = require('./menuItem.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const { createMenuItemSchema, updateMenuItemSchema } = require('./menuItem.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

router
  .route('/')
  .post(canManage, validateBody(createMenuItemSchema), menuItemController.createMenuItem)
  .get(menuItemController.listMenuItems);

router
  .route('/:menuItemId')
  .get(menuItemController.getMenuItem)
  .patch(canManage, validateBody(updateMenuItemSchema), menuItemController.updateMenuItem)
  .delete(canManage, menuItemController.deleteMenuItem);

module.exports = router;
