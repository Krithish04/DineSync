const { z } = require('zod');
const { addressSchema } = require('../../utils/address.validation');
const { weeklyScheduleSchema } = require('../../utils/schedule.validation');

const contactSchema = z.object({
  phone: z.string().trim().min(5, 'A valid phone number is required').max(20),
  alternatePhone: z.string().trim().max(20).optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address').optional().or(z.literal('')),
});

// --- Add Branch ---
const createBranchSchema = z.object({
  name: z.string().trim().min(2, 'Branch name must be at least 2 characters').max(150),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]+$/, 'Code may only contain letters, numbers, and hyphens')
    .max(30)
    .optional()
    .or(z.literal('')),
  address: addressSchema,
  contact: contactSchema,
  operatingHours: weeklyScheduleSchema.optional(),
  managerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid manager id')
    .optional()
    .or(z.literal('')),
});

// --- Update Branch (name/code only — other aspects have dedicated endpoints) ---
const updateBranchSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]+$/, 'Code may only contain letters, numbers, and hyphens')
    .max(30)
    .optional(),
});

// --- Branch Address ---
const updateBranchAddressSchema = z.object({
  address: addressSchema,
});

// --- Contact Details ---
const updateBranchContactSchema = z.object({
  contact: contactSchema,
});

// --- Operating Hours ---
const updateBranchHoursSchema = z.object({
  operatingHours: weeklyScheduleSchema,
});

// --- Branch Manager Assignment ---
const assignManagerSchema = z.object({
  managerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid manager id')
    .nullable(),
});

// --- Branch Status ---
const updateBranchStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

module.exports = {
  createBranchSchema,
  updateBranchSchema,
  updateBranchAddressSchema,
  updateBranchContactSchema,
  updateBranchHoursSchema,
  assignManagerSchema,
  updateBranchStatusSchema,
};
