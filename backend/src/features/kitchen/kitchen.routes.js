const express = require('express');
const kitchenController = require('./kitchen.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const { updateTicketStatusSchema, updateTicketItemStatusSchema } = require('./kitchen.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

router.route('/').get(kitchenController.listTickets);
router.route('/stats').get(kitchenController.getKitchenStats);

router
  .route('/:ticketId/status')
  .patch(canManage, validateBody(updateTicketStatusSchema), kitchenController.updateTicketStatus);

router
  .route('/:ticketId/items/:itemId/status')
  .patch(canManage, validateBody(updateTicketItemStatusSchema), kitchenController.updateTicketItemStatus);

module.exports = router;
