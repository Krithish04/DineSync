const express = require('express');
const customerController = require('./customer.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const { createCustomerSchema, adjustLoyaltyPointsSchema } = require('./customer.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

router
  .route('/')
  .post(validateBody(createCustomerSchema), customerController.createCustomer)
  .get(customerController.listCustomers);

router.get('/stats', customerController.getCustomerStats);
router.get('/reports/analytics', customerController.getCustomerReports);
router.get('/loyalty/transactions', customerController.listLoyaltyTransactions);

router
  .route('/:customerId')
  .get(customerController.getCustomer)
  .patch(validateBody(createCustomerSchema.partial()), customerController.updateCustomer)
  .delete(canManage, customerController.deleteCustomer);

router.post('/:customerId/birthday', canManage, customerController.awardBirthdayReward);
router.post('/:customerId/adjust', canManage, validateBody(adjustLoyaltyPointsSchema), customerController.adjustPoints);

module.exports = router;
