const { Schema } = require('mongoose');

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timeSlotSchema = new Schema(
  {
    open: {
      type: String,
      required: true,
      match: [TIME_REGEX, 'Time must be in HH:mm 24-hour format'],
    },
    close: {
      type: String,
      required: true,
      match: [TIME_REGEX, 'Time must be in HH:mm 24-hour format'],
    },
  },
  { _id: false }
);

const dayScheduleSchema = new Schema(
  {
    day: {
      type: String,
      enum: WEEK_DAYS,
      required: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    // Supports split shifts, e.g. lunch 11:00-15:00 and dinner 18:00-23:00.
    slots: {
      type: [timeSlotSchema],
      default: [{ open: '09:00', close: '22:00' }],
    },
  },
  { _id: false }
);

/**
 * Builds a default Mon-Sun weekly schedule (all open, defaultOpen-defaultClose).
 * Used to seed openingHours/operatingHours on document creation.
 */
const buildDefaultSchedule = (defaultOpen = '09:00', defaultClose = '22:00') =>
  WEEK_DAYS.map((day) => ({ day, isOpen: true, slots: [{ open: defaultOpen, close: defaultClose }] }));

/**
 * Evaluates whether a restaurant/branch is currently OPEN or CLOSED
 * based on its configured opening/operating hours schedule.
 */
const evaluateOperatingStatus = (schedule, referenceDate = new Date(), timeZone = 'Asia/Kolkata') => {
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return {
      isOpen: true,
      isClosed: false,
      currentDay: null,
      statusMessage: 'Open Today',
      formattedHours: 'Open Today',
    };
  }

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let currentDayName;
  let currentMins;

  try {
    const tz = timeZone || 'Asia/Kolkata';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'lowercase',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(referenceDate);
    const partMap = {};
    parts.forEach((p) => { partMap[p.type] = p.value; });
    currentDayName = partMap.weekday ? partMap.weekday.toLowerCase() : daysOfWeek[referenceDate.getDay()];
    let hour = parseInt(partMap.hour, 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(partMap.minute, 10);
    currentMins = hour * 60 + minute;
  } catch {
    currentDayName = daysOfWeek[referenceDate.getDay()];
    currentMins = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  }

  const daySchedule = schedule.find(
    (d) => d && d.day && d.day.toLowerCase() === currentDayName
  );

  if (!daySchedule || !daySchedule.isOpen) {
    return {
      isOpen: false,
      isClosed: true,
      currentDay: currentDayName,
      statusMessage: 'Restaurant is Closed Today',
      formattedHours: 'Closed Today',
    };
  }

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : m;
    return `${displayH}:${displayM} ${period}`;
  };

  const slots = daySchedule.slots || [];
  if (slots.length === 0) {
    return {
      isOpen: true,
      isClosed: false,
      currentDay: currentDayName,
      statusMessage: 'Open Today',
      formattedHours: 'Open Today',
    };
  }

  const formattedHours = slots
    .map((s) => `${formatTime12h(s.open)} - ${formatTime12h(s.close)}`)
    .join(', ');

  const isCurrentlyWithinSlot = slots.some((s) => {
    if (!s.open || !s.close) return true;
    const [openH, openM] = s.open.split(':').map(Number);
    const [closeH, closeM] = s.close.split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    if (openMins <= closeMins) {
      return currentMins >= openMins && currentMins <= closeMins;
    } else {
      return currentMins >= openMins || currentMins <= closeMins;
    }
  });

  if (isCurrentlyWithinSlot) {
    return {
      isOpen: true,
      isClosed: false,
      currentDay: currentDayName,
      statusMessage: `Open Today (${formattedHours})`,
      formattedHours,
    };
  }

  return {
    isOpen: false,
    isClosed: true,
    currentDay: currentDayName,
    statusMessage: `Restaurant is Currently Closed (Today's Hours: ${formattedHours})`,
    formattedHours,
  };
};

module.exports = {
  WEEK_DAYS,
  TIME_REGEX,
  timeSlotSchema,
  dayScheduleSchema,
  buildDefaultSchedule,
  evaluateOperatingStatus,
};
