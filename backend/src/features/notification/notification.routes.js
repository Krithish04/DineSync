const express = require('express');
const notificationController = require('./notification.controller');
const { protect, enforceTenantIsolation } = require('../../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(protect, enforceTenantIsolation);

router.get('/', notificationController.listNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/:notificationId/archive', notificationController.archiveNotification);
router.delete('/:notificationId', notificationController.deleteNotification);

router
  .route('/preferences')
  .get(notificationController.getPreferences)
  .put(notificationController.updatePreferences);

router.get('/jobs', notificationController.getJobLogs);

module.exports = router;
