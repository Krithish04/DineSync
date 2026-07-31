import api from '@/lib/axios';

/**
 * Fetches the full restaurant document (used sparingly — prefer the
 * feature-scoped getters below for individual settings pages).
 */
export const getRestaurant = async (restaurantId) => {
  const { data } = await api.get(`/restaurants/${restaurantId}`);
  return data.data.restaurant;
};

// --- Profile ---
export const getProfile = async (restaurantId) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/profile`);
  return data.data.profile;
};

export const updateProfile = async (restaurantId, payload) => {
  const { data } = await api.patch(`/restaurants/${restaurantId}/profile`, payload);
  return data.data.profile;
};

// --- Settings ---
export const getSettings = async (restaurantId) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/settings`);
  return data.data.settings;
};

export const updateSettings = async (restaurantId, payload) => {
  const { data } = await api.patch(`/restaurants/${restaurantId}/settings`, payload);
  return data.data.settings;
};

// --- GST ---
export const getGst = async (restaurantId) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/gst`);
  return data.data.gst;
};

export const updateGst = async (restaurantId, payload) => {
  const { data } = await api.patch(`/restaurants/${restaurantId}/gst`, payload);
  return data.data.gst;
};

// --- Opening hours ---
export const getOpeningHours = async (restaurantId) => {
  const { data } = await api.get(`/restaurants/${restaurantId}/opening-hours`);
  return data.data.openingHours;
};

export const updateOpeningHours = async (restaurantId, openingHours) => {
  const { data } = await api.put(`/restaurants/${restaurantId}/opening-hours`, { openingHours });
  return data.data.openingHours;
};
