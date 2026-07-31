const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const billingService = require('./billing.service');

const generateInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.generateInvoice(
    req.params.restaurantId,
    req.body,
    req.user?._id
  );
  return new ApiResponse(201, { invoice }, 'Invoice generated successfully').send(res);
});

const listInvoices = asyncHandler(async (req, res) => {
  const branch = req.query.branch || undefined;
  const status = req.query.status || undefined;
  const search = req.query.search || '';

  const invoices = await billingService.listInvoices(req.params.restaurantId, { branch, status, search });
  return new ApiResponse(200, { invoices }, 'Invoices logs fetched successfully').send(res);
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.getInvoice(req.params.restaurantId, req.params.invoiceId);
  return new ApiResponse(200, { invoice }, 'Invoice details fetched successfully').send(res);
});

const processPayment = asyncHandler(async (req, res) => {
  const result = await billingService.processPayment(req.params.restaurantId, req.body, req.user?._id);
  return new ApiResponse(201, result, 'Payment recorded successfully').send(res);
});

const refundInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.refundInvoice(
    req.params.restaurantId,
    req.params.invoiceId,
    req.user?._id
  );
  return new ApiResponse(200, { invoice }, 'Invoice refund processed successfully').send(res);
});

const getBillingStats = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || undefined;
  const stats = await billingService.getBillingStats(req.params.restaurantId, branchId);
  return new ApiResponse(200, { stats }, 'Billing stats fetched successfully').send(res);
});

const getFinanceReports = asyncHandler(async (req, res) => {
  const reports = await billingService.getFinanceReports(req.params.restaurantId);
  return new ApiResponse(200, { reports }, 'Financial reports fetched successfully').send(res);
});

module.exports = {
  generateInvoice,
  listInvoices,
  getInvoice,
  processPayment,
  refundInvoice,
  getBillingStats,
  getFinanceReports,
};
