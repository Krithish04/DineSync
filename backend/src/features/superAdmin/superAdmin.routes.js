const express = require('express');
const superAdminController = require('./superAdmin.controller');
const { protect, authorize } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router();

// Strictly protected — Super Admin access only
router.use(protect, authorize(ROLES.SUPER_ADMIN));

router.get('/overview', superAdminController.getPlatformOverview);
router.get('/tenants', superAdminController.listTenants);
router.get('/tenants/:tenantId', superAdminController.getTenantDetails);
router.patch('/tenants/:tenantId/status', superAdminController.updateTenantStatus);
router.post('/tenants/:tenantId/impersonate', superAdminController.impersonateTenant);
router.post('/exit-impersonation', superAdminController.exitImpersonation);

router.get('/plans', superAdminController.listSubscriptionPlans);
router.patch('/plans/:code', superAdminController.updatePlanConfig);
router.get('/tenants/:tenantId/subscription', superAdminController.getTenantSubscription);
router.patch('/tenants/:tenantId/subscription', superAdminController.updateTenantSubscription);

router.get('/tenants/:tenantId/feature-flags', superAdminController.getFeatureFlags);
router.put('/tenants/:tenantId/feature-flags', superAdminController.updateFeatureFlags);

router.get('/review-queue', superAdminController.listManualReviewQueue);
router.post('/review-queue/:tenantId/approve', superAdminController.approveTenantRegistration);
router.post('/review-queue/:tenantId/reject', superAdminController.rejectTenantRegistration);

router.get('/audit-logs', superAdminController.listAuditLogs);
router.get('/health', superAdminController.getSystemHealth);

module.exports = router;
