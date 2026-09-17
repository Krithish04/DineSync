const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../../src/features/auth/auth.model');
const Branch = require('../../src/features/branch/branch.model');
const Table = require('../../src/features/table/table.model');
const MenuItem = require('../../src/features/menu/menuItem.model');
const Category = require('../../src/features/category/category.model');
const Order = require('../../src/features/order/order.model');
const KitchenTicket = require('../../src/features/kitchen/kitchenTicket.model');
const Ingredient = require('../../src/features/inventory/ingredient.model');
const Employee = require('../../src/features/employee/employee.model');
const Payroll = require('../../src/features/employee/payroll.model');
const Reservation = require('../../src/features/reservation/reservation.model');
const AuditLog = require('../../src/features/superAdmin/auditLog.model');

const branchService = require('../../src/features/branch/branch.service');
const { enforceBranchIsolation } = require('../../src/middlewares/auth.middleware');
const migrateBranchData = require('../../src/migrations/migrateBranchData');
const { ROLES } = require('../../src/constants/roles.constant');

describe('Branch Entity & 3-Tier Account Hierarchy Unit Tests', () => {
  it('Phase 1 & 2: User schema defines branch ref and isPasswordResetRequired', () => {
    const managerUser = new User({
      name: 'John Manager',
      email: 'manager@test.com',
      password: 'Password123!',
      role: ROLES.MANAGER,
      restaurant: new mongoose.Types.ObjectId(),
      branch: new mongoose.Types.ObjectId(),
      isPasswordResetRequired: true,
    });

    assert.strictEqual(managerUser.role, ROLES.MANAGER);
    assert.ok(managerUser.branch);
    assert.strictEqual(managerUser.isPasswordResetRequired, true);
  });

  it('Phase 1: Branch model defines restaurant, code, address, contact, operatingHours, manager, status', () => {
    const branchId = new mongoose.Types.ObjectId();
    const branch = new Branch({
      _id: branchId,
      restaurant: new mongoose.Types.ObjectId(),
      name: 'Downtown Branch',
      code: 'DT-01',
      address: { line1: '123 Main St', city: 'Metropolis', state: 'NY', postalCode: '10001' },
      contact: { phone: '555-0101', email: 'downtown@test.com' },
      status: 'active',
    });

    assert.strictEqual(branch.name, 'Downtown Branch');
    assert.strictEqual(branch.code, 'DT-01');
    assert.strictEqual(branch.status, 'active');
    assert.ok(branch.operatingHours.length > 0);
  });

  it('Phase 4: Target models contain branch ref field for multi-branch data isolation', () => {
    const restId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const table = new Table({ restaurant: restId, branch: branchId, tableNumber: 'T-01', capacity: 4 });
    const menuItem = new MenuItem({ restaurant: restId, branch: branchId, category: new mongoose.Types.ObjectId(), name: 'Burger', price: 10, dietaryType: 'non-veg' });
    const category = new Category({ restaurant: restId, branch: branchId, name: 'Starters' });
    const order = new Order({ restaurant: restId, branch: branchId, orderNumber: 'ORD-101', orderType: 'Dine-In', items: [] });
    const ticket = new KitchenTicket({ restaurant: restId, branch: branchId, ticketNumber: 'KKT-101', order: new mongoose.Types.ObjectId(), orderType: 'Dine-In' });
    const ingredient = new Ingredient({ restaurant: restId, branch: branchId, ingredientName: 'Tomato', unit: 'kg' });
    const employee = new Employee({ restaurant: restId, branch: branchId, employeeId: 'EMP-01', employeeCode: 'C-01', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com' });
    const payroll = new Payroll({ restaurant: restId, branch: branchId, employee: new mongoose.Types.ObjectId(), month: '2026-09', basicSalary: 3000 });
    const reservation = new Reservation({ restaurant: restId, branch: branchId, reservationNumber: 'RES-01', customerName: 'Alice', partySize: 2, reservationDate: new Date(), timeSlot: '19:00' });
    const auditLog = new AuditLog({ restaurant: restId, branch: branchId, action: 'TEST_ACTION' });

    assert.strictEqual(table.branch.toString(), branchId.toString());
    assert.strictEqual(menuItem.branch.toString(), branchId.toString());
    assert.strictEqual(category.branch.toString(), branchId.toString());
    assert.strictEqual(order.branch.toString(), branchId.toString());
    assert.strictEqual(ticket.branch.toString(), branchId.toString());
    assert.strictEqual(ingredient.branch.toString(), branchId.toString());
    assert.strictEqual(employee.branch.toString(), branchId.toString());
    assert.strictEqual(payroll.branch.toString(), branchId.toString());
    assert.strictEqual(reservation.branch.toString(), branchId.toString());
    assert.strictEqual(auditLog.branch.toString(), branchId.toString());
  });

  it('Phase 4: enforceBranchIsolation allows Super Admin and Owner to bypass isolation', () => {
    const ownerUser = {
      _id: new mongoose.Types.ObjectId(),
      role: ROLES.OWNER,
      restaurant: new mongoose.Types.ObjectId(),
    };

    const req = { user: ownerUser, query: {}, body: {}, params: {} };
    let nextCalled = false;
    enforceBranchIsolation(req, {}, () => { nextCalled = true; });

    assert.ok(nextCalled);
    assert.strictEqual(req.branchId, null);
  });

  it('Phase 4: enforceBranchIsolation locks Manager/Staff to req.user.branch', () => {
    const branchId = new mongoose.Types.ObjectId().toString();
    const managerUser = {
      _id: new mongoose.Types.ObjectId(),
      role: ROLES.MANAGER,
      restaurant: new mongoose.Types.ObjectId(),
      branch: branchId,
    };

    const req = { user: managerUser, query: {}, body: {}, params: {} };
    let nextCalled = false;
    enforceBranchIsolation(req, {}, () => { nextCalled = true; });

    assert.ok(nextCalled);
    assert.strictEqual(req.branchId, branchId);
  });

  it('Phase 4: enforceBranchIsolation rejects cross-branch access attempt with 403 Forbidden', () => {
    const branchIdA = new mongoose.Types.ObjectId().toString();
    const branchIdB = new mongoose.Types.ObjectId().toString();

    const managerUser = {
      _id: new mongoose.Types.ObjectId(),
      role: ROLES.MANAGER,
      restaurant: new mongoose.Types.ObjectId(),
      branch: branchIdA,
    };

    const req = {
      user: managerUser,
      query: { branch: branchIdB },
      body: {},
      params: {},
    };

    try {
      enforceBranchIsolation(req, {}, () => {});
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.ok(err.message.includes('another branch'));
    }
  });

  it('Phase 4: enforceBranchIsolation rejects Manager/Staff without assigned branch with 403 Forbidden', () => {
    const unassignedStaff = {
      _id: new mongoose.Types.ObjectId(),
      role: ROLES.STAFF,
      restaurant: new mongoose.Types.ObjectId(),
      branch: null,
    };

    const req = { user: unassignedStaff, query: {}, body: {}, params: {} };

    try {
      enforceBranchIsolation(req, {}, () => {});
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.ok(err.message.includes('not assigned to any branch'));
    }
  });

  it('Data Migration: migrateBranchData function is exported and ready for execution', () => {
    assert.strictEqual(typeof migrateBranchData, 'function');
  });
});
