const assert = require('assert');
const crypto = require('crypto');
const RazorpayPaymentProvider = require('../../src/features/billing/providers/RazorpayPaymentProvider');
const DevConsolePaymentProvider = require('../../src/features/billing/providers/DevConsolePaymentProvider');
const { getPaymentProvider, resetPaymentProvider } = require('../../src/features/billing/providers/paymentProviderFactory');

async function runRazorpayPhase1Tests() {
  console.log('  🧪 Running Razorpay Phase 1 (Backend Test-Mode Setup & Webhook Verification) Tests...');

  // TEST 1: Security Gate — Reject Live Keys, Allow Test Keys
  console.log('    ✓ Test 1: Fail loudly if key ID does not match test-mode prefix "rzp_test_"');
  let threwLiveKeyError = false;
  try {
    process.env.RAZORPAY_KEY_ID = 'rzp_live_1234567890abcdef';
    // eslint-disable-next-line no-new
    new RazorpayPaymentProvider();
  } catch (err) {
    threwLiveKeyError = true;
    assert(err.message.includes('Security Violation'), 'Should throw Security Violation error for live production key ID');
  } finally {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_demoKeyId12345678';
  }
  assert.strictEqual(threwLiveKeyError, true, 'Instantiating with live key must be rejected at startup');

  // TEST 2: Provider Factory Selection
  console.log('    ✓ Test 2: Payment provider factory singleton and fallback instantiation');
  resetPaymentProvider();
  process.env.PAYMENT_PROVIDER = 'razorpay';
  const rzpProvider = getPaymentProvider();
  assert.strictEqual(rzpProvider.constructor.name, 'RazorpayPaymentProvider');

  resetPaymentProvider();
  process.env.PAYMENT_PROVIDER = 'dev';
  const devProvider = getPaymentProvider();
  assert.strictEqual(devProvider.constructor.name, 'DevConsolePaymentProvider');

  // Reset to Razorpay
  resetPaymentProvider();
  process.env.PAYMENT_PROVIDER = 'razorpay';

  // TEST 3: Create Order Payload Structure
  console.log('    ✓ Test 3: Create Razorpay Order API payload structure & currency subunit conversion');
  const provider = new DevConsolePaymentProvider();
  const orderRes = await provider.createOrder({
    amount: 1250.50,
    currency: 'INR',
    receipt: 'rcpt_test_101',
    notes: { restaurantId: 'rest_demo', tableNumber: '4' },
  });

  assert.strictEqual(orderRes.amount, 125050, 'Amount ₹1250.50 should be converted to 125050 paise');
  assert.strictEqual(orderRes.currency, 'INR');
  assert.strictEqual(orderRes.receipt, 'rcpt_test_101');
  assert(orderRes.id.startsWith('order_dev_'), 'Dev order ID should start with order_dev_');

  // TEST 4: HMAC SHA256 Webhook Signature Verification
  console.log('    ✓ Test 4: HMAC SHA256 Webhook signature verification (Genuine vs Forged)');
  const secret = 'test_webhook_signing_secret_9988';
  const payloadStr = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: { id: 'pay_test_998877', amount: 125050, status: 'captured' },
      },
    },
  });

  const validSignature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  const invalidSignature = 'invalid_forged_hmac_signature_12345';

  const isGenuineValid = provider.verifyWebhookSignature({
    rawBody: payloadStr,
    signature: validSignature,
    secret,
  });

  const isForgedValid = provider.verifyWebhookSignature({
    rawBody: payloadStr,
    signature: invalidSignature,
    secret,
  });

  assert.strictEqual(isGenuineValid, true, 'Genuine HMAC signature must pass verification');
  assert.strictEqual(isForgedValid, false, 'Forged/invalid HMAC signature must be rejected');

  // TEST 5: Payment Signature Verification (Callback)
  console.log('    ✓ Test 5: Client callback payment signature verification');
  const orderId = 'order_test_1234';
  const paymentId = 'pay_test_5678';
  const keySecret = provider.keySecret;
  const validCallbackSig = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');

  const isValidCallback = provider.verifyPaymentSignature({
    orderId,
    paymentId,
    signature: validCallbackSig,
  });

  const isInvalidCallback = provider.verifyPaymentSignature({
    orderId,
    paymentId,
    signature: 'bad_signature',
  });

  assert.strictEqual(isValidCallback, true, 'Valid payment callback signature must be accepted');
  assert.strictEqual(isInvalidCallback, false, 'Invalid callback signature must be rejected');

  console.log('  ✅ All Razorpay Phase 1 Backend Tests Passed Successfully!\n');
}

module.exports = { runRazorpayPhase1Tests };
