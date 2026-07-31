const Otp = require('./otp.model');
const { OTP_PURPOSES } = require('./otp.model');
const ApiError = require('../../utils/ApiError');
const { generateOtpCode, hashOtpCode, compareOtpCode } = require('../../utils/otp.util');
const { sendEmail } = require('../../utils/email.util');
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
};

const buildOtpEmailHtml = (purpose, code) => {
  const copy = OTP_EMAIL_COPY[purpose];
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#b23c17;">${copy.heading}</h2>
      <p>${copy.body}</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">${code}</p>
      <p style="color:#666; font-size: 13px;">
        This code expires in ${env.OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
};

/**
 * Enforces a minimum cooldown between OTP requests for the same
 * email + restaurant + purpose, to prevent spamming the mail provider.
 */
const assertResendCooldown = async ({ email, restaurantId, purpose }) => {
  const latest = await Otp.findOne({ email, restaurant: restaurantId, purpose }).sort({
    createdAt: -1,
  });

  if (!latest) return;

  const secondsSinceLast = (Date.now() - latest.createdAt.getTime()) / 1000;
  if (secondsSinceLast < env.OTP_RESEND_COOLDOWN_SECONDS) {
    const waitSeconds = Math.ceil(env.OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
    throw ApiError.badRequest(`Please wait ${waitSeconds}s before requesting another code.`);
  }
};

/**
 * Generates a new OTP, persists its hash, invalidates any previous
 * unconsumed OTPs for the same identity + purpose, and emails the code.
 */
const createAndSendOtp = async ({ email, restaurantId = null, purpose, skipCooldown = false }) => {
  if (!skipCooldown) {
    await assertResendCooldown({ email, restaurantId, purpose });
  }

  // Invalidate any still-active OTPs of the same purpose for this identity.
  await Otp.updateMany(
    { email, restaurant: restaurantId, purpose, consumed: false },
    { $set: { consumed: true } }
  );

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.create({
    email,
    restaurant: restaurantId,
    purpose,
    codeHash,
    expiresAt,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
  });

  const copy = OTP_EMAIL_COPY[purpose];
  await sendEmail({
    to: email,
    subject: copy.subject,
    html: buildOtpEmailHtml(purpose, code),
  });

  return { expiresAt };
};

/**
 * Verifies a submitted OTP code against the most recent active record.
 * Throws on: no active OTP, expired OTP, too many attempts, or mismatch.
 * On success, marks the OTP as consumed so it cannot be reused.
 */
const verifyOtp = async ({ email, restaurantId = null, purpose, code }) => {
  const otpRecord = await Otp.findOne({
    email,
    restaurant: restaurantId,
    purpose,
    consumed: false,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw ApiError.badRequest('No active verification code found. Please request a new one.');
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('This code has expired. Please request a new one.');
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    throw ApiError.badRequest('Too many incorrect attempts. Please request a new code.');
  }

  const isMatch = compareOtpCode(code, otpRecord.codeHash);

  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw ApiError.badRequest('Incorrect verification code.');
  }

  otpRecord.consumed = true;
  await otpRecord.save();

  return true;
};

module.exports = { createAndSendOtp, verifyOtp, OTP_PURPOSES };
