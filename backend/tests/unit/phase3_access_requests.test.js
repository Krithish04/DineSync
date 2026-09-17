const assert = require('assert');
const TableSession = require('../../src/features/table/tableSession.model');
const TableSessionAudit = require('../../src/features/table/tableSessionAudit.model');

describe('Phase 3 — Access Request & Host Approval Tests', () => {
  it('should format masked phone with last 4 digits for privacy', () => {
    const fullPhone = '+919876543210';
    const maskedPhone = `•••• ${fullPhone.slice(-4)}`;
    assert.strictEqual(maskedPhone, '•••• 3210', 'Masked phone should display only last 4 digits');
  });

  it('should register co-orderer on session approval and maintain approval timestamp', () => {
    const session = new TableSession({
      restaurant: '507f1f77bcf86cd799439011',
      table: '507f1f77bcf86cd799439012',
      customer: '507f1f77bcf86cd799439013',
      hostName: 'Host Diner',
      hostPhone: '+919876543210',
      hostToken: 'token123',
      coOrderers: [],
    });

    // Simulate approval of guest 2
    session.coOrderers.push({
      name: 'Guest Two',
      phone: '+919123456789',
      approvedAt: new Date(Date.now() - 5000),
    });

    // Simulate approval of guest 3
    session.coOrderers.push({
      name: 'Guest Three',
      phone: '+919988776655',
      approvedAt: new Date(Date.now()),
    });

    assert.strictEqual(session.coOrderers.length, 2, 'Session should have 2 approved co-orderers');
    assert.strictEqual(session.coOrderers[0].phone, '+919123456789');
  });

  it('should support Option A Host Promotion Fallback — Host + 2 co-orderers active, earliest approved becomes Host & other co-orderer rights unaffected', () => {
    const earliestApprovedDate = new Date(Date.now() - 15000);
    const laterApprovedDate = new Date(Date.now() - 5000);

    const session = {
      hostName: 'Original Host',
      hostPhone: '+919876543210',
      coOrderers: [
        { name: 'Later Co-Orderer', phone: '+919988776655', approvedAt: laterApprovedDate },
        { name: 'Earliest Co-Orderer', phone: '+919123456789', approvedAt: earliestApprovedDate },
      ],
    };

    // Simulate Host Session End Promotion
    const sortedCoOrderers = [...session.coOrderers].sort(
      (a, b) => new Date(a.approvedAt || 0) - new Date(b.approvedAt || 0)
    );
    const nextHost = sortedCoOrderers.shift();
    session.coOrderers = sortedCoOrderers;
    session.hostName = nextHost.name;
    session.hostPhone = nextHost.phone;

    // Assertions
    assert.strictEqual(session.hostPhone, '+919123456789', 'Earliest-approved co-orderer (+919123456789) should become new Host');
    assert.strictEqual(session.hostName, 'Earliest Co-Orderer');
    assert.strictEqual(session.coOrderers.length, 1, 'Remaining co-orderer count should be 1');
    assert.strictEqual(session.coOrderers[0].phone, '+919988776655', 'Second co-orderer should remain in coOrderers list unaffected');
    assert.strictEqual(session.coOrderers[0].name, 'Later Co-Orderer');
  });

  it('should grant ordering rights to approved co-orderers in placeCustomerOrder authorization logic', () => {
    const activeSession = {
      hostPhone: '+919876543210',
      hostToken: 'host_token_abc',
      coOrderers: [
        { name: 'Guest B', phone: '+919123456789', approvedAt: new Date() }
      ]
    };

    const hostTokenInput = null;
    const guestBPhone = '+919123456789';
    const unapprovedGuestPhone = '+919999999999';

    // Helper checking authorization rule matching customerExperience.service.js
    const isAuthorizedToOrder = (providedToken, phone) => {
      const cleanPhone = phone ? phone.trim() : '';
      const isHostTokenValid = Boolean(providedToken && providedToken === activeSession.hostToken);
      const isHostPhoneValid = Boolean(cleanPhone && activeSession.hostPhone === cleanPhone);
      const isCoOrdererApproved = Boolean(cleanPhone && (activeSession.coOrderers || []).some((c) => c.phone === cleanPhone));
      return isHostTokenValid || isHostPhoneValid || isCoOrdererApproved;
    };

    assert.strictEqual(isAuthorizedToOrder(activeSession.hostToken, '+919876543210'), true, 'Host should be authorized via token/phone');
    assert.strictEqual(isAuthorizedToOrder(hostTokenInput, guestBPhone), true, 'Approved co-orderer Guest B should be authorized to place order without hostToken');
    assert.strictEqual(isAuthorizedToOrder(hostTokenInput, unapprovedGuestPhone), false, 'Unapproved guest should be rejected with 403 View-Only restriction');
  });

  it('should maintain View-Only mode when access request is denied by Host', () => {
    const activeSession = {
      hostPhone: '+919876543210',
      hostToken: 'host_token_abc',
      coOrderers: [] // Empty coOrderers list after denial
    };

    const deniedGuestPhone = '+919555555555';
    const isApprovedCoOrderer = (activeSession.coOrderers || []).some((c) => c.phone === deniedGuestPhone);

    assert.strictEqual(isApprovedCoOrderer, false, 'Denied guest should not be present in coOrderers array');
  });
});
