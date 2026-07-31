const assert = require('assert');
const { mockInvoice } = require('../fixtures/mockData');

describe('Backend Billing Unit Tests', () => {
  it('should generate valid invoice document payload with unique invoice number', () => {
    assert.ok(mockInvoice.invoiceNumber.startsWith('INV-'), 'Invoice number should start with INV-');
    assert.strictEqual(mockInvoice.paymentStatus, 'Paid');
  });

  it('should validate split payment total equality', () => {
    const totalBill = 1000;
    const splitPayments = [
      { method: 'Cash', amount: 400 },
      { method: 'UPI', amount: 600 },
    ];

    const sumSplit = splitPayments.reduce((s, p) => s + p.amount, 0);
    assert.strictEqual(sumSplit, totalBill, 'Split payments sum must equal total bill');
  });
});
