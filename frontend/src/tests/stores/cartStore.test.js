import assert from 'assert';
import { mockCustomerCartItem, mockCoupon } from '../fixtures/frontendMockData.js';

describe('Frontend CartStore Unit Tests', () => {
  it('should calculate item subtotal with modifier additions', () => {
    const basePrice = mockCustomerCartItem.price; // 320
    const modifierTotal = mockCustomerCartItem.selectedModifiers.reduce((s, m) => s + m.price, 0); // 40
    const quantity = mockCustomerCartItem.quantity; // 2

    const itemTotal = (basePrice + modifierTotal) * quantity; // (320 + 40) * 2 = 720
    assert.strictEqual(itemTotal, 720, 'Item total with modifiers should be 720');
  });

  it('should apply discount coupon percentage with max discount cap', () => {
    const cartSubtotal = 1200;
    const discountAmount = Math.min((cartSubtotal * mockCoupon.discountPercent) / 100, mockCoupon.maxDiscount);

    assert.strictEqual(discountAmount, 100, 'Discount amount should be capped at maxDiscount 100');
  });

  it('should compute loyalty points redemption value correctly', () => {
    const pointsToRedeem = 500; // 100 points = ₹10
    const pointsValue = pointsToRedeem / 10;

    assert.strictEqual(pointsValue, 50, '500 points should equal ₹50 discount');
  });
});
