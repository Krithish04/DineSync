const express = require('express');
const orderController = require('./order.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  splitOrderSchema,
  mergeOrdersSchema,
} = require('./order.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);
const canCreateOrder = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF);
const canUpdateStatus = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.CHEF);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

router
  .route('/')
  .post(canCreateOrder, validateBody(createOrderSchema), orderController.createOrder)
  .get(orderController.listOrders);

router.post('/merge', canManage, validateBody(mergeOrdersSchema), orderController.mergeOrders);

router
  .route('/:orderId')
  .get(orderController.getOrder)
  .patch(canManage, validateBody(updateOrderSchema), orderController.updateOrder)
  .delete(canManage, orderController.deleteOrder);

router
  .route('/:orderId/status')
  .patch(canUpdateStatus, validateBody(updateOrderStatusSchema), orderController.updateOrderStatus);

router
  .route('/:orderId/payment')
  .patch(canManage, validateBody(updatePaymentStatusSchema), orderController.updatePaymentStatus);

router.post('/:orderId/split', canManage, validateBody(splitOrderSchema), orderController.splitBill);

module.exports = router;
