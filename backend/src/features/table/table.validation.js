const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createTableSchema = z.object({
  tableNumber: z
    .string()
    .trim()
    .min(1, 'Table number is required')
    .max(50, 'Table number cannot exceed 50 characters'),
  tableName: z
    .string()
    .trim()
    .max(100, 'Table name cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
  type: z.enum(['Indoor', 'Outdoor', 'VIP', 'Private']).optional(),
  status: z.enum(['Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance']).optional(),
  isActive: z.boolean().optional(),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

const updateTableSchema = createTableSchema.partial();

const updateTableStatusSchema = z.object({
  status: z.enum(['Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance']),
});

module.exports = {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
};
