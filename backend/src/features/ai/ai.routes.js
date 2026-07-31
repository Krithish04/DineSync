const express = require('express');
const aiController = require('./ai.controller');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canView = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

router.use(protect, enforceTenantIsolation, canView);

router.get('/overview', aiController.getAiDashboardOverview);
router.get('/sales-forecast', aiController.getSalesForecast);
router.get('/demand-forecast', aiController.getDemandForecast);
router.get('/inventory-forecast', aiController.getInventoryForecast);
router.get('/customer-recommendations', aiController.getCustomerRecommendations);
router.get('/smart-menu', aiController.getSmartMenuRecommendations);
router.get('/wait-time', aiController.getWaitTimePrediction);
router.get('/food-waste', aiController.getFoodWastePrediction);
router.get('/sentiment', aiController.getSentimentAnalysis);

module.exports = router;
