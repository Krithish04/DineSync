const mongoose = require('mongoose');

const { Schema } = mongoose;

const featureFlagSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
      index: true,
    },
    aiFeaturesEnabled: { type: Boolean, default: true },
    qrOrderingEnabled: { type: Boolean, default: true },
    loyaltyEnabled: { type: Boolean, default: true },
    inventoryEnabled: { type: Boolean, default: true },
    kitchenDisplayEnabled: { type: Boolean, default: true },
    reportsEnabled: { type: Boolean, default: true },
    tierTargeting: {
      starter: { type: Schema.Types.Mixed, default: {} },
      pro: { type: Schema.Types.Mixed, default: {} },
      enterprise: { type: Schema.Types.Mixed, default: {} },
    },
    rolloutPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);

