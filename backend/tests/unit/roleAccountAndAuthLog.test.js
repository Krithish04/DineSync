const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../../src/features/auth/auth.model');
const Branch = require('../../src/features/branch/branch.model');
const ManagerBranch = require('../../src/features/branch/managerBranch.model');
const AuthLog = require('../../src/features/auth/authLog.model');
const { ROLES } = require('../../src/constants/roles.constant');
const branchService = require('../../src/features/branch/branch.service');
const authService = require('../../src/features/auth/auth.service');

describe('Role-Based Account Creation & Login-Tracking (AuthLog) Unit Tests', () => {
  let testRestaurantId;
  let testBranch1Id;
  let testBranch2Id;
  let testBranchUnassignedId;
  let ownerUser;

  before(async () => {
    testRestaurantId = new mongoose.Types.ObjectId();
    testBranch1Id = new mongoose.Types.ObjectId();
    testBranch2Id = new mongoose.Types.ObjectId();
    testBranchUnassignedId = new mongoose.Types.ObjectId();

    // Create owner user and test branches in memory DB or mock
    ownerUser = {
      _id: new mongoose.Types.ObjectId(),
      role: ROLES.OWNER,
      restaurant: testRestaurantId,
    };
  });

  it('1. ROLES constant should include KITCHEN role', () => {
    assert.strictEqual(ROLES.KITCHEN, 'kitchen');
  });

  it('2. Should model ManagerBranch M:N relationship schema correctly', () => {
    const mb = new ManagerBranch({
      restaurant: testRestaurantId,
      manager: new mongoose.Types.ObjectId(),
      branch: testBranch1Id,
    });
    assert.strictEqual(mb.restaurant.toString(), testRestaurantId.toString());
    assert.strictEqual(mb.branch.toString(), testBranch1Id.toString());
  });

  it('3. Should model AuthLog schema with loginAt, logoutAt, and sessionDurationSeconds', () => {
    const log = new AuthLog({
      user: new mongoose.Types.ObjectId(),
      userEmail: 'teststaff@dinesync.ai',
      userName: 'Test Staff',
      role: ROLES.STAFF,
      restaurant: testRestaurantId,
      branch: testBranch1Id,
      eventType: 'login',
      loginAt: new Date(),
    });

    assert.strictEqual(log.role, 'staff');
    assert.strictEqual(log.eventType, 'login');
    assert.ok(log.loginAt);
  });

  it('4. Should authorize KITCHEN role for tenant settings read & kitchen ticket updates', () => {
    const { authorize } = require('../../src/middlewares/auth.middleware');
    const canViewSettings = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.CHEF, ROLES.KITCHEN);
    const canManageKitchen = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.CHEF, ROLES.KITCHEN);

    const kitchenReq = {
      user: { role: ROLES.KITCHEN, restaurant: testRestaurantId },
    };

    let settingsNextCalled = false;
    canViewSettings(kitchenReq, {}, () => { settingsNextCalled = true; });
    assert.ok(settingsNextCalled, 'KITCHEN role should be authorized to read tenant settings');

    let kitchenNextCalled = false;
    canManageKitchen(kitchenReq, {}, () => { kitchenNextCalled = true; });
    assert.ok(kitchenNextCalled, 'KITCHEN role should be authorized to manage kitchen ticket status');
  });
});
