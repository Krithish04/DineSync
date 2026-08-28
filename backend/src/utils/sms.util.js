const axios = require('axios');
const env = require('../config/env.config');
const ApiError = require('./ApiError');

/**
 * Dispatches an OTP SMS via the Android SMS Gateway running on the local Wi-Fi network.
 *
 * @param {Object} params
 * @param {string} params.phone Destination phone number (e.g., "+919876543210")
 * @param {string} params.otp 6-digit numeric OTP code
 * @returns {Promise<Object>} Response data from the SMS Gateway
 */
const sendSmsViaAndroidGateway = async ({ phone, otp }) => {
  if (!env.SMS_GATEWAY_URL) {
    throw ApiError.internal('SMS Gateway URL is not configured in backend environment.');
  }

  const baseUrl = env.SMS_GATEWAY_URL.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/send-otp`;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (env.SMS_GATEWAY_API_KEY) {
    headers['X-API-Key'] = env.SMS_GATEWAY_API_KEY;
  }

  const payload = {
    phone: phone ? phone.trim() : '',
    otp: otp ? otp.toString().trim() : '',
  };

  try {
    const response = await axios.post(endpoint, payload, {
      headers,
      timeout: env.SMS_GATEWAY_TIMEOUT_MS,
    });

    console.log(`[SMS GATEWAY SUCCESS] OTP sent successfully to ${payload.phone}`);
    return response.data;
  } catch (error) {
    // Hide gateway URL, internal IP and API keys from error message exposed to client
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.error(`[SMS GATEWAY ERROR] Timeout after ${env.SMS_GATEWAY_TIMEOUT_MS}ms connecting to Android SMS Gateway.`);
      throw ApiError.internal('Failed to send SMS code. The SMS gateway phone did not respond in time.');
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH' || error.code === 'ENOTFOUND') {
      console.error(`[SMS GATEWAY ERROR] Could not reach Android Gateway (${error.code}). Ensure phone is connected to local Wi-Fi.`);
      throw ApiError.internal('Unable to connect to SMS Gateway. Please ensure the Android SMS Gateway phone is online and on the same Wi-Fi network.');
    }

    if (error.response) {
      console.error(`[SMS GATEWAY ERROR] Gateway responded with status ${error.response.status}:`, error.response.data);
      const message = error.response.data?.message || 'Android SMS Gateway rejected the SMS request.';
      throw ApiError.badRequest(`SMS Gateway error: ${message}`);
    }

    console.error(`[SMS GATEWAY ERROR] Unexpected error:`, error.message);
    throw ApiError.internal('Failed to dispatch SMS code via Android SMS Gateway.');
  }
};

module.exports = { sendSmsViaAndroidGateway };
