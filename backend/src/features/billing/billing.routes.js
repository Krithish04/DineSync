const express = require('express');
const billingController = require('./billing.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const { generateInvoiceSchema, createPaymentSchema } = require('./billing.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

router
  .route('/invoices')
  .post(validateBody(generateInvoiceSchema), billingController.generateInvoice)
  .get(billingController.listInvoices);

router.route('/invoices/:invoiceId').get(billingController.getInvoice);
router.post('/invoices/:invoiceId/refund', canManage, billingController.refundInvoice);

router.post('/payments', validateBody(createPaymentSchema), billingController.processPayment);

router.get('/stats', billingController.getBillingStats);
router.get('/reports/finance', billingController.getFinanceReports);

module.exports = router;
