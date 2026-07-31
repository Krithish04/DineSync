const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const reservationService = require('./reservation.service');

const createReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.createReservation(
    req.params.restaurantId,
    req.body,
    req.user?._id
  );
  return new ApiResponse(201, { reservation }, 'Reservation created successfully').send(res);
});

const listReservations = asyncHandler(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const search = req.query.search || '';
  const branch = req.query.branch || undefined;
  const status = req.query.status || undefined;
  const date = req.query.date || undefined;

  const result = await reservationService.listReservations(req.params.restaurantId, {
    page,
    limit,
    search,
    branch,
    status,
    date,
  });

  return new ApiResponse(200, result, 'Reservations fetched successfully').send(res);
});

const getReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.getReservation(
    req.params.restaurantId,
    req.params.reservationId
  );
  return new ApiResponse(200, { reservation }, 'Reservation fetched successfully').send(res);
});

const updateReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.updateReservation(
    req.params.restaurantId,
    req.params.reservationId,
    req.body
  );
  return new ApiResponse(200, { reservation }, 'Reservation updated successfully').send(res);
});

const deleteReservation = asyncHandler(async (req, res) => {
  await reservationService.deleteReservation(req.params.restaurantId, req.params.reservationId);
  return new ApiResponse(200, null, 'Reservation deleted successfully').send(res);
});

const updateReservationStatus = asyncHandler(async (req, res) => {
  const reservation = await reservationService.updateReservationStatus(
    req.params.restaurantId,
    req.params.reservationId,
    req.body.status
  );
  return new ApiResponse(200, { reservation }, 'Reservation status updated successfully').send(res);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const branchId = req.query.branch || null;
  const stats = await reservationService.getDashboardStats(req.params.restaurantId, branchId);
  return new ApiResponse(200, { stats }, 'Dashboard stats fetched successfully').send(res);
});

module.exports = {
  createReservation,
  listReservations,
  getReservation,
  updateReservation,
  deleteReservation,
  updateReservationStatus,
  getDashboardStats,
};
