const axios = require('axios');
const NotificationProvider = require('./NotificationProvider');
const DevConsoleNotificationProvider = require('./DevConsoleNotificationProvider');
const env = require('../../../config/env.config');

/**
 * Fast2SMS API Notification Provider.
 * Sends OTP codes & SMS notifications via Fast2SMS Bulk V2 API.
 * Gracefully degrades to DevConsoleNotificationProvider if unconfigured or on failure.
 */
class Fast2SmsNotificationProvider extends NotificationProvider {
  constructor() {
    super();
    this.fallbackProvider = new DevConsoleNotificationProvider();
    this.apiUrl = 'https://www.fast2sms.com/dev/bulkV2';
  }

  /**
   * Format phone number to 10 digit Indian number for Fast2SMS.
   */
  _formatPhoneNumber(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/[^0-9]/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  async sendOtp({ phone, code, purpose }) {
    const apiKey = env.FAST2SMS_API_KEY || process.env.FAST2SMS_API_KEY;
    const cleanPhone = this._formatPhoneNumber(phone);

    if (!apiKey) {
      // eslint-disable-next-line no-console
      console.warn('[FAST2SMS PROVIDER] FAST2SMS_API_KEY is not configured. Falling back to DevConsole provider.');
      return this.fallbackProvider.sendOtp({ phone, code, purpose });
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          route: 'otp',
          variables_values: String(code),
          numbers: cleanPhone,
        },
        {
          headers: {
            authorization: apiKey,
            'Content-Type': 'application/json',
          },
          timeout: env.SMS_GATEWAY_TIMEOUT_MS || 10000,
        }
      );

      const isSuccess = response.data && (response.data.return === true || response.data.status_code === 200);

      if (isSuccess) {
        // eslint-disable-next-line no-console
        console.log(`[FAST2SMS SUCCESS] Sent OTP to ${cleanPhone} (Request ID: ${response.data.request_id || 'N/A'})`);
        return {
          success: true,
          provider: 'fast2sms',
          requestId: response.data.request_id,
          response: response.data,
          timestamp: new Date().toISOString(),
        };
      }

      // eslint-disable-next-line no-console
      console.warn(`[FAST2SMS WARNING] Fast2SMS returned non-success response: ${JSON.stringify(response.data)}. Falling back to DevConsole.`);
      return this.fallbackProvider.sendOtp({ phone, code, purpose });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[FAST2SMS ERROR] Failed to send OTP via Fast2SMS: ${error.response?.data?.message || error.message}. Falling back to DevConsole.`);
      return this.fallbackProvider.sendOtp({ phone, code, purpose });
    }
  }

  async sendMessage({ phone, message, template, data }) {
    const apiKey = env.FAST2SMS_API_KEY || process.env.FAST2SMS_API_KEY;
    const cleanPhone = this._formatPhoneNumber(phone);

    if (!apiKey) {
      // eslint-disable-next-line no-console
      console.warn('[FAST2SMS PROVIDER] FAST2SMS_API_KEY is not configured for sendMessage. Falling back to DevConsole provider.');
      return this.fallbackProvider.sendMessage({ phone, message, template, data });
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          route: 'q',
          message: message,
          language: 'english',
          numbers: cleanPhone,
        },
        {
          headers: {
            authorization: apiKey,
            'Content-Type': 'application/json',
          },
          timeout: env.SMS_GATEWAY_TIMEOUT_MS || 10000,
        }
      );

      const isSuccess = response.data && (response.data.return === true || response.data.status_code === 200);

      if (isSuccess) {
        // eslint-disable-next-line no-console
        console.log(`[FAST2SMS SUCCESS] Sent message to ${cleanPhone}`);
        return {
          success: true,
          provider: 'fast2sms',
          requestId: response.data.request_id,
          response: response.data,
          timestamp: new Date().toISOString(),
        };
      }

      // eslint-disable-next-line no-console
      console.warn(`[FAST2SMS WARNING] Fast2SMS returned non-success response: ${JSON.stringify(response.data)}. Falling back to DevConsole.`);
      return this.fallbackProvider.sendMessage({ phone, message, template, data });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[FAST2SMS ERROR] Failed to send message via Fast2SMS: ${error.response?.data?.message || error.message}. Falling back to DevConsole.`);
      return this.fallbackProvider.sendMessage({ phone, message, template, data });
    }
  }
}

module.exports = Fast2SmsNotificationProvider;
