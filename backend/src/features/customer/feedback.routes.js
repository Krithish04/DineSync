const express = require('express');
const feedbackController = require('./feedback.controller');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// Protected routes (Manager, Owner, Super Admin)
router.use(protect, enforceTenantIsolation);

router.get('/', canManage, feedbackController.getFeedback);
router.patch('/:feedbackId/respond', canManage, feedbackController.respondToFeedback);

module.exports = router;
