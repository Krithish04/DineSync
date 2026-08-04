const mongoose = require('mongoose');

const { Schema } = mongoose;

const INVOICE_STATUSES = Object.freeze(['Draft', 'Generated', 'Paid', 'Refunded', 'Cancelled']);

const invoiceSchema = new Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    table: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
    },
    cashier: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    invoiceStatus: {
      type: String,
      enum: INVOICE_STATUSES,
      default: 'Generated',
      index: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyaltyDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    serviceCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    cgst: {
      type: Number,
      default: 0,
      min: 0,
    },
    sgst: {
      type: Number,
      default: 0,
      min: 0,
    },
    igst: {
      type: Number,
      default: 0,
      min: 0,
    },
    roundingAdjustment: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Pre-validate hook to generate unique Invoice number
invoiceSchema.pre('validate', async function generateInvoiceNumber(next) {
  if (this.invoiceNumber) return next();

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let isUnique = false;
  let candidate = '';

  const InvoiceModel = this.constructor;

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    candidate = `INV-${dateStr}-${random}`;

    // eslint-disable-next-line no-await-in-loop
    const exists = await InvoiceModel.exists({ invoiceNumber: candidate });
    if (!exists) {
      isUnique = true;
    }
  }

  this.invoiceNumber = candidate;
  next();
});

const InvoiceModel = mongoose.model('Invoice', invoiceSchema);
InvoiceModel.INVOICE_STATUSES = INVOICE_STATUSES;

module.exports = InvoiceModel;
