const axios = require('axios');
const NotificationProvider = require('./NotificationProvider');
const DevConsoleNotificationProvider = require('./DevConsoleNotificationProvider');

/**
 * Firebase / Gateway Phone Notification Provider.
 * Gracefully degrades to DevConsoleNotificationProvider on network/config failure.
 */
class FirebaseNotificationProvider extends NotificationProvider {
  constructor() {
    super();
    this.fallbackProvider = new DevConsoleNotificationProvider();
  }

  async sendOtp({ phone, code, purpose }) {
    const gatewayUrl = process.env.SMS_GATEWAY_URL || process.env.FIREBASE_SMS_GATEWAY_URL;

    if (!gatewayUrl) {
      // eslint-disable-next-line no-console
      console.warn('[FIREBASE NOTIFICATION PROVIDER] Unconfigured gateway URL. Falling back to DevConsole provider.');
      return this.fallbackProvider.sendOtp({ phone, code, purpose });
    }

    try {
      const response = await axios.post(
        `${gatewayUrl.replace(/\/+$/, '')}/send-otp`,
        { phone, otp: code, purpose },
        { timeout: 4000 }
      );
      return { success: true, provider: 'firebase', response: response.data };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[FIREBASE NOTIFICATION PROVIDER ERROR] ${err.message}. Gracefully falling back to DevConsole provider.`);
      return this.fallbackProvider.sendOtp({ phone, code, purpose });
    }
  }

  async sendMessage({ phone, message, template, data }) {
    const gatewayUrl = process.env.SMS_GATEWAY_URL || process.env.FIREBASE_SMS_GATEWAY_URL;

    if (!gatewayUrl) {
      return this.fallbackProvider.sendMessage({ phone, message, template, data });
    }

    try {
      const response = await axios.post(
        `${gatewayUrl.replace(/\/+$/, '')}/send-message`,
        { phone, message, template, data },
        { timeout: 4000 }
      );
      return { success: true, provider: 'firebase', response: response.data };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[FIREBASE NOTIFICATION PROVIDER ERROR] ${err.message}. Gracefully falling back to DevConsole provider.`);
      return this.fallbackProvider.sendMessage({ phone, message, template, data });
    }
  }
}

module.exports = FirebaseNotificationProvider;
