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

// --- Create Branch Manager Account ---
const createBranchManagerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
});

// --- Create Branch Staff / Chef Account ---
const createBranchStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  role: z.enum(['staff', 'chef']).optional().default('staff'),
});

// --- Create Owner Manager (Multi-Branch) ---
const createOwnerManagerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  branchIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid branch id')).min(1, 'At least one branch must be assigned'),
});

// --- Create Manager Scoped Staff ---
const createScopedStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid branch id'),
  designation: z.string().trim().optional(),
  department: z.string().trim().optional(),
});

// --- Create Manager Scoped Kitchen ---
const createScopedKitchenSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid branch id'),
  kitchenStation: z.string().trim().optional(),
});

module.exports = {
  createBranchSchema,
  updateBranchSchema,
  updateBranchAddressSchema,
  updateBranchContactSchema,
  updateBranchHoursSchema,
  assignManagerSchema,
  updateBranchStatusSchema,
  createBranchManagerSchema,
  createBranchStaffSchema,
  createOwnerManagerSchema,
  createScopedStaffSchema,
  createScopedKitchenSchema,
};
