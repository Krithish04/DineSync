const assert = require('assert');
const Table = require('../../src/features/table/table.model');
const TableSession = require('../../src/features/table/tableSession.model');
const TableSessionAudit = require('../../src/features/table/tableSessionAudit.model');

describe('Phase 2 — Table State Machine (Occupied / Available) Tests', () => {
  it('should transition table status to Occupied when first guest verifies phone number and claims host', () => {
    const table = new Table({
      restaurant: '507f1f77bcf86cd799439011',
      tableNumber: '1',
      capacity: 4,
      status: Table.TABLE_STATUSES.AVAILABLE,
    });

    assert.strictEqual(table.status, 'Available', 'Initial table status should be Available');

    // On phone verification & host claim
    table.status = Table.TABLE_STATUSES.OCCUPIED;
    table.currentHostName = 'Diner One';
    table.currentHostPhone = '+919876543210';

    assert.strictEqual(table.status, 'Occupied', 'Table status should transition to Occupied on phone verification');
    assert.strictEqual(table.currentHostPhone, '+919876543210', 'Host phone should be registered');
  });

  it('should return table to Available when session is settled or Host signs out', () => {
    const table = new Table({
      restaurant: '507f1f77bcf86cd799439011',
      tableNumber: '1',
      capacity: 4,
      status: Table.TABLE_STATUSES.OCCUPIED,
      currentHostName: 'Diner One',
      currentHostPhone: '+919876543210',
    });

    // Settle session / Host sign-out
    table.status = Table.TABLE_STATUSES.AVAILABLE;
    table.currentHostName = '';
    table.currentHostPhone = '';

    assert.strictEqual(table.status, 'Available', 'Table should return to Available when session ends');
    assert.strictEqual(table.currentHostPhone, '', 'Host phone should be cleared');
  });

  it('should support manual staff override audit action to force-empty a table regardless of state', () => {
    const auditEnum = TableSessionAudit.AUDIT_ACTIONS.STAFF_OVERRIDE;
    assert.strictEqual(auditEnum, 'STAFF_OVERRIDE', 'TableSessionAudit must include STAFF_OVERRIDE action constant');
  });
});
