const NotificationProvider = require('./NotificationProvider');
const DevConsoleNotificationProvider = require('./DevConsoleNotificationProvider');

/**
 * Twilio SMS Notification Provider.
 * Gracefully degrades to DevConsoleNotificationProvider on failure.
 */
class TwilioNotificationProvider extends NotificationProvider {
  constructor() {
    super();
    this.fallbackProvider = new DevConsoleNotificationProvider();
  }

  async sendOtp({ phone, code, purpose }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      // eslint-disable-next-line no-console
      console.warn('[TWILIO PROVIDER] Unconfigured Twilio credentials. Falling back to DevConsole provider.');
      return this.fallbackProvider.sendOtp({ phone, code, purpose });
    }

    try {
      // Lazy load twilio SDK if installed
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      const res = await client.messages.create({
        body: `Your DineSync verification code is ${code}. Valid for 10 minutes.`,
        from: fromPhone,
        to: phone,
      });
      return { success: true, provider: 'twilio', messageSid: res.sid };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[TWILIO PROVIDER ERROR] ${err.message}. Gracefully falling back to DevConsole provider.`);
      return this.fallbackProvider.sendOtp({ phone, code, purpose });
    }
  }

  async sendMessage({ phone, message, template, data }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      return this.fallbackProvider.sendMessage({ phone, message, template, data });
    }

    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      const res = await client.messages.create({
        body: message,
        from: fromPhone,
        to: phone,
      });
      return { success: true, provider: 'twilio', messageSid: res.sid };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[TWILIO PROVIDER ERROR] ${err.message}. Gracefully falling back to DevConsole provider.`);
      return this.fallbackProvider.sendMessage({ phone, message, template, data });
    }
  }
}

module.exports = TwilioNotificationProvider;
