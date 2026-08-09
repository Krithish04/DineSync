const express = require('express');
const tenantController = require('./tenant.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const {
  updateProfileSchema,
  updateSettingsSchema,
  updateGstSchema,
  updateOpeningHoursSchema,
} = require('./tenant.validation');
const { protect, authorize } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router();

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);
const canManageFinancials = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER);

// Public: fetch a restaurant's public profile (used to render its storefront)
router.get('/public/:slug', tenantController.getPublicBySlug);

// Platform-level: super admin lists every tenant
router.get('/', protect, authorize(ROLES.SUPER_ADMIN), tenantController.listAll);

// Full restaurant document
router.get('/:restaurantId', protect, canManage, tenantController.getById);
router.delete('/:restaurantId', protect, canManageFinancials, tenantController.deactivate);

// --- Profile (Owner & Super Admin only) ---
router.get('/:restaurantId/profile', protect, canManageFinancials, tenantController.getProfile);
router.patch(
  '/:restaurantId/profile',
  protect,
  canManageFinancials,
  validateBody(updateProfileSchema),
  tenantController.updateProfile
);

// --- Settings ---
router.get('/:restaurantId/settings', protect, canManage, tenantController.getSettings);
router.patch(
  '/:restaurantId/settings',
  protect,
  canManage,
  validateBody(updateSettingsSchema),
  tenantController.updateSettings
);

// --- GST (financially sensitive — owner/super_admin only for writes) ---
router.get('/:restaurantId/gst', protect, canManage, tenantController.getGst);
router.patch(
  '/:restaurantId/gst',
  protect,
  canManageFinancials,
  validateBody(updateGstSchema),
  tenantController.updateGst
);

// --- Opening hours ---
router.get('/:restaurantId/opening-hours', protect, canManage, tenantController.getOpeningHours);
router.put(
  '/:restaurantId/opening-hours',
  protect,
  canManage,
  validateBody(updateOpeningHoursSchema),
  tenantController.updateOpeningHours
);

module.exports = router;
