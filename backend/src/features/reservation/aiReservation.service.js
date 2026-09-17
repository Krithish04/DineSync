const Reservation = require('./reservation.model');
const Table = require('../table/table.model');
const socketConfig = require('../../config/socket.config');
const ApiError = require('../../utils/ApiError');
const { getNotificationProvider } = require('../notification/providers/notificationProviderFactory');

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

// Fetch restaurant configurable reservation settings with fallback defaults
const getRestaurantReservationSettings = async (restaurantId) => {
  const defaultSettings = {
    preArrivalBufferMins: 30,
    hardLockOffsetMins: 15,
    gracePeriodMins: 15,
    midGraceNudgeMins: 8,
  };

  if (!restaurantId) return defaultSettings;

  try {
    const Tenant = require('../tenant/tenant.model');
    const tenant = await Tenant.findById(restaurantId).lean();
    const customSettings = tenant?.settings?.reservationSettings;
    if (customSettings) {
      return {
        preArrivalBufferMins: customSettings.preArrivalBufferMins ?? 30,
        hardLockOffsetMins: customSettings.hardLockOffsetMins ?? 15,
        gracePeriodMins: customSettings.gracePeriodMins ?? 15,
        midGraceNudgeMins: customSettings.midGraceNudgeMins ?? 8,
      };
    }
  } catch {
    // Ignore error and return defaults
  }

  return defaultSettings;
};

/**
 * Checks if a table is currently locked by an upcoming or active reservation
 * (Active window: hardLockOffsetMins BEFORE reservationTime to gracePeriodMins AFTER reservationTime).
 */
