const mongoose = require('mongoose');

const { Schema } = mongoose;

const OTP_PURPOSES = Object.freeze({
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
});

const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
    },
    purpose: {
      type: String,
      enum: Object.values(OTP_PURPOSES),
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    consumed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Fast lookup for the most recent active OTP for a given identity + purpose.
otpSchema.index({ email: 1, restaurant: 1, purpose: 1, createdAt: -1 });

// MongoDB TTL index — automatically deletes documents once expiresAt has passed,
// so expired/used OTPs don't accumulate.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
module.exports.OTP_PURPOSES = OTP_PURPOSES;
