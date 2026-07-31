const { z } = require('zod');
const { WEEK_DAYS, TIME_REGEX } = require('./schedule.util');

const timeSlotSchema = z
  .object({
    open: z.string().regex(TIME_REGEX, 'Time must be in HH:mm 24-hour format'),
    close: z.string().regex(TIME_REGEX, 'Time must be in HH:mm 24-hour format'),
  })
  .refine((slot) => slot.open < slot.close, {
    message: 'Opening time must be earlier than closing time',
    path: ['close'],
  });

const dayScheduleSchema = z.object({
  day: z.enum(WEEK_DAYS),
  isOpen: z.boolean(),
  slots: z.array(timeSlotSchema).default([]),
});

/**
 * A full 7-day weekly schedule: exactly one entry per day of the week,
 * and every day marked open must include at least one time slot.
 */
const weeklyScheduleSchema = z
  .array(dayScheduleSchema)
  .length(7, 'Schedule must include all 7 days of the week')
  .refine(
    (days) => WEEK_DAYS.every((day) => days.some((d) => d.day === day)),
    'Schedule must include each day of the week exactly once'
  )
  .refine(
    (days) => days.every((d) => !d.isOpen || d.slots.length > 0),
    'Days marked as open must include at least one time slot'
  );

module.exports = { timeSlotSchema, dayScheduleSchema, weeklyScheduleSchema };
