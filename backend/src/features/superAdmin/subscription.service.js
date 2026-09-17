const mongoose = require('mongoose');
const SubscriptionPlan = require('./subscriptionPlan.model');
const TenantSubscription = require('./tenantSubscription.model');
const Restaurant = require('../tenant/tenant.model');
const User = require('../auth/auth.model');
const ApiError = require('../../utils/ApiError');
const auditService = require('./audit.service');
const { getNotificationProvider } = require('../notification/providers/notificationProviderFactory');
const { getPaymentProvider } = require('../billing/providers/paymentProviderFactory');

// Indian GST State Code mapping helper
const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '19': 'West Bengal',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

// Default initial plans seeder
const seedDefaultPlansIfEmpty = async () => {
  const count = await SubscriptionPlan.countDocuments();
  if (count === 0) {
    await SubscriptionPlan.create([
      { code: 'starter', name: 'Starter Plan', priceMonthly: 1999, priceYearly: 19990, userLimit: 5, storageLimitMb: 2048, aiFeatureAccess: 'Basic', reportsAccess: 'Basic', trialDays: 14 },
      { code: 'pro', name: 'Professional Plan', priceMonthly: 4999, priceYearly: 49990, userLimit: 25, storageLimitMb: 10240, aiFeatureAccess: 'Full', reportsAccess: 'Advanced', trialDays: 14 },
      { code: 'enterprise', name: 'Enterprise Plan', priceMonthly: 9999, priceYearly: 99990, userLimit: -1, storageLimitMb: 102400, aiFeatureAccess: 'Custom', reportsAccess: 'Full', trialDays: 14 },
    ]);
  }
};

const listPlans = async () => {
  await seedDefaultPlansIfEmpty();
  return SubscriptionPlan.find({ isActive: true }).sort({ priceMonthly: 1 });
};

/**
 * Evaluates concrete registration flag conditions.
 * Returns array of explicit flag reason strings.
 */
const evaluateRegistrationFlags = async ({ email, phone, restaurantName, address, gstin }) => {
  const flags = [];

  // 1. Duplicate business name, email, or phone check (only if database connection is active)
  if (mongoose.connection.readyState === 1) {
    try {
      const [existingUser, existingRestaurant] = await Promise.all([
        User.findOne({ $or: [{ email: email?.toLowerCase() }, { phone }] }),
        Restaurant.findOne({ $or: [{ name: restaurantName }, { phone }] }),
      ]);

      if (existingUser) {
        flags.push(`Duplicate owner email/phone: Account with ${existingUser.email === email ? 'email' : 'phone'} already exists.`);
      }

      if (existingRestaurant) {
        flags.push(`Duplicate restaurant business profile: Restaurant with name "${restaurantName}" or phone already exists.`);
      }
    } catch { /* non-fatal DB query timeout safeguard */ }
  }

  // 2. GSTIN check & state mismatch signal
  if (gstin) {
    const cleanGstin = String(gstin).trim().toUpperCase();

    if (mongoose.connection.readyState === 1) {
      try {
        const existingGst = await Restaurant.findOne({ 'gst.gstin': cleanGstin });
        if (existingGst) {
          flags.push(`Duplicate GSTIN: "${cleanGstin}" is already registered to tenant "${existingGst.name}".`);
        }
      } catch { /* non-fatal */ }
    }

    const stateCode = cleanGstin.slice(0, 2);
    const expectedState = GST_STATE_CODES[stateCode];
    if (expectedState && address) {
      const addressLower = String(address).toLowerCase();
      const stateLower = expectedState.toLowerCase();
      if (!addressLower.includes(stateLower)) {
        flags.push(`GSTIN State Mismatch: GSTIN state code (${stateCode} - ${expectedState}) does not match provided address "${address}".`);
      }
    }
  }

  // 3. Incomplete address / contact validation
  if (!address || String(address).trim().length < 5) {
    flags.push('Incomplete Physical Address: Address must be at least 5 characters long.');
  }

  if (phone && !/^\+?\d{10,12}$/.test(String(phone).replace(/[\s-]/g, ''))) {
    flags.push('Invalid Phone Number Format: Must be a valid 10 to 12 digit phone number.');
  }

  return flags;
};

