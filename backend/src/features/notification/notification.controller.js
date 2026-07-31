const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const notificationService = require('./notification.service');
const jobSchedulerService = require('./jobScheduler.service');

const listNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotifications(req.params.restaurantId, req.query);
  return new ApiResponse(200, data, 'Notifications fetched successfully').send(res);
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.restaurantId, req.params.notificationId);
  return new ApiResponse(200, { notification }, 'Notification marked as read').send(res);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.params.restaurantId);
  return new ApiResponse(200, result, 'All notifications marked as read').send(res);
});

const archiveNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.archiveNotification(req.params.restaurantId, req.params.notificationId);
  return new ApiResponse(200, { notification }, 'Notification archived').send(res);
});

const deleteNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotification(req.params.restaurantId, req.params.notificationId);
  return new ApiResponse(200, result, 'Notification deleted').send(res);
});

const getPreferences = asyncHandler(async (req, res) => {
  const preference = await notificationService.getPreferences(req.params.restaurantId, req.user?._id);
  return new ApiResponse(200, { preference }, 'Notification preferences fetched').send(res);
});

const updatePreferences = asyncHandler(async (req, res) => {
  const preference = await notificationService.updatePreferences(req.params.restaurantId, req.user?._id, req.body);
  return new ApiResponse(200, { preference }, 'Notification preferences updated').send(res);
});

const getJobLogs = asyncHandler(async (req, res) => {
  const jobs = jobSchedulerService.getJobLogs();
  return new ApiResponse(200, { jobs }, 'Scheduled background jobs monitor status fetched').send(res);
});

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  getPreferences,
  updatePreferences,
  getJobLogs,
};
