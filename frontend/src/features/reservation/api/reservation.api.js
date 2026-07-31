import api from '@/lib/axios';

const reservationsUrl = (restaurantId) => `/restaurants/${restaurantId}/reservations`;
const reservationUrl = (restaurantId, reservationId) => `${reservationsUrl(restaurantId)}/${reservationId}`;

/**
 * Creates a new reservation.
 */
export const createReservation = async (restaurantId, payload) => {
  const { data } = await api.post(reservationsUrl(restaurantId), payload);
  return data.data.reservation;
};

/**
 * Lists reservations, optionally filtered by date, branch, status, or searched by customer details.
 */
export const listReservations = async (restaurantId, params = {}) => {
  const { data } = await api.get(reservationsUrl(restaurantId), { params });
  return data.data;
};

/**
 * Fetches a single reservation by ID.
 */
export const getReservation = async (restaurantId, reservationId) => {
  const { data } = await api.get(reservationUrl(restaurantId, reservationId));
  return data.data.reservation;
};

/**
 * Updates an existing reservation.
 */
export const updateReservation = async (restaurantId, reservationId, payload) => {
  const { data } = await api.patch(reservationUrl(restaurantId, reservationId), payload);
  return data.data.reservation;
};

/**
 * Soft deletes a reservation.
 */
export const deleteReservation = async (restaurantId, reservationId) => {
  const { data } = await api.delete(reservationUrl(restaurantId, reservationId));
  return data.data;
};

/**
 * Specifically updates reservation status (e.g. check-in, cancel, confirm).
 */
export const updateReservationStatus = async (restaurantId, reservationId, status) => {
  const { data } = await api.patch(`${reservationUrl(restaurantId, reservationId)}/status`, { status });
  return data.data.reservation;
};

/**
 * Fetches dashboard counts (reservations today, upcoming, available/occupied tables).
 */
export const getDashboardStats = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reservationsUrl(restaurantId)}/stats`, { params });
  return data.data.stats;
};
