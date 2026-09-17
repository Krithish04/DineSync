import api from '@/lib/axios';

const superUrl = '/super-admin';

export const getPlatformOverview = async () => {
  const { data } = await api.get(`${superUrl}/overview`);
  return data.data;
};

export const listTenants = async (params = {}) => {
  const { data } = await api.get(`${superUrl}/tenants`, { params });
  return data.data;
};

export const getTenantDetails = async (tenantId) => {
  const { data } = await api.get(`${superUrl}/tenants/${tenantId}`);
  return data.data;
};

export const updateTenantStatus = async (tenantId, action) => {
  const { data } = await api.patch(`${superUrl}/tenants/${tenantId}/status`, { action });
  return data.data;
};

export const listSubscriptionPlans = async () => {
  const { data } = await api.get(`${superUrl}/plans`);
  return data.data.plans;
};

export const updateSubscriptionPlanConfig = async (code, payload) => {
  const { data } = await api.patch(`${superUrl}/plans/${code}`, payload);
  return data.data.plan;
};

export const getTenantSubscription = async (tenantId) => {
  const { data } = await api.get(`${superUrl}/tenants/${tenantId}/subscription`);
  return data.data.subscription;
};

export const updateTenantSubscription = async (tenantId, payload) => {
  const { data } = await api.patch(`${superUrl}/tenants/${tenantId}/subscription`, payload);
  return data.data.subscription;
};

export const getFeatureFlags = async (tenantId) => {
  const { data } = await api.get(`${superUrl}/tenants/${tenantId}/feature-flags`);
  return data.data.flags;
};

export const updateFeatureFlags = async (tenantId, payload) => {
  const { data } = await api.put(`${superUrl}/tenants/${tenantId}/feature-flags`, payload);
  return data.data.flags;
};

export const listAuditLogs = async (params = {}) => {
  const { data } = await api.get(`${superUrl}/audit-logs`, { params });
  return data.data;
};

export const getSystemHealth = async () => {
  const { data } = await api.get(`${superUrl}/health`);
  return data.data;
};

export const impersonateTenant = async (tenantId) => {
  const { data } = await api.post(`${superUrl}/tenants/${tenantId}/impersonate`);
  return data.data;
};

export const exitImpersonation = async () => {
  const { data } = await api.post(`${superUrl}/exit-impersonation`);
  return data.data;
};

export const bulkUpdateTenantStatus = async (tenantIds, action) => {
  const { data } = await api.patch(`${superUrl}/tenants/bulk-status`, { tenantIds, action });
  return data.data;
};

export const manualPlanOverride = async (tenantId, newPlan, reason) => {
  const { data } = await api.patch(`${superUrl}/tenants/${tenantId}/plan-override`, { newPlan, reason });
  return data.data;
};

export const resendMandate = async (tenantId) => {
  const { data } = await api.post(`${superUrl}/tenants/${tenantId}/resend-mandate`);
  return data.data;
};

export const listManualReviewQueue = async () => {
  const { data } = await api.get(`${superUrl}/review-queue`);
  return data.data;
};

export const approveTenantRegistration = async (tenantId) => {
  const { data } = await api.post(`${superUrl}/review-queue/${tenantId}/approve`);
  return data.data;
};

export const rejectTenantRegistration = async (tenantId, payload) => {
  const { data } = await api.post(`${superUrl}/review-queue/${tenantId}/reject`, payload);
  return data.data;
};

export const getHistoricalHealthSnapshots = async (days = 7) => {
  const { data } = await api.get(`${superUrl}/health/history`, { params: { days } });
  return data.data;
};

export const getPerTenantAiUsage = async () => {
  const { data } = await api.get(`${superUrl}/ai-usage`);
  return data.data;
};

export const exportAuditLogsCSV = async (params = {}) => {
  const response = await api.get(`${superUrl}/audit-logs/export`, { params, responseType: 'blob' });
  return response.data;
};

