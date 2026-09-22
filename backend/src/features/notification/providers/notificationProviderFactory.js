const DevConsoleNotificationProvider = require('./DevConsoleNotificationProvider');
const FirebaseNotificationProvider = require('./FirebaseNotificationProvider');
const TwilioNotificationProvider = require('./TwilioNotificationProvider');
const SmsGatewayNotificationProvider = require('./SmsGatewayNotificationProvider');
const Fast2SmsNotificationProvider = require('./Fast2SmsNotificationProvider');

const env = require('../../../config/env.config');

let instance = null;

/**
 * Returns active NotificationProvider singleton based on process.env.NOTIFICATION_PROVIDER.
 * Supported options: 'fast2sms' (prioritized if FAST2SMS_API_KEY present) | 'dev' | 'gateway' | 'firebase' | 'twilio'
 */
const getNotificationProvider = () => {
  if (instance) return instance;

  let providerType = (process.env.NOTIFICATION_PROVIDER || process.env.SMS_PROVIDER || '').toLowerCase().trim();

  // Default to Fast2SMS if FAST2SMS_API_KEY is available or provider is unset
  const fast2SmsKey = process.env.FAST2SMS_API_KEY || (env && env.FAST2SMS_API_KEY);
  if (!providerType) {
    providerType = fast2SmsKey ? 'fast2sms' : 'dev';
  }

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