/**
 * Initializes Trial Period & creates Razorpay Subscription + Mandate Authorization Link.
 */
const initializeTenantTrialAndMandate = async (restaurantId, requestedPlanCode = 'starter') => {
  await seedDefaultPlansIfEmpty();
  const planCode = (requestedPlanCode || 'starter').toLowerCase();

  const [restaurant, planConfig] = await Promise.all([
    Restaurant.findById(restaurantId).populate('owner'),
    SubscriptionPlan.findOne({ code: planCode, isActive: true }) || SubscriptionPlan.findOne({ code: 'starter' }),
  ]);

  if (!restaurant) {
    throw ApiError.notFound('Restaurant tenant not found.');
  }

  const trialDays = planConfig?.trialDays || 14;
  const trialEndsAt = new Date(Date.now() + trialDays * 86400000);

  // 1. Create or resolve Razorpay Subscription Plan & Subscription
  const paymentProvider = getPaymentProvider();

  let rzpPlan;
  try {
    rzpPlan = await paymentProvider.createSubscriptionPlan({
      name: `DineSync AI ${planConfig?.name || 'Starter Plan'}`,
      amount: planConfig?.priceMonthly || 1999,
      period: 'monthly',
      interval: 1,
    });
  } catch {
    rzpPlan = { id: `plan_fallback_${planCode}_${Date.now()}` };
  }

  let rzpSub;
  try {
    rzpSub = await paymentProvider.createSubscription({
      planId: rzpPlan.id,
      startAt: trialEndsAt, // Native Razorpay trial start-date offset
      customerNotify: 1,
      notes: {
        restaurantId: restaurantId.toString(),
        restaurantName: restaurant.name,
        planCode,
      },
    });
  } catch {
    rzpSub = {
      id: `sub_fallback_${Date.now()}`,
      shortUrl: `https://rzp.io/i/dev_mandate_${Date.now().toString().slice(-6)}`,
      status: 'created',
    };
  }

  // 2. Create or update TenantSubscription record
  const sub = await TenantSubscription.findOneAndUpdate(
    { restaurant: restaurantId },
    {
      planCode,
      status: 'Trial',
      mandateStatus: 'Pending',
      razorpayPlanId: rzpPlan.id,
      razorpaySubscriptionId: rzpSub.id || rzpSub.subscriptionId,
      mandateUrl: rzpSub.shortUrl,
      startDate: new Date(),
      endDate: trialEndsAt,
      trialEndsAt,
      gracePeriodEndsAt: null,
      dunningAttempts: 0,
      autoRenew: true,
    },
    { new: true, upsert: true }
  );

  // Update Restaurant subscriptionPlan reference
  restaurant.subscriptionPlan = planCode;
  restaurant.isActive = true;
  await restaurant.save();

  // 3. Send Mandate Authorization link via Notification Provider
  const notificationProvider = getNotificationProvider();
  const ownerPhone = restaurant.owner?.phone || restaurant.phone;

  if (ownerPhone) {
    try {
      await notificationProvider.sendMessage({
        phone: ownerPhone,
        message: `Welcome to DineSync AI! Your ${trialDays}-day free trial for ${planConfig?.name} is active until ${trialEndsAt.toLocaleDateString('en-IN')}. Please authorize your subscription auto-renewal mandate here: ${rzpSub.shortUrl}`,
        template: 'MANDATE_AUTHORIZATION_LINK',
        data: {
          mandateUrl: rzpSub.shortUrl,
          trialEndsAt: trialEndsAt.toISOString(),
          planName: planConfig?.name,
        },
      });
    } catch { /* non-fatal notification fallback */ }
  }

  // 4. Log Audit Trail
  await auditService.logAction({
    restaurantId: restaurant._id,
    userId: restaurant.owner?._id || null,
    userEmail: restaurant.owner?.email || 'system',
    userRole: 'OWNER',
    action: 'TENANT_TRIAL_STARTED',
    resource: 'TenantSubscription',
    details: {
      planCode,
      trialDays,
      trialEndsAt,
      razorpaySubscriptionId: sub.razorpaySubscriptionId,
      mandateUrl: sub.mandateUrl,
    },
  });

  return sub;
};

