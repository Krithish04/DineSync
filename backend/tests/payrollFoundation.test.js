const assert = require('assert');
const Employee = require('../src/features/employee/employee.model');
const Attendance = require('../src/features/employee/attendance.model');
const Leave = require('../src/features/employee/leave.model');
const Shift = require('../src/features/employee/shift.model');
const User = require('../src/features/auth/auth.model');
const AuditLog = require('../src/features/superAdmin/auditLog.model');
const { encrypt, decrypt, maskValue } = require('../src/utils/encryption.util');
const employeeService = require('../src/features/employee/employee.service');

describe('Payroll Foundation (Phase 1 & 2) Unit Tests', () => {
  it('should encrypt, decrypt, and mask sensitive strings accurately', () => {
    const rawAccount = '98765432101234';
    const encrypted = encrypt(rawAccount);
    assert.strictEqual(encrypted.startsWith('enc:v1:'), true);
    assert.notStrictEqual(encrypted, rawAccount);

    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, rawAccount);

    const masked = maskValue(rawAccount, 4);
    assert.strictEqual(masked, 'XXXXXXXXXX1234');
  });

  it('should store sensitive employee info encrypted and log audit trail on access', async () => {
    const origUserFindOne = User.findOne;
    const origEmpCreate = Employee.create;
    const origEmpFindOne = Employee.findOne;
    const origAuditCreate = AuditLog.create;

    let auditLogged = false;

    User.findOne = async () => null;
    AuditLog.create = async (data) => {
      auditLogged = true;
      return data;
    };

    const mockEmpDoc = {
      _id: 'emp_123',
      employeeCode: 'EMP-101',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      sensitiveInfo: {
        bankAccount: encrypt('11223344556677'),
        bankIfsc: encrypt('HDFC0001234'),
        bankName: encrypt('HDFC Bank'),
        panNumber: encrypt('ABCDE1234F'),
      },
      toObject() { return { ...this }; },
    };

    Employee.create = async (payload) => ({
      ...payload,
      _id: 'emp_123',
      employeeCode: 'EMP-101',
      toObject() { return { ...this }; },
    });

    Employee.findOne = async () => mockEmpDoc;

    try {
      const createdEmp = await employeeService.createEmployee('rest_1', {
        firstName: 'Ramesh',
        lastName: 'Kumar',
        employeeCode: 'EMP-101',
        email: 'ramesh@dinesync.test',
        phone: '9876543210',
        sensitiveInfo: {
          bankAccount: '11223344556677',
          panNumber: 'ABCDE1234F',
        },
      });

      assert.strictEqual(createdEmp.sensitiveInfo.bankAccount, 'XXXXXXXXXX6677');
      assert.strictEqual(createdEmp.sensitiveInfo.panNumber, 'XXXXXX234F');

      const sensitive = await employeeService.getEmployeeSensitiveInfo(
        'rest_1',
        'emp_123',
        { _id: 'mgr_1', email: 'mgr@test.com', role: 'manager' }
      );

      assert.strictEqual(sensitive.bankAccount, '11223344556677');
      assert.strictEqual(sensitive.panNumber, 'ABCDE1234F');
      assert.strictEqual(auditLogged, true);
    } finally {
      User.findOne = origUserFindOne;
      Employee.create = origEmpCreate;
      Employee.findOne = origEmpFindOne;
      AuditLog.create = origAuditCreate;
    }
  });

  it('should handle POS login auto clock-in and manager manual corrections', async () => {
    const origEmpFindOne = Employee.findOne;
    const origAttFindOne = Attendance.findOne;
    const origAttCreate = Attendance.create;
    const origAuditCreate = AuditLog.create;

    let auditLogged = false;

    Employee.findOne = async () => ({
      _id: 'emp_456',
      user: 'user_456',
    });

    Attendance.findOne = async (query) => {
      if (query._id) {
        return {
          _id: 'att_789',
          employee: 'emp_456',
          checkIn: new Date(Date.now() - 9.5 * 3600 * 1000),
          checkOut: null,
          workingHours: 0,
          overtime: 0,
          corrections: [],
          save: async function () { return this; },
        };
      }
      return null;
    };

    Attendance.create = async (data) => ({
      ...data,
      _id: 'att_789',
    });

    AuditLog.create = async () => {
      auditLogged = true;
    };

    try {
      const posClockIn = await employeeService.handlePosLoginClockIn('rest_1', 'user_456');
      assert.ok(posClockIn);
      assert.strictEqual(posClockIn.source, 'POS_LOGIN');

      const now = new Date();
      const startTime = new Date(now.getTime() - 9.5 * 3600 * 1000);

      const corrected = await employeeService.correctAttendance(
        'rest_1',
        'att_789',
        { checkIn: startTime, checkOut: now, reason: 'Forgot to clock out' },
        { _id: 'mgr_1', email: 'mgr@test.com', role: 'manager' }
      );

      assert.strictEqual(corrected.workingHours, 9.5);
      assert.strictEqual(corrected.overtime, 1.5);
      assert.strictEqual(corrected.corrections.length, 1);
      assert.strictEqual(auditLogged, true);
    } finally {
      Employee.findOne = origEmpFindOne;
      Attendance.findOne = origAttFindOne;
      Attendance.create = origAttCreate;
      AuditLog.create = origAuditCreate;
    }
  });

  it('should enforce leave balance quota and deduct taken days upon approval', async () => {
    const origEmpFindOne = Employee.findOne;
    const origEmpFindById = Employee.findById;
    const origLeaveCreate = Leave.create;
    const origLeaveFindOne = Leave.findOne;

    const mockEmp = {
      _id: 'emp_777',
      status: 'Active',
      leaveBalances: {
        casualLeave: { allocated: 2, taken: 0 },
      },
      save: async function () { return this; },
    };

    Employee.findOne = async () => mockEmp;
    Employee.findById = async () => mockEmp;

    Leave.create = async (data) => ({
      ...data,
      _id: 'leave_101',
      status: 'Pending',
    });

    Leave.findOne = async () => ({
      _id: 'leave_101',
      employee: 'emp_777',
      leaveType: 'Casual Leave',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-01'),
      status: 'Pending',
      save: async function () { return this; },
    });

    try {
      const leaveReq = await employeeService.applyLeave('rest_1', 'emp_777', {
        leaveType: 'Casual Leave',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-01'),
        reason: 'Personal work',
      });

      assert.strictEqual(leaveReq.status, 'Pending');

      await employeeService.approveLeave('rest_1', 'leave_101', 'Approved', 'mgr_1');

      assert.strictEqual(mockEmp.status, 'On Leave');
      assert.strictEqual(mockEmp.leaveBalances.casualLeave.taken, 1);

      // Now set taken to 2 (quota maxed)
      mockEmp.leaveBalances.casualLeave.taken = 2;

      await assert.rejects(
        async () => {
          await employeeService.applyLeave('rest_1', 'emp_777', {
            leaveType: 'Casual Leave',
            startDate: new Date('2026-10-05'),
            endDate: new Date('2026-10-05'),
            reason: 'Exceeding quota',
          });
        },
        (err) => err.message.includes('Insufficient Casual Leave balance')
      );
    } finally {
      Employee.findOne = origEmpFindOne;
      Employee.findById = origEmpFindById;
      Leave.create = origLeaveCreate;
      Leave.findOne = origLeaveFindOne;
    }
  });

  it('should compare scheduled vs actual hours accurately', async () => {
    const origEmpFindOne = Employee.findOne;
    const origShiftFind = Shift.find;
    const origAttFind = Attendance.find;

    Employee.findOne = async () => ({
      _id: 'emp_888',
      employeeCode: 'EMP-103',
      firstName: 'Anita',
      lastName: 'Deshmukh',
    });

    Shift.find = async () => [
      {
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 30,
        assignedEmployees: ['emp_888'],
      },
    ];

    Attendance.find = async () => [
      {
        date: '2026-09-13',
        workingHours: 9,
        overtime: 1,
      },
    ];

    try {
      const metrics = await employeeService.getScheduledVsActualHours('rest_1', 'emp_888', '2026-09-13', '2026-09-13');
      assert.strictEqual(metrics.scheduledShiftsCount, 1);
      assert.strictEqual(metrics.totalScheduledHours, 7.5);
      assert.strictEqual(metrics.actualHoursWorked, 9);
      assert.strictEqual(metrics.varianceHours, 1.5);
    } finally {
      Employee.findOne = origEmpFindOne;
      Shift.find = origShiftFind;
      Attendance.find = origAttFind;
    }
  });

  it('6. Phase 3 Wage Calculation & Role-Weighted Tip Pool — should calculate gross pay and tip shares', async () => {
    const Restaurant = require('../src/features/tenant/tenant.model');
    const Invoice = require('../src/features/billing/invoice.model');
    const Payroll = require('../src/features/employee/payroll.model');

    const origRestFindById = Restaurant.findById;
    const origInvoiceFind = Invoice.find;
    const origEmpFind = Employee.find;
    const origAttFind = Attendance.find;
    const origLeaveFind = Leave.find;
    const origPayrollFindOneAndUpdate = Payroll.findOneAndUpdate;

    Restaurant.findById = async () => ({
      _id: 'rest_1',
      settings: {
        payrollSettings: {
          overtimeThresholdHours: 8,
          overtimeMultiplier: 1.5,
          tipDistributionModel: 'ROLE_WEIGHTED',
          departmentTipWeights: new Map([['Service', 50], ['Kitchen', 30], ['Cashier', 20]]),
        },
      },
    });

    Invoice.find = async () => [
      { serviceCharge: 1000, tipAmount: 0, invoiceStatus: 'Paid' },
    ];

    const mockEmpService = {
      _id: 'emp_service',
      firstName: 'Priya',
      lastName: 'Sharma',
      department: 'Service',
      employmentType: 'Full Time',
      salaryType: 'Monthly',
      basicSalary: 30000,
      salaryStructure: { basicSalary: 30000, hra: 5000, specialAllowance: 0 },
    };

    const mockEmpKitchen = {
      _id: 'emp_kitchen',
      firstName: 'Vikas',
      lastName: 'Khanna',
      department: 'Kitchen',
      employmentType: 'Full Time',
      salaryType: 'Monthly',
      basicSalary: 40000,
      salaryStructure: { basicSalary: 40000, hra: 5000, specialAllowance: 0 },
    };

    Employee.find = async () => [mockEmpService, mockEmpKitchen];

    Attendance.find = async (query) => {
      if (query.employee === 'emp_service') {
        return [{ workingHours: 160, overtime: 10, status: 'Present' }];
      }
      return [{ workingHours: 160, overtime: 0, status: 'Present' }];
    };

    Leave.find = async () => [];

    const createdPayrolls = [];
    Payroll.findOneAndUpdate = async (query, update) => {
      createdPayrolls.push(update);
      return update;
    };

    try {
      const results = await employeeService.generateMonthlyPayroll('rest_1', '2026-09');
      assert.strictEqual(results.length, 2);

      const servicePayroll = createdPayrolls.find((p) => p.employee === 'emp_service');
      assert.ok(servicePayroll);
      // Service department weight = 50% of ₹1000 pool = ₹500
      assert.strictEqual(servicePayroll.tipShare, 500);

      const kitchenPayroll = createdPayrolls.find((p) => p.employee === 'emp_kitchen');
      assert.ok(kitchenPayroll);
      // Kitchen department weight = 30% of ₹1000 pool = ₹300
      assert.strictEqual(kitchenPayroll.tipShare, 300);

      // Verify overtime calculation on Service employee
      assert.strictEqual(servicePayroll.overtimeHours, 10);
      assert.ok(servicePayroll.overtimePay > 0);
      assert.ok(servicePayroll.grossSalary > servicePayroll.basicSalary);
    } finally {
      Restaurant.findById = origRestFindById;
      Invoice.find = origInvoiceFind;
      Employee.find = origEmpFind;
      Attendance.find = origAttFind;
      Leave.find = origLeaveFind;
      Payroll.findOneAndUpdate = origPayrollFindOneAndUpdate;
    }
  });
});

