/**
 * Central Mongoose Model Registry
 * Explicitly requires all model files at server startup to guarantee Mongoose schema
 * registration decoupled from route loading order or feature route toggles.
 */

// Auth & Tenant Models
require('../features/auth/auth.model');
require('../features/auth/otp.model');
require('../features/tenant/tenant.model');
require('../features/branch/branch.model');

// Operations Models
require('../features/category/category.model');
require('../features/menu/menuItem.model');
require('../features/table/table.model');
require('../features/table/tableSession.model');
require('../features/reservation/reservation.model');
require('../features/order/order.model');
require('../features/kitchen/kitchenTicket.model');

// Inventory Models
require('../features/inventory/ingredient.model');
require('../features/inventory/purchase.model');
require('../features/inventory/recipe.model');
require('../features/inventory/stockTransaction.model');
require('../features/inventory/supplier.model');

// Customer & Billing Models
require('../features/customer/customer.model');
require('../features/customer/feedback.model');
require('../features/customer/loyaltyTransaction.model');
require('../features/billing/invoice.model');
require('../features/billing/payment.model');

// Staff Models
require('../features/employee/employee.model');
require('../features/employee/attendance.model');
require('../features/employee/leave.model');
require('../features/employee/payroll.model');
require('../features/employee/shift.model');

// Notification & Reports Models
require('../features/notification/notification.model');
require('../features/notification/notificationPreference.model');
require('../features/notification/notificationTemplate.model');
require('../features/reports/scheduledReport.model');

// Super Admin Models
require('../features/superAdmin/auditLog.model');
require('../features/superAdmin/featureFlag.model');
require('../features/superAdmin/securityLog.model');
require('../features/superAdmin/subscriptionPlan.model');
require('../features/superAdmin/tenantSubscription.model');

module.exports = {};
