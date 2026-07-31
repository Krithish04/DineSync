const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createCustomerSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  phoneNumber: z.string().trim().min(5, 'Valid phone number is required'),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  dateOfBirth: z.string().optional().nullable().or(z.literal('')),
  gender: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  preferredBranch: z.string().regex(objectIdRegex, 'Invalid branch id').optional().nullable(),
  dietaryPreference: z.enum(['Veg', 'Non Veg', 'Vegan', 'Jain']).default('Non Veg'),
  referredByCode: z.string().trim().optional().or(z.literal('')),
  marketingConsent: z.boolean().optional().default(false),
  notes: z.string().trim().optional().or(z.literal('')),
});

const adjustLoyaltyPointsSchema = z.object({
  points: z.number().int('Points must be integer value'),
  reason: z.string().trim().min(1, 'Reason for point adjustment is required'),
});

module.exports = {
  createCustomerSchema,
  adjustLoyaltyPointsSchema,
};
