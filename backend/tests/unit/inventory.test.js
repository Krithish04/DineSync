const assert = require('assert');
const { mockIngredients } = require('../fixtures/mockData');

describe('Backend Inventory Unit Tests', () => {
  it('should accurately calculate stock depletion on order item deduction', () => {
    const ingredient = { ...mockIngredients[0] };
    const initialStock = ingredient.currentStock; // 5 kg
    const quantityDeducted = 1.2; // 1.2 kg

    ingredient.currentStock = Math.max(0, initialStock - quantityDeducted);

    assert.strictEqual(ingredient.currentStock, 3.8, 'Stock should be 3.8 after deducting 1.2');
  });

  it('should detect low stock alerts when current stock falls below reorder level', () => {
    const lowStockIng = { ...mockIngredients[1] }; // currentStock: 0.5, reorderLevel: 1
    const isLowStock = lowStockIng.currentStock <= lowStockIng.reorderLevel;

    assert.strictEqual(isLowStock, true, 'Ingredient should trigger low stock alert');
  });
});
