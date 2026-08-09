import api from '@/lib/axios';

const tablesUrl = (restaurantId) => `/restaurants/${restaurantId}/tables`;
const tableUrl = (restaurantId, tableId) => `${tablesUrl(restaurantId)}/${tableId}`;

/**
 * Creates a new table under a restaurant.
 */
export const createTable = async (restaurantId, payload) => {
  const { data } = await api.post(tablesUrl(restaurantId), payload);
  return data.data.table;
};

/**
 * Lists tables for a restaurant, optionally paginated, searched, or filtered.
 */
export const listTables = async (restaurantId, params = {}) => {
  const { data } = await api.get(tablesUrl(restaurantId), { params });
  return data.data;
};

/**
 * Fetches a single table.
 */
export const getTable = async (restaurantId, tableId) => {
  const { data } = await api.get(tableUrl(restaurantId, tableId));
  return data.data.table;
};

/**
 * Updates table details.
 */
export const updateTable = async (restaurantId, tableId, payload) => {
  const { data } = await api.patch(tableUrl(restaurantId, tableId), payload);
  return data.data.table;
};

/**
 * Soft deletes a table.
 */
export const deleteTable = async (restaurantId, tableId) => {
  const { data } = await api.delete(tableUrl(restaurantId, tableId));
  return data.data;
};

/**
 * Updates a table's occupancy/operation status.
 */
export const updateTableStatus = async (restaurantId, tableId, status) => {
  const { data } = await api.patch(`${tableUrl(restaurantId, tableId)}/status`, { status });
  return data.data.table;
};

/**
 * Fetches active session order details for a table (Manager/Staff authenticated view).
 */
export const getTableSession = async (restaurantId, tableId) => {
  const { data } = await api.get(`${tableUrl(restaurantId, tableId)}/session`);
  return data.data;
};

/**
 * Merges multiple secondary tables into a primary table.
 */
export const mergeTables = async (restaurantId, primaryTableId, tableIds) => {
  const { data } = await api.post(`${tableUrl(restaurantId, primaryTableId)}/merge`, { tableIds });
  return data.data.table;
};

/**
 * Unmerges a primary table seating group.
 */
export const unmergeTables = async (restaurantId, primaryTableId, force = false) => {
  const { data } = await api.post(`${tableUrl(restaurantId, primaryTableId)}/unmerge`, { force });
  return data.data.table;
};
