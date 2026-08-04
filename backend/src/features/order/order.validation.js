const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const modifierSelectionValidationSchema = z.object({
  groupName: z.string().trim().min(1, 'Group name is required'),
  optionName: z.string().trim().min(1, 'Option name is required'),
  price: z.number().min(0, 'Modifier price cannot be negative').default(0),
});

const orderItemInputSchema = z.object({
  menuItem: z.string().regex(objectIdRegex, 'Invalid menu item id'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  modifiers: z.array(modifierSelectionValidationSchema).optional().default([]),
  specialInstructions: z.string().trim().optional().or(z.literal('')),
});

const createOrderSchema = z.object({
  table: z.string().regex(objectIdRegex, 'Invalid table id').optional().nullable(),
  reservation: z.string().regex(objectIdRegex, 'Invalid reservation id').optional().nullable(),
  customer: z.string().regex(objectIdRegex, 'Invalid customer id').optional().nullable(),
  orderType: z.enum(['Dine-In', 'Takeaway', 'Delivery', 'QR Order']),
  items: z.array(orderItemInputSchema).nonempty('Order must contain at least 1 item'),
  discount: z.number().min(0, 'Discount cannot be negative').optional().default(0),
  notes: z.string().trim().optional().or(z.literal('')),
});

const updateOrderSchema = z.object({
  items: z.array(z.object({
    _id: z.string().regex(objectIdRegex, 'Invalid order item id').optional(), // present for existing items
    menuItem: z.string().regex(objectIdRegex, 'Invalid menu item id'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    modifiers: z.array(modifierSelectionValidationSchema).optional().default([]),
    specialInstructions: z.string().trim().optional().or(z.literal('')),
    kitchenStatus: z.enum(['Pending', 'Preparing', 'Ready', 'Served']).optional(),
  })).optional(),
  discount: z.number().min(0, 'Discount cannot be negative').optional(),
  notes: z.string().trim().optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['Pending', 'Accepted', 'Preparing', 'Ready', 'Served', 'Completed', 'Cancelled']),
});

const updatePaymentStatusSchema = z.object({
  status: z.enum(['Pending', 'Paid', 'Refunded']),
});

const splitOrderSchema = z.object({
  splitType: z.enum(['equal', 'items']),
  splitCount: z.number().int().min(2, 'Must split into at least 2 parts').optional(), // required for equal
  splitItems: z.array(z.object({
    itemId: z.string().regex(objectIdRegex, 'Invalid order item id'),
    quantity: z.number().int().min(1, 'Must split at least 1 unit'),
  })).optional(), // required for items split
});

const mergeOrdersSchema = z.object({
  sourceOrderIds: z.array(z.string().regex(objectIdRegex, 'Invalid source order id')).nonempty('Must merge at least 1 order'),
});

module.exports = {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  splitOrderSchema,
  mergeOrdersSchema,
};
