const crypto = require('crypto');
const PaymentProvider = require('./PaymentProvider');

/**
 * Dev Console Fallback Payment Provider.
 * Used for offline development and testing when live network calls or keys are unavailable.
 */
class DevConsolePaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.keyId = 'rzp_test_devConsoleMockKey1234';
    this.keySecret = 'devConsoleMockSecret1234';
    this.webhookSecret = 'devConsoleWebhookSecret1234';
  }

  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    const amountInPaise = Math.round(Number(amount) * 100);
    const mockOrderId = `order_dev_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // eslint-disable-next-line no-console
    console.log(`[DEV PAYMENT PROVIDER - CREATE ORDER] Created Mock Razorpay Order "${mockOrderId}" for ₹${amount} (${amountInPaise} paise)`);

    return {
      id: mockOrderId,
      orderId: mockOrderId,
      amount: amountInPaise,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      status: 'created',
      keyId: this.keyId,
      notes,
    };
  }

  verifyWebhookSignature({ rawBody, signature, secret }) {
    const activeSecret = secret || this.webhookSecret;
    if (!rawBody || !signature) return false;
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const expected = crypto.createHmac('sha256', activeSecret).update(bodyStr).digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  }

  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) return false;
    const expected = crypto.createHmac('sha256', this.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return expected === signature;
  }
}

module.exports = DevConsolePaymentProvider;
