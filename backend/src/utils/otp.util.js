const crypto = require('crypto');
const env = require('../config/env.config');

/**
 * Generates a numeric OTP code of the configured length (default 6 digits).
 * Uses crypto.randomInt for cryptographically strong randomness.
 */
const generateOtpCode = (length = env.OTP_LENGTH) => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return crypto.randomInt(min, max + 1).toString();
};

/**
 * Hashes an OTP code with SHA-256 + a server-side pepper before persisting it,
 * so raw codes are never stored in the database.
 */
const hashOtpCode = (code) =>
  crypto.createHmac('sha256', env.JWT_SECRET).update(code).digest('hex');

/**
 * Constant-time comparison between a candidate code and the stored hash.
 */
const compareOtpCode = (candidateCode, storedHash) => {
  const candidateHash = Buffer.from(hashOtpCode(candidateCode), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  if (candidateHash.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidateHash, stored);
};

module.exports = { generateOtpCode, hashOtpCode, compareOtpCode };
