const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createSupplierSchema = z.object({
  supplierName: z.string().trim().min(1, 'Supplier name is required'),
  contactPerson: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().min(5, 'Valid phone number is required'),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  gstNumber: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
});

const createIngredientSchema = z.object({
  branch: z.string().regex(objectIdRegex, 'Invalid branch id'),
  ingredientName: z.string().trim().min(1, 'Ingredient name is required'),
  category: z.string().trim().optional().default('General'),
  unit: z.string().trim().min(1, 'Unit of measurement is required (e.g. kg, L, pcs)'),
  currentStock: z.number().min(0, 'Current stock cannot be negative').default(0),
  minimumStock: z.number().min(0, 'Minimum stock cannot be negative').default(0),
  maximumStock: z.number().min(0, 'Maximum stock cannot be negative').default(0),
  reorderLevel: z.number().min(0, 'Reorder level cannot be negative').default(0),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative').default(0),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative').optional().default(0),
  supplier: z.string().regex(objectIdRegex, 'Invalid supplier id').optional().nullable(),
  expiryDate: z.string().optional().nullable().or(z.literal('')),
  barcode: z.string().trim().optional().or(z.literal('')),
});

const createRecipeSchema = z.object({
  menuItem: z.string().regex(objectIdRegex, 'Invalid menu item id'),
  ingredients: z.array(
    z.object({
      ingredient: z.string().regex(objectIdRegex, 'Invalid ingredient id'),
      quantityNeeded: z.number().min(0.0001, 'Quantity needed must be positive'),
    })
  ).nonempty('Recipe must map at least 1 ingredient'),
});

const createPurchaseSchema = z.object({
  branch: z.string().regex(objectIdRegex, 'Invalid branch id'),
  supplier: z.string().regex(objectIdRegex, 'Invalid supplier id'),
  purchaseDate: z.string().optional().or(z.literal('')),
  invoiceNumber: z.string().trim().optional().or(z.literal('')),
  items: z.array(
    z.object({
      ingredient: z.string().regex(objectIdRegex, 'Invalid ingredient id'),
      quantity: z.number().min(0.0001, 'Quantity must be positive'),
      unitPrice: z.number().min(0, 'Unit price cannot be negative'),
    })
  ).nonempty('Purchase must contain at least 1 item'),
  paymentStatus: z.enum(['Pending', 'Paid', 'Partial']).default('Pending'),
});

const adjustStockSchema = z.object({
  branch: z.string().regex(objectIdRegex, 'Invalid branch id'),
  ingredient: z.string().regex(objectIdRegex, 'Invalid ingredient id'),
  transactionType: z.enum(['Adjustment', 'Waste']),
  quantity: z.number(), // positive to add, negative to deduct
  reason: z.string().trim().optional().or(z.literal('')),
});

module.exports = {
  createSupplierSchema,
  createIngredientSchema,
  createRecipeSchema,
  createPurchaseSchema,
  adjustStockSchema,
};
