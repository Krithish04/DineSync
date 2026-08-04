const express = require('express');
const customerExperienceController = require('./customerExperience.controller');

const router = express.Router({ mergeParams: true });

// Public customer-facing routes (unprotected)
router.get('/qr-resolve', customerExperienceController.resolveQrCode);
router.get('/menu', customerExperienceController.getPublicMenu);
router.post('/orders', customerExperienceController.placeCustomerOrder);
router.post('/claim-table', customerExperienceController.claimTableHost);
router.post('/release-table', customerExperienceController.releaseTableHost);
router.get('/orders/:orderId/track', customerExperienceController.trackLiveOrder);
router.post('/orders/:orderId/pay', customerExperienceController.payCustomerOrder);
router.post('/orders/:orderId/cancel', customerExperienceController.cancelCustomerOrder);
router.post('/feedback', customerExperienceController.submitCustomerFeedback);
router.post('/assist-request', customerExperienceController.requestAssistance);

module.exports = router;
