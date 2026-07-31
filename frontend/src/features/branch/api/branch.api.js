import api from '@/lib/axios';

const branchesUrl = (restaurantId) => `/restaurants/${restaurantId}/branches`;
const branchUrl = (restaurantId, branchId) => `${branchesUrl(restaurantId)}/${branchId}`;

/**
 * Creates a new branch under a restaurant.
 * @param {string} restaurantId
 * @param {object} payload { name, code?, address, contact, operatingHours?, managerId? }
 */
export const createBranch = async (restaurantId, payload) => {
  const { data } = await api.post(branchesUrl(restaurantId), payload);
  return data.data.branch;
};

/**
 * Lists branches for a restaurant, optionally filtered by status.
 * @param {string} restaurantId
 * @param {{ page?: number, limit?: number, status?: 'active' | 'inactive' }} params
 */
export const listBranches = async (restaurantId, params = {}) => {
  const { data } = await api.get(branchesUrl(restaurantId), { params });
  return data.data;
};

export const getBranch = async (restaurantId, branchId) => {
  const { data } = await api.get(branchUrl(restaurantId, branchId));
  return data.data.branch;
};

/**
 * Updates a branch's core details (name / code).
 */
export const updateBranch = async (restaurantId, branchId, payload) => {
  const { data } = await api.patch(branchUrl(restaurantId, branchId), payload);
  return data.data.branch;
};

export const deleteBranch = async (restaurantId, branchId) => {
  const { data } = await api.delete(branchUrl(restaurantId, branchId));
  return data.data;
};

export const updateBranchAddress = async (restaurantId, branchId, address) => {
  const { data } = await api.patch(`${branchUrl(restaurantId, branchId)}/address`, { address });
  return data.data.address;
};

export const updateBranchContact = async (restaurantId, branchId, contact) => {
  const { data } = await api.patch(`${branchUrl(restaurantId, branchId)}/contact`, { contact });
  return data.data.contact;
};

export const updateBranchOperatingHours = async (restaurantId, branchId, operatingHours) => {
  const { data } = await api.put(`${branchUrl(restaurantId, branchId)}/operating-hours`, {
    operatingHours,
  });
  return data.data.operatingHours;
};

/**
 * Assigns (or unassigns, by passing null) a branch manager.
 * @param {string} restaurantId
 * @param {string} branchId
 * @param {string | null} managerId
 */
export const assignBranchManager = async (restaurantId, branchId, managerId) => {
  const { data } = await api.patch(`${branchUrl(restaurantId, branchId)}/manager`, { managerId });
  return data.data.manager;
};

/**
 * @param {'active' | 'inactive'} status
 */
export const updateBranchStatus = async (restaurantId, branchId, status) => {
  const { data } = await api.patch(`${branchUrl(restaurantId, branchId)}/status`, { status });
  return data.data.branch;
};

/**
 * Lists users eligible to be assigned as a branch manager
 * (owners, managers, and staff belonging to this restaurant).
 */
export const listEligibleManagers = async (restaurantId) => {
  const { data } = await api.get(`${branchesUrl(restaurantId)}/managers/eligible`);
  return data.data.managers;
};
