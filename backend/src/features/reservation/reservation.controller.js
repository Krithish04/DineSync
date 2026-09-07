const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const reservationService = require('./reservation.service');
const reservationAiService = require('./reservationAi.service');
const RecurringReservation = require('./recurringReservation.model');
const ApiError = require('../../utils/ApiError');

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
  const stats = await reservationService.getDashboardStats(req.params.restaurantId);
  return new ApiResponse(200, { stats }, 'Dashboard stats fetched successfully').send(res);
});

// AI Reservation Controllers
const parseAiBookingQuery = asyncHandler(async (req, res) => {
  const { query } = req.body;
  const result = await reservationAiService.parseNaturalLanguageBooking(req.params.restaurantId, query);
  return new ApiResponse(200, result, 'Natural language booking query parsed successfully').send(res);
});

const getRecommendedTimeSlots = asyncHandler(async (req, res) => {
  const { date, partySize } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const size = partySize ? parseInt(partySize, 10) : 2;

  const result = await reservationAiService.recommendOptimalBookingSlots(req.params.restaurantId, targetDate, size);
  return new ApiResponse(200, result, 'Optimal time slots recommended successfully').send(res);
});

const createRecurringReservation = asyncHandler(async (req, res) => {
  const { dayOfWeek, preferredTime, numberOfGuests, table, specialRequests } = req.body;
  if (!dayOfWeek || !preferredTime) {
    throw ApiError.badRequest('dayOfWeek and preferredTime are required for recurring bookings.');
  }

  const profile = await RecurringReservation.create({
    restaurant: req.params.restaurantId,
    customer: req.user?._id || null,
    customerName: req.body.customerName || req.user?.name || 'Guest Diner',
    customerPhone: req.body.customerPhone || '9999999999',
    customerEmail: req.body.customerEmail || req.user?.email || '',
    dayOfWeek,
    preferredTime,
    numberOfGuests: numberOfGuests || 2,
    table: table || null,
    specialRequests: specialRequests || '',
  });

  return new ApiResponse(201, { recurringProfile: profile }, 'Recurring weekly reservation profile created successfully').send(res);
});

const listRecurringReservations = asyncHandler(async (req, res) => {
  const profiles = await RecurringReservation.find({
    restaurant: req.params.restaurantId,
    isActive: true,
  }).sort({ createdAt: -1 }).lean();

  return new ApiResponse(200, { recurringProfiles: profiles }, 'Recurring reservation profiles fetched successfully').send(res);
});

module.exports = {
  createReservation,
  listReservations,
  getReservation,
  updateReservation,
  deleteReservation,
  updateReservationStatus,
  getDashboardStats,
  parseAiBookingQuery,
  getRecommendedTimeSlots,
  createRecurringReservation,
  listRecurringReservations,
};
