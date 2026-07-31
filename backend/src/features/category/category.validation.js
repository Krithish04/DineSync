const { z } = require('zod');

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name cannot exceed 50 characters'),
  description: z
    .string()
    .trim()
    .max(200, 'Description cannot exceed 200 characters')
    .optional()
    .or(z.literal('')),
  image: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal('')),
  displayOrder: z
    .number()
    .int()
    .min(0, 'Display order cannot be negative')
    .optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
