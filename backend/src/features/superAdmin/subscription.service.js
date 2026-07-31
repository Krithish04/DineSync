const SubscriptionPlan = require('./subscriptionPlan.model');
const TenantSubscription = require('./tenantSubscription.model');
const ApiError = require('../../utils/ApiError');

// Default initial plans seeder
const seedDefaultPlansIfEmpty = async () => {
  const count = await SubscriptionPlan.countDocuments();
  if (count === 0) {
    await SubscriptionPlan.create([
      { code: 'starter', name: 'Starter Plan', priceMonthly: 1999, priceYearly: 19990, userLimit: 5, branchLimit: 1, storageLimitMb: 2048, aiFeatureAccess: 'Basic', reportsAccess: 'Basic' },
      { code: 'pro', name: 'Professional Plan', priceMonthly: 4999, priceYearly: 49990, userLimit: 25, branchLimit: 5, storageLimitMb: 10240, aiFeatureAccess: 'Full', reportsAccess: 'Advanced' },
      { code: 'enterprise', name: 'Enterprise Plan', priceMonthly: 9999, priceYearly: 99990, userLimit: -1, branchLimit: -1, storageLimitMb: 102400, aiFeatureAccess: 'Custom', reportsAccess: 'Full' },
    ]);
  }
};

const listPlans = async () => {
  await seedDefaultPlansIfEmpty();
  return SubscriptionPlan.find({ isActive: true }).sort({ priceMonthly: 1 });
};

const getTenantSubscription = async (restaurantId) => {
  let sub = await TenantSubscription.findOne({ restaurant: restaurantId });
  if (!sub) {
    sub = await TenantSubscription.create({
      restaurant: restaurantId,
      planCode: 'starter',
      status: 'Active',
      billingHistory: [
        { invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, amount: 1999, status: 'Paid' },
      ],
    });
  }
  return sub;
};

const updateTenantSubscription = async (restaurantId, { planCode, status, autoRenew }) => {
  const updates = {};
  if (planCode) updates.planCode = planCode;
  if (status) updates.status = status;
  if (autoRenew !== undefined) updates.autoRenew = autoRenew;

  const sub = await TenantSubscription.findOneAndUpdate(
    { restaurant: restaurantId },
    updates,
    { new: true, upsert: true }
  );

  return sub;
};

module.exports = {
  listPlans,
  getTenantSubscription,
  updateTenantSubscription,
};
