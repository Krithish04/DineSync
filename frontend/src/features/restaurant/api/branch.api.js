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
