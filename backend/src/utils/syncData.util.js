const Order = require('../features/order/order.model');
const Customer = require('../features/customer/customer.model');
const billingService = require('../features/billing/billing.service');
const customerService = require('../features/customer/customer.service');

/**
 * Retroactively synchronizes all paid/completed orders with:
 * 1. Paid Invoice & Payment records for Executive BI / Financial Reports
 * 2. Customer visitCount, totalSpent, averageOrderValue, loyaltyPoints & membershipTier for CRM Directory
 */
const TableSession = require('../features/table/tableSession.model');

const syncPaidInvoicesAndCustomerStats = async () => {
  try {
    // 1. Find all paid or completed orders
    const paidOrders = await Order.find({
      $or: [{ paymentStatus: 'Paid' }, { orderStatus: 'Completed' }],
      isDeleted: false,
    });

    for (const order of paidOrders) {
      let orderModified = false;

      // Auto-link customer if missing on order
      if (!order.customer) {
        if (order.session) {
          const session = await TableSession.findById(order.session);
          if (session?.currentHostPhone) {
            const customer = await Customer.findOne({ restaurant: order.restaurant, phoneNumber: session.currentHostPhone, isDeleted: false });
            if (customer) {
              order.customer = customer._id;
              orderModified = true;
            }
          }
        }
      }

      if (order.paymentStatus !== 'Paid') {
        order.paymentStatus = 'Paid';
        orderModified = true;
      }
      if (order.orderStatus !== 'Completed') {
        order.orderStatus = 'Completed';
        orderModified = true;
      }
      if (orderModified) {
        await order.save();
      }

      // Ensure Paid Invoice document exists
      await billingService.ensurePaidInvoiceForOrder(
        order.restaurant,
        order,
        order.paymentMethod || 'UPI',
        order.paymentDetails?.transactionId || ''
      );
    }

    // 2. Recalculate and update Customer statistics for all registered customers
    const customers = await Customer.find({ isDeleted: false });

    for (const customer of customers) {
      const customerOrders = await Order.find({
        customer: customer._id,
        $or: [{ paymentStatus: 'Paid' }, { orderStatus: 'Completed' }],
        isDeleted: false,
      });

      if (customerOrders.length > 0) {
        let totalSpent = 0;
        let pointsEarned = 0;

        for (const ord of customerOrders) {
          totalSpent += ord.grandTotal || 0;
          pointsEarned += Math.round(ord.grandTotal || 0);

          if (!ord.loyaltyAccrued) {
            ord.loyaltyAccrued = true;
            await ord.save();
          }
        }

        customer.visitCount = customerOrders.length;
        customer.totalSpent = totalSpent;
        customer.loyaltyPoints = Math.max(customer.loyaltyPoints || 0, pointsEarned);
        customer.averageOrderValue = customer.visitCount > 0
          ? Math.round((customer.totalSpent / customer.visitCount) * 100) / 100
          : 0;

        // Re-evaluate membership tier based on lifetime spent
        if (customer.totalSpent >= 75000) {
          customer.membershipTier = 'Platinum';
        } else if (customer.totalSpent >= 30000) {
          customer.membershipTier = 'Gold';
        } else if (customer.totalSpent >= 10000) {
          customer.membershipTier = 'Silver';
        } else {
          customer.membershipTier = 'Bronze';
        }

        await customer.save();
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[SyncData] Error during paid invoices & customer stats auto-sync:', err.message);
  }
};

module.exports = { syncPaidInvoicesAndCustomerStats };
