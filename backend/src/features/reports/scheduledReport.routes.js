const express = require('express');
const scheduledReportController = require('./scheduledReport.controller');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

router.use(protect, enforceTenantIsolation, canManage);

router
  .route('/scheduled')
  .get(scheduledReportController.listScheduledReports)
  .post(scheduledReportController.createScheduledReport);

router
  .route('/scheduled/:reportId')
  .patch(scheduledReportController.updateScheduledReport)
  .delete(scheduledReportController.deleteScheduledReport);

module.exports = router;
