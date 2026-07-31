const mongoose = require('mongoose');

const { Schema } = mongoose;

const billingLedgerSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    billingDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: 'Credit Card' },
    status: { type: String, enum: ['Paid', 'Pending', 'Failed'], default: 'Paid' },
  },
  { _id: false }
);

const tenantSubscriptionSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
      index: true,
    },
    planCode: {
      type: String,
      enum: ['starter', 'pro', 'enterprise'],
      default: 'starter',
    },
    status: {
      type: String,
      enum: ['Trial', 'Active', 'Suspended', 'Expired', 'Cancelled'],
      default: 'Active',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 86400000), // 30 days trial/cycle
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    billingHistory: {
      type: [billingLedgerSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TenantSubscription', tenantSubscriptionSchema);
