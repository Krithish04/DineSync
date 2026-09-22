const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });


const required = ['MONGO_URI', 'JWT_SECRET'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.error(`[ENV] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const parseTrustProxy = (val) => {
  if (val === undefined || val === null || val === '') {
    return process.env.NODE_ENV === 'production' ? 1 : 'loopback';
  }
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (!isNaN(val) && !isNaN(parseInt(val, 10))) {
    return parseInt(val, 10);
  }
  return val;
};

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),

  MONGO_URI: process.env.MONGO_URI,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_COOKIE_EXPIRES_DAYS: parseInt(process.env.JWT_COOKIE_EXPIRES_DAYS, 10) || 7,

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 2000,

  // Email (SMTP) — falls back to console-logged emails in dev if unset
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'DineSync AI <no-reply@dinesync.ai>',

  // OTP & SMS Gateway
  OTP_LENGTH: parseInt(process.env.OTP_LENGTH, 10) || 6,
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10,
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5,
  OTP_RESEND_COOLDOWN_SECONDS:
    parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10) ||
    (process.env.NODE_ENV === 'development' ? 10 : 60),
  SMS_GATEWAY_URL: process.env.SMS_GATEWAY_URL || '',
  SMS_GATEWAY_API_KEY: process.env.SMS_GATEWAY_API_KEY || '',
  FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY || '',
  SMS_GATEWAY_TIMEOUT_MS: parseInt(process.env.SMS_GATEWAY_TIMEOUT_MS, 10) || 5000,

  // Password reset
  RESET_TOKEN_EXPIRY_MINUTES: parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES, 10) || 15,

  // AI Microservice & Gemini LLM
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000/api/v1',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  AI_KITCHEN_RESCORE_MIN_INTERVAL_MS: parseInt(process.env.AI_KITCHEN_RESCORE_MIN_INTERVAL_MS, 10) || 60000,
  AI_KITCHEN_MAX_CALLS_PER_MIN: parseInt(process.env.AI_KITCHEN_MAX_CALLS_PER_MIN, 10) || 5,

  // Auto-Serve Orders Threshold
  AUTO_SERVE_MINUTES: parseInt(process.env.AUTO_SERVE_MINUTES, 10) || 10,

  // Redis & Rate Limiting
  REDIS_URI: process.env.REDIS_URI || process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  OTP_MAX_SEND_PER_HOUR: parseInt(process.env.OTP_MAX_SEND_PER_HOUR, 10) || 5,
  OTP_MAX_SEND_PER_TABLE_PER_HOUR: parseInt(process.env.OTP_MAX_SEND_PER_TABLE_PER_HOUR, 10) || 10,
  OTP_MAX_VERIFY_ATTEMPTS: parseInt(process.env.OTP_MAX_VERIFY_ATTEMPTS, 10) || 5,

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
};

module.exports = env;
