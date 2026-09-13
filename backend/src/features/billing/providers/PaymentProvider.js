/* eslint-disable no-unused-vars */
/**
 * Abstract Payment Provider Interface.
 * Enforces contract for all payment gateway implementations (Razorpay, DevConsole, etc.).
 */
class PaymentProvider {
  /**
   * Creates a payment order with the gateway.
   * @param {Object} options - { amount (in rupees), currency, receipt, notes }
   * @returns {Promise<Object>} - { orderId, amount, currency, keyId, notes }
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    throw new Error('PaymentProvider.createOrder must be implemented by subclass');
  }

  /**
   * Verifies webhook HMAC signature sent by payment gateway.
   * @param {Object} options - { rawBody, signature, secret }
   * @returns {boolean}
   */
  verifyWebhookSignature({ rawBody, signature, secret }) {
    throw new Error('PaymentProvider.verifyWebhookSignature must be implemented by subclass');
  }

  /**
   * Verifies frontend payment signature callback.
   * @param {Object} options - { orderId, paymentId, signature }
   * @returns {boolean}
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    throw new Error('PaymentProvider.verifyPaymentSignature must be implemented by subclass');
  }
}

module.exports = PaymentProvider;
