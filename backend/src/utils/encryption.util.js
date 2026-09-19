const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

// Derive a 32-byte key from process.env.ENCRYPTION_KEY or JWT_SECRET or fallback
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'dinesync-ai-default-payroll-secret-key-2026!';
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Encrypts a string value using AES-256-GCM.
 * Returns a payload string formatted as: "iv:authTag:encryptedData"
 */
const encrypt = (text) => {
  if (!text || typeof text !== 'string') return text;
  if (text.startsWith('enc:v1:')) return text; // Already encrypted flag

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts an encrypted payload formatted as: "enc:v1:iv:authTag:encryptedData"
 */
const decrypt = (cipherText) => {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith('enc:v1:')) {
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) return cipherText;

    const [, , ivHex, authTagHex, encryptedData] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // If decryption fails, return masked fallback to avoid hard crashes
    return '**********';
  }
};

/**
 * Masks sensitive values for display to unauthorized roles.
 * E.g. "123456789012" -> "XXXX-XXXX-9012", "ABCDE1234F" -> "XXXXX1234F"
 */
const maskValue = (value, visibleSuffixLength = 4) => {
  if (!value) return '';
  const str = String(value);
  if (str.length <= visibleSuffixLength) return str;
  const maskedLength = str.length - visibleSuffixLength;
  return 'X'.repeat(maskedLength) + str.slice(-visibleSuffixLength);
};

/**
 * Encrypts payload object or string (e.g. { tableId, restaurantId }) into a URL-safe token.
 * Token format: "enc_<base64url(iv + authTag + encryptedData)>"
 * Supports optional options: { expiresInSeconds }
 */
const encryptQrToken = (data, options = {}) => {
  if (!data) return '';
  let payloadObj = typeof data === 'object' ? { ...data } : { value: String(data) };
  if (options.expiresInSeconds && typeof options.expiresInSeconds === 'number') {
    payloadObj.exp = Date.now() + options.expiresInSeconds * 1000;
  }
  const payloadStr = JSON.stringify(payloadObj);
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encryptedBuf = Buffer.concat([cipher.update(payloadStr, 'utf8'), cipher.final()]);
  const authTagBuf = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTagBuf, encryptedBuf]);
  const base64Url = combined.toString('base64url');

  return `enc_${base64Url}`;
};

/**
 * Decrypts a URL-safe token "enc_<base64url(...)>".
 * Returns parsed object or raw string. Returns null if invalid, corrupt, or expired.
 */
const decryptQrToken = (token) => {
  if (!token || typeof token !== 'string' || !token.startsWith('enc_')) {
    return null;
  }

  try {
    const base64Url = token.slice(4);
    const combined = Buffer.from(base64Url, 'base64url');
    if (combined.length < 32) return null;

    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encryptedBuf = combined.subarray(32);

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decryptedBuf = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
    const decryptedStr = decryptedBuf.toString('utf8');

    let parsed;
    try {
      parsed = JSON.parse(decryptedStr);
    } catch {
      parsed = decryptedStr;
    }

    if (parsed && typeof parsed === 'object' && parsed.exp) {
      if (Date.now() > parsed.exp) {
        return null; // Expired token
      }
    }

    return parsed;
  } catch (error) {
    return null;
  }
};

module.exports = {
  encrypt,
  decrypt,
  maskValue,
  encryptQrToken,
  decryptQrToken,
};

