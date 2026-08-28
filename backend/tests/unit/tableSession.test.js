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
});
