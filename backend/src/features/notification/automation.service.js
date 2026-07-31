const notificationService = require('./notification.service');
const Reservation = require('../reservation/reservation.model');
const Order = require('../order/order.model');
const Table = require('../table/table.model');
const Ingredient = require('../inventory/ingredient.model');
const Customer = require('../customer/customer.model');
const Employee = require('../employee/employee.model');

// ==========================================
// 1. RESERVATION AUTOMATION
// ==========================================
const runReservationAutomations = async (restaurantId) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Remind upcoming reservations for today
  const upcomingBookings = await Reservation.find({
    restaurant: restaurantId,
    reservationDate: todayStr,
    reservationStatus: 'Confirmed',
  }).populate('customer branch');

  for (const booking of upcomingBookings) {
    if (booking.customer && booking.customer.email) {
      await notificationService.dispatchNotification(restaurantId, {
        title: 'Reservation Reminder Today',
        message: `Dear ${booking.customer.fullName}, your table reservation is scheduled for ${booking.reservationTime} today.`,
        category: 'Reservation',
        priority: 'Info',
        channels: ['In-App', 'Email', 'WhatsApp'],
        emailTo: booking.customer.email,
        phoneTo: booking.customer.phoneNumber,
      });
    }
  }

  // Cancel expired pending reservations older than 2 hours
  const pastPending = await Reservation.find({
    restaurant: restaurantId,
    reservationStatus: 'Pending',
    createdAt: { $lte: new Date(Date.now() - 2 * 3600000) },
  });

  for (const exp of pastPending) {
    exp.reservationStatus = 'Cancelled';
    await exp.save();
  }
};

// ==========================================
// 2. ORDER & TABLE AUTOMATION
// ==========================================
const handleOrderReadyAutomation = async (restaurantId, order) => {
  if (order.customer && order.customer.email) {
    await notificationService.dispatchNotification(restaurantId, {
      title: 'Your Order is Ready!',
      message: `Order #${order._id.toString().slice(-6)} is ready for pickup/service. Enjoy your meal!`,
      category: 'Order',
      priority: 'Info',
      channels: ['In-App', 'Email', 'SMS', 'WhatsApp'],
      emailTo: order.customer.email,
      phoneTo: order.customer.phoneNumber,
    });
  }
};

const handlePaymentCompletedTableFreeing = async (restaurantId, tableId) => {
  if (tableId) {
    await Table.updateOne({ _id: tableId, restaurant: restaurantId }, { status: 'Cleaning' });
  }
};

// ==========================================
// 3. INVENTORY AUTOMATION
// ==========================================
const runInventoryAutomations = async (restaurantId) => {
  const lowStockItems = await Ingredient.find({
    restaurant: restaurantId,
    isDeleted: false,
    $expr: { $lte: ['$currentStock', '$reorderLevel'] },
  });

  for (const ing of lowStockItems) {
    await notificationService.dispatchNotification(restaurantId, {
      title: `Low Stock Alert: ${ing.ingredientName}`,
      message: `Stock level for ${ing.ingredientName} has dropped to ${ing.currentStock} ${ing.unit} (Reorder level: ${ing.reorderLevel} ${ing.unit}).`,
      category: 'Inventory',
      priority: 'Warning',
      channels: ['In-App', 'Email'],
    });
  }
};

// ==========================================
// 4. CUSTOMER & LOYALTY AUTOMATION
// ==========================================
const runCustomerAutomations = async (restaurantId) => {
  const customers = await Customer.find({ restaurant: restaurantId, isDeleted: false });

  for (const cust of customers) {
    // Loyalty tier upgrade check
    let newTier = cust.membershipTier;
    if (cust.totalSpent >= 10000) newTier = 'Platinum';
    else if (cust.totalSpent >= 5000) newTier = 'Gold';
    else if (cust.totalSpent >= 2000) newTier = 'Silver';

    if (newTier !== cust.membershipTier) {
      cust.membershipTier = newTier;
      await cust.save();

      await notificationService.dispatchNotification(restaurantId, {
        title: `Congratulations! Tier Upgraded to ${newTier}`,
        message: `Dear ${cust.fullName}, you have been upgraded to the ${newTier} membership tier! Enjoy 1.5x points multiplier.`,
        category: 'Customer',
        priority: 'Info',
        channels: ['In-App', 'Email'],
        emailTo: cust.email,
      });
    }
  }
};

// ==========================================
// 5. EMPLOYEE AUTOMATION
// ==========================================
const runEmployeeAutomations = async (restaurantId) => {
  const activeEmployees = await Employee.find({ restaurant: restaurantId, isActive: true });

  for (const emp of activeEmployees) {
    if (emp.email) {
      await notificationService.dispatchNotification(restaurantId, {
        title: 'Daily Shift Reminder',
        message: `Hello ${emp.firstName}, please remember to clock in upon arrival for your scheduled shift today.`,
        category: 'Employee',
        priority: 'Info',
        channels: ['In-App', 'Email'],
        emailTo: emp.email,
      });
    }
  }
};

module.exports = {
  runReservationAutomations,
  handleOrderReadyAutomation,
  handlePaymentCompletedTableFreeing,
  runInventoryAutomations,
  runCustomerAutomations,
  runEmployeeAutomations,
};
