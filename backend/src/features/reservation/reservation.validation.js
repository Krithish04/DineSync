const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createReservationSchema = z.object({
  branch: z.string().regex(objectIdRegex, 'Invalid branch id'),
  table: z.string().regex(objectIdRegex, 'Invalid table id'),
  customerName: z.string().trim().min(1, 'Customer name is required'),
  customerPhone: z.string().trim().min(5, 'Valid phone number is required'),
  customerEmail: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  numberOfGuests: z.number().int().min(1, 'Guests count must be at least 1'),
  reservationDate: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
  reservationTime: z.string().regex(timeRegex, 'Time must be in HH:mm 24-hour format'),
  duration: z.number().int().min(15, 'Minimum duration is 15 minutes').default(90),
  occasion: z.enum(['Birthday', 'Anniversary', 'Business', 'Family', 'Other']).optional(),
  specialRequest: z.string().trim().max(1000, 'Special request cannot exceed 1000 characters').optional().or(z.literal('')),
  reservationStatus: z.enum(['Pending', 'Confirmed', 'Seated', 'Completed', 'Cancelled', 'No Show']).optional(),
  bookingSource: z.enum(['Walk In', 'Phone', 'Website', 'QR']).optional(),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
});

const updateReservationSchema = createReservationSchema.partial();

const updateReservationStatusSchema = z.object({
  status: z.enum(['Pending', 'Confirmed', 'Seated', 'Completed', 'Cancelled', 'No Show']),
});

module.exports = {
  createReservationSchema,
  updateReservationSchema,
  updateReservationStatusSchema,
};