/**
 * Super Admin Review Queue: List all tenants pending manual review.
 */
const listManualReviewQueue = async () => {
  const pendingTenants = await Restaurant.find({ approvalStatus: 'Pending Review' })
    .populate('owner', 'name email phone role')
    .sort({ createdAt: -1 });
  return pendingTenants;
};

/**
 * Super Admin Review Queue: Approve tenant registration.
 */
const approveTenantRegistration = async (restaurantId, reviewerUser) => {
  const restaurant = await Restaurant.findById(restaurantId).populate('owner');
  if (!restaurant) {
    throw ApiError.notFound('Restaurant tenant not found.');
  }

  restaurant.approvalStatus = 'Approved';
  restaurant.isActive = true;
  restaurant.reviewDecidedAt = new Date();
  restaurant.reviewedBy = reviewerUser?._id || null;
  await restaurant.save();

  // Initialize trial access and generate mandate authorization link
  const sub = await initializeTenantTrialAndMandate(restaurant._id, restaurant.subscriptionPlan || 'starter');

  // Notify owner
  const notificationProvider = getNotificationProvider();
  const ownerPhone = restaurant.owner?.phone || restaurant.phone;
  if (ownerPhone) {
    try {
      await notificationProvider.sendMessage({
        phone: ownerPhone,
        message: `Great news! Your DineSync AI restaurant account for "${restaurant.name}" has been approved by Super Admin. You have 14 days of trial access. Complete mandate setup here: ${sub.mandateUrl}`,
        template: 'TENANT_APPROVED',
      });
    } catch { /* non-fatal */ }
  }

  // Audit log
  await auditService.logAction({
    restaurantId: restaurant._id,
    userId: reviewerUser?._id || null,
    userEmail: reviewerUser?.email || 'superadmin',
    userRole: reviewerUser?.role || 'super_admin',
    action: 'TENANT_MANUALLY_APPROVED',
    resource: 'Restaurant',
    details: { restaurantName: restaurant.name, planCode: restaurant.subscriptionPlan },
  });

  return { restaurant, subscription: sub };
};

/**
 * Super Admin Review Queue: Reject tenant registration.
 */
const rejectTenantRegistration = async (restaurantId, { rejectionReason }, reviewerUser) => {
  const restaurant = await Restaurant.findById(restaurantId).populate('owner');
  if (!restaurant) {
    throw ApiError.notFound('Restaurant tenant not found.');
  }

  const reasonText = rejectionReason || 'Registration details could not be verified by Super Admin.';

  restaurant.approvalStatus = 'Rejected';
  restaurant.isActive = false;
  restaurant.rejectionReason = reasonText;
  restaurant.reviewDecidedAt = new Date();
  restaurant.reviewedBy = reviewerUser?._id || null;
  await restaurant.save();

  // Notify owner
  const notificationProvider = getNotificationProvider();
  const ownerPhone = restaurant.owner?.phone || restaurant.phone;
  if (ownerPhone) {
    try {
      await notificationProvider.sendMessage({
        phone: ownerPhone,
        message: `Your DineSync AI registration request for "${restaurant.name}" was not approved. Reason: ${reasonText}`,
        template: 'TENANT_REJECTED',
      });
    } catch { /* non-fatal */ }
  }

  // Audit log
  await auditService.logAction({
    restaurantId: restaurant._id,
    userId: reviewerUser?._id || null,
    userEmail: reviewerUser?.email || 'superadmin',
    userRole: reviewerUser?.role || 'super_admin',
    action: 'TENANT_REGISTRATION_REJECTED',
    resource: 'Restaurant',
    details: { restaurantName: restaurant.name, rejectionReason: reasonText },
  });

  return restaurant;
};

/**
 * Handles Webhook: Razorpay Mandate Authorized (`subscription.authenticated` or `subscription.activated`).
 */
