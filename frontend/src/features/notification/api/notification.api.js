import api from '@/lib/axios';

const notifUrl = (restaurantId) => `/restaurants/${restaurantId}/notifications`;

export const listNotifications = async (restaurantId, params = {}) => {
  const { data } = await api.get(notifUrl(restaurantId), { params });
  return data.data;
};

export const markAsRead = async (restaurantId, notificationId) => {
  const { data } = await api.patch(`${notifUrl(restaurantId)}/${notificationId}/read`);
  return data.data.notification;
};

export const markAllAsRead = async (restaurantId) => {
  const { data } = await api.patch(`${notifUrl(restaurantId)}/read-all`);
  return data.data;
};

export const archiveNotification = async (restaurantId, notificationId) => {
  const { data } = await api.patch(`${notifUrl(restaurantId)}/${notificationId}/archive`);
  return data.data.notification;
};

export const deleteNotification = async (restaurantId, notificationId) => {
  const { data } = await api.delete(`${notifUrl(restaurantId)}/${notificationId}`);
  return data.data;
};

export const getPreferences = async (restaurantId) => {
  const { data } = await api.get(`${notifUrl(restaurantId)}/preferences`);
  return data.data.preference;
};

export const updatePreferences = async (restaurantId, payload) => {
  const { data } = await api.put(`${notifUrl(restaurantId)}/preferences`, payload);
  return data.data.preference;
};

export const getJobLogs = async (restaurantId) => {
  const { data } = await api.get(`${notifUrl(restaurantId)}/jobs`);
  return data.data.jobs;
};
