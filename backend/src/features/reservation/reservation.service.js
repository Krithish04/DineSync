const mongoose = require('mongoose');
const Reservation = require('./reservation.model');
const Table = require('../table/table.model');
const Branch = require('../branch/branch.model');
const ApiError = require('../../utils/ApiError');

// Helper to convert HH:mm string to minutes from midnight
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Helper to check if two time ranges overlap
const checkOverlap = (start1, duration1, start2, duration2) => {
  const end1 = start1 + duration1;
  const end2 = start2 + duration2;
  return start1 < end2 && start2 < end1;
};

/**
 * Validates a reservation candidate against business rules:
 * 1. Guest count <= table capacity.
 * 2. Booking falls within branch operating hours.
 * 3. Table is not already reserved during the requested slot (overlapping start/end).
 */
const validateReservationBusinessRules = async (restaurantId, payload, reservationId = null) => {
  const { branch: branchId, table: tableId, numberOfGuests, reservationDate, reservationTime, duration = 90 } = payload;

  // 1. Validate Table exists, is active, and matches capacity
  const table = await Table.findOne({ _id: tableId, restaurant: restaurantId, isDeleted: false });
  if (!table) {
    throw ApiError.notFound('Selected table not found.');
  }
  if (!table.isActive) {
    throw ApiError.badRequest('Selected table is currently inactive.');
  }
  if (numberOfGuests > table.capacity) {
    throw ApiError.badRequest(`Table capacity is ${table.capacity} guests, but booking is for ${numberOfGuests} guests.`);
  }

  // 2. Validate Branch exists and falls within operating hours
  const branch = await Branch.findOne({ _id: branchId, restaurant: restaurantId });
  if (!branch) {
    throw ApiError.notFound('Selected branch not found.');
  }
  if (branch.status === 'inactive') {
    throw ApiError.badRequest('Selected branch is currently inactive.');
  }

  // Find weekday weekdayName (e.g. 'monday')
  const dateObj = new Date(reservationDate);
  const dayIndex = dateObj.getDay(); // 0 = Sunday, 1 = Monday...
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const weekdayName = daysOfWeek[dayIndex];

  const daySchedule = branch.operatingHours.find((h) => h.day === weekdayName);
  if (!daySchedule || !daySchedule.isOpen) {
    throw ApiError.badRequest(`Branch is closed on ${weekdayName}s.`);
  }

  // Time slots checks
  const bookStart = timeToMinutes(reservationTime);
  const bookEnd = bookStart + duration;

  const inSlot = daySchedule.slots.some((slot) => {
    const slotStart = timeToMinutes(slot.open);
    const slotEnd = timeToMinutes(slot.close);
    return bookStart >= slotStart && bookEnd <= slotEnd;
  });

  if (!inSlot) {
    const slotRanges = daySchedule.slots.map((s) => `${s.open} to ${s.close}`).join(', ');
    throw ApiError.badRequest(`Selected reservation time falls outside operating hours on ${weekdayName} (${slotRanges}).`);
  }

  // 3. Double Booking Check (Overlap Check)
  const activeBookings = await Reservation.find({
    table: tableId,
    reservationDate: reservationDate,
    reservationStatus: { $in: ['Pending', 'Confirmed', 'Seated'] },
    isDeleted: false,
    _id: { $ne: reservationId }, // exclude self if editing
  });

  const isOverlapping = activeBookings.some((b) => {
    const bStart = timeToMinutes(b.reservationTime);
    return checkOverlap(bookStart, duration, bStart, b.duration);
  });

  if (isOverlapping) {
    throw ApiError.conflict('Double booking error: This table is already reserved during the requested time range.');
  }
};

/**
 * Creates a new reservation.
 */
