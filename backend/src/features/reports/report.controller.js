const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const reportService = require('./report.service');

// ==========================================
// EXECUTIVE DASHBOARD
// ==========================================

const getExecutiveDashboard = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || null;
  const data = await reportService.getExecutiveDashboard(req.params.restaurantId, branchId);
  return new ApiResponse(200, data, 'Executive dashboard data fetched successfully').send(res);
});

// ==========================================
// SALES
// ==========================================

const getSalesSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch, groupBy } = req.query;
  const data = await reportService.getSalesSummary(req.params.restaurantId, {
    startDate, endDate, branchId: branch, groupBy,
  });
  return new ApiResponse(200, data, 'Sales summary fetched successfully').send(res);
});

const getSalesByBranch = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await reportService.getSalesByBranch(req.params.restaurantId, { startDate, endDate });
  return new ApiResponse(200, { sales: data }, 'Sales by branch fetched successfully').send(res);
});

const getSalesByCategory = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getSalesByCategory(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, { sales: data }, 'Sales by category fetched successfully').send(res);
});

const getSalesByItem = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch, limit } = req.query;
  const data = await reportService.getSalesByItem(req.params.restaurantId, {
    startDate, endDate, branchId: branch, limit,
  });
  return new ApiResponse(200, { items: data }, 'Sales by item fetched successfully').send(res);
});

const getHourlySales = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getHourlySales(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, { hourly: data }, 'Hourly sales fetched successfully').send(res);
});

// ==========================================
// ORDERS
// ==========================================

const getOrderSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getOrderSummary(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, data, 'Order summary fetched successfully').send(res);
});

// ==========================================
// RESERVATIONS
// ==========================================

const getReservationSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getReservationSummary(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, data, 'Reservation summary fetched successfully').send(res);
});

// ==========================================
// CUSTOMERS
// ==========================================

const getCustomerSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getCustomerSummary(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, data, 'Customer summary fetched successfully').send(res);
});

const getCustomerLoyaltySummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await reportService.getCustomerLoyaltySummary(req.params.restaurantId, {
    startDate, endDate,
  });
  return new ApiResponse(200, data, 'Loyalty summary fetched successfully').send(res);
});

// ==========================================
// INVENTORY
// ==========================================

const getInventorySummary = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || null;
  const data = await reportService.getInventorySummary(req.params.restaurantId, branchId);
  return new ApiResponse(200, data, 'Inventory summary fetched successfully').send(res);
});

const getPurchaseSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getPurchaseSummary(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, { purchases: data }, 'Purchase summary fetched successfully').send(res);
});

const getIngredientConsumption = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getIngredientConsumption(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, { consumption: data }, 'Ingredient consumption fetched successfully').send(res);
});

const getWasteAnalysis = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getWasteAnalysis(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, { waste: data }, 'Waste analysis fetched successfully').send(res);
});

// ==========================================
// EMPLOYEES
// ==========================================

const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getAttendanceSummary(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, data, 'Attendance summary fetched successfully').send(res);
});

const getWorkingHoursReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getWorkingHoursReport(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, { report: data }, 'Working hours report fetched successfully').send(res);
});

const getLeaveSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getLeaveSummary(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, { leaveSummary: data }, 'Leave summary fetched successfully').send(res);
});

// ==========================================
// FINANCIAL
// ==========================================

const getFinancialSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getFinancialSummary(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, data, 'Financial summary fetched successfully').send(res);
});

const getGstReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getGstReport(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, { gst: data }, 'GST report fetched successfully').send(res);
});

const getPaymentMethodSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, branch } = req.query;
  const data = await reportService.getPaymentMethodSummary(req.params.restaurantId, {
    startDate, endDate, branchId: branch,
  });
  return new ApiResponse(200, { paymentMethods: data }, 'Payment method summary fetched successfully').send(res);
});

module.exports = {
  getExecutiveDashboard,
  getSalesSummary,
  getSalesByBranch,
  getSalesByCategory,
  getSalesByItem,
  getHourlySales,
  getOrderSummary,
  getReservationSummary,
  getCustomerSummary,
  getCustomerLoyaltySummary,
  getInventorySummary,
  getPurchaseSummary,
  getIngredientConsumption,
  getWasteAnalysis,
  getAttendanceSummary,
  getWorkingHoursReport,
  getLeaveSummary,
  getFinancialSummary,
  getGstReport,
  getPaymentMethodSummary,
};
