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

router.get('/plans', superAdminController.listSubscriptionPlans);
router.get('/tenants/:tenantId/subscription', superAdminController.getTenantSubscription);
router.patch('/tenants/:tenantId/subscription', superAdminController.updateTenantSubscription);

router.get('/tenants/:tenantId/feature-flags', superAdminController.getFeatureFlags);
router.put('/tenants/:tenantId/feature-flags', superAdminController.updateFeatureFlags);

router.get('/audit-logs', superAdminController.listAuditLogs);
router.get('/health', superAdminController.getSystemHealth);

module.exports = router;