const handleMandateAuthorized = async ({ razorpaySubscriptionId }) => {
  const sub = await TenantSubscription.findOne({ razorpaySubscriptionId });
  if (!sub) return null;

  sub.mandateStatus = 'Authorized';
  sub.autoRenew = true;
  await sub.save();

  // Audit log
  await auditService.logAction({
    restaurantId: sub.restaurant,
    action: 'MANDATE_AUTHORIZED',
    resource: 'TenantSubscription',
    details: { razorpaySubscriptionId, mandateStatus: 'Authorized' },
  });

  return sub;
};

/**
 * Audits & Enforces Expiration of Unmandated Trials / Grace Periods.
 */
const checkExpiredTrialsAndDunning = async () => {
  const now = new Date();

  // 1. Check expired trials without authorized mandates
  const expiredTrials = await TenantSubscription.find({
    status: 'Trial',
    trialEndsAt: { $lte: now },
  });

  for (const sub of expiredTrials) {
    if (sub.mandateStatus === 'Authorized') {
      sub.status = 'Active';
      await sub.save();
    } else {
      sub.status = 'Suspended';
      await sub.save();
      await Restaurant.updateOne({ _id: sub.restaurant }, { isActive: false });

      const restaurant = await Restaurant.findById(sub.restaurant).populate('owner');
      const ownerPhone = restaurant?.owner?.phone || restaurant?.phone;
      if (ownerPhone) {
        try {
          await getNotificationProvider().sendMessage({
            phone: ownerPhone,
            message: `Your free trial for "${restaurant?.name}" has expired and no auto-renewal mandate was authorized. Workspace access has been suspended.`,
            template: 'TRIAL_EXPIRED_SUSPENDED',
          });
        } catch { /* non-fatal */ }
      }

      await auditService.logAction({
        restaurantId: sub.restaurant,
        action: 'TRIAL_EXPIRED_SUSPENDED',
        resource: 'TenantSubscription',
        details: { reason: 'Trial expired without authorized mandate' },
      });
    }
  }

  // 2. Check expired grace periods
  const expiredGrace = await TenantSubscription.find({
    status: 'Grace Period',
    gracePeriodEndsAt: { $lte: now },
  });

  for (const sub of expiredGrace) {
    sub.status = 'Suspended';
    await sub.save();
    await Restaurant.updateOne({ _id: sub.restaurant }, { isActive: false });

    await auditService.logAction({
      restaurantId: sub.restaurant,
      action: 'DUNNING_GRACE_EXHAUSTED_SUSPENDED',
      resource: 'TenantSubscription',
      details: { reason: 'Grace period exhausted after recurring payment failures' },
    });
  }
};

/**
 * Handles Webhook: Recurring Charge Success (`subscription.charged` / `invoice.paid`).
 */
const handleRecurringChargeSuccess = async ({ razorpaySubscriptionId, amount, invoiceNumber }) => {
  const sub = await TenantSubscription.findOne({ razorpaySubscriptionId });
  if (!sub) return null;

  const now = new Date();
  const nextEndDate = new Date(now.getTime() + 30 * 86400000);

  sub.status = 'Active';
  sub.endDate = nextEndDate;
  sub.gracePeriodEndsAt = null;
  sub.dunningAttempts = 0;
  sub.billingHistory.push({
    invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    amount: Number(amount) || 1999,
    billingDate: now,
    paymentMethod: 'UPI Autopay / Card Mandate',
    status: 'Paid',
  });

  await sub.save();
  await Restaurant.updateOne({ _id: sub.restaurant }, { isActive: true });

  await auditService.logAction({
    restaurantId: sub.restaurant,
    action: 'RECURRING_CHARGE_SUCCESS',
    resource: 'TenantSubscription',
    details: { amount, razorpaySubscriptionId, nextEndDate },
  });

  return sub;
};

/**
 * Handles Webhook: Recurring Charge Failed (`subscription.halted` / `invoice.payment_failed`).
 */
