const Employee = require('./employee.model');
const Attendance = require('./attendance.model');
const Shift = require('./shift.model');
const Leave = require('./leave.model');
const Payroll = require('./payroll.model');
const User = require('../auth/auth.model');
const ApiError = require('../../utils/ApiError');

// ==========================================
// EMPLOYEE DIRECTORY OPERATIONS
// ==========================================

const createEmployee = async (restaurantId, payload) => {
  // If email matches an existing auth user, automatically link them
  let matchedUser = null;
  if (payload.email) {
    matchedUser = await User.findOne({ email: payload.email.toLowerCase(), restaurant: restaurantId });
  }

  const employee = await Employee.create({
    ...payload,
    restaurant: restaurantId,
    user: matchedUser ? matchedUser._id : null,
  });

  return employee;
};

const listEmployees = async (restaurantId, { branch, department, status, search = '' }) => {
  const query = { restaurant: restaurantId };
  if (branch) query.branch = branch;
  if (department) query.department = department;
  if (status) query.status = status;

  if (search) {
    const terms = search.trim().split(/\s+/);
    if (terms.length > 1) {
      query.$and = [
        { firstName: { $regex: terms[0], $options: 'i' } },
        { lastName: { $regex: terms[1], $options: 'i' } },
      ];
    } else {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ];
    }
  }

  return Employee.find(query).populate('branch', 'name').sort({ lastName: 1, firstName: 1 });
};

const getEmployee = async (restaurantId, employeeId) => {
  const employee = await Employee.findOne({ _id: employeeId, restaurant: restaurantId }).populate('branch', 'name');
  if (!employee) throw ApiError.notFound('Employee profile not found.');

  // Load supporting files
  const attendance = await Attendance.find({ employee: employeeId }).sort({ date: -1 }).limit(30);
  const leaves = await Leave.find({ employee: employeeId }).sort({ startDate: -1 });
  const shifts = await Shift.find({ assignedEmployees: employeeId });
  const payroll = await Payroll.find({ employee: employeeId }).sort({ month: -1 });

  return {
    employee,
    attendance,
    leaves,
    shifts,
    payroll,
  };
};

const updateEmployee = async (restaurantId, employeeId, payload) => {
  const employee = await Employee.findOneAndUpdate(
    { _id: employeeId, restaurant: restaurantId },
    payload,
    { new: true, runValidators: true }
  );
  if (!employee) throw ApiError.notFound('Employee profile not found.');
  return employee;
};

const deleteEmployee = async (restaurantId, employeeId) => {
  const employee = await Employee.findOneAndUpdate(
    { _id: employeeId, restaurant: restaurantId },
    { status: 'Resigned' },
    { new: true }
  );
  if (!employee) throw ApiError.notFound('Employee not found.');
  return employee;
};

// ==========================================
// ATTENDANCE ACTIVE TIMERS
// ==========================================

const clockIn = async (restaurantId, branchId, employeeId, payload) => {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Check duplicate clock-in for the day
  const exists = await Attendance.exists({ employee: employeeId, date: dateStr });
  if (exists) {
    throw ApiError.badRequest('Employee has already clocked in for today.');
  }

  const attendance = await Attendance.create({
    employee: employeeId,
    restaurant: restaurantId,
    branch: branchId,
    date: dateStr,
    checkIn: new Date(),
    status: payload.status || 'Present',
    notes: payload.notes || '',
  });

  return attendance;
};

const clockOut = async (restaurantId, employeeId) => {
  const dateStr = new Date().toISOString().slice(0, 10);

  const attendance = await Attendance.findOne({
    employee: employeeId,
    date: dateStr,
    restaurant: restaurantId,
    checkOut: null,
  });

  if (!attendance) {
    throw ApiError.notFound('No active clock-in session found for today.');
  }

  const checkOutTime = new Date();
  attendance.checkOut = checkOutTime;

  // Calculate active hours (checkOut - checkIn in milliseconds)
  const diffMs = checkOutTime - attendance.checkIn;
  const rawHours = diffMs / (1000 * 60 * 60);

  // Deduct break durations
  let totalBreakMs = 0;
  attendance.breaks.forEach((b) => {
    if (b.start && b.end) {
      totalBreakMs += b.end - b.start;
    } else if (b.start && !b.end) {
      // Auto-cap ongoing break at clock out
      totalBreakMs += checkOutTime - b.start;
      b.end = checkOutTime;
    }
  });

  const netHours = Math.max(0, rawHours - totalBreakMs / (1000 * 60 * 60));
  attendance.workingHours = Math.round(netHours * 100) / 100;

  // 8 hours baseline before overtime starts accumulating
  if (attendance.workingHours > 8.0) {
    attendance.overtime = Math.round((attendance.workingHours - 8.0) * 100) / 100;
  }

  await attendance.save();
  return attendance;
};

const toggleBreak = async (restaurantId, employeeId, action) => {
  const dateStr = new Date().toISOString().slice(0, 10);

  const attendance = await Attendance.findOne({
    employee: employeeId,
    date: dateStr,
    restaurant: restaurantId,
    checkOut: null,
  });

  if (!attendance) {
    throw ApiError.badRequest('Employee is not clocked in.');
  }

  const now = new Date();

  if (action === 'start') {
    // Verify no unresolved break
    const activeBreak = attendance.breaks.find((b) => b.end === null);
    if (activeBreak) throw ApiError.badRequest('An active break session is already running.');

    attendance.breaks.push({ start: now, end: null });
  } else if (action === 'end') {
    const activeBreak = attendance.breaks.find((b) => b.end === null);
    if (!activeBreak) throw ApiError.badRequest('No active break session found to resolve.');

    activeBreak.end = now;
  }

  await attendance.save();
  return attendance;
};

