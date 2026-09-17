const mongoose = require('mongoose');
const Restaurant = require('../features/tenant/tenant.model');
const Branch = require('../features/branch/branch.model');
const User = require('../features/auth/auth.model');
const Table = require('../features/table/table.model');
const MenuItem = require('../features/menu/menuItem.model');
const Category = require('../features/category/category.model');
const Order = require('../features/order/order.model');
const KitchenTicket = require('../features/kitchen/kitchenTicket.model');
const Ingredient = require('../features/inventory/ingredient.model');
const Employee = require('../features/employee/employee.model');
const Payroll = require('../features/employee/payroll.model');
const Reservation = require('../features/reservation/reservation.model');
const AuditLog = require('../features/superAdmin/auditLog.model');

/**
 * Migration helper to ensure every existing restaurant has a Main Branch,
 * and all pre-existing unbranched records are backfilled to point to their Main Branch.
 */
async function migrateBranchData() {
  console.log('Starting Branch Data Backfill & Migration...');
  const stats = {
    restaurantsProcessed: 0,
    mainBranchesCreated: 0,
    collectionsBackfilled: {},
  };

  const restaurants = await Restaurant.find({});
  stats.restaurantsProcessed = restaurants.length;

  for (const restaurant of restaurants) {
    const restaurantId = restaurant._id;

    // Find or create default Main Branch for this restaurant
    let mainBranch = await Branch.findOne({ restaurant: restaurantId });
    if (!mainBranch) {
      mainBranch = await Branch.create({
        restaurant: restaurantId,
        name: `${restaurant.name} - Main Branch`,
        code: 'MAIN',
        address: restaurant.address || { line1: '123 Main St', city: 'City', state: 'State', postalCode: '100001', country: 'India' },
        contact: { phone: restaurant.phone || '0000000000', email: restaurant.email || '' },
        status: 'active',
      });
      stats.mainBranchesCreated++;
    }

    const branchId = mainBranch._id;

    // Collections to backfill
    const targetModels = [
      { name: 'User', model: User },
      { name: 'Table', model: Table },
      { name: 'MenuItem', model: MenuItem },
      { name: 'Category', model: Category },
      { name: 'Order', model: Order },
      { name: 'KitchenTicket', model: KitchenTicket },
      { name: 'Ingredient', model: Ingredient },
      { name: 'Employee', model: Employee },
      { name: 'Payroll', model: Payroll },
      { name: 'Reservation', model: Reservation },
      { name: 'AuditLog', model: AuditLog },
    ];

    for (const target of targetModels) {
      const filter = { restaurant: restaurantId, $or: [{ branch: null }, { branch: { $exists: false } }] };
      const res = await target.model.updateMany(filter, { $set: { branch: branchId } });
      
      if (!stats.collectionsBackfilled[target.name]) {
        stats.collectionsBackfilled[target.name] = 0;
      }
      stats.collectionsBackfilled[target.name] += res.modifiedCount || 0;
    }
  }

  console.log('Branch Data Migration completed successfully:', stats);
  return stats;
}

module.exports = migrateBranchData;
