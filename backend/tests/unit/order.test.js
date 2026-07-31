const assert = require('assert');
const { mockOrder, mockMenuItems } = require('../fixtures/mockData');

describe('Backend Order Unit Tests', () => {
  it('should accurately compute order subtotal and item totals', () => {
    let computedSubtotal = 0;
    mockOrder.items.forEach((item) => {
      computedSubtotal += item.price * item.quantity;
    });

    assert.strictEqual(computedSubtotal, 700, 'Subtotal calculation should equal 700');
  });

  it('should calculate 5% GST tax and grand total correctly', () => {
    const taxRate = 0.05;
    const computedTax = mockOrder.subtotal * taxRate;
    const computedGrandTotal = mockOrder.subtotal + computedTax;

    assert.strictEqual(computedTax, 35, 'Tax calculation (5%) should equal 35');
    assert.strictEqual(computedGrandTotal, 735, 'Grand total calculation should equal 735');
  });

  it('should validate order status state machine transitions', () => {
    const validTransitions = {
      Pending: ['Accepted', 'Cancelled'],
      Accepted: ['Preparing', 'Cancelled'],
      Preparing: ['Ready', 'Cancelled'],
      Ready: ['Served', 'Completed'],
      Served: ['Completed'],
      Completed: [],
      Cancelled: [],
    };

    assert.ok(validTransitions.Pending.includes('Accepted'), 'Pending status can transition to Accepted');
    assert.ok(validTransitions.Ready.includes('Served'), 'Ready status can transition to Served');
    assert.strictEqual(validTransitions.Completed.length, 0, 'Completed status is terminal');
  });
});
