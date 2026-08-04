const mongoose = require('mongoose');

const { Schema } = mongoose;

const subscriptionPlanSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      enum: ['starter', 'pro', 'enterprise'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    priceMonthly: {
      type: Number,
      required: true,
      min: 0,
    },
    priceYearly: {
      type: Number,
      required: true,
      min: 0,
    },
    userLimit: {
      type: Number,
      default: 5, // -1 for unlimited
    },
    storageLimitMb: {
      type: Number,
      default: 2048, // 2GB
    },
    aiFeatureAccess: {
      type: String,
      enum: ['None', 'Basic', 'Full', 'Custom'],
      default: 'Basic',
    },
    reportsAccess: {
      type: String,
      enum: ['Basic', 'Advanced', 'Full'],
      default: 'Basic',
    },
    apiAccess: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
