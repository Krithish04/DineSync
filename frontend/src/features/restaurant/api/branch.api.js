import api from '@/lib/axios';

export const getBranchDashboardSummary = async (restaurantId) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/branches/dashboard-summary`);
  return data.data;
};

export const listBranches = async (restaurantId, params = {}) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/branches`, { params });
  return data.data;
};

export const createBranch = async (restaurantId, payload) => {
  const { data } = await api.post(`/restaurants/${restaurantId}/branches`, payload);
  return data.data;
};

export const updateBranch = async (restaurantId, branchId, updates) => {
  const { data } = await api.patch(`/restaurants/${restaurantId}/branches/${branchId}`, updates);
  return data.data;
};

export const deleteBranch = async (restaurantId, branchId) => {
  const { data } = await api.delete(`/restaurants/${restaurantId}/branches/${branchId}`);
  return data.data;
};

// --- Owner Capabilities ---
export const createOwnerManager = async (restaurantId, payload) => {
  const { data } = await api.post(`/restaurants/${restaurantId}/branches/owner-managers`, payload);
  return data.data;
};

export const listOwnerManagers = async (restaurantId) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/branches/owner-managers`);
  return data.data;
};

export const getOwnerManagerLogs = async (restaurantId) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/branches/owner-logs/managers`);
  return data.data;
};

export const getOwnerBranchLogs = async (restaurantId, branchId, accountType = 'staff') => {
  const { data } = await api.get(`/restaurants/${restaurantId}/branches/owner-logs/branch/${branchId}`, { params: { accountType } });
  return data.data;
};

// --- Manager Capabilities ---
export const createScopedStaff = async (restaurantId, payload) => {
  const { data } = await api.post(`/restaurants/${restaurantId}/branches/scoped-staff`, payload);
  return data.data;
};

export const createScopedKitchen = async (restaurantId, payload) => {
  const { data } = await api.post(`/restaurants/${restaurantId}/branches/scoped-kitchen`, payload);
  return data.data;
};

export const listScopedAccounts = async (restaurantId, params = {}) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/branches/scoped-accounts`, { params });
  return data.data;
};

export const getScopedLogs = async (restaurantId, params = {}) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/branches/scoped-logs`, { params });
  return data.data;
};
