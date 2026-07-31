import api from '@/lib/axios';

const kitchenUrl = (restaurantId) => `/restaurants/${restaurantId}/kitchen`;
const ticketUrl = (restaurantId, ticketId) => `${kitchenUrl(restaurantId)}/${ticketId}`;

/**
 * Lists active kitchen tickets, optionally filtered by branch, station, or status.
 */
export const listTickets = async (restaurantId, params = {}) => {
  const { data } = await api.get(kitchenUrl(restaurantId), { params });
  return data.data.tickets;
};

/**
 * Updates status of an entire kitchen ticket (e.g. Accept, Mark Ready).
 */
export const updateTicketStatus = async (restaurantId, ticketId, status) => {
  const { data } = await api.patch(`${ticketUrl(restaurantId, ticketId)}/status`, { status });
  return data.data.ticket;
};

/**
 * Updates status of an individual item in a kitchen ticket.
 */
export const updateTicketItemStatus = async (restaurantId, ticketId, itemId, status) => {
  const { data } = await api.patch(
    `${ticketUrl(restaurantId, ticketId)}/items/${itemId}/status`,
    { status }
  );
  return data.data.ticket;
};

/**
 * Fetches statistics counts (Pending, Preparing, Ready, Delayed) and average preparation times.
 */
export const getKitchenStats = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${kitchenUrl(restaurantId)}/stats`, { params });
  return data.data.stats;
};
