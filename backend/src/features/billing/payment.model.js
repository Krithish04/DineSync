const mongoose = require('mongoose');

const { Schema } = mongoose;

const PAYMENT_METHODS = Object.freeze([
  'Cash',
  'Card',
  'UPI',
  'Net Banking',
  'Wallet',
  'Split Payment',
]);

const PAYMENT_STATUSES = Object.freeze(['Pending', 'Success', 'Failed', 'Refunded']);

const paymentSchema = new Schema(
  {
    paymentId: {
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
    invoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: [true, 'Payment method is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be positive'],
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'Success',
      index: true,
    },
    paymentTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Pre-validate hook to generate unique payment transaction ID
paymentSchema.pre('validate', async function generatePaymentId(next) {
  if (this.paymentId) return next();

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let isUnique = false;
  let candidate = '';

  const PaymentModel = this.constructor;

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    candidate = `PAY-${dateStr}-${random}`;

    // eslint-disable-next-line no-await-in-loop
    const exists = await PaymentModel.exists({ paymentId: candidate });
    if (!exists) {
      isUnique = true;
    }
  }

  this.paymentId = candidate;
  next();
});

const PaymentModel = mongoose.model('Payment', paymentSchema);
PaymentModel.PAYMENT_METHODS = PAYMENT_METHODS;
PaymentModel.PAYMENT_STATUSES = PAYMENT_STATUSES;

module.exports = PaymentModel;
