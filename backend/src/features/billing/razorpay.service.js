const TableSession = require('../table/tableSession.model');
const Order = require('../order/order.model');
const ApiError = require('../../utils/ApiError');
const { getPaymentProvider } = require('./providers/paymentProviderFactory');
const customerExperienceService = require('../customerExperience/customerExperience.service');

/**
 * Creates a Razorpay Order tied to a bill or split-bill share.
 */
const createRazorpayOrder = async (restaurantId, { amount, orderId, sessionId, isSplit = false, splitCount = 1, dinerIndex = 0 }) => {
  const provider = getPaymentProvider();

  let targetAmount = Number(amount);
  let receipt = `rcpt_${Date.now()}`;

  if (!targetAmount || targetAmount <= 0) {
    if (sessionId) {
      const session = await TableSession.findById(sessionId);
      if (session) {
        const orders = await Order.find({ session: session._id, orderStatus: { $ne: 'Cancelled' } });
        targetAmount = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      }
    } else if (orderId) {
      const order = await Order.findById(orderId);
      if (order) targetAmount = order.grandTotal || 0;
    }
  }

  if (!targetAmount || targetAmount <= 0) {
    throw ApiError.badRequest('Valid positive bill amount is required to create a Razorpay order.');
  }

  if (isSplit && splitCount > 1) {
    targetAmount = Math.round((targetAmount / splitCount) * 100) / 100;
    receipt = `split_${sessionId || orderId}_${dinerIndex + 1}_${Date.now()}`;
  }

  const notes = {
    restaurantId,
    sessionId: sessionId || '',
    orderId: orderId || '',
    isSplit: isSplit ? 'true' : 'false',
    splitCount: String(splitCount),
    dinerIndex: String(dinerIndex),
  };

  const razorpayOrder = await provider.createOrder({
    amount: targetAmount,
    currency: 'INR',
    receipt,
    notes,
  });

  return {
    razorpayOrderId: razorpayOrder.id || razorpayOrder.orderId,
    orderId: razorpayOrder.id || razorpayOrder.orderId,
    amount: targetAmount,
    amountInPaise: razorpayOrder.amount,
    currency: razorpayOrder.currency || 'INR',
    keyId: razorpayOrder.keyId || provider.keyId,
    notes: razorpayOrder.notes,
  };
};

/**
 * Verifies webhook signature and processes genuine payment events.
 */
const processWebhookEvent = async (restaurantId, rawBody, signature) => {
  const provider = getPaymentProvider();

  // Signature verification algorithm check
  const isValidSignature = provider.verifyWebhookSignature({
    rawBody,
    signature,
  });

  if (!isValidSignature) {
    throw ApiError.badRequest('Razorpay webhook signature verification failed. Request unverified or forged.');
  }

  const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  const event = payload.event;
  const paymentEntity = payload.payload?.payment?.entity || {};
  const orderEntity = payload.payload?.order?.entity || {};

  const notes = paymentEntity.notes || orderEntity.notes || {};
  const sessionId = notes.sessionId;
  const orderId = notes.orderId;
  const isSplit = notes.isSplit === 'true';
  const splitCount = parseInt(notes.splitCount || '1', 10);

  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentRef = paymentEntity.id || `RZP-${Date.now()}`;

    if (sessionId) {
      if (isSplit && splitCount > 1) {
        // Track split payment installment in TableSession
        const session = await TableSession.findById(sessionId);
        if (session) {
          if (!session.splitPaymentStatus) {
            session.splitPaymentStatus = {
              splitCount,
              paidSharesCount: 0,
              totalPaidAmount: 0,
              paidPayments: [],
            };
          }

          const existingTxn = session.splitPaymentStatus.paidPayments.find((p) => p.paymentId === paymentRef);
          if (!existingTxn) {
            const shareAmount = (paymentEntity.amount ? paymentEntity.amount / 100 : 0);
            session.splitPaymentStatus.paidSharesCount += 1;
            session.splitPaymentStatus.totalPaidAmount += shareAmount;
            session.splitPaymentStatus.paidPayments.push({
              paymentId: paymentRef,
              amount: shareAmount,
              paidAt: new Date(),
            });

            await session.save();
          }

          // Fully settled only when all shares are paid
          if (session.splitPaymentStatus.paidSharesCount >= splitCount) {
            await customerExperienceService.settleTableSession(restaurantId, sessionId, {
              paymentMethod: 'UPI',
              transactionReference: paymentRef,
            });
          }
        }
      } else {
        await customerExperienceService.settleTableSession(restaurantId, sessionId, {
          paymentMethod: 'UPI',
          transactionReference: paymentRef,
        });
      }
    } else if (orderId) {
      await customerExperienceService.payCustomerOrder(restaurantId, orderId, {
        paymentMethod: 'UPI',
        transactionReference: paymentRef,
      });
    }

    return { success: true, event, verified: true };
  }

  if (event === 'payment.failed') {
    // Payment failure leaves order/table state unaffected
    return { success: false, event, verified: true, message: 'Payment failed event processed without affecting table state.' };
  }

  return { success: true, event, verified: true, message: 'Webhook event acknowledged.' };
};

/**
 * Verifies frontend payment callback signature.
 */
const verifyPaymentCallback = async (restaurantId, { razorpay_order_id, razorpay_payment_id, razorpay_signature, sessionId, orderId }) => {
  const provider = getPaymentProvider();

  const isValid = provider.verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    throw ApiError.badRequest('Payment verification failed: Invalid callback signature.');
  }

  if (sessionId) {
    await customerExperienceService.settleTableSession(restaurantId, sessionId, {
      paymentMethod: 'Card',
      transactionReference: razorpay_payment_id,
    });
  } else if (orderId) {
    await customerExperienceService.payCustomerOrder(restaurantId, orderId, {
      paymentMethod: 'Card',
      transactionReference: razorpay_payment_id,
    });
  }

  return { verified: true, razorpayPaymentId: razorpay_payment_id };
};

module.exports = {
  createRazorpayOrder,
  processWebhookEvent,
  verifyPaymentCallback,
};
