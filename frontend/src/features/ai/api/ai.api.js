import api from '@/lib/axios';

const aiUrl = (restaurantId) => `/restaurants/${restaurantId}/ai`;

export const getAiDashboardOverview = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${aiUrl(restaurantId)}/overview`, { params });
  return data.data;
};

export const getSalesForecast = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${aiUrl(restaurantId)}/sales-forecast`, { params });
  return data.data;
};

export const getDemandForecast = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${aiUrl(restaurantId)}/demand-forecast`, { params });
  return data.data;
};

export const getInventoryForecast = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${aiUrl(restaurantId)}/inventory-forecast`, { params });
  return data.data;
};

export const getCustomerRecommendations = async (restaurantId) => {
  const { data } = await api.get(`${aiUrl(restaurantId)}/customer-recommendations`);
  return data.data;
};

export const getSmartMenuRecommendations = async (restaurantId) => {
  const { data } = await api.get(`${aiUrl(restaurantId)}/smart-menu`);
  return data.data;
};

export const getWaitTimePrediction = async (restaurantId) => {
  const { data } = await api.get(`${aiUrl(restaurantId)}/wait-time`);
  return data.data;
};

export const getFoodWastePrediction = async (restaurantId) => {
  const { data } = await api.get(`${aiUrl(restaurantId)}/food-waste`);
  return data.data;
};

export const getSentimentAnalysis = async (restaurantId) => {
  const { data } = await api.get(`${aiUrl(restaurantId)}/sentiment`);
  return data.data;
};
