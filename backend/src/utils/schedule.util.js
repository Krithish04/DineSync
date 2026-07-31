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

module.exports = {
  WEEK_DAYS,
  TIME_REGEX,
  timeSlotSchema,
  dayScheduleSchema,
  buildDefaultSchedule,
};
