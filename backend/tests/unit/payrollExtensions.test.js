const assert = require('assert');
const mongoose = require('mongoose');

// Models
const Employee = require('../../src/features/employee/employee.model');
const Attendance = require('../../src/features/employee/attendance.model');
const Payroll = require('../../src/features/employee/payroll.model');
const Advance = require('../../src/features/employee/advance.model');
const Leave = require('../../src/features/employee/leave.model');
const Restaurant = require('../../src/features/tenant/tenant.model');
const User = require('../../src/features/auth/auth.model');
const AuditLog = require('../../src/features/superAdmin/auditLog.model');
const Invoice = require('../../src/features/billing/invoice.model');
const employeeService = require('../../src/features/employee/employee.service');

async function runPayrollExtensionsTests() {
  console.log('  🧪 Running Staff Payroll Extensions (Manual Attendance, Advances, Mark Paid) Tests...');

  const restId = new mongoose.Types.ObjectId();
  const managerUserId = new mongoose.Types.ObjectId();

  const mockManagerUser = {
    _id: managerUserId,
    email: 'manager@test.com',
    role: 'manager',
  };

  // Setup Stub Database State
  const restaurantDoc = new Restaurant({
    _id: restId,
    name: 'Test Gourmet Kitchen',
    slug: 'test-gourmet',
    settings: {
      payrollSettings: {
        overtimeThresholdHours: 8,
        overtimeMultiplier: 1.5,
        tipDistributionModel: 'ROLE_WEIGHTED',
      },
    },
  });

  const empPos = new Employee({
    _id: new mongoose.Types.ObjectId(),
    employeeId: 'EMP-TEST-POS',
    restaurant: restId,
    firstName: 'Pos',
    lastName: 'User',
    employeeCode: 'EMP-001',
    email: 'pos@test.com',
    phone: '+919999900001',
    employmentType: 'Full Time',
    salaryType: 'Monthly',
    basicSalary: 30000,
  });

  const empManual = new Employee({
    _id: new mongoose.Types.ObjectId(),
    employeeId: 'EMP-TEST-MANUAL',
    restaurant: restId,
    firstName: 'Kitchen',
    lastName: 'Staff',
    employeeCode: 'EMP-002',
    email: 'kitchen@test.com',
    phone: '+919999900002',
    employmentType: 'Full Time',
    salaryType: 'Monthly',
    basicSalary: 30000,
  });

  // Mock Mongoose Calls
  const originalFindById = Restaurant.findById;
  const originalEmployeeFind = Employee.find;
  const originalEmployeeFindOne = Employee.findOne;
  const originalAttendanceFind = Attendance.find;
  const originalAttendanceCreate = Attendance.create;
  const originalAttendanceFindOneAndUpdate = Attendance.findOneAndUpdate;
  const originalAttendanceFindOne = Attendance.findOne;
  const originalPayrollFind = Payroll.find;
  const originalPayrollFindOne = Payroll.findOne;
  const originalPayrollFindOneAndUpdate = Payroll.findOneAndUpdate;
  const originalAdvanceCreate = Advance.create;
  const originalAdvanceFind = Advance.find;
  const originalAdvanceFindOne = Advance.findOne;
  const originalAuditCreate = AuditLog.create;
  const originalInvoiceFind = Invoice.find;
  const originalLeaveFind = Leave.find;

  const attendanceStore = [];
  const payrollStore = [];
  const advanceStore = [];

  try {
    AuditLog.create = async (data) => data;
    Invoice.find = async () => [];
    Leave.find = async () => [];
    Restaurant.findById = async () => restaurantDoc;
    Employee.find = async () => [empPos, empManual];
    Employee.findOne = async (query) => {
      if (query._id && query._id.toString() === empPos._id.toString()) return empPos;
      if (query._id && query._id.toString() === empManual._id.toString()) return empManual;
      return null;
    };

    Attendance.find = async (query) => {
      return attendanceStore.filter((att) => {
        if (query.employee && att.employee.toString() !== query.employee.toString()) return false;
        if (query.restaurant && att.restaurant.toString() !== query.restaurant.toString()) return false;
        if (query.date && query.date.$regex) {
          const re = new RegExp(query.date.$regex);
          if (!re.test(att.date)) return false;
        }
        return true;
      });
    };

    Attendance.findOneAndUpdate = async (query, update, options) => {
      let doc = attendanceStore.find(
        (a) => a.employee.toString() === query.employee.toString() && a.date === query.date
      );
      if (!doc && options && options.upsert) {
        doc = {
          _id: new mongoose.Types.ObjectId(),
          employee: query.employee,
          restaurant: query.restaurant,
          date: query.date,
          corrections: [],
        };
        attendanceStore.push(doc);
      }
      if (doc) {
        Object.assign(doc, update);
        if (!doc.corrections) doc.corrections = [];
        if (update.$push && update.$push.corrections) {
          doc.corrections.push(update.$push.corrections);
        }
      }
      return doc;
    };

    Attendance.findOne = async (query) => {
      return attendanceStore.find(
        (a) => a._id.toString() === query._id?.toString() || (a.employee?.toString() === query.employee?.toString() && a.date === query.date)
      );
    };

    Advance.create = async (docData) => {
      const doc = new Advance({
        _id: new mongoose.Types.ObjectId(),
        ...docData,
        repaymentHistory: docData.repaymentHistory || [],
      });
      doc.save = async function () {
        return this;
      };
      advanceStore.push(doc);
      return doc;
    };

    Advance.find = async (query) => {
      return advanceStore.filter((adv) => {
        if (query.restaurant && adv.restaurant.toString() !== query.restaurant.toString()) return false;
        if (query.employee && adv.employee.toString() !== query.employee.toString()) return false;
        if (query.status && adv.status !== query.status) return false;
        return true;
      }).sort((a, b) => b.createdAt - a.createdAt);
    };

    Advance.findOne = async (query) => {
      return advanceStore.find((adv) => {
        if (query._id && adv._id.toString() !== query._id.toString()) return false;
        if (query.employee && adv.employee.toString() !== query.employee.toString()) return false;
        if (query.status && adv.status !== query.status) return false;
        return true;
      });
    };

    Payroll.create = async (data) => {
      const doc = new Payroll({ _id: new mongoose.Types.ObjectId(), ...data });
      doc.save = async function () { return this; };
      payrollStore.push(doc);
      return doc;
    };

    Payroll.find = async (query) => {
      return payrollStore.filter((p) => {
        if (query.restaurant && p.restaurant.toString() !== query.restaurant.toString()) return false;
        if (query.month && p.month !== query.month) return false;
        return true;
      });
    };

    Payroll.findOne = async (query) => {
      return payrollStore.find((p) => {
        if (query.restaurant && p.restaurant.toString() !== query.restaurant.toString()) return false;
        if (query._id && p._id.toString() !== query._id.toString()) return false;
        if (query.month && p.month !== query.month) return false;
        if (query.$or) {
          const matchOr = query.$or.some((cond) => {
            if (cond.paymentStatus && p.paymentStatus === cond.paymentStatus) return true;
            if (cond.isClosed && p.isClosed === cond.isClosed) return true;
            return false;
          });
          if (!matchOr) return false;
        }
        return true;
      });
    };

    Payroll.findOneAndUpdate = async (query, update, options) => {
      let doc = payrollStore.find(
        (p) => p.employee.toString() === (query.employee?.toString() || '') && p.month === query.month
      );
      if (!doc && query._id) {
        doc = payrollStore.find((p) => p._id.toString() === query._id.toString());
      }

      if (!doc && options && options.upsert) {
        doc = new Payroll({
          _id: new mongoose.Types.ObjectId(),
          employee: query.employee,
          restaurant: query.restaurant,
          month: query.month,
          ...update,
        });
        doc.save = async function () { return this; };
        doc.populate = () => doc;
        payrollStore.push(doc);
      } else if (doc) {
        Object.assign(doc, update);
        doc.save = async function () { return this; };
        doc.populate = () => doc;
      }
      return doc;
    };

    // TEST 1: Manual vs POS Attendance Parity
    console.log('    ✓ Test 1: Manual vs POS attendance parity & wage calculation');
    const month = '2026-10';

    // Seed 10 days for POS user (POS_LOGIN) and 10 days for Kitchen user (MANAGER_ENTRY batch)
    for (let day = 1; day <= 10; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      attendanceStore.push({
        _id: new mongoose.Types.ObjectId(),
        employee: empPos._id,
        restaurant: restId,
        date,
        checkIn: new Date(`${date}T09:00:00Z`),
        checkOut: new Date(`${date}T17:00:00Z`),
        workingHours: 8.0,
        overtime: 0,
        status: 'Present',
        source: 'POS_LOGIN',
      });
    }

    await employeeService.markBatchAttendance(
      restId,
      {
        date: `${month}-01`,
        entries: [{ employeeId: empManual._id.toString(), status: 'Present', workingHours: 8.0 }],
      },
      mockManagerUser
    );

    for (let day = 2; day <= 10; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      attendanceStore.push({
        _id: new mongoose.Types.ObjectId(),
        employee: empManual._id,
        restaurant: restId,
        date,
        checkIn: new Date(`${date}T09:00:00Z`),
        checkOut: new Date(`${date}T17:00:00Z`),
        workingHours: 8.0,
        overtime: 0,
        status: 'Present',
        source: 'MANAGER_ENTRY',
      });
    }

    const payrolls = await employeeService.generateMonthlyPayroll(restId, month);
    assert.strictEqual(payrolls.length, 2, 'Should generate payroll for both employees');
    const posPr = payrolls.find((p) => p.employee.toString() === empPos._id.toString());
    const manualPr = payrolls.find((p) => p.employee.toString() === empManual._id.toString());

    assert.strictEqual(posPr.grossSalary, manualPr.grossSalary, 'Gross salary should be identical for POS and Manual staff with same hours');

    // TEST 2: Staff-Requested & Manager-Logged Salary Advances
    console.log('    ✓ Test 2: Staff-requested approval flow & manager-logged advances');

    // Staff-requested advance
    const reqAdv = await employeeService.requestAdvance(
      restId,
      empPos._id,
      { amount: 3000, reason: 'Medical emergency' },
      mockManagerUser
    );
    assert.strictEqual(reqAdv.status, 'Pending');
    assert.strictEqual(reqAdv.requestType, 'STAFF_REQUESTED');

    // Review & approve with 3 installments
    const reviewedAdv = await employeeService.reviewAdvance(
      restId,
      reqAdv._id,
      { status: 'Approved', totalInstallments: 3 },
      mockManagerUser
    );
    assert.strictEqual(reviewedAdv.status, 'Active');
    assert.strictEqual(reviewedAdv.repaymentPlan.totalInstallments, 3);
    assert.strictEqual(reviewedAdv.repaymentPlan.installmentAmount, 1000);

    // Manager-logged direct advance
    const mgrAdv = await employeeService.logManagerAdvance(
      restId,
      empManual._id,
      { amount: 2000, totalInstallments: 2, reason: 'Cash handed in person' },
      mockManagerUser
    );
    assert.strictEqual(mgrAdv.status, 'Active');
    assert.strictEqual(mgrAdv.repaymentPlan.installmentAmount, 1000);

    // TEST 3: Multi-installment auto-deduction across payroll run
    console.log('    ✓ Test 3: Multi-installment auto-deduction on payroll run');
    const updatedPayrolls = await employeeService.generateMonthlyPayroll(restId, month);
    const posPrExt = updatedPayrolls.find((p) => p.employee.toString() === empPos._id.toString());

    assert.strictEqual(posPrExt.advanceDeduction, 1000, 'Should deduct ₹1,000 installment on payslip');
    assert.strictEqual(posPrExt.netSalary, posPrExt.grossSalary - 1000, 'Net salary should subtract advance deduction');
    assert.strictEqual(reviewedAdv.repaymentPlan.balance, 2000, 'Remaining balance should reduce to ₹2,000');

    // TEST 4: Net-pay cannot go negative safeguard (capping deduction)
    console.log('    ✓ Test 4: Net-pay non-negative safeguard (capping deduction)');
    const lowSalaryEmp = new Employee({
      _id: new mongoose.Types.ObjectId(),
      employeeId: 'EMP-TEST-LOW',
      restaurant: restId,
      firstName: 'Low',
      lastName: 'Wages',
      employeeCode: 'EMP-003',
      basicSalary: 500,
      salaryType: 'Monthly',
      employmentType: 'Full Time',
    });

    Employee.find = async () => [lowSalaryEmp];
    Employee.findOne = async (query) => (query._id.toString() === lowSalaryEmp._id.toString() ? lowSalaryEmp : null);

    // Log a large ₹2,000 advance for low salary employee
    const largeAdv = await employeeService.logManagerAdvance(
      restId,
      lowSalaryEmp._id,
      { amount: 2000, totalInstallments: 1, reason: 'Large advance' },
      mockManagerUser
    );

    const lowPayrolls = await employeeService.generateMonthlyPayroll(restId, '2026-11');
    const lowPr = lowPayrolls[0];

    assert(lowPr.netSalary >= 0, 'Net salary must NEVER be negative');
    assert.strictEqual(lowPr.advanceDeduction, lowPr.grossSalary, 'Advance deduction should be capped to gross salary');
    assert(largeAdv.repaymentHistory[0].capped, 'Repayment history must record capped flag');

    // TEST 5: Mark Salary as Paid & Closed-Period Safeguard
    console.log('    ✓ Test 5: Mark salary as paid & closed-period safeguard (reopen required)');

    // Reset Employee.find
    Employee.find = async () => [empPos, empManual];

    // Mark payroll as paid with reference ID
    const paidPr = await employeeService.paySalary(
      restId,
      posPrExt._id,
      { paymentReference: 'UTR-987654321', paymentNote: 'HDFC NEFT Transfer' },
      mockManagerUser
    );

    assert.strictEqual(paidPr.paymentStatus, 'Paid');
    assert.strictEqual(paidPr.isClosed, true);
    assert.strictEqual(paidPr.paymentReference, 'UTR-987654321');

    // Attempt retro attendance edit for paid period — must throw exception!
    let editThrew = false;
    try {
      await employeeService.markBatchAttendance(
        restId,
        {
          date: `${month}-05`,
          entries: [{ employeeId: empPos._id.toString(), status: 'Absent' }],
        },
        mockManagerUser
      );
    } catch (err) {
      editThrew = true;
      assert(err.message.includes('closed and marked Paid'), 'Error message must specify period is closed and marked Paid');
    }
    assert.strictEqual(editThrew, true, 'Editing attendance for a paid period must be rejected');

    // Reopen period explicitly with reason
    const reopenResult = await employeeService.reopenPayrollPeriod(
      restId,
      { month, reason: 'Correction required for missed overtime' },
      mockManagerUser
    );
    assert.strictEqual(reopenResult.reopenedCount > 0, true);

    // Retro edit should now succeed
    const allowedEdit = await employeeService.markBatchAttendance(
      restId,
      {
        date: `${month}-05`,
        entries: [{ employeeId: empPos._id.toString(), status: 'Half-day', workingHours: 4.0 }],
      },
      mockManagerUser
    );
    assert.strictEqual(allowedEdit.length, 1);

    console.log('  ✅ All Staff Payroll Extension Unit Tests Passed Successfully!\n');
  } finally {
    Restaurant.findById = originalFindById;
    Employee.find = originalEmployeeFind;
    Employee.findOne = originalEmployeeFindOne;
    Attendance.find = originalAttendanceFind;
    Attendance.create = originalAttendanceCreate;
    Attendance.findOneAndUpdate = originalAttendanceFindOneAndUpdate;
    Attendance.findOne = originalAttendanceFindOne;
    Payroll.find = originalPayrollFind;
    Payroll.findOne = originalPayrollFindOne;
    Payroll.findOneAndUpdate = originalPayrollFindOneAndUpdate;
    Advance.create = originalAdvanceCreate;
    Advance.find = originalAdvanceFind;
    Advance.findOne = originalAdvanceFindOne;
    AuditLog.create = originalAuditCreate;
    Invoice.find = originalInvoiceFind;
    Leave.find = originalLeaveFind;
  }
}

module.exports = { runPayrollExtensionsTests };