const checkTableLockStatus = async (restaurantId, tableId) => {
  if (!tableId) return { isLocked: false };

  const settings = await getRestaurantReservationSettings(restaurantId);
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
    const lockStart = resMins - settings.hardLockOffsetMins;
    const lockEnd = resMins + settings.gracePeriodMins;

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
 * Pre-Arrival Turnover Guard:
 * Checks if seating a walk-in party at table for expectedDiningDuration minutes
 * will overlap with an upcoming reservation starting within preArrivalBufferMins.
 */
const isTableAvailableForWalkIn = async (restaurantId, tableId, expectedDiningDuration = 60) => {
  if (!tableId) return { available: true };

  const settings = await getRestaurantReservationSettings(restaurantId);
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMins = getCurrentTimeMinutes();
  const estimatedEndMins = currentMins + expectedDiningDuration;

  const upcomingReservations = await Reservation.find({
    table: tableId,
    reservationDate: todayStr,
    reservationStatus: { $in: ['Pending', 'Confirmed'] },
    isDeleted: false,
  });

  for (const res of upcomingReservations) {
    const resMins = timeToMinutes(res.reservationTime);
    const bufferStartMins = resMins - settings.preArrivalBufferMins;

    if (estimatedEndMins > bufferStartMins && currentMins < resMins + settings.gracePeriodMins) {
      return {
        available: false,
        reservationId: res._id,
        customerName: res.customerName,
        reservationTime: res.reservationTime,
        bufferMins: settings.preArrivalBufferMins,
        reason: `Walk-in dining duration (${expectedDiningDuration} mins) overlaps with upcoming ${res.reservationTime} reservation for ${res.customerName}.`,
      };
    }
  }

  return { available: true };
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
 * 1. Hard Lock: Locks table to "Reserved" hardLockOffsetMins BEFORE reservation time.
 * 2. Mid-Grace Nudge: Sends automated check-in nudge SMS via NotificationProvider mid-grace period.
 * 3. Auto No-Show: Marks "No Show" & releases table when grace period expires.
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

    const provider = getNotificationProvider();

    const settingsCachePerTick = new Map();

    for (const res of activeReservations) {
      if (!res.table) continue;

      const restId = res.restaurant.toString();
      let settings = settingsCachePerTick.get(restId);
      if (!settings) {
        settings = await getRestaurantReservationSettings(restId);
        settingsCachePerTick.set(restId, settings);
      }
      const resMins = timeToMinutes(res.reservationTime);

      const hardLockStart = resMins - settings.hardLockOffsetMins;
      const midGraceNudgeTime = resMins + settings.midGraceNudgeMins;
      const autoCancelTime = resMins + settings.gracePeriodMins;

      const tableId = res.table._id.toString();
      const TableSession = require('../table/tableSession.model');
      const activeSession = await TableSession.findOne({ table: tableId, status: 'active' });

      // 1. Hard Lock: Hold table empty & unavailable from hardLockOffsetMins before reservation time
      if (currentMins >= hardLockStart && currentMins <= autoCancelTime) {
        if (res.table.status === 'Available' && !activeSession) {
          await Table.updateOne({ _id: tableId }, { status: 'Reserved' });
          socketConfig.broadcastEvent(restId, 'table:status_updated', {
            tableId,
            status: 'Reserved',
            reason: `Reserved for ${res.customerName} at ${res.reservationTime}`,
          });
        }
      }

      // 2. Mid-Grace Period Check-In Nudge via Notification Provider Layer
      if (currentMins >= midGraceNudgeTime && currentMins < autoCancelTime && !res.nudgedAt) {
        res.nudgedAt = new Date();
        await res.save();

        const nudgeMessage = `Hi ${res.customerName}, your table #${res.table.tableNumber} reservation at ${res.reservationTime} is waiting for you! Please reply or verify your phone at the table to hold your spot.`;

        try {
          await provider.sendMessage({
            phone: res.customerPhone,
            message: nudgeMessage,
            template: 'RESERVATION_NUDGE',
            data: { reservationId: res._id, tableNumber: res.table.tableNumber },
          });

          socketConfig.broadcastEvent(restId, 'reservation:nudged', {
            reservationId: res._id,
            customerName: res.customerName,
            customerPhone: res.customerPhone,
            tableNumber: res.table.tableNumber,
          });
        } catch (nudgeErr) {
          // eslint-disable-next-line no-console
          console.warn('[AI Reservation Monitor] Failed to dispatch check-in nudge:', nudgeErr.message);
        }
      }

      // 3. Auto No-Show & Release Table (respects staff manual hold extension)
      const isHoldExtended = Boolean(res.holdExtendedUntil && new Date(res.holdExtendedUntil) > new Date());
      if (currentMins > autoCancelTime && !isHoldExtended) {
        res.reservationStatus = 'No Show';
        await res.save();

        if (!activeSession) {
          await Table.updateOne({ _id: tableId }, { status: 'Available' });

          socketConfig.broadcastEvent(restId, 'table:status_updated', {
            tableId,
            status: 'Available',
          });
        }

        // Broadcast Socket.IO auto-cancellation event
        socketConfig.broadcastEvent(restId, 'reservation:auto_cancelled', {
          reservationId: res._id,
          reservationNumber: res.reservationNumber,
          customerName: res.customerName,
          tableId,
          tableNumber: res.table.tableNumber,
          reason: `No-Show: Guest did not arrive within ${settings.gracePeriodMins}-minute grace period.`,
        });

        // Notify staff
        try {
          const notificationService = require('../notification/notification.service');
          await notificationService.dispatchNotification(restId, {
            title: `Reservation Auto-Cancelled ⚠️`,
            message: `Booking for ${res.customerName} (Table ${res.table.tableNumber}) marked No-Show.${activeSession ? ' Table remains occupied by live session.' : ' Table released.'}`,
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

/**
 * Manual Staff Override: Extend reservation hold time when guest calls running late.
 */
const extendReservationHold = async (restaurantId, reservationId, extendMinutes = 15, userId = null) => {
  const reservation = await Reservation.findOne({
    _id: reservationId,
    restaurant: restaurantId,
    isDeleted: false,
  }).populate('table');

  if (!reservation) {
    throw ApiError.notFound('Reservation not found.');
  }

  const extendUntil = new Date(Date.now() + extendMinutes * 60 * 1000);
  reservation.holdExtendedUntil = extendUntil;
  reservation.holdExtendedBy = userId;
  await reservation.save();

  if (reservation.table) {
    await Table.updateOne({ _id: reservation.table._id }, { status: 'Reserved' });
  }

  socketConfig.broadcastEvent(restaurantId, 'reservation:updated', reservation);
  socketConfig.broadcastEvent(restaurantId, 'table:status_updated', {
    tableId: reservation.table?._id,
    status: 'Reserved',
    reason: `Staff extended hold until ${extendUntil.toLocaleTimeString()}`,
  });

  return { success: true, reservation, holdExtendedUntil: extendUntil };
};

/**
 * Manual Staff Override: Release table early if guest cancels or leaves.
 */
const releaseReservationEarly = async (restaurantId, reservationId, userId = null) => {
  const reservation = await Reservation.findOne({
    _id: reservationId,
    restaurant: restaurantId,
    isDeleted: false,
  }).populate('table');

  if (!reservation) {
    throw ApiError.notFound('Reservation not found.');
  }

  reservation.reservationStatus = 'Cancelled';
  reservation.notes = `${reservation.notes || ''} [Early release by staff]`.trim();
  await reservation.save();

  if (reservation.table) {
    const TableSession = require('../table/tableSession.model');
    const activeSession = await TableSession.findOne({ table: reservation.table._id, status: 'active' });
    if (!activeSession) {
      await Table.updateOne({ _id: reservation.table._id }, { status: 'Available' });
      socketConfig.broadcastEvent(restaurantId, 'table:status_updated', {
        tableId: reservation.table._id,
        status: 'Available',
      });
    }
  }

  socketConfig.broadcastEvent(restaurantId, 'reservation:updated', reservation);
  return { success: true, message: 'Reservation released early by staff.' };
};

/**
 * Surface repeat no-show history count for staff visibility.
 */
const getNoShowHistoryForPhone = async (restaurantId, phone) => {
  if (!phone) return { phone: '', noShowCount: 0, isRepeatNoShow: false };

  const norm = normalizePhone(phone);
  if (!norm) return { phone: '', noShowCount: 0, isRepeatNoShow: false };

  const noShowCount = await Reservation.countDocuments({
    restaurant: restaurantId,
    customerPhone: { $regex: norm },
    reservationStatus: 'No Show',
    isDeleted: false,
  });

  return {
    phone,
    noShowCount,
    isRepeatNoShow: noShowCount >= 2,
  };
};

let monitorInterval = null;

const startAiReservationMonitor = () => {
  if (monitorInterval) return;
  runAiReservationMonitorCycle();
  monitorInterval = setInterval(runAiReservationMonitorCycle, 30000);
  // eslint-disable-next-line no-console
  console.log('[AI Reservation Engine] Table lock & no-show auto-cancellation monitor initialized (30s cycle).');
};

module.exports = {
  getRestaurantReservationSettings,
  checkTableLockStatus,
  isTableAvailableForWalkIn,
  verifyGuestPhoneToUnlock,
  runAiReservationMonitorCycle,
  startAiReservationMonitor,
  extendReservationHold,
  releaseReservationEarly,
  getNoShowHistoryForPhone,
};
