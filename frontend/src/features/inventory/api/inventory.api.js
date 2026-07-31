import api from '@/lib/axios';

const inventoryUrl = (restaurantId) => `/restaurants/${restaurantId}/inventory`;

// Suppliers
export const createSupplier = async (restaurantId, payload) => {
  const { data } = await api.post(`${inventoryUrl(restaurantId)}/suppliers`, payload);
  return data.data.supplier;
};

export const listSuppliers = async (restaurantId) => {
  const { data } = await api.get(`${inventoryUrl(restaurantId)}/suppliers`);
  return data.data.suppliers;
};

export const updateSupplier = async (restaurantId, supplierId, payload) => {
  const { data } = await api.patch(`${inventoryUrl(restaurantId)}/suppliers/${supplierId}`, payload);
  return data.data.supplier;
};

export const deleteSupplier = async (restaurantId, supplierId) => {
  const { data } = await api.delete(`${inventoryUrl(restaurantId)}/suppliers/${supplierId}`);
  return data.data;
};

// Ingredients
export const createIngredient = async (restaurantId, payload) => {
  const { data } = await api.post(`${inventoryUrl(restaurantId)}/ingredients`, payload);
  return data.data.ingredient;
};

export const listIngredients = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${inventoryUrl(restaurantId)}/ingredients`, { params });
  return data.data.ingredients;
};

export const updateIngredient = async (restaurantId, ingredientId, payload) => {
  const { data } = await api.patch(`${inventoryUrl(restaurantId)}/ingredients/${ingredientId}`, payload);
  return data.data.ingredient;
};

export const deleteIngredient = async (restaurantId, ingredientId) => {
  const { data } = await api.delete(`${inventoryUrl(restaurantId)}/ingredients/${ingredientId}`);
  return data.data;
};

// Recipes
export const upsertRecipe = async (restaurantId, payload) => {
  const { data } = await api.post(`${inventoryUrl(restaurantId)}/recipes`, payload);
  return data.data.recipe;
};

export const getRecipeForMenuItem = async (restaurantId, menuItemId) => {
  const { data } = await api.get(`${inventoryUrl(restaurantId)}/recipes/menu-item/${menuItemId}`);
  return data.data.recipe;
};

// Purchases
export const createPurchase = async (restaurantId, payload) => {
  const { data } = await api.post(`${inventoryUrl(restaurantId)}/purchases`, payload);
  return data.data.purchase;
};

export const listPurchases = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${inventoryUrl(restaurantId)}/purchases`, { params });
  return data.data.purchases;
};

// Stock Adjustments & Stats
export const adjustStock = async (restaurantId, payload) => {
  const { data } = await api.post(`${inventoryUrl(restaurantId)}/stock/adjust`, payload);
  return data.data;
};

export const listStockTransactions = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${inventoryUrl(restaurantId)}/stock/transactions`, { params });
  return data.data.transactions;
};

export const getInventoryStats = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${inventoryUrl(restaurantId)}/stats`, { params });
  return data.data.stats;
};
