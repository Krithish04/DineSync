const mongoose = require('mongoose');

const { Schema } = mongoose;

const LOYALTY_TRANSACTION_TYPES = Object.freeze(['Earned', 'Redeemed', 'Adjustment', 'Referral']);

const loyaltyTransactionSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: LOYALTY_TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: [true, 'Loyalty points value is required'],
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

const LoyaltyTransactionModel = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
LoyaltyTransactionModel.LOYALTY_TRANSACTION_TYPES = LOYALTY_TRANSACTION_TYPES;

module.exports = LoyaltyTransactionModel;
