const express = require('express');
const branchController = require('./branch.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const {
  createBranchSchema,
  updateBranchSchema,
  updateBranchAddressSchema,
  updateBranchContactSchema,
  updateBranchHoursSchema,
  assignManagerSchema,
  updateBranchStatusSchema,
} = require('./branch.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

// mergeParams so this router can read :restaurantId from its parent mount path.
const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);
const canManageCritical = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER);

// All branch routes require authentication + tenant isolation (a user can
// only manage branches of their own restaurant, unless they're super_admin).
router.use(protect, enforceTenantIsolation);

// --- Add Branch / List Branches ---
router
  .route('/')
  .post(canManage, validateBody(createBranchSchema), branchController.createBranch)
  .get(canManage, branchController.listBranches);

// --- Eligible managers lookup (for the manager-assignment picker) ---
router.get('/managers/eligible', canManage, branchController.listEligibleManagers);

// --- Get / Update / Delete a single branch ---
router
  .route('/:branchId')
  .get(canManage, branchController.getBranch)
  .patch(canManage, validateBody(updateBranchSchema), branchController.updateBranch)
  .delete(canManageCritical, branchController.deleteBranch);

// --- Branch Address ---
router.patch(
  '/:branchId/address',
  canManage,
  validateBody(updateBranchAddressSchema),
  branchController.updateAddress
);

// --- Contact Details ---
router.patch(
  '/:branchId/contact',
  canManage,
  validateBody(updateBranchContactSchema),
  branchController.updateContact
);

// --- Operating Hours ---
router.put(
  '/:branchId/operating-hours',
  canManage,
  validateBody(updateBranchHoursSchema),
  branchController.updateOperatingHours
);

// --- Branch Manager Assignment ---
router.patch(
  '/:branchId/manager',
  canManageCritical,
  validateBody(assignManagerSchema),
  branchController.assignManager
);

// --- Branch Status (Active/Inactive) ---
router.patch(
  '/:branchId/status',
  canManageCritical,
  validateBody(updateBranchStatusSchema),
  branchController.updateStatus
);

module.exports = router;
