const NotificationProvider = require('./NotificationProvider');

/**
 * Dev / Test Notification Provider.
 * Replaces manual self-phone relay by logging OTPs and messaging nudges
 * directly to the server console and structured audit logs.
 */
class DevConsoleNotificationProvider extends NotificationProvider {
  async sendOtp({ phone, code, purpose }) {
    const cleanPhone = phone ? String(phone).trim() : 'Unknown';
    // eslint-disable-next-line no-console
    console.log(`[DEV NOTIFICATION PROVIDER - OTP] Sent OTP code "${code}" to ${cleanPhone} for purpose "${purpose || 'AUTH'}"`);
    return {
      success: true,
      provider: 'dev',
      channel: 'console',
      phone: cleanPhone,
      otpCode: code,
      timestamp: new Date().toISOString(),
    };
  }

  async sendMessage({ phone, message, template, data }) {
    const cleanPhone = phone ? String(phone).trim() : 'Unknown';
    // eslint-disable-next-line no-console
    console.log(`[DEV NOTIFICATION PROVIDER - MSG] Destination: ${cleanPhone} | Message: "${message}" | Template: ${template || 'N/A'}`);
    return {
      success: true,
      provider: 'dev',
      channel: 'console',
      phone: cleanPhone,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = DevConsoleNotificationProvider;
