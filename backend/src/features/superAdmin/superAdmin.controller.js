const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const superAdminService = require('./superAdmin.service');
const subscriptionService = require('./subscription.service');
const featureFlagService = require('./featureFlag.service');
const auditService = require('./audit.service');

const getPlatformOverview = asyncHandler(async (req, res) => {
  const data = await superAdminService.getPlatformOverview();
  return new ApiResponse(200, data, 'SaaS platform overview metrics fetched').send(res);
});

const listTenants = asyncHandler(async (req, res) => {
  const data = await superAdminService.listTenants(req.query);
  return new ApiResponse(200, data, 'Tenants list fetched successfully').send(res);
});

const getTenantDetails = asyncHandler(async (req, res) => {
  const data = await superAdminService.getTenantDetails(req.params.tenantId);
  return new ApiResponse(200, data, 'Tenant deep-dive details fetched').send(res);
});

const updateTenantStatus = asyncHandler(async (req, res) => {
  const { action } = req.body;
  const tenant = await superAdminService.updateTenantStatus(req.params.tenantId, action, req.user);
  return new ApiResponse(200, { tenant }, `Tenant status updated (${action})`).send(res);
});

const listSubscriptionPlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.listPlans();
  return new ApiResponse(200, { plans }, 'Subscription plans fetched').send(res);
});

const updatePlanConfig = asyncHandler(async (req, res) => {
  const plan = await subscriptionService.updatePlanConfig(req.params.code, req.body);
  return new ApiResponse(200, { plan }, `Subscription plan configuration for ${req.params.code} updated`).send(res);
});

const getTenantSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getTenantSubscription(req.params.tenantId);
  return new ApiResponse(200, { subscription }, 'Tenant subscription details fetched').send(res);
});

const updateTenantSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.updateTenantSubscription(req.params.tenantId, req.body);
  return new ApiResponse(200, { subscription }, 'Tenant subscription updated').send(res);
});

const getFeatureFlags = asyncHandler(async (req, res) => {
  const flags = await featureFlagService.getFeatureFlags(req.params.tenantId);
  return new ApiResponse(200, { flags }, 'Tenant feature flags fetched').send(res);
});

const updateFeatureFlags = asyncHandler(async (req, res) => {
  const flags = await featureFlagService.updateFeatureFlags(req.params.tenantId, req.body);
  return new ApiResponse(200, { flags }, 'Tenant feature flags updated').send(res);
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const data = await auditService.listAuditLogs(req.query);
  return new ApiResponse(200, data, 'Platform audit logs fetched').send(res);
});

const getSystemHealth = asyncHandler(async (req, res) => {
  const data = await superAdminService.getSystemHealth();
  return new ApiResponse(200, data, 'System health and monitoring metrics fetched').send(res);
});

const impersonateTenant = asyncHandler(async (req, res) => {
  const { token, restaurant } = await superAdminService.impersonateTenant(req.params.tenantId, req.user);
  const { setTokenCookie } = require('../../utils/jwt.util');
  setTokenCookie(res, token);
  return new ApiResponse(200, { token, restaurant }, `Impersonating tenant ${restaurant.name}`).send(res);
});

const exitImpersonation = asyncHandler(async (req, res) => {
  const { token } = await superAdminService.exitImpersonation(req.user);
  const { setTokenCookie } = require('../../utils/jwt.util');
  setTokenCookie(res, token);
  return new ApiResponse(200, { token }, 'Exited impersonation mode').send(res);
});

const listManualReviewQueue = asyncHandler(async (req, res) => {
  const queue = await subscriptionService.listManualReviewQueue();
  return new ApiResponse(200, { queue, total: queue.length }, 'Manual review queue fetched successfully').send(res);
});

const approveTenantRegistration = asyncHandler(async (req, res) => {
  const result = await subscriptionService.approveTenantRegistration(req.params.tenantId, req.user);
  return new ApiResponse(200, result, 'Tenant registration approved successfully').send(res);
});

const rejectTenantRegistration = asyncHandler(async (req, res) => {
  const restaurant = await subscriptionService.rejectTenantRegistration(req.params.tenantId, req.body, req.user);
  return new ApiResponse(200, { restaurant }, 'Tenant registration rejected').send(res);
});

module.exports = {
  getPlatformOverview,
  listTenants,
  getTenantDetails,
  updateTenantStatus,
  listSubscriptionPlans,
  updatePlanConfig,
  getTenantSubscription,
  updateTenantSubscription,
  getFeatureFlags,
  updateFeatureFlags,
  listAuditLogs,
  getSystemHealth,
  impersonateTenant,
  exitImpersonation,
  listManualReviewQueue,
  approveTenantRegistration,
  rejectTenantRegistration,
};
