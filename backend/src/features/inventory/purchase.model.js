const mongoose = require('mongoose');

const { Schema } = mongoose;

const PAYMENT_STATUSES = Object.freeze(['Pending', 'Paid', 'Partial']);

const purchaseItemSchema = new Schema(
  {
    ingredient: {
      type: Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, 'Ingredient reference is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.0001, 'Quantity must be positive'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseSchema = new Schema(
  {
    purchaseNumber: {
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
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required'],
      index: true,
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Purchase must contain at least 1 item.',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'Pending',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-validate hook to generate unique Purchase invoice number
purchaseSchema.pre('validate', async function generatePurchaseNumber(next) {
  if (this.purchaseNumber) return next();

  // e.g. PUR-20260727-4829
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let isUnique = false;
  let candidate = '';

  const PurchaseModel = this.constructor;

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    candidate = `PUR-${dateStr}-${random}`;

    // eslint-disable-next-line no-await-in-loop
    const exists = await PurchaseModel.exists({ purchaseNumber: candidate });
    if (!exists) {
      isUnique = true;
    }
  }

  this.purchaseNumber = candidate;
  next();
});

const PurchaseModel = mongoose.model('Purchase', purchaseSchema);
PurchaseModel.PAYMENT_STATUSES = PAYMENT_STATUSES;

module.exports = PurchaseModel;
