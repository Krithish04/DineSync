import api from '@/lib/axios';

const ordersUrl = (restaurantId) => `/restaurants/${restaurantId}/orders`;
const orderUrl = (restaurantId, orderId) => `${ordersUrl(restaurantId)}/${orderId}`;

/**
 * Creates a new order (Dine-In, Takeaway, Delivery, QR Order).
 */
export const createOrder = async (restaurantId, payload) => {
  const { data } = await api.post(ordersUrl(restaurantId), payload);
  return data.data.order;
};

/**
 * Lists orders with filters and pagination.
 */
export const listOrders = async (restaurantId, params = {}) => {
  const { data } = await api.get(ordersUrl(restaurantId), { params });
  return data.data;
};

/**
 * Fetches details of a single order.
 */
export const getOrder = async (restaurantId, orderId) => {
  const { data } = await api.get(orderUrl(restaurantId, orderId));
  return data.data.order;
};

/**
 * Updates order details (e.g. cart items or internal notes).
 */
export const updateOrder = async (restaurantId, orderId, payload) => {
  const { data } = await api.patch(orderUrl(restaurantId, orderId), payload);
  return data.data.order;
};

/**
 * Soft deletes/cancels an order.
 */
export const deleteOrder = async (restaurantId, orderId) => {
  const { data } = await api.delete(orderUrl(restaurantId, orderId));
  return data.data;
};

/**
 * Updates order status (e.g. Accepted, Preparing, Ready, Served, Completed).
 */
export const updateOrderStatus = async (restaurantId, orderId, status) => {
  const { data } = await api.patch(`${orderUrl(restaurantId, orderId)}/status`, { status });
  return data.data.order;
};

/**
 * Updates order payment status (Pending, Paid, Refunded).
 */
export const updatePaymentStatus = async (restaurantId, orderId, status) => {
  const { data } = await api.patch(`${orderUrl(restaurantId, orderId)}/payment`, { status });
  return data.data.order;
};

/**
 * Processes bill splitting (equal divide or item-wise split).
 */
export const splitBill = async (restaurantId, orderId, splitPayload) => {
  const { data } = await api.post(`${orderUrl(restaurantId, orderId)}/split`, splitPayload);
  return data.data;
};

/**
 * Merges multiple source orders into a target order.
 */
export const mergeOrders = async (restaurantId, targetOrderId, sourceOrderIds) => {
  const { data } = await api.post(`${ordersUrl(restaurantId)}/merge`, {
    targetOrderId,
    sourceOrderIds,
  });
  return data.data.order;
};
