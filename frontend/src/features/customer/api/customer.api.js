import api from '@/lib/axios';

const customersUrl = (restaurantId) => `/restaurants/${restaurantId}/customers`;

export const createCustomer = async (restaurantId, payload) => {
  const { data } = await api.post(customersUrl(restaurantId), payload);
  return data.data.customer;
};

export const listCustomers = async (restaurantId, params = {}) => {
  const { data } = await api.get(customersUrl(restaurantId), { params });
  return data.data.customers;
};

export const getCustomer = async (restaurantId, customerId) => {
  const { data } = await api.get(`${customersUrl(restaurantId)}/${customerId}`);
  return data.data; // contains customer, orders, reservations
};

export const updateCustomer = async (restaurantId, customerId, payload) => {
  const { data } = await api.patch(`${customersUrl(restaurantId)}/${customerId}`, payload);
  return data.data.customer;
};

export const deleteCustomer = async (restaurantId, customerId) => {
  const { data } = await api.delete(`${customersUrl(restaurantId)}/${customerId}`);
  return data.data;
};

export const awardBirthdayReward = async (restaurantId, customerId) => {
  const { data } = await api.post(`${customersUrl(restaurantId)}/${customerId}/birthday`);
  return data.data.customer;
};

export const adjustPoints = async (restaurantId, customerId, points, reason) => {
  const { data } = await api.post(`${customersUrl(restaurantId)}/${customerId}/adjust`, { points, reason });
  return data.data.customer;
};

export const listLoyaltyTransactions = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${customersUrl(restaurantId)}/loyalty/transactions`, { params });
  return data.data.transactions;
};

export const getCustomerStats = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${customersUrl(restaurantId)}/stats`, { params });
  return data.data.stats;
};

export const getCustomerReports = async (restaurantId) => {
  const { data } = await api.get(`${customersUrl(restaurantId)}/reports/analytics`);
  return data.data.reports;
};
