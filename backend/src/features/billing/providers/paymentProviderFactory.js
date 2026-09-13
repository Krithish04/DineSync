const RazorpayPaymentProvider = require('./RazorpayPaymentProvider');
const DevConsolePaymentProvider = require('./DevConsolePaymentProvider');

/**
 * Returns active PaymentProvider singleton based on process.env.PAYMENT_PROVIDER.
 */
let instance = null;

const getPaymentProvider = () => {
  if (instance) return instance;

  const providerType = (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase();

  switch (providerType) {
    case 'razorpay':
      instance = new RazorpayPaymentProvider();
      break;
    case 'dev':
    case 'mock':
    case 'console':
      instance = new DevConsolePaymentProvider();
      break;
    default:
      // eslint-disable-next-line no-console
      console.warn(`[PAYMENT PROVIDER FACTORY] Unknown provider "${providerType}". Defaulting to DevConsole Payment Provider.`);
      instance = new DevConsolePaymentProvider();
      break;
  }

  return instance;
};

const resetPaymentProvider = () => {
  instance = null;
};

module.exports = { getPaymentProvider, resetPaymentProvider };
