const Restaurant = require('../tenant/tenant.model');
const TenantSubscription = require('./tenantSubscription.model');
const FeatureFlag = require('./featureFlag.model');
const ApiError = require('../../utils/ApiError');


const getFeatureFlags = async (restaurantId) => {
  let flags = await FeatureFlag.findOne({ restaurant: restaurantId });
  if (!flags) {
    flags = await FeatureFlag.create({ restaurant: restaurantId });
  }

  // Fetch plan code for tier targeting
  const sub = await TenantSubscription.findOne({ restaurant: restaurantId });
  const planTier = sub?.planCode || 'starter';

  // Compute effective flags considering tier targeting and rollout percentage
  const effectiveFlags = evaluateEffectiveFlags(flags, planTier, restaurantId);

  return {
    raw: flags,
    effective: effectiveFlags,
    planTier,
  };
};

const evaluateEffectiveFlags = (flagDoc, planTier, restaurantId) => {
  const keys = ['aiFeaturesEnabled', 'qrOrderingEnabled', 'loyaltyEnabled', 'inventoryEnabled', 'kitchenDisplayEnabled', 'reportsEnabled'];
  const effective = {};

  const hashId = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  };

  const tenantBucket = hashId(restaurantId.toString());
  const passesRollout = tenantBucket < (flagDoc.rolloutPercentage ?? 100);

  keys.forEach((key) => {
    // Layer 1: Per-tenant explicit override (if defined on doc)
    if (typeof flagDoc[key] === 'boolean' && flagDoc[key] !== undefined) {
      effective[key] = flagDoc[key];
      return;
    }

    // Layer 2: Plan tier targeting rule (if configured)
    const tierRule = flagDoc.tierTargeting?.[planTier]?.[key];
    if (typeof tierRule === 'boolean') {
      effective[key] = tierRule;
      return;
    }

    // Layer 3: Percentage rollout & default fallback
    effective[key] = passesRollout;
  });

  return effective;
};

const updateFeatureFlags = async (restaurantId, updates) => {
  const flags = await FeatureFlag.findOneAndUpdate(
    { restaurant: restaurantId },
    updates,
    { new: true, upsert: true }
  );
  return flags;
};

module.exports = {
  getFeatureFlags,
  updateFeatureFlags,
  evaluateEffectiveFlags,
};

