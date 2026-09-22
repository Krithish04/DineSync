const DevConsoleNotificationProvider = require('./DevConsoleNotificationProvider');
const FirebaseNotificationProvider = require('./FirebaseNotificationProvider');
const TwilioNotificationProvider = require('./TwilioNotificationProvider');
const SmsGatewayNotificationProvider = require('./SmsGatewayNotificationProvider');
const Fast2SmsNotificationProvider = require('./Fast2SmsNotificationProvider');

let instance = null;

/**
 * Returns active NotificationProvider singleton based on process.env.NOTIFICATION_PROVIDER.
 * Supported options: 'dev' (default) | 'gateway' | 'fast2sms' | 'firebase' | 'twilio'
 */
const getNotificationProvider = () => {
  if (instance) return instance;

  const providerType = (process.env.NOTIFICATION_PROVIDER || 'dev').toLowerCase().trim();

  switch (providerType) {
    case 'fast2sms':
    case 'fast2sms_api':
    case 'fast_2_sms':
      instance = new Fast2SmsNotificationProvider();
      break;
    case 'gateway':
    case 'smsgateway':
    case 'custom':
    case 'cloudflare':
      instance = new SmsGatewayNotificationProvider();
      break;
    case 'firebase':
      instance = new FirebaseNotificationProvider();
      break;
    case 'twilio':
      instance = new TwilioNotificationProvider();
      break;
    case 'dev':
    case 'console':
    default:
      instance = new DevConsoleNotificationProvider();
      break;
  }

  // eslint-disable-next-line no-console
  console.log(`[NOTIFICATION PROVIDER FACTORY] Initialized active provider: "${providerType}"`);
  return instance;
};

// Helper function to reset singleton (useful for testing)
const resetNotificationProvider = () => {
  instance = null;
};

module.exports = { getNotificationProvider, resetNotificationProvider };
