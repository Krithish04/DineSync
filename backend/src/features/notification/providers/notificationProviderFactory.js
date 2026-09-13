const DevConsoleNotificationProvider = require('./DevConsoleNotificationProvider');
const FirebaseNotificationProvider = require('./FirebaseNotificationProvider');
const TwilioNotificationProvider = require('./TwilioNotificationProvider');

let instance = null;

/**
 * Returns active NotificationProvider singleton based on process.env.NOTIFICATION_PROVIDER.
 * Supported options: 'dev' (default) | 'firebase' | 'twilio' | 'whatsapp'
 */
const getNotificationProvider = () => {
  if (instance) return instance;

  const providerType = (process.env.NOTIFICATION_PROVIDER || 'dev').toLowerCase().trim();

  switch (providerType) {
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
