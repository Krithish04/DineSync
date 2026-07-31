const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const scheduledReportService = require('./scheduledReport.service');

const createScheduledReport = asyncHandler(async (req, res) => {
  const report = await scheduledReportService.createScheduledReport(
    req.params.restaurantId,
    req.body,
    req.user?._id
  );
  return new ApiResponse(201, { report }, 'Scheduled report created successfully').send(res);
});

const listScheduledReports = asyncHandler(async (req, res) => {
  const reports = await scheduledReportService.listScheduledReports(req.params.restaurantId);
  return new ApiResponse(200, { reports }, 'Scheduled reports fetched successfully').send(res);
});

const updateScheduledReport = asyncHandler(async (req, res) => {
  const report = await scheduledReportService.updateScheduledReport(
    req.params.restaurantId,
    req.params.reportId,
    req.body
  );
  return new ApiResponse(200, { report }, 'Scheduled report updated successfully').send(res);
});

const deleteScheduledReport = asyncHandler(async (req, res) => {
  const result = await scheduledReportService.deleteScheduledReport(
    req.params.restaurantId,
    req.params.reportId
  );
  return new ApiResponse(200, result, 'Scheduled report deleted successfully').send(res);
});

module.exports = {
  createScheduledReport,
  listScheduledReports,
  updateScheduledReport,
  deleteScheduledReport,
};
