const FeatureFlag = require('./featureFlag.model');
const ApiError = require('../../utils/ApiError');

const getFeatureFlags = async (restaurantId) => {
  let flags = await FeatureFlag.findOne({ restaurant: restaurantId });
  if (!flags) {
    flags = await FeatureFlag.create({ restaurant: restaurantId });
  }
  return flags;
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
};
