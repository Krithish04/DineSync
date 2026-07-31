import api from '@/lib/axios';

const categoriesUrl = (restaurantId) => `/restaurants/${restaurantId}/categories`;
const categoryUrl = (restaurantId, categoryId) => `${categoriesUrl(restaurantId)}/${categoryId}`;

/**
 * Creates a new category under a restaurant.
 */
export const createCategory = async (restaurantId, payload) => {
  const { data } = await api.post(categoriesUrl(restaurantId), payload);
  return data.data.category;
};

/**
 * Lists categories for a restaurant, optionally paginated, searched, or filtered.
 */
export const listCategories = async (restaurantId, params = {}) => {
  const { data } = await api.get(categoriesUrl(restaurantId), { params });
  return data.data;
};

/**
 * Fetches a single category.
 */
export const getCategory = async (restaurantId, categoryId) => {
  const { data } = await api.get(categoryUrl(restaurantId, categoryId));
  return data.data.category;
};

/**
 * Updates a category.
 */
export const updateCategory = async (restaurantId, categoryId, payload) => {
  const { data } = await api.patch(categoryUrl(restaurantId, categoryId), payload);
  return data.data.category;
};

/**
 * Deletes a category.
 */
export const deleteCategory = async (restaurantId, categoryId) => {
  const { data } = await api.delete(categoryUrl(restaurantId, categoryId));
  return data.data;
};
