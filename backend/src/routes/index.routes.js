const express = require('express');
const authRoutes = require('../features/auth/auth.routes');
const tenantRoutes = require('../features/tenant/tenant.routes');
const branchRoutes = require('../features/branch/branch.routes');
const categoryRoutes = require('../features/category/category.routes');
const menuItemRoutes = require('../features/menu/menuItem.routes');
const tableRoutes = require('../features/table/table.routes');
const reservationRoutes = require('../features/reservation/reservation.routes');
const orderRoutes = require('../features/order/order.routes');
const kitchenRoutes = require('../features/kitchen/kitchen.routes');
const inventoryRoutes = require('../features/inventory/inventory.routes');
const customerRoutes = require('../features/customer/customer.routes');
const billingRoutes = require('../features/billing/billing.routes');
const employeeRoutes = require('../features/employee/employee.routes');
const reportRoutes = require('../features/reports/report.routes');
const scheduledReportRoutes = require('../features/reports/scheduledReport.routes');
const aiRoutes = require('../features/ai/ai.routes');
const customerExperienceRoutes = require('../features/customerExperience/customerExperience.routes');
const feedbackRoutes = require('../features/customer/feedback.routes');
const notificationRoutes = require('../features/notification/notification.routes');
const superAdminRoutes = require('../features/superAdmin/superAdmin.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'DineSync AI API is healthy', data: null });
});

router.use('/auth', authRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/restaurants', tenantRoutes);
router.use('/restaurants/:restaurantId/branches', branchRoutes);
router.use('/restaurants/:restaurantId/categories', categoryRoutes);
router.use('/restaurants/:restaurantId/menu-items', menuItemRoutes);
router.use('/restaurants/:restaurantId/tables', tableRoutes);
router.use('/restaurants/:restaurantId/reservations', reservationRoutes);
router.use('/restaurants/:restaurantId/orders', orderRoutes);
router.use('/restaurants/:restaurantId/kitchen', kitchenRoutes);
router.use('/restaurants/:restaurantId/inventory', inventoryRoutes);
router.use('/restaurants/:restaurantId/customers', customerRoutes);
router.use('/restaurants/:restaurantId/feedback', feedbackRoutes);
router.use('/restaurants/:restaurantId/billing', billingRoutes);
router.use('/restaurants/:restaurantId/employees', employeeRoutes);
router.use('/restaurants/:restaurantId/reports', reportRoutes);
router.use('/restaurants/:restaurantId/reports', scheduledReportRoutes);
router.use('/restaurants/:restaurantId/ai', aiRoutes);
router.use('/restaurants/:restaurantId/notifications', notificationRoutes);
router.use('/public/restaurants/:restaurantId', customerExperienceRoutes);

module.exports = router;
