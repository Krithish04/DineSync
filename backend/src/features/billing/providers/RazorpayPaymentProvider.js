const crypto = require('crypto');
const Razorpay = require('razorpay');
const PaymentProvider = require('./PaymentProvider');
const DevConsolePaymentProvider = require('./DevConsolePaymentProvider');

/**
 * Razorpay Payment Provider (Test Mode Only).
 * Enforces test-mode key format (`rzp_test_...`) and wraps Razorpay's Node SDK.
 */
class RazorpayPaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.fallbackProvider = new DevConsolePaymentProvider();

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_demoKeyId12345678';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'demoKeySecret12345678';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'demoWebhookSecret12345678';

    // Strict Test-Mode Key Format Safeguard: Must start with "rzp_test_"
    if (keyId && !keyId.startsWith('rzp_test_')) {
      const errMsg = `[RazorpayPaymentProvider] Security Violation: RAZORPAY_KEY_ID ("${keyId}") does not match test-mode prefix "rzp_test_". Live production keys are strictly prohibited!`;
      // eslint-disable-next-line no-console
      console.error(errMsg);
      throw new Error(errMsg);
    }

    this.keyId = keyId;
    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret;

    try {
      this.razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
      // eslint-disable-next-line no-console
      console.log(`[RAZORPAY PAYMENT PROVIDER] Initialized with test key_id: "${this.keyId.slice(0, 12)}..."`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RAZORPAY PROVIDER INITIALIZATION ERROR] Falling back to DevConsole provider:', err.message);
      this.razorpay = null;
    }
  }

  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    if (!this.razorpay) {
      return this.fallbackProvider.createOrder({ amount, currency, receipt, notes });
    }

    try {
      const amountInPaise = Math.round(Number(amount) * 100);
      const receiptId = receipt || `rcpt_${Date.now()}`;

      const orderData = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: receiptId,
        notes,
      });

      return {
        id: orderData.id,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
        status: orderData.status,
        keyId: this.keyId,
        notes: orderData.notes,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RAZORPAY CREATE ORDER ERROR] Gracefully falling back to DevConsole provider:', err.message);
      return this.fallbackProvider.createOrder({ amount, currency, receipt, notes });
    }
  }

  async createSubscriptionPlan({ name, amount, interval = 1, period = 'monthly', currency = 'INR' }) {
    if (!this.razorpay) {
      return { id: `plan_dev_${Date.now()}`, name, amount, currency };
    }

    try {
      const amountInPaise = Math.round(Number(amount) * 100);
      const plan = await this.razorpay.plans.create({
        period,
        interval,
        item: {
          name,
          amount: amountInPaise,
          currency,
        },
      });

      return {
        id: plan.id,
        name: plan.item?.name || name,
        amount: plan.item?.amount ? plan.item.amount / 100 : amount,
        currency: plan.item?.currency || currency,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RAZORPAY CREATE PLAN ERROR] Gracefully falling back to dev mock plan:', err.message);
      return { id: `plan_mock_${Date.now()}`, name, amount, currency };
    }
  }

  async createSubscription({ planId, totalCount = 12, startAt, notes = {}, customerNotify = 1 }) {
    if (!this.razorpay) {
      const subId = `sub_dev_${Date.now()}`;
      return {
        id: subId,
        subscriptionId: subId,
        shortUrl: `https://rzp.io/i/dev_mandate_${Date.now().toString().slice(-6)}`,
        status: 'created',
      };
    }

    try {
      const payload = {
        plan_id: planId,
        total_count: totalCount,
        customer_notify: customerNotify,
        notes,
      };
      if (startAt) {
        payload.start_at = Math.floor(new Date(startAt).getTime() / 1000);
      }

      const sub = await this.razorpay.subscriptions.create(payload);

      return {
        id: sub.id,
        subscriptionId: sub.id,
        shortUrl: sub.short_url || `https://rzp.io/i/sub_${sub.id}`,
        status: sub.status,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RAZORPAY CREATE SUBSCRIPTION ERROR] Gracefully falling back to dev mock subscription:', err.message);
      const subId = `sub_fallback_${Date.now()}`;
      return {
        id: subId,
        subscriptionId: subId,
        shortUrl: `https://rzp.io/i/dev_mandate_${Date.now().toString().slice(-6)}`,
        status: 'created',
      };
    }
  }

  verifyWebhookSignature({ rawBody, signature, secret }) {
    const activeSecret = secret || this.webhookSecret;
    if (!rawBody || !signature) return false;

    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
      const expectedSignature = crypto
        .createHmac('sha256', activeSecret)
        .update(bodyStr)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const sigBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== sigBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, sigBuf);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RAZORPAY WEBHOOK VERIFICATION ERROR]:', err.message);
      return false;
    }
  }

  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) return false;

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      return expectedSignature === signature;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RAZORPAY PAYMENT VERIFICATION ERROR]:', err.message);
      return false;
    }
  }
}

module.exports = RazorpayPaymentProvider;