const handleRecurringChargeFailed = async ({ razorpaySubscriptionId, reason }) => {
  const sub = await TenantSubscription.findOne({ razorpaySubscriptionId });
  if (!sub) return null;

  const now = new Date();
  const graceDays = 3;
  const graceEndsAt = new Date(now.getTime() + graceDays * 86400000);

  sub.status = 'Grace Period';
  sub.gracePeriodEndsAt = graceEndsAt;
  sub.dunningAttempts += 1;
  await sub.save();

  const restaurant = await Restaurant.findById(sub.restaurant).populate('owner');
  const ownerPhone = restaurant?.owner?.phone || restaurant?.phone;
  if (ownerPhone) {
    try {
      await getNotificationProvider().sendMessage({
        phone: ownerPhone,
        message: `Automatic subscription renewal charge for "${restaurant?.name}" failed (${reason || 'Payment declined'}). Your account is in a ${graceDays}-day grace period until ${graceEndsAt.toLocaleDateString('en-IN')}. Please update your payment mandate.`,
        template: 'RECURRING_PAYMENT_FAILED_GRACE',
      });
    } catch { /* non-fatal */ }
  }

  await auditService.logAction({
    restaurantId: sub.restaurant,
    action: 'RECURRING_CHARGE_FAILED_GRACE_STARTED',
    resource: 'TenantSubscription',
    details: { reason, dunningAttempts: sub.dunningAttempts, gracePeriodEndsAt: graceEndsAt },
  });

  return sub;
};

const getTenantSubscription = async (restaurantId) => {
  let sub = await TenantSubscription.findOne({ restaurant: restaurantId });
  if (!sub) {
    sub = await TenantSubscription.create({
      restaurant: restaurantId,
      planCode: 'starter',
      status: 'Trial',
      mandateStatus: 'Pending',
      trialEndsAt: new Date(Date.now() + 14 * 86400000),
      mandateUrl: `https://rzp.io/i/dev_mandate_${Date.now().toString().slice(-6)}`,
      billingHistory: [],
    });
  }
  return sub;
};

const updateTenantSubscription = async (restaurantId, { planCode, status, autoRenew, mandateStatus, extendTrialDays }) => {
  const updates = {};
  if (planCode) updates.planCode = planCode;
  if (status) {
    updates.status = status;
    if (status === 'Active' || status === 'Trial') {
      await Restaurant.updateOne({ _id: restaurantId }, { isActive: true });
    } else if (status === 'Suspended' || status === 'Cancelled') {
      await Restaurant.updateOne({ _id: restaurantId }, { isActive: false });
    }
  }
  if (autoRenew !== undefined) updates.autoRenew = autoRenew;
  if (mandateStatus) updates.mandateStatus = mandateStatus;

  let sub = await TenantSubscription.findOne({ restaurant: restaurantId });
  if (!sub) {
    sub = await TenantSubscription.create({
      restaurant: restaurantId,
      planCode: planCode || 'starter',
      status: status || 'Active',
      ...updates,
    });
  } else {
    if (extendTrialDays && Number(extendTrialDays) > 0) {
      const currentTrial = sub.trialEndsAt || new Date();
      sub.trialEndsAt = new Date(currentTrial.getTime() + Number(extendTrialDays) * 86400000);
      sub.endDate = sub.trialEndsAt;
      sub.status = 'Trial';
      await Restaurant.updateOne({ _id: restaurantId }, { isActive: true });
    }
    Object.assign(sub, updates);
    await sub.save();
  }

  await auditService.logAction({
    restaurantId,
    action: 'TENANT_SUBSCRIPTION_OVERRIDDEN',
    resource: 'TenantSubscription',
    details: updates,
  });

  return sub;
};

const updatePlanConfig = async (code, updates) => {
  await seedDefaultPlansIfEmpty();
  const plan = await SubscriptionPlan.findOneAndUpdate(
    { code: code.toLowerCase() },
    updates,
    { new: true, runValidators: true }
  );
  if (!plan) {
    throw ApiError.notFound(`Subscription plan "${code}" not found.`);
  }
  return plan;
};

module.exports = {
  listPlans,
  evaluateRegistrationFlags,
  initializeTenantTrialAndMandate,
  listManualReviewQueue,
  approveTenantRegistration,
  rejectTenantRegistration,
  handleMandateAuthorized,
  checkExpiredTrialsAndDunning,
  handleRecurringChargeSuccess,
  handleRecurringChargeFailed,
  getTenantSubscription,
  updateTenantSubscription,
  updatePlanConfig,
};
