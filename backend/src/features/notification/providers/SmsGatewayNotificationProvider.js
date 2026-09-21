const axios = require('axios');
const NotificationProvider = require('./NotificationProvider');
const env = require('../../../config/env.config');

/**
 * Custom SMS Gateway Notification Provider.
 * Sends OTP codes & SMS notifications to custom physical SIM / Android SMS Gateway apps via Cloudflare Tunnel.
 */
class SmsGatewayNotificationProvider extends NotificationProvider {
  async sendOtp({ phone, code, purpose }) {
    const cleanPhone = phone ? String(phone).trim() : '';
    const gatewayUrl = env.SMS_GATEWAY_URL || process.env.SMS_GATEWAY_URL;
    const apiKey = env.SMS_GATEWAY_API_KEY || process.env.SMS_GATEWAY_API_KEY;

    if (!gatewayUrl) {
      // eslint-disable-next-line no-console
      console.warn(`[SMS GATEWAY] SMS_GATEWAY_URL is not configured. Falling back to console OTP: ${code}`);
      return {
        success: false,
        provider: 'custom_gateway',
        error: 'SMS_GATEWAY_URL is missing',
        otpCode: code,
      };
    }

    const messageText = `Your DineSync AI verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

    const headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }

    const payload = {
      to: cleanPhone,
      phone: cleanPhone,
      number: cleanPhone,
      recipient: cleanPhone,
      message: messageText,
      text: messageText,
      code,
      purpose: purpose || 'CUSTOMER_LOGIN',
      secret: apiKey || '',
    };

    try {
      const response = await axios.post(gatewayUrl, payload, {
        headers,
        timeout: env.SMS_GATEWAY_TIMEOUT_MS || 10000,
      });

      const isSuccess = response.status >= 200 && response.status < 300;
      // eslint-disable-next-line no-console
      console.log(`[SMS GATEWAY SUCCESS] Sent OTP to ${cleanPhone} via ${gatewayUrl} (HTTP ${response.status})`);

      return {
        success: isSuccess,
        provider: 'custom_gateway',
        gatewayUrl,
        response: response.data || { status: 'queued', httpStatus: response.status },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[SMS GATEWAY ERROR] Failed to send OTP via ${gatewayUrl}: ${error.response?.data?.message || error.message}`);
      return {
        success: false,
        provider: 'custom_gateway',
        error: error.message,
        otpCode: code,
      };
    }
  }

  async sendMessage({ phone, message, template, data }) {
    const cleanPhone = phone ? String(phone).trim() : '';
    const gatewayUrl = env.SMS_GATEWAY_URL || process.env.SMS_GATEWAY_URL;
    const apiKey = env.SMS_GATEWAY_API_KEY || process.env.SMS_GATEWAY_API_KEY;

    if (!gatewayUrl) {
      // eslint-disable-next-line no-console
      console.warn(`[SMS GATEWAY] SMS_GATEWAY_URL is not configured for sendMessage: "${message}"`);
      return { success: false, provider: 'custom_gateway', error: 'SMS_GATEWAY_URL is missing' };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }

    const payload = {
      to: cleanPhone,
      phone: cleanPhone,
      number: cleanPhone,
      recipient: cleanPhone,
      message,
      text: message,
      template: template || 'GENERAL',
      data: data || {},
      secret: apiKey || '',
    };

    try {
      const response = await axios.post(gatewayUrl, payload, {
        headers,
        timeout: env.SMS_GATEWAY_TIMEOUT_MS || 10000,
      });

      return {
        success: response.status >= 200 && response.status < 300,
        provider: 'custom_gateway',
        gatewayUrl,
        response: response.data || { status: 'queued', httpStatus: response.status },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[SMS GATEWAY ERROR] Failed to send message via ${gatewayUrl}: ${error.response?.data?.message || error.message}`);
      return { success: false, provider: 'custom_gateway', error: error.message };
    }
  }
}

module.exports = SmsGatewayNotificationProvider;
