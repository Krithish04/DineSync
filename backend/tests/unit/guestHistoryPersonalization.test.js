const assert = require('assert');
const customerExperienceService = require('../../src/features/customerExperience/customerExperience.service');
const Order = require('../../src/features/order/order.model');
const Customer = require('../../src/features/customer/customer.model');
const MenuItem = require('../../src/features/menu/menuItem.model');
const Recipe = require('../../src/features/inventory/recipe.model');
const Ingredient = require('../../src/features/inventory/ingredient.model');
const recommendationEngine = require('../../src/features/ai/recommendationEngine.service');

describe('Guest Order History Personalization & Privacy Unit Tests', () => {
  const validRestId = '507f1f77bcf86cd799439000';
  const testPhone = '+919876543210';

  it('should explicitly handle cold-start case for unverified/first-time guests without errors', async () => {
    const origOrderFind = Order.find;
    const origCustomerFindOne = Customer.findOne;

    Customer.findOne = () => ({
      lean: async () => null,
    });
    Order.find = () => ({
      sort: () => ({
        lean: async () => [],
      }),
    });

    try {
      const history1 = await customerExperienceService.getGuestOrderHistory(validRestId, null);
      assert.strictEqual(history1.hasHistory, false);
      assert.strictEqual(history1.visitCount, 0);
      assert.deepStrictEqual(history1.topFavoriteItems, []);

      const history2 = await customerExperienceService.getGuestOrderHistory(validRestId, '+910000000000');
      assert.strictEqual(history2.hasHistory, false);
      assert.strictEqual(history2.visitCount, 0);
      assert.deepStrictEqual(history2.topFavoriteItems, []);
    } finally {
      Order.find = origOrderFind;
      Customer.findOne = origCustomerFindOne;
    }
  });

  it('should aggregate top favorite items, spend tier, and recent orders for returning verified guests', async () => {
    const origOrderFind = Order.find;
    const origCustomerFindOne = Customer.findOne;

    Customer.findOne = () => ({
      lean: async () => ({
        _id: '507f1f77bcf86cd799439066',
        phoneNumber: testPhone,
        dietaryPreference: 'Veg',
      }),
    });

    Order.find = () => ({
      sort: () => ({
        lean: async () => [
          {
            orderNumber: 'ORD-101',
            grandTotal: 450,
            createdAt: new Date('2026-09-01'),
            items: [
              { menuItem: 'm1', itemName: 'Paneer Butter Masala', quantity: 2, unitPrice: 200 },
              { menuItem: 'm2', itemName: 'Butter Naan', quantity: 4, unitPrice: 45 },
            ],
          },
          {
            orderNumber: 'ORD-102',
            grandTotal: 350,
            createdAt: new Date('2026-09-05'),
            items: [
              { menuItem: 'm1', itemName: 'Paneer Butter Masala', quantity: 1, unitPrice: 200 },
              { menuItem: 'm3', itemName: 'Mango Lassi', quantity: 2, unitPrice: 75 },
            ],
          },
        ],
      }),
    });

    try {
      const history = await customerExperienceService.getGuestOrderHistory(validRestId, testPhone);
      assert.strictEqual(history.hasHistory, true);
      assert.strictEqual(history.visitCount, 2);
      assert.strictEqual(history.averageSpend, 400); // (450 + 350) / 2
      assert.strictEqual(history.budgetTier, 'mid_range');

      assert.strictEqual(history.topFavoriteItems.length, 3);
      // Butter Naan total qty = 4, Paneer Butter Masala = 3 -> Butter Naan should be #1
      assert.strictEqual(history.topFavoriteItems[0].itemName, 'Butter Naan');
      assert.strictEqual(history.topFavoriteItems[0].quantity, 4);
      assert.strictEqual(history.topFavoriteItems[1].itemName, 'Paneer Butter Masala');
      assert.strictEqual(history.topFavoriteItems[1].quantity, 3);
    } finally {
      Order.find = origOrderFind;
      Customer.findOne = origCustomerFindOne;
    }
  });

  it('should boost scores for returning guest favorites in recommendation engine', async () => {
    const origOrderFind = Order.find;
    const origCustomerFindOne = Customer.findOne;
    const origMenuItemFind = MenuItem.find;
    const origRecipeFind = Recipe.find;
    const origIngredientFind = Ingredient.find;

    const mockMenuItems = [
      { _id: 'm1', name: 'Special Veg Biryani', price: 250, rating: 4.5, isAvailable: true },
      { _id: 'm2', name: 'Paneer Butter Masala', price: 220, rating: 4.2, isAvailable: true },
    ];

    MenuItem.find = () => {
      const builder = {
        populate: () => builder,
        lean: async () => mockMenuItems,
      };
      return builder;
    };

    Recipe.find = () => ({ lean: async () => [] });
    Ingredient.find = () => ({ lean: async () => [] });

    Customer.findOne = () => ({
      lean: async () => ({
        _id: '507f1f77bcf86cd799439066',
        phoneNumber: testPhone,
      }),
    });

    Order.find = () => ({
      sort: () => ({
        lean: async () => [
          {
            orderNumber: 'ORD-101',
            grandTotal: 500,
            items: [{ menuItem: 'm1', itemName: 'Special Veg Biryani', quantity: 3, unitPrice: 250 }],
          },
        ],
      }),
    });

    try {
      const recs = await recommendationEngine.generateRecommendations({
        restaurantId: validRestId,
        customerPhone: testPhone,
        limit: 4,
      });

      assert.ok(recs);
      assert.strictEqual(recs.items[0].name, 'Special Veg Biryani');
      assert.ok(recs.items[0].whyRecommended.includes('Reorder your top favorite'));
    } finally {
      Order.find = origOrderFind;
      Customer.findOne = origCustomerFindOne;
      MenuItem.find = origMenuItemFind;
      Recipe.find = origRecipeFind;
      Ingredient.find = origIngredientFind;
    }
  });

  it('should clear stored order history and AI personalization data on forgetGuestHistory opt-out', async () => {
    const origCustomerFindOne = Customer.findOne;
    const origOrderUpdateMany = Order.updateMany;

    let historyCleared = false;
    Customer.findOne = async () => ({
      save: async () => {
        historyCleared = true;
      },
    });

    Order.updateMany = async () => ({ modifiedCount: 2 });

    try {
      const res = await customerExperienceService.forgetGuestHistory(validRestId, testPhone);
      assert.strictEqual(res.success, true);
      assert.strictEqual(historyCleared, true);
    } finally {
      Customer.findOne = origCustomerFindOne;
      Order.updateMany = origOrderUpdateMany;
    }
  });
});
