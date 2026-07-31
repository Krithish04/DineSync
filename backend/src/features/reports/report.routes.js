const express = require('express');
const reportController = require('./report.controller');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canView = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// All report routes require authentication + tenant isolation + manager+ role
router.use(protect, enforceTenantIsolation, canView);

// Executive Dashboard
router.get('/executive', reportController.getExecutiveDashboard);

// Sales
router.get('/sales/summary', reportController.getSalesSummary);
router.get('/sales/by-branch', reportController.getSalesByBranch);
router.get('/sales/by-category', reportController.getSalesByCategory);
router.get('/sales/by-item', reportController.getSalesByItem);
router.get('/sales/hourly', reportController.getHourlySales);

// Orders
router.get('/orders/summary', reportController.getOrderSummary);

// Reservations
router.get('/reservations/summary', reportController.getReservationSummary);

// Customers
router.get('/customers/summary', reportController.getCustomerSummary);
router.get('/customers/loyalty', reportController.getCustomerLoyaltySummary);

// Inventory
router.get('/inventory/summary', reportController.getInventorySummary);
router.get('/inventory/purchases', reportController.getPurchaseSummary);
router.get('/inventory/consumption', reportController.getIngredientConsumption);
router.get('/inventory/waste', reportController.getWasteAnalysis);

// Employees
router.get('/employees/attendance', reportController.getAttendanceSummary);
router.get('/employees/working-hours', reportController.getWorkingHoursReport);
router.get('/employees/leave-summary', reportController.getLeaveSummary);

// Financial
router.get('/financial/summary', reportController.getFinancialSummary);
router.get('/financial/gst', reportController.getGstReport);
router.get('/financial/payment-methods', reportController.getPaymentMethodSummary);

module.exports = router;
