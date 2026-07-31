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
