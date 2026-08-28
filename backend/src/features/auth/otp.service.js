const Otp = require('./otp.model');
const { OTP_PURPOSES } = require('./otp.model');
const ApiError = require('../../utils/ApiError');
const { generateOtpCode, hashOtpCode, compareOtpCode } = require('../../utils/otp.util');
const { sendEmail } = require('../../utils/email.util');
const { sendSmsViaAndroidGateway } = require('../../utils/sms.util');
const env = require('../../config/env.config');

const OTP_EMAIL_COPY = {
  [OTP_PURPOSES.EMAIL_VERIFICATION]: {
    subject: 'Verify your DineSync AI account',
    heading: 'Confirm your email address',
    body: 'Use the code below to verify your email and activate your DineSync AI account.',
  },
  [OTP_PURPOSES.PASSWORD_RESET]: {
    subject: 'Reset your DineSync AI password',
    heading: 'Reset your password',
    body: 'Use the code below to reset your DineSync AI account password.',
  },
  [OTP_PURPOSES.CUSTOMER_LOGIN]: {
    subject: 'Your DineSync AI Login Code',
    heading: 'DineSync Diner Verification',
    body: 'Use the code below to log in to your diner account.',
  },
};

const buildOtpEmailHtml = (purpose, code) => {
  const copy = OTP_EMAIL_COPY[purpose] || OTP_EMAIL_COPY[OTP_PURPOSES.EMAIL_VERIFICATION];
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#b23c17;">${copy.heading}</h2>
      <p>${copy.body}</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">${code}</p>
      <p style="color:#666; font-size: 13px;">
        This code expires in ${env.OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this code.
      </p>
    </div>
  `;
};

const normalizePhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  return String(phone).trim().startsWith('+') ? `+${digits}` : digits;
};

/**
 * Enforces a minimum cooldown between OTP requests for the same
 * email/phone + purpose (and restaurant if provided).
 */
const assertResendCooldown = async ({ email = null, phone = null, restaurantId = null, purpose }) => {
  const cleanEmail = email ? email.trim().toLowerCase() : null;
  const cleanPhone = normalizePhone(phone);
  const query = { purpose };
  if (cleanPhone) query.phone = cleanPhone;
  else if (cleanEmail) query.email = cleanEmail;
  else return;

  const latest = await Otp.findOne(query).sort({ createdAt: -1 });

  if (!latest) return;

  const cooldownSecs = env.isDevelopment ? 5 : (env.OTP_RESEND_COOLDOWN_SECONDS || 60);

  const createdTime = latest.createdAt instanceof Date ? latest.createdAt.getTime() : new Date(latest.createdAt).getTime();
  const secondsSinceLast = (Date.now() - createdTime) / 1000;
  if (secondsSinceLast < cooldownSecs) {
    const waitSeconds = Math.ceil(cooldownSecs - secondsSinceLast);
    throw ApiError.badRequest(`Please wait ${waitSeconds}s before requesting another code.`);
  }
};

/**
 * Generates a new OTP, persists its hash, invalidates any previous
 * unconsumed OTPs for the same identity + purpose, and sends/logs the code.
 */
const createAndSendOtp = async ({ email = null, phone = null, restaurantId = null, purpose, skipCooldown = false }) => {
  const cleanEmail = email ? email.trim().toLowerCase() : null;
  const cleanPhone = normalizePhone(phone);

  if (!cleanEmail && !cleanPhone) {
    throw ApiError.badRequest('Either email or phone is required to generate an OTP.');
  }

  if (!skipCooldown) {
    await assertResendCooldown({ email: cleanEmail, phone: cleanPhone, restaurantId, purpose });
  }

  const invalidateQuery = { purpose, consumed: false };
  if (cleanPhone) invalidateQuery.phone = cleanPhone;
  else if (cleanEmail) invalidateQuery.email = cleanEmail;

  // Invalidate any still-active OTPs of the same purpose for this identity.
  await Otp.updateMany(invalidateQuery, { $set: { consumed: true } });

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.create({
    email: cleanEmail,
    phone: cleanPhone,
    restaurant: restaurantId || null,
    purpose,
    codeHash,
    expiresAt,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
  });

  let smsSent = false;
  let emailSent = false;

  if (cleanPhone) {
    if (env.SMS_GATEWAY_URL) {
      try {
        await sendSmsViaAndroidGateway({ phone: cleanPhone, otp: code });
        smsSent = true;
      } catch (err) {
        if (process.env.NODE_ENV === 'production') throw err;
        console.warn(`[SMS GATEWAY FALLBACK] ${err.message}. Dev OTP code is: ${code}`);
      }
    } else {
      console.log(`[SMS DEV FALLBACK] Sent OTP code ${code} to phone ${cleanPhone} for purpose ${purpose}`);
    }
  } else if (cleanEmail) {
    const copy = OTP_EMAIL_COPY[purpose] || OTP_EMAIL_COPY[OTP_PURPOSES.EMAIL_VERIFICATION];
    try {
      await sendEmail({
        to: cleanEmail,
        subject: copy.subject,
        html: buildOtpEmailHtml(purpose, code),
      });
      emailSent = true;
    } catch (err) {
      if (process.env.NODE_ENV === 'production') throw err;
      console.warn(`[EMAIL DISPATCH FALLBACK] ${err.message}. Dev OTP code is: ${code}`);
    }
  }

  const isDevOrUnconfigured =
    (!cleanPhone && (!env.SMTP_HOST || !emailSent)) ||
    (cleanPhone && (!env.SMS_GATEWAY_URL || !smsSent));

  return { expiresAt, devOtp: isDevOrUnconfigured ? code : undefined };
};

/**
 * Verifies a submitted OTP code against the most recent active record.
 * Throws on: no active OTP, expired OTP, too many attempts, or mismatch.
 * On success, marks the OTP as consumed so it cannot be reused.
 */
const verifyOtp = async ({ email = null, phone = null, restaurantId = null, purpose, code }) => {
  const cleanEmail = email ? email.trim().toLowerCase() : null;
  const cleanPhone = normalizePhone(phone);
  const cleanCode = code !== null && code !== undefined ? code.toString().trim() : '';

  if (!cleanCode) {
    throw ApiError.badRequest('Verification OTP code is required.');
  }

  const query = { purpose, consumed: false };
  if (cleanPhone) query.phone = cleanPhone;
  else if (cleanEmail) query.email = cleanEmail;
  else {
    throw ApiError.badRequest('Either email or phone is required to verify OTP.');
  }

  let otpRecord = null;
  if (restaurantId) {
    otpRecord = await Otp.findOne({ ...query, restaurant: restaurantId }).sort({ createdAt: -1 });
  }
  if (!otpRecord) {
    otpRecord = await Otp.findOne(query).sort({ createdAt: -1 });
  }

  if (!otpRecord) {
    throw ApiError.badRequest('No active verification code found. Please request a new one.');
  }

  const expiresTime = otpRecord.expiresAt instanceof Date ? otpRecord.expiresAt.getTime() : new Date(otpRecord.expiresAt).getTime();
  if (expiresTime < Date.now()) {
    throw ApiError.badRequest('This code has expired. Please request a new one.');
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    throw ApiError.badRequest('Too many incorrect attempts. Please request a new code.');
  }

  const isMatch = compareOtpCode(cleanCode, otpRecord.codeHash);

  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw ApiError.badRequest('Incorrect verification code.');
  }

  otpRecord.consumed = true;
  await otpRecord.save();

  return true;
};

module.exports = { createAndSendOtp, verifyOtp, OTP_PURPOSES, normalizePhone };