const createReservation = async (restaurantId, payload, userId = null) => {
  await validateReservationBusinessRules(restaurantId, payload);

  const reservation = await Reservation.create({
    ...payload,
    restaurant: restaurantId,
    createdBy: userId,
  });

  // If status starts as Seated, auto occupy table
  if (reservation.reservationStatus === 'Seated') {
    await Table.updateOne({ _id: payload.table }, { status: 'Occupied' });
  } else if (reservation.reservationStatus === 'Confirmed') {
    await Table.updateOne({ _id: payload.table }, { status: 'Reserved' });
  }

  return reservation;
};

/**
 * Lists reservations. Supports searching, filtering by branch/status/date, and pagination.
 */
const listReservations = async (restaurantId, { page = 1, limit = 20, branch, status, date, search = '' }) => {
  const query = { restaurant: restaurantId, isDeleted: false };

  if (branch) {
    query.branch = branch;
  }

  if (status) {
    query.reservationStatus = status;
  }

  if (date) {
    query.reservationDate = date; // matches 'YYYY-MM-DD'
  }

  if (search) {
    query.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
      { reservationNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Reservation.find(query)
      .sort({ reservationDate: 1, reservationTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate('branch', 'name code')
      .populate('table', 'tableNumber tableName capacity'),
    Reservation.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Gets a single reservation.
 */
const getReservation = async (restaurantId, reservationId) => {
  const reservation = await Reservation.findOne({
    _id: reservationId,
    restaurant: restaurantId,
    isDeleted: false,
  })
    .populate('branch', 'name code')
    .populate('table', 'tableNumber tableName capacity');

  if (!reservation) {
    throw ApiError.notFound('Reservation not found.');
  }

  return reservation;
};

/**
 * Updates a reservation.
 */
const updateReservation = async (restaurantId, reservationId, updates) => {
  const reservation = await Reservation.findOne({
    _id: reservationId,
    restaurant: restaurantId,
    isDeleted: false,
  });

  if (!reservation) {
    throw ApiError.notFound('Reservation not found.');
  }

  // Merge updates onto current values to run validations
  const merged = {
    branch: updates.branch || reservation.branch.toString(),
    table: updates.table || reservation.table.toString(),
    numberOfGuests: updates.numberOfGuests !== undefined ? updates.numberOfGuests : reservation.numberOfGuests,
    reservationDate: updates.reservationDate || reservation.reservationDate,
    reservationTime: updates.reservationTime || reservation.reservationTime,
    duration: updates.duration !== undefined ? updates.duration : reservation.duration,
  };

  // Re-run capacity/operating hours/overlap checks
  await validateReservationBusinessRules(restaurantId, merged, reservationId);

  // If table is changing, check statuses
  const oldTableId = reservation.table.toString();
  const newTableId = merged.table;
  const currentStatus = updates.reservationStatus || reservation.reservationStatus;

  Object.assign(reservation, updates);
  await reservation.save();

  // Handle table occupancy changes if status changed or table changed
  if (oldTableId !== newTableId) {
    // Revert old table status if relevant
    if (reservation.reservationStatus === 'Seated') {
      await Table.updateOne({ _id: oldTableId }, { status: 'Available' });
      await Table.updateOne({ _id: newTableId }, { status: 'Occupied' });
    } else if (reservation.reservationStatus === 'Confirmed') {
      await Table.updateOne({ _id: oldTableId }, { status: 'Available' });
      await Table.updateOne({ _id: newTableId }, { status: 'Reserved' });
    }
  } else {
    if (updates.reservationStatus) {
      if (updates.reservationStatus === 'Seated') {
        await Table.updateOne({ _id: newTableId }, { status: 'Occupied' });
      } else if (updates.reservationStatus === 'Completed') {
        await Table.updateOne({ _id: newTableId }, { status: 'Available' });
      } else if (['Cancelled', 'No Show'].includes(updates.reservationStatus)) {
        await Table.updateOne({ _id: newTableId }, { status: 'Available' });
      } else if (updates.reservationStatus === 'Confirmed') {
        await Table.updateOne({ _id: newTableId }, { status: 'Reserved' });
      }
    }
  }

  await reservation.populate('branch', 'name code');
  await reservation.populate('table', 'tableNumber tableName capacity');

  return reservation;
};

/**
 * Soft deletes a reservation.
 */
const deleteReservation = async (restaurantId, reservationId) => {
  const reservation = await Reservation.findOne({
    _id: reservationId,
    restaurant: restaurantId,
    isDeleted: false,
  });

  if (!reservation) {
    throw ApiError.notFound('Reservation not found.');
  }

  reservation.isDeleted = true;
  reservation.deletedAt = new Date();
  await reservation.save();

  // Revert table status back to Available if it was occupied/reserved by this booking
  if (['Pending', 'Confirmed', 'Seated'].includes(reservation.reservationStatus)) {
    await Table.updateOne({ _id: reservation.table }, { status: 'Available' });
  }

  return { deleted: true };
};

/**
 * Specifically updates reservation status.
 */
const updateReservationStatus = async (restaurantId, reservationId, newStatus) => {
  const reservation = await Reservation.findOne({
    _id: reservationId,
    restaurant: restaurantId,
    isDeleted: false,
  });

  if (!reservation) {
    throw ApiError.notFound('Reservation not found.');
  }

  reservation.reservationStatus = newStatus;
  await reservation.save();

  // Sync table status
  if (newStatus === 'Seated') {
    await Table.updateOne({ _id: reservation.table }, { status: 'Occupied' });
  } else if (newStatus === 'Completed' || ['Cancelled', 'No Show'].includes(newStatus)) {
    await Table.updateOne({ _id: reservation.table }, { status: 'Available' });
  } else if (newStatus === 'Confirmed') {
    await Table.updateOne({ _id: reservation.table }, { status: 'Reserved' });
  }

  await reservation.populate('branch', 'name code');
  await reservation.populate('table', 'tableNumber tableName capacity');

  return reservation;
};

/**
 * Fetches dashboard statistics counts.
 */
const getDashboardStats = async (restaurantId, branchId = null) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const reservationQuery = { restaurant: restaurantId, isDeleted: false };
  const tableQuery = { restaurant: restaurantId, isDeleted: false };

  if (branchId) {
    reservationQuery.branch = branchId;
    tableQuery.branch = branchId;
  }

  // Count reservations
  const [
    todayCount,
    upcomingCount,
    completedCount,
    cancelledCount,
    availableTables,
    occupiedTables,
  ] = await Promise.all([
    // Today's Bookings
    Reservation.countDocuments({ ...reservationQuery, reservationDate: todayStr }),
    // Upcoming Bookings (Future dates, plus today's bookings in Pending/Confirmed status)
    Reservation.countDocuments({
      ...reservationQuery,
      $or: [
        { reservationDate: { $gt: todayStr }, reservationStatus: { $in: ['Pending', 'Confirmed'] } },
        { reservationDate: todayStr, reservationStatus: { $in: ['Pending', 'Confirmed'] } },
      ],
    }),
    // Completed Bookings (All time)
    Reservation.countDocuments({ ...reservationQuery, reservationStatus: 'Completed' }),
    // Cancelled Bookings (All time)
    Reservation.countDocuments({ ...reservationQuery, reservationStatus: 'Cancelled' }),
    // Tables Available count
    Table.countDocuments({ ...tableQuery, status: 'Available', isActive: true }),
    // Tables Occupied count
    Table.countDocuments({ ...tableQuery, status: 'Occupied', isActive: true }),
  ]);

  return {
    todayReservations: todayCount,
    upcomingReservations: upcomingCount,
    completedReservations: completedCount,
    cancelledReservations: cancelledCount,
    availableTables,
    occupiedTables,
  };
};

module.exports = {
  createReservation,
  listReservations,
  getReservation,
  updateReservation,
  deleteReservation,
  updateReservationStatus,
  getDashboardStats,
};
