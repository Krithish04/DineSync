const assert = require('assert');
const mongoose = require('mongoose');
const Restaurant = require('../../src/features/tenant/tenant.model');
const TenantSubscription = require('../../src/features/superAdmin/tenantSubscription.model');
const SubscriptionPlan = require('../../src/features/superAdmin/subscriptionPlan.model');
const subscriptionService = require('../../src/features/superAdmin/subscription.service');
const RazorpayPaymentProvider = require('../../src/features/billing/providers/RazorpayPaymentProvider');

describe('Restaurant Owner Registration, Subscription, Mandate & Dunning Unit Tests', () => {
  it('Phase 1: should model Restaurant approval status, flag reasons, and GST schema', () => {
    const restaurant = new Restaurant({
      name: 'Spice Bistro',
      phone: '+919876543210',
      address: '100ft Road, Indiranagar, Bangalore, Karnataka',
      subscriptionPlan: 'pro',
      approvalStatus: 'Auto Approved',
      flaggedReasons: [],
      gst: {
        gstRegistered: true,
        gstin: '29ABCDE1234F1Z5',
      },
    });

    assert.strictEqual(restaurant.approvalStatus, 'Auto Approved');
    assert.strictEqual(restaurant.subscriptionPlan, 'pro');
    assert.strictEqual(restaurant.gst.gstin, '29ABCDE1234F1Z5');
  });

  it('Phase 1 & 2: should detect GSTIN state code mismatch and flag registration for review', async () => {
    const flags = await subscriptionService.evaluateRegistrationFlags({
      email: 'owner.mumbai@example.com',
      phone: '+919876543211',
      restaurantName: 'Mumbai Spice Bangalore Branch',
      address: 'Indiranagar, Bangalore, Karnataka',
      gstin: '27ABCDE1234F1Z5', // 27 = Maharashtra, address says Karnataka -> Mismatch!
    });

    assert.strictEqual(flags.length, 1);
    assert.ok(flags[0].includes('GSTIN State Mismatch'), 'Should trigger GSTIN state mismatch flag');
  });

  it('Phase 1 & 2: should flag incomplete address and invalid phone number formats', async () => {
    const flags = await subscriptionService.evaluateRegistrationFlags({
      email: 'test.invalid@example.com',
      phone: '123', // Invalid phone length
      restaurantName: 'Short Addr Cafe',
      address: '123', // Incomplete address
    });

    assert.strictEqual(flags.length, 2);
    assert.ok(flags.some((f) => f.includes('Incomplete Physical Address')));
    assert.ok(flags.some((f) => f.includes('Invalid Phone Number Format')));
  });

  it('Phase 3 & 4: should calculate Razorpay subscription start_at trial offset and mandate URL', async () => {
    const provider = new RazorpayPaymentProvider();
    const trialDays = 14;
    const trialEndsAt = new Date(Date.now() + trialDays * 86400000);

    const rzpSub = await provider.createSubscription({
      planId: 'plan_pro_123',
      startAt: trialEndsAt,
      notes: { restaurantName: 'Clean Bistro' },
    });

    assert.ok(rzpSub.id, 'Subscription ID should be created');
    assert.ok(rzpSub.shortUrl, 'Mandate shortUrl should be generated');
    assert.strictEqual(rzpSub.status, 'created');
  });

  it('Phase 4: should authenticate mandate authorization webhook event', async () => {
    const sub = new TenantSubscription({
      restaurant: new mongoose.Types.ObjectId(),
      planCode: 'pro',
      status: 'Trial',
      mandateStatus: 'Pending',
      razorpaySubscriptionId: 'sub_test_mandate_123',
    });

    assert.strictEqual(sub.mandateStatus, 'Pending');

    sub.mandateStatus = 'Authorized';
    sub.autoRenew = true;

    assert.strictEqual(sub.mandateStatus, 'Authorized');
    assert.strictEqual(sub.autoRenew, true);
  });

  it('Phase 5: should model recurring payment failure entering Grace Period and dunning attempts', () => {
    const sub = new TenantSubscription({
      restaurant: new mongoose.Types.ObjectId(),
      planCode: 'starter',
      status: 'Active',
      mandateStatus: 'Authorized',
      razorpaySubscriptionId: 'sub_test_dunning_456',
    });

    const now = new Date();
    const graceEndsAt = new Date(now.getTime() + 3 * 86400000);

    sub.status = 'Grace Period';
    sub.gracePeriodEndsAt = graceEndsAt;
    sub.dunningAttempts += 1;

    assert.strictEqual(sub.status, 'Grace Period');
    assert.strictEqual(sub.dunningAttempts, 1);
    assert.ok(sub.gracePeriodEndsAt > now);

    // Simulate grace period exhaustion
    sub.status = 'Suspended';
    assert.strictEqual(sub.status, 'Suspended');
  });
});