// ==========================================
// LEAVE SCHEDULER
// ==========================================

const applyLeave = async (restaurantId, employeeId, payload) => {
  const leave = await Leave.create({
    ...payload,
    employee: employeeId,
    restaurant: restaurantId,
    status: 'Pending',
  });
  return leave;
};

const listLeaves = async (restaurantId, { status }) => {
  const query = { restaurant: restaurantId };
  if (status) query.status = status;

  return Leave.find(query)
    .populate('employee', 'firstName lastName employeeCode designation')
    .sort({ startDate: -1 });
};

const approveLeave = async (restaurantId, leaveId, status, approverId) => {
  const leave = await Leave.findOne({ _id: leaveId, restaurant: restaurantId });
  if (!leave) throw ApiError.notFound('Leave request not found.');

  leave.status = status;
  leave.approvedBy = approverId;
  await leave.save();

  if (status === 'Approved') {
    // Shift Employee status to On Leave
    await Employee.updateOne({ _id: leave.employee }, { status: 'On Leave' });
  }

  return leave;
};

// ==========================================
// SHIFT ROSTERING
// ==========================================

const createShift = async (restaurantId, branchId, payload) => {
  const shift = await Shift.create({
    ...payload,
    restaurant: restaurantId,
    branch: branchId,
  });
  return shift;
};

const listShifts = async (restaurantId, branchId) => {
  return Shift.find({ restaurant: restaurantId, branch: branchId }).populate(
    'assignedEmployees',
    'firstName lastName employeeCode department designation'
  );
};

const assignEmployeesToShift = async (restaurantId, shiftId, employeeIds) => {
  const shift = await Shift.findOneAndUpdate(
    { _id: shiftId, restaurant: restaurantId },
    { assignedEmployees: employeeIds },
    { new: true }
  ).populate('assignedEmployees', 'firstName lastName employeeCode');

  if (!shift) throw ApiError.notFound('Shift details not found.');
  return shift;
};

// ==========================================
// PAYROLL OPERATIONS
// ==========================================

const generateMonthlyPayroll = async (restaurantId, month) => {
  const employees = await Employee.find({ restaurant: restaurantId, status: { $ne: 'Resigned' } });
  const createdRecords = [];

  for (const emp of employees) {
    // Simple basic check to prevent double inserts
    const exists = await Payroll.exists({ employee: emp._id, month });
    if (!exists) {
      // Calculate attendance parameters
      const attendanceList = await Attendance.find({
        employee: emp._id,
        date: { $regex: `^${month}` },
        restaurant: restaurantId,
      });

      let overtimeHours = 0;
      attendanceList.forEach((att) => {
        overtimeHours += att.overtime || 0;
      });

      // Overtime multiplier value: e.g. ₹250 per overtime hour
      const overtimePay = Math.round(overtimeHours * 250);
      const allowances = emp.employmentType === 'Full Time' ? 2000 : 500;
      const deductions = 0;

      const netSalary = emp.basicSalary + allowances + overtimePay - deductions;

      const pr = await Payroll.create({
        employee: emp._id,
        restaurant: restaurantId,
        month,
        basicSalary: emp.basicSalary,
        allowances,
        deductions,
        overtimePay,
        netSalary,
        paymentStatus: 'Unpaid',
      });
      createdRecords.push(pr);
    }
  }

  return createdRecords;
};

const listPayroll = async (restaurantId, month) => {
  return Payroll.find({ restaurant: restaurantId, month })
    .populate('employee', 'firstName lastName employeeCode department designation')
    .sort({ netSalary: -1 });
};

const paySalary = async (restaurantId, payrollId) => {
  const pr = await Payroll.findOneAndUpdate(
    { _id: payrollId, restaurant: restaurantId },
    { paymentStatus: 'Paid', paidDate: new Date() },
    { new: true }
  ).populate('employee', 'firstName lastName employeeCode');

  if (!pr) throw ApiError.notFound('Payroll log not found.');
  return pr;
};

// ==========================================
// REPORTS & DASHBOARDS
// ==========================================

const getEmployeeStats = async (restaurantId, branchId = null) => {
  const query = { restaurant: restaurantId };
  if (branchId) query.branch = branchId;

  const employees = await Employee.find(query);
  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const leaveCount = employees.filter((e) => e.status === 'On Leave').length;

  const dateStr = new Date().toISOString().slice(0, 10);
  const todayCheckIns = await Attendance.find({
    restaurant: restaurantId,
    date: dateStr,
    ...(branchId && { branch: branchId }),
  });

  const presentCount = todayCheckIns.length;
  const absentCount = Math.max(0, activeCount - presentCount);

  // Upcomings birthdays
  const todayMonthDay = new Date().toISOString().slice(5, 10); // MM-DD
  const upcomingBirthdays = employees
    .filter((e) => e.dateOfBirth && new Date(e.dateOfBirth).toISOString().slice(5, 10) === todayMonthDay)
    .map((e) => ({
      name: `${e.firstName} ${e.lastName}`,
      designation: e.designation,
    }));

  return {
    totalEmployees: employees.length,
    presentToday: presentCount,
    absentToday: absentCount,
    onLeave: leaveCount,
    birthdaysToday: upcomingBirthdays,
  };
};

module.exports = {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  clockIn,
  clockOut,
  toggleBreak,
  applyLeave,
  listLeaves,
  approveLeave,
  createShift,
  listShifts,
  assignEmployeesToShift,
  generateMonthlyPayroll,
  listPayroll,
  paySalary,
  getEmployeeStats,
};
