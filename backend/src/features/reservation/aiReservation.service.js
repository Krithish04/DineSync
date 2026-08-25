const Reservation = require('./reservation.model');
const Table = require('../table/table.model');
const socketConfig = require('../../config/socket.config');
const ApiError = require('../../utils/ApiError');

// Helper to convert "HH:mm" string to minutes from midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Helper to get current time in "HH:mm" format and total minutes
const getCurrentTimeMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

// Clean up phone number strings for flexible comparison (digits only)
const normalizePhone = (phoneStr) => {
  if (!phoneStr) return '';
  return phoneStr.replace(/\D/g, '').slice(-10); // Match last 10 digits
};

/**
 * Checks if a table is currently locked by an upcoming or active reservation
 * (Active window: 15 mins BEFORE reservationTime to 15 mins AFTER reservationTime).
 */
const checkTableLockStatus = async (restaurantId, tableId) => {
  if (!tableId) return { isLocked: false };

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMins = getCurrentTimeMinutes();

  const reservations = await Reservation.find({
    table: tableId,
    reservationDate: todayStr,
    reservationStatus: { $in: ['Pending', 'Confirmed'] },
    isDeleted: false,
  }).populate('table', 'tableNumber tableName status');

  for (const res of reservations) {
    const resMins = timeToMinutes(res.reservationTime);
    const lockStart = resMins - 15; // 15 mins before reservation time
    const lockEnd = resMins + 15;   // 15 mins grace period after reservation time

    if (currentMins >= lockStart && currentMins <= lockEnd) {
      return {
        isLocked: true,
        reservationId: res._id,
        tableNumber: res.table?.tableNumber || '',
        customerName: res.customerName,
        customerPhoneMasked: res.customerPhone ? `******${res.customerPhone.slice(-4)}` : '',
        reservationTime: res.reservationTime,
        lockStartMins: lockStart,
        lockEndMins: lockEnd,
        minutesUntilCancellation: Math.max(0, lockEnd - currentMins),
      };
    }
  }

  return { isLocked: false };
};

/**
 * Verifies registered mobile number entered by guest at table.
 * If matched: sets reservation to "Seated", table to "Occupied", and unlocks menu.
 */
const verifyGuestPhoneToUnlock = async (restaurantId, { tableId, phoneNumber }) => {
  if (!tableId || !phoneNumber) {
    throw ApiError.badRequest('Table ID and registered phone number are required.');
  }

  const lockStatus = await checkTableLockStatus(restaurantId, tableId);
  if (!lockStatus.isLocked) {
    return { success: true, message: 'Table is not locked by reservation.' };
  }

  const reservation = await Reservation.findOne({
    _id: lockStatus.reservationId,
    isDeleted: false,
  });

  if (!reservation) {
    throw ApiError.notFound('Reservation booking not found.');
  }

  const inputNorm = normalizePhone(phoneNumber);
  const regNorm = normalizePhone(reservation.customerPhone);

  if (!inputNorm || !regNorm || inputNorm !== regNorm) {
    throw ApiError.badRequest(`Registered phone number does not match reservation for Table ${lockStatus.tableNumber}. Please re-check your booking details.`);
  }

  // Verification successful! Transition status to Seated & Table to Occupied
  reservation.reservationStatus = 'Seated';
  await reservation.save();

  await Table.updateOne({ _id: tableId }, { status: 'Occupied' });

  // Broadcast real-time Socket.IO events
  const targetRestId = restaurantId || reservation.restaurant;
  socketConfig.broadcastEvent(targetRestId, 'reservation:updated', reservation);
  socketConfig.broadcastEvent(targetRestId, 'table:status_updated', {
    tableId,
    status: 'Occupied',
  });

  return {
    success: true,
    message: `Welcome, ${reservation.customerName}! Your table reservation is verified and unlocked.`,
    reservation,
  };
};

/**
 * AI Reservation Monitor Loop — Executed every 30 seconds:
 * 1. Locks table to "Reserved" 15 mins BEFORE reservation time.
 * 2. Auto-cancels reservation to "No Show" and frees table 15 mins AFTER reservation time if guest fails to arrive.
 */
const runAiReservationMonitorCycle = async () => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMins = getCurrentTimeMinutes();

    const activeReservations = await Reservation.find({
      reservationDate: todayStr,
      reservationStatus: { $in: ['Pending', 'Confirmed'] },
      isDeleted: false,
    }).populate('table');

    for (const res of activeReservations) {
      if (!res.table) continue;

      const resMins = timeToMinutes(res.reservationTime);
      const lockStart = resMins - 15; // 15 mins before
      const autoCancelTime = resMins + 15; // 15 mins after

      const restId = res.restaurant.toString();
      const tableId = res.table._id.toString();

      // 1. Buffer Lock: 15 mins before reservation time -> Mark Table "Reserved"
      if (currentMins >= lockStart && currentMins <= resMins + 15) {
        if (res.table.status === 'Available') {
          await Table.updateOne({ _id: tableId }, { status: 'Reserved' });
          socketConfig.broadcastEvent(restId, 'table:status_updated', {
            tableId,
            status: 'Reserved',
            reason: `Reserved for ${res.customerName} at ${res.reservationTime}`,
          });
        }
      }

      // 2. Auto-Cancellation: 15 mins AFTER reservation time -> Mark "No Show" & Release Table
      if (currentMins > autoCancelTime) {
        res.reservationStatus = 'No Show';
        await res.save();

        await Table.updateOne({ _id: tableId }, { status: 'Available' });

        // Broadcast real-time Socket.IO cancellation event
        socketConfig.broadcastEvent(restId, 'reservation:auto_cancelled', {
          reservationId: res._id,
          reservationNumber: res.reservationNumber,
          customerName: res.customerName,
          tableId,
          tableNumber: res.table.tableNumber,
          reason: 'No-Show: Guest did not arrive or verify registered phone number within 15-minute window.',
        });

        socketConfig.broadcastEvent(restId, 'table:status_updated', {
          tableId,
          status: 'Available',
        });

        // Dispatch Notification to restaurant staff
        try {
          const notificationService = require('../notification/notification.service');
          await notificationService.dispatchNotification(restId, {
            title: `Reservation Auto-Cancelled ⚠️`,
            message: `Booking for ${res.customerName} (Table ${res.table.tableNumber}) was automatically cancelled due to 15-minute no-show. Table released.`,
            category: 'Reservation',
            priority: 'Warning',
            channels: ['In-App'],
          }).catch(() => null);
        } catch {
          // Ignore
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AI Reservation Monitor] Error during monitoring cycle:', err.message);
  }
};

let monitorInterval = null;

const startAiReservationMonitor = () => {
  if (monitorInterval) return;
  // Run first cycle immediately, then every 30 seconds
  runAiReservationMonitorCycle();
  monitorInterval = setInterval(runAiReservationMonitorCycle, 30000);
  // eslint-disable-next-line no-console
  console.log('[AI Reservation Engine] Table lock & no-show auto-cancellation monitor initialized (30s cycle).');
};

module.exports = {
  checkTableLockStatus,
  verifyGuestPhoneToUnlock,
  runAiReservationMonitorCycle,
  startAiReservationMonitor,
};
