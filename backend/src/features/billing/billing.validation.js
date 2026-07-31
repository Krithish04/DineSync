const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const generateInvoiceSchema = z.object({
  orderId: z.string().regex(objectIdRegex, 'Invalid order id'),
  discount: z.number().min(0, 'Discount cannot be negative').optional().default(0),
  couponDiscount: z.number().min(0, 'Coupon discount cannot be negative').optional().default(0),
  loyaltyDiscount: z.number().min(0, 'Loyalty points discount cannot be negative').optional().default(0),
  notes: z.string().trim().optional().or(z.literal('')),
});

const createPaymentSchema = z.object({
  invoiceId: z.string().regex(objectIdRegex, 'Invalid invoice id'),
  paymentMethod: z.enum(['Cash', 'Card', 'UPI', 'Net Banking', 'Wallet', 'Split Payment']),
  amount: z.number().min(0.01, 'Payment amount must be positive'),
  transactionReference: z.string().trim().optional().or(z.literal('')),
  splitPayments: z
    .array(
      z.object({
        paymentMethod: z.enum(['Cash', 'Card', 'UPI', 'Net Banking', 'Wallet']),
        amount: z.number().min(0.01, 'Split amount must be positive'),
        transactionReference: z.string().trim().optional().or(z.literal('')),
      })
    )
    .optional(),
});

module.exports = {
  generateInvoiceSchema,
  createPaymentSchema,
};
