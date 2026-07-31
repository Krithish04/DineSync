const express = require('express');
const tableController = require('./table.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const { createTableSchema, updateTableSchema, updateTableStatusSchema } = require('./table.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

router
  .route('/')
  .post(canManage, validateBody(createTableSchema), tableController.createTable)
  .get(tableController.listTables);

router
  .route('/:tableId')
  .get(tableController.getTable)
  .patch(canManage, validateBody(updateTableSchema), tableController.updateTable)
  .delete(canManage, tableController.deleteTable);

router
  .route('/:tableId/status')
  .patch(canManage, validateBody(updateTableStatusSchema), tableController.updateTableStatus);

module.exports = router;
