/**
 * Abstract Base Class for Swappable Notification Providers.
 * Supports OTP sending & custom SMS/WhatsApp/Push messaging.
 */
class NotificationProvider {
  /**
   * @param {Object} params
   * @param {string} params.phone Destination phone number
   * @param {string} params.code 6-digit OTP code
   * @param {string} params.purpose OTP purpose
   * @returns {Promise<Object>}
   */
  async sendOtp({ phone, code, purpose }) {
    throw new Error('sendOtp must be implemented by subclass.');
  }

  /**
   * @param {Object} params
   * @param {string} params.phone Destination phone number
   * @param {string} params.message Text message / nudge content
   * @param {string} [params.template] Optional template key
   * @param {Object} [params.data] Additional data context
   * @returns {Promise<Object>}
   */
  async sendMessage({ phone, message, template, data }) {
    throw new Error('sendMessage must be implemented by subclass.');
  }
}

module.exports = NotificationProvider;
