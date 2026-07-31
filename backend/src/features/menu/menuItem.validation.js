const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const modifierOptionValidationSchema = z.object({
  _id: z.string().regex(objectIdRegex, 'Invalid option id').optional(),
  name: z.string().trim().min(1, 'Option name is required'),
  price: z.number().min(0, 'Option price cannot be negative').default(0),
});

const modifierGroupValidationSchema = z.object({
  _id: z.string().regex(objectIdRegex, 'Invalid group id').optional(),
  name: z.string().trim().min(1, 'Group name is required'),
  required: z.boolean().default(false),
  multiSelect: z.boolean().default(false),
  minSelection: z.number().int().min(0, 'Minimum selection cannot be negative').default(0),
  maxSelection: z.number().int().min(1, 'Maximum selection must be at least 1').default(1),
  options: z.array(modifierOptionValidationSchema).default([]),
});

const createMenuItemSchema = z.object({
  category: z.string().regex(objectIdRegex, 'Invalid category id'),
  name: z
    .string()
    .trim()
    .min(2, 'Item name must be at least 2 characters')
    .max(100, 'Item name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .or(z.literal('')),
  shortDescription: z
    .string()
    .trim()
    .max(150, 'Short description cannot exceed 150 characters')
    .optional()
    .or(z.literal('')),
  price: z.number().min(0, 'Price cannot be negative'),
  costPrice: z.number().min(0, 'Cost price cannot be negative').optional(),
  gst: z.number().min(0, 'GST percentage cannot be negative').max(100, 'GST percentage cannot exceed 100').optional(),
  preparationTime: z.number().int().min(1, 'Preparation time must be at least 1 minute').optional(),
  image: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal('')),
  dietaryType: z.enum(['veg', 'non-veg', 'vegan', 'jain']),
  spiceLevel: z.enum(['none', 'mild', 'medium', 'hot']).optional(),
  isAvailable: z.boolean().optional(),
  availableBranches: z.array(z.string().regex(objectIdRegex, 'Invalid branch id')).optional(),
  isFeatured: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
  modifierGroups: z.array(modifierGroupValidationSchema).optional(),
});

const updateMenuItemSchema = createMenuItemSchema.partial();

module.exports = {
  createMenuItemSchema,
  updateMenuItemSchema,
};
