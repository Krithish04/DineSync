import api from '@/lib/axios';

const publicUrl = (restaurantId) => `/public/restaurants/${restaurantId}`;

export const resolveQrCode = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/qr-resolve`, { params });
  return data.data;
};

export const getPublicMenu = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/menu`, { params });
  return data.data;
};

export const placeCustomerOrder = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/orders`, payload);
  return data.data.order;
};

export const claimTableHost = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/claim-table`, payload);
  return data.data;
};

export const releaseTableHost = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/release-table`, payload);
  return data.data;
};

export const trackLiveOrder = async (restaurantId, orderId) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/orders/${orderId}/track`);
  return data.data;
};

export const payCustomerOrder = async (restaurantId, orderId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/orders/${orderId}/pay`, payload);
  return data.data;
};

export const cancelCustomerOrder = async (restaurantId, orderId) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/orders/${orderId}/cancel`);
  return data.data;
};

export const submitCustomerFeedback = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/feedback`, payload);
  return data.data.feedback;
};

export const submitFeedback = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/feedback`, payload);
  return data.data;
};
