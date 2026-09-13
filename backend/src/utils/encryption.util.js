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

module.exports = {
  encrypt,
  decrypt,
  maskValue,
};
