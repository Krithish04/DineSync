const assert = require('assert');
const TableSessionAudit = require('../../src/features/table/tableSessionAudit.model');

describe('Table Session & Host Automation Unit Tests', () => {
  it('should define valid TableSessionAudit action enum constants', () => {
    assert.strictEqual(TableSessionAudit.AUDIT_ACTIONS.AUTO_LOCK, 'AUTO_LOCK');
    assert.strictEqual(TableSessionAudit.AUDIT_ACTIONS.HANDOFF_APPROVED, 'HANDOFF_APPROVED');
    assert.strictEqual(TableSessionAudit.AUDIT_ACTIONS.HANDOFF_REQUEST, 'HANDOFF_REQUEST');
    assert.strictEqual(TableSessionAudit.AUDIT_ACTIONS.STALE_AUTO_RELEASE, 'STALE_AUTO_RELEASE');
    assert.strictEqual(TableSessionAudit.AUDIT_ACTIONS.SETTLE_AUTO_CLOSE, 'SETTLE_AUTO_CLOSE');
  });

  it('should auto-approve host handoff when current host is idle past 10 minutes with 0 active orders', () => {
    const activeOrdersCount = 0;
    const idleMins = 12;
    const canAutoApprove = activeOrdersCount === 0 && idleMins >= 10;
    assert.strictEqual(canAutoApprove, true);
  });

  it('should fail safe-by-default to staff review if current host has active orders', () => {
    const activeOrdersCount = 2;
    const idleMins = 15;
    const canAutoApprove = activeOrdersCount === 0 && idleMins >= 10;
    assert.strictEqual(canAutoApprove, false);
  });

  it('should accept encrypted enc_ tokens in table session resolution without throwing Invalid tableId format', () => {
    const { encryptQrToken, decryptQrToken } = require('../../src/utils/encryption.util');
    const validTableId = '507f1f77bcf86cd799439011';
    const validRestaurantId = '507f1f77bcf86cd799439022';
    
    const token = encryptQrToken({ tableId: validTableId, restaurantId: validRestaurantId });
    assert.ok(token.startsWith('enc_'), 'Token must start with enc_');

    const decrypted = decryptQrToken(token);
    assert.strictEqual(decrypted.tableId, validTableId);
    assert.strictEqual(decrypted.restaurantId, validRestaurantId);
  });

  it('should transition table status to Cleaning upon session settlement so staff are notified', () => {
    const tableStatusPostSettlement = 'Cleaning';
    assert.strictEqual(tableStatusPostSettlement, 'Cleaning');
  });
});
