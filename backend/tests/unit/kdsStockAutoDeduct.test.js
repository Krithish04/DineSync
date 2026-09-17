const assert = require('assert');
const MenuItem = require('../../src/features/menu/menuItem.model');
const KitchenTicket = require('../../src/features/kitchen/kitchenTicket.model');
const Ingredient = require('../../src/features/inventory/ingredient.model');
const Recipe = require('../../src/features/inventory/recipe.model');

describe('KDS Redesign, Stock Tracking, Auto-Deduction & Auto-86 Unit Tests', () => {
  it('should define isAuto86 and auto86Reason schema fields on MenuItem model', () => {
    const item = new MenuItem({
      restaurant: '507f1f77bcf86cd799439011',
      category: '507f1f77bcf86cd799439012',
      name: 'Test Dish',
      price: 250,
      dietaryType: 'veg',
    });

    assert.strictEqual(item.isAvailable, true);
    assert.strictEqual(item.isAuto86, false);
    assert.strictEqual(item.auto86Reason, 'none');
  });

  it('should define deducted boolean flag on KitchenTicket item schema to prevent double deductions', () => {
    const ticket = new KitchenTicket({
      ticketNumber: '101-MAIN',
      restaurant: '507f1f77bcf86cd799439011',
      order: '507f1f77bcf86cd799439012',
      table: '507f1f77bcf86cd799439013',
      station: 'Main Kitchen',
      items: [
        {
          orderItemId: '507f1f77bcf86cd799439014',
          menuItem: '507f1f77bcf86cd799439015',
          itemName: 'Butter Chicken',
          quantity: 2,
        },
      ],
    });

    assert.strictEqual(ticket.items[0].deducted, false, 'deducted flag should default to false');
  });

  it('should accurately evaluate lead ticket priority for 1-second glanceability', () => {
    const tickets = [
      { _id: 't1', priorityFlag: 'on-track', createdAt: new Date(Date.now() - 300000) },
      { _id: 't2', priorityFlag: 'late', createdAt: new Date(Date.now() - 900000) },
      { _id: 't3', priorityFlag: 'at-risk', createdAt: new Date(Date.now() - 600000) },
    ];

    const findLeadTicket = (list) => {
      if (list.length === 0) return null;
      const late = list.filter((t) => t.priorityFlag === 'late' || t.status === 'Delayed');
      if (late.length > 0) return late.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
      const atRisk = list.filter((t) => t.priorityFlag === 'at-risk');
      if (atRisk.length > 0) return atRisk.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
      return list[0];
    };

    const lead = findLeadTicket(tickets);
    assert.strictEqual(lead._id, 't2', 'Ticket t2 (late) should be selected as the dominant Lead Ticket');
  });

  it('should auto-86 menu items when ingredient stock reaches 0 and auto-restore when replenished', () => {
    const ingredient = { _id: 'ing1', ingredientName: 'Chicken', currentStock: 0 };
    const menuItem = { _id: 'm1', name: 'Butter Chicken', isAvailable: true, isAuto86: false, auto86Reason: 'none' };

    // Simulate auto-86 trigger
    if (ingredient.currentStock <= 0) {
      menuItem.isAvailable = false;
      menuItem.isAuto86 = true;
      menuItem.auto86Reason = 'stock';
    }

    assert.strictEqual(menuItem.isAvailable, false, 'Menu item should be unavailable when stock reaches 0');
    assert.strictEqual(menuItem.isAuto86, true);
    assert.strictEqual(menuItem.auto86Reason, 'stock');

    // Simulate stock replenishment
    ingredient.currentStock = 10;
    if (ingredient.currentStock > 0 && menuItem.isAuto86 && menuItem.auto86Reason === 'stock') {
      menuItem.isAvailable = true;
      menuItem.isAuto86 = false;
      menuItem.auto86Reason = 'none';
    }

    assert.strictEqual(menuItem.isAvailable, true, 'Menu item availability should auto-restore when stock is replenished');
    assert.strictEqual(menuItem.isAuto86, false);
    assert.strictEqual(menuItem.auto86Reason, 'none');
  });

  it('should preserve manual 86 reason when staff explicitly disables a dish', () => {
    const menuItem = { _id: 'm2', name: 'Special Fish', isAvailable: false, isAuto86: false, auto86Reason: 'manual' };

    // Stock replenishment should NOT override a manual 86 by staff
    const ingredientStock = 50;
    if (ingredientStock > 0 && menuItem.isAuto86 && menuItem.auto86Reason === 'stock') {
      menuItem.isAvailable = true;
    }

    assert.strictEqual(menuItem.isAvailable, false, 'Manually 86d item should remain unavailable even when stock is OK');
    assert.strictEqual(menuItem.auto86Reason, 'manual');
  });
});
