import api from '@/lib/axios';

const menuItemsUrl = (restaurantId) => `/restaurants/${restaurantId}/menu-items`;
const menuItemUrl = (restaurantId, menuItemId) => `${menuItemsUrl(restaurantId)}/${menuItemId}`;

/**
 * Creates a new menu item.
 */
export const createMenuItem = async (restaurantId, payload) => {
  const { data } = await api.post(menuItemsUrl(restaurantId), payload);
  return data.data.menuItem;
};

/**
 * Lists menu items, optionally filtered, searched, or paginated.
 */
export const listMenuItems = async (restaurantId, params = {}) => {
  const { data } = await api.get(menuItemsUrl(restaurantId), { params });
  return data.data;
};

/**
 * Fetches a single menu item.
 */
export const getMenuItem = async (restaurantId, menuItemId) => {
  const { data } = await api.get(menuItemUrl(restaurantId, menuItemId));
  return data.data.menuItem;
};

/**
 * Updates a menu item.
 */
export const updateMenuItem = async (restaurantId, menuItemId, payload) => {
  const { data } = await api.patch(menuItemUrl(restaurantId, menuItemId), payload);
  return data.data.menuItem;
};

/**
 * Deletes a menu item.
 */
export const deleteMenuItem = async (restaurantId, menuItemId) => {
  const { data } = await api.delete(menuItemUrl(restaurantId, menuItemId));
  return data.data;
};
