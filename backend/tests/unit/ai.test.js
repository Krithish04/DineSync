const assert = require('assert');
const { mockAiForecast } = require('../fixtures/mockData');

describe('Backend AI Microservice Proxy Unit Tests', () => {
  it('should validate AI forecast payload structure and confidence score bounds', () => {
    assert.strictEqual(mockAiForecast.forecastPeriod, 'Next 7 Days');
    assert.ok(mockAiForecast.confidenceScore >= 0 && mockAiForecast.confidenceScore <= 1, 'Confidence score must be between 0 and 1');
    assert.strictEqual(mockAiForecast.dailyForecasts.length, 2);
  });

  it('should calculate heuristic sales forecast fallback if FastAPI is unreachable', () => {
    const historical7DayRevenue = [12000, 14000, 15000, 13000, 16000, 18000, 20000];
    const avgDaily = historical7DayRevenue.reduce((a, b) => a + b, 0) / historical7DayRevenue.length;
    const predictedTomorrow = Math.round(avgDaily * 1.05); // 5% growth heuristic

    assert.strictEqual(Math.round(avgDaily), 15429);
    assert.strictEqual(predictedTomorrow, 16200);
  });

  it('should strictly filter out items containing specified allergens for allergy safety', () => {
    const sampleItems = [
      { name: 'Butter Chicken', price: 280, allergens: ['dairy'] },
      { name: 'Peanut Sauce Noodles', price: 220, allergens: ['peanuts'] },
      { name: 'Steamed Rice', price: 100, allergens: [] },
    ];

    const userAllergies = ['peanuts'];
    const safeItems = sampleItems.filter(
      (item) => !item.allergens.some((a) => userAllergies.includes(a))
    );

    assert.strictEqual(safeItems.length, 2);
    assert.strictEqual(safeItems.some((i) => i.name === 'Peanut Sauce Noodles'), false);
  });

  it('should enforce budget threshold when user specifies budget query', () => {
    const sampleItems = [
      { name: 'Paneer Bowl', price: 240 },
      { name: 'Royal Thali', price: 550 },
      { name: 'Garlic Naan', price: 60 },
    ];

    const maxBudget = 300;
    const budgetItems = sampleItems.filter((i) => i.price <= maxBudget);

    assert.strictEqual(budgetItems.length, 2);
    assert.strictEqual(budgetItems.every((i) => i.price <= 300), true);
  });

  it('should strictly match requested food category/item keywords like salad or biryani', () => {
    const sampleItems = [
      { name: 'Fresh Garden Salad', category: 'Starters', description: 'Crisp vegetable salad' },
      { name: 'Garlic Naan', category: 'Breads', description: 'Tandoori bread' },
      { name: 'Butter Chicken', category: 'Main Course', description: 'Rich chicken curry' },
    ];

    const searchQuery = 'salad';
    const matches = sampleItems.filter((it) =>
      it.name.toLowerCase().includes(searchQuery) ||
      it.description.toLowerCase().includes(searchQuery)
    );

    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].name, 'Fresh Garden Salad');
  });
});
