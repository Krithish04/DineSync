const axios = require('axios');
const env = require('../../config/env.config');
const Reservation = require('./reservation.model');
const RecurringReservation = require('./recurringReservation.model');
const Table = require('../table/table.model');
const socketConfig = require('../../config/socket.config');
const ApiError = require('../../utils/ApiError');

const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 2000,
  headers: { 'Content-Type': 'application/json' },
});

const DAY_OFFSETS = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6,
};

/**
 * Calculates YYYY-MM-DD date string for upcoming weekday name
 */
const getNextDateForDay = (dayName) => {
  const today = new Date();
  const todayWeekday = (today.getDay() + 6) % 7; // Monday = 0
  const targetWeekday = DAY_OFFSETS[dayName] !== undefined ? DAY_OFFSETS[dayName] : 4;
  let daysAhead = (targetWeekday - todayWeekday) % 7;
  if (daysAhead === 0) daysAhead = 7; // next week
  
  const nextDate = new Date(today.getTime() + daysAhead * 86400000);
  return nextDate.toISOString().slice(0, 10);
};

/**
 * Parses natural language query into structured reservation slots
 * and auto-assigns matching available table.
 */
const parseNaturalLanguageBooking = async (restaurantId, queryText) => {
  if (!queryText) {
    throw ApiError.badRequest('Query text is required for AI parsing.');
  }

  let parsed = null;
  try {
    const response = await aiClient.post('/reservation/parse', { query: queryText });
    parsed = response.data;
  } catch (err) {
    // Local Regex Fallback
    const now = new Date();
    let resDate = now.toISOString().slice(0, 10);
    const qLower = queryText.toLowerCase();

    if (qLower.includes('tomorrow') || qLower.includes('kal')) {
      resDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    }

    let guests = 2;
    const gMatch = qLower.match(/(?:for|party of|table for|guests?)\s*(\d+)/i) || qLower.match(/(\d+)\s*(?:people|guests|pax)/i);
    if (gMatch) guests = parseInt(gMatch[1], 10);

    parsed = {
      reservation_date: resDate,
      reservation_time: '19:30',
      number_of_guests: guests,
      special_requests: qLower.includes('window') ? 'Window seat preferred' : '',
      confidence_score: 0.80,
    };
  }

  // Auto-assign suitable table from DB catalog matching capacity
  const suitableTable = await Table.findOne({
    restaurant: restaurantId,
    capacity: { $gte: parsed.number_of_guests || 2 },
    isDeleted: false,
  }).sort({ capacity: 1 }).lean();

  return {
    parsedSlots: {
      reservationDate: parsed.reservation_date,
      reservationTime: parsed.reservation_time,
      numberOfGuests: parsed.number_of_guests,
      cuisine: parsed.cuisine || null,
      areaOrLocation: parsed.area_or_location || null,
      specialRequests: parsed.special_requests || '',
      dietaryPreferences: parsed.dietary_preferences || [],
      confidenceScore: parsed.confidence_score,
    },
    suggestedTable: suitableTable ? {
      tableId: suitableTable._id,
      tableNumber: suitableTable.tableNumber,
      capacity: suitableTable.capacity,
      location: suitableTable.location,
    } : null,
  };
};

/**
 * Recommends optimal reservation time slots based on live active reservation congestion
 */
const recommendOptimalBookingSlots = async (restaurantId, reservationDate, partySize = 2) => {
  const activeCount = await Reservation.countDocuments({
    restaurant: restaurantId,
    reservationDate,
    reservationStatus: { $in: ['Pending', 'Confirmed', 'Seated'] },
    isDeleted: false,
  });

  try {
    const response = await aiClient.post('/reservation/recommend-slots', {
      reservation_date: reservationDate,
      party_size: partySize,
      active_reservations_count: activeCount,
    });
    return response.data;
  } catch (err) {
    // Fallback Slot Scoring
    const defaultSlots = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    return {
      reservation_date: reservationDate,
      recommended_slots: defaultSlots.map((time) => ({
        time,
        availability_status: activeCount > 8 ? 'Moderate' : 'High Availability',
        congestion_percentage: activeCount > 8 ? 65 : 25,
        recommendation_tag: activeCount > 8 ? 'Popular Slot' : 'Chef Recommended',
      })),
    };
  }
};

/**
 * Weekly Scheduled Recurring Auto-Booking Engine:
 * Scans active RecurringReservation records every Monday at 8 AM,
 * creates upcoming week's reservations, locks tables, and emits notifications.
 */
const processRecurringWeeklyBookings = async () => {
  try {
    const activeProfiles = await RecurringReservation.find({ isActive: true }).lean();
    if (activeProfiles.length === 0) return;

    let createdCount = 0;

    for (const profile of activeProfiles) {
      const upcomingDate = getNextDateForDay(profile.dayOfWeek);

      // Check if booking already exists for upcoming date to avoid duplicates
      const existing = await Reservation.findOne({
        restaurant: profile.restaurant,
        customerEmail: profile.customerEmail,
        reservationDate: upcomingDate,
        isDeleted: false,
      });

      if (!existing) {
        const newReservation = await Reservation.create({
          restaurant: profile.restaurant,
          table: profile.table || null,
          customer: profile.customer || null,
          customerName: profile.customerName,
          customerPhone: profile.customerPhone,
          customerEmail: profile.customerEmail,
          numberOfGuests: profile.numberOfGuests || 2,
          reservationDate: upcomingDate,
          reservationTime: profile.preferredTime || '19:00',
          specialRequest: profile.specialRequests || 'Recurring Weekly Favorite Booking',
          reservationStatus: 'Confirmed',
          bookingSource: 'Website',
          notes: 'Auto-created by DineSync Recurring Reservation AI Engine',
        });

        createdCount += 1;

        // Update profile lastAutoBookedAt timestamp
        await RecurringReservation.updateOne(
          { _id: profile._id },
          { lastAutoBookedAt: new Date() }
        );

        // Broadcast Socket.IO event
        socketConfig.broadcastEvent(profile.restaurant.toString(), 'reservation:created', newReservation);

        // Dispatch Notification
        try {
          const notificationService = require('../notification/notification.service');
          await notificationService.dispatchNotification(profile.restaurant.toString(), {
            title: 'Recurring Weekly Reservation Confirmed 🗓️',
            message: `Weekly recurring table booking confirmed for ${profile.customerName} on ${upcomingDate} at ${profile.preferredTime}.`,
            category: 'Reservation',
            priority: 'Normal',
            channels: ['In-App'],
          }).catch(() => null);
        } catch {
          // Ignore notification error
        }
      }
    }

    if (createdCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`[AI Recurring Reservation Engine] Processed ${createdCount} weekly recurring bookings.`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AI Recurring Reservation Engine] Error processing recurring bookings:', err.message);
  }
};

let recurringInterval = null;

const startRecurringReservationScheduler = () => {
  if (recurringInterval) return;
  // Run once on server startup, then check every 12 hours
  processRecurringWeeklyBookings();
  recurringInterval = setInterval(processRecurringWeeklyBookings, 12 * 60 * 60 * 1000);
  // eslint-disable-next-line no-console
  console.log('[AI Recurring Reservation Engine] Weekly recurring scheduler initialized.');
};

module.exports = {
  parseNaturalLanguageBooking,
  recommendOptimalBookingSlots,
  processRecurringWeeklyBookings,
  startRecurringReservationScheduler,
};
