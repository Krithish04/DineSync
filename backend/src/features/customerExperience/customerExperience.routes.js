const express = require('express');
const customerExperienceController = require('./customerExperience.controller');
const customerAuthController = require('./customerAuth.controller');
const { protect } = require('../../middlewares/auth.middleware');

const rateLimit = require('express-rate-limit');

const router = express.Router({ mergeParams: true });

// Rate limiter for customer phone OTP requests to prevent SMS-bombing/spam abuse
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait a few minutes before trying again.',
  },
});

// Optional auth helper: attaches req.user if a valid Bearer token or token cookie is provided, but does not block unauthenticated diners
const optionalProtect = (req, res, next) => {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (!token) {
    return next();
  }
  return protect(req, res, () => next());
};

// Customer OTP Authentication & Self-Service Endpoints
router.post('/customer-auth/send-otp', otpSendLimiter, customerAuthController.sendCustomerOtp);
router.post('/customer-auth/verify-otp', customerAuthController.verifyCustomerOtp);
router.get('/customer-auth/me', protect, customerAuthController.getCustomerProfile);
router.get('/customer-auth/my-orders', protect, customerAuthController.getCustomerOrders);
router.post('/reservations', protect, customerExperienceController.createCustomerReservation);
router.get('/reservations/mine', protect, customerExperienceController.getMyCustomerReservations);

// Public customer-facing routes (unprotected or optional auth)
router.get('/qr-resolve', customerExperienceController.resolveQrCode);
router.get('/menu', customerExperienceController.getPublicMenu);
router.get('/tables/:tableId/session', customerExperienceController.getActiveTableSession);
router.post('/orders', optionalProtect, customerExperienceController.placeCustomerOrder);
router.post('/claim-table', optionalProtect, customerExperienceController.claimTableHost);
router.post('/sessions/:sessionId/settle', optionalProtect, customerExperienceController.settleTableSession);
router.post('/sessions/:sessionId/release', customerExperienceController.releaseTableSession);
router.post('/release-table', customerExperienceController.releaseTableHost);
router.get('/table-orders/:tableId', customerExperienceController.getActiveTableOrders);
router.get('/orders/:orderId/track', customerExperienceController.trackLiveOrder);
router.post('/orders/:orderId/pay', customerExperienceController.payCustomerOrder);
router.post('/orders/:orderId/cancel', customerExperienceController.cancelCustomerOrder);
router.post('/feedback', optionalProtect, customerExperienceController.submitCustomerFeedback);
router.post('/assist-request', customerExperienceController.requestAssistance);

module.exports = router;
