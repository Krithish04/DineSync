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

export const getActiveTableSession = async (restaurantId, tableId) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/tables/${tableId}/session`);
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

export const settleTableSession = async (restaurantId, sessionId, payload = {}) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/sessions/${sessionId}/settle`, payload);
  return data.data;
};

export const releaseTableSession = async (restaurantId, sessionId, payload = {}) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/sessions/${sessionId}/release`, payload);
  return data.data;
};

export const releaseTableHost = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/release-table`, payload);
  return data.data;
};

export const getActiveTableOrders = async (restaurantId, tableId) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/table-orders/${tableId}`);
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

export const requestAssistance = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/assist-request`, payload);
  return data.data;
};

// Customer OTP Authentication & Profile API
export const sendCustomerOtp = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/customer-auth/send-otp`, payload);
  return data.data;
};

export const verifyCustomerOtp = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/customer-auth/verify-otp`, payload);
  return data.data;
};

export const getCustomerProfile = async (restaurantId) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/customer-auth/me`);
  return data.data.customer;
};

export const getCustomerOrders = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/customer-auth/my-orders`, { params });
  return data.data;
};

export const createReservation = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/reservations`, payload);
  return data.data;
};

export const getMyReservations = async (restaurantId) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/reservations/mine`);
  return data.data.reservations;
};

export const checkTableReservationLock = async (restaurantId, tableId) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/tables/${tableId}/reservation-lock`);
  return data.data;
};

export const verifyReservationPhone = async (restaurantId, tableId, phone) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/tables/${tableId}/verify-reservation-phone`, { phone });
  return data.data;
};

// AI Chatbot APIs
export const sendChatMessage = async (restaurantId, payload) => {
  const { data } = await api.post(`${publicUrl(restaurantId)}/chatbot/chat`, {
    restaurantId,
    ...payload,
  });
  return data.data;
};

export const getChatbotSettings = async (restaurantId) => {
  const { data } = await api.get(`${publicUrl(restaurantId)}/chatbot/settings`, {
    params: { restaurantId },
  });
  return data.data;
};

export const updateChatbotSettings = async (restaurantId, payload) => {
  const { data } = await api.put(`/restaurants/${restaurantId}/chatbot/settings`, {
    restaurantId,
    ...payload,
  });
  return data.data;
};

export const getChatbotAnalytics = async (restaurantId) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/chatbot/analytics`, {
    params: { restaurantId },
  });
  return data.data;
};
