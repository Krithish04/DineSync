const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('./auth.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const {
  registerRestaurantSchema,
  registerUserSchema,
  loginSchema,
  sendOtpSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('./auth.validation');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Stricter rate limit for endpoints that trigger emails or brute-forceable checks.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

// --- Registration ---
router.post(
  '/register-restaurant',
  sensitiveLimiter,
  validateBody(registerRestaurantSchema),
  authController.registerRestaurant
);

router.post(
  '/register',
  sensitiveLimiter,
  validateBody(registerUserSchema),
  authController.registerUser
);

// --- Email verification (OTP) ---
router.post(
  '/verify-email',
  sensitiveLimiter,
  validateBody(verifyEmailSchema),
  authController.verifyEmail
);

router.post(
  '/resend-otp',
  sensitiveLimiter,
  validateBody(sendOtpSchema),
  authController.resendOtp
);

// --- Login / Logout ---
router.post('/login', sensitiveLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', protect, authController.logout);

// --- Forgot / Reset password ---
router.post(
  '/forgot-password',
  sensitiveLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  sensitiveLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

// --- Current user ---
router.get('/me', protect, authController.getMe);

module.exports = router;
