const { z } = require('zod');
const { weeklyScheduleSchema } = require('../../utils/schedule.validation');

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// --- Profile ---
const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address').optional(),
  website: z.string().trim().url('Please provide a valid URL').optional().or(z.literal('')),
  cuisine: z.array(z.string().trim()).optional(),
  logoUrl: z.string().trim().url().optional().or(z.literal('')),
  coverImageUrl: z.string().trim().url().optional().or(z.literal('')),
  socialLinks: z
    .object({
      facebook: z.string().trim().url().optional().or(z.literal('')),
      instagram: z.string().trim().url().optional().or(z.literal('')),
      twitter: z.string().trim().url().optional().or(z.literal('')),
    })
    .partial()
    .optional(),
});

// --- Settings ---
const updateSettingsSchema = z.object({
  currency: z.string().trim().length(3, 'Currency must be a 3-letter ISO code (e.g. INR, USD)').optional(),
  timezone: z.string().trim().min(1).optional(),
  orderPrefix: z.string().trim().min(1).max(8).optional(),
  allowOnlineOrders: z.boolean().optional(),
  allowTableReservations: z.boolean().optional(),
  minOrderAmount: z.number().min(0, 'Minimum order amount cannot be negative').optional(),
  serviceChargePercent: z
    .number()
    .min(0, 'Service charge cannot be negative')
    .max(100, 'Service charge cannot exceed 100%')
    .optional(),
  taxEnabled: z.boolean().optional(),
});

// --- GST ---
const updateGstSchema = z
  .object({
    gstRegistered: z.boolean(),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(GSTIN_REGEX, 'Invalid GSTIN format')
      .optional()
      .or(z.literal('')),
    legalBusinessName: z.string().trim().max(150).optional(),
    placeOfSupply: z.string().trim().max(100).optional(),
    gstCertificateUrl: z.string().trim().url().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.gstRegistered && (!data.gstin || data.gstin.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstin'],
        message: 'GSTIN is required when GST registered is enabled.',
      });
    }
  });

// --- Opening hours ---
const updateOpeningHoursSchema = z.object({
  openingHours: weeklyScheduleSchema,
});

module.exports = {
  updateProfileSchema,
  updateSettingsSchema,
  updateGstSchema,
  updateOpeningHoursSchema,
};
