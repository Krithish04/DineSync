const mongoose = require('mongoose');
const Employee = require('./employee.model');
const Attendance = require('./attendance.model');
const Shift = require('./shift.model');
const Leave = require('./leave.model');
const Payroll = require('./payroll.model');
const Advance = require('./advance.model');
const User = require('../auth/auth.model');
const Restaurant = require('../tenant/tenant.model');
const Invoice = require('../billing/invoice.model');
const ApiError = require('../../utils/ApiError');
const { encrypt, decrypt, maskValue } = require('../../utils/encryption.util');
const { logAction } = require('../superAdmin/audit.service');

// Helper to mask sensitive employee payload for general listings
const maskEmployeeSensitiveData = (empDoc) => {
  if (!empDoc) return empDoc;
  const emp = empDoc.toObject ? empDoc.toObject() : { ...empDoc };
  if (emp.sensitiveInfo) {
    emp.sensitiveInfo = {
      bankAccount: emp.sensitiveInfo.bankAccount ? maskValue(decrypt(emp.sensitiveInfo.bankAccount), 4) : '',
      bankIfsc: emp.sensitiveInfo.bankIfsc ? maskValue(decrypt(emp.sensitiveInfo.bankIfsc), 4) : '',
      bankName: emp.sensitiveInfo.bankName ? decrypt(emp.sensitiveInfo.bankName) : '',
      panNumber: emp.sensitiveInfo.panNumber ? maskValue(decrypt(emp.sensitiveInfo.panNumber), 4) : '',
    };
  }
  return emp;
};

// ==========================================
// EMPLOYEE DIRECTORY OPERATIONS
// ==========================================

const createEmployee = async (restaurantId, payload, requestingUser = null, ipAddress = '127.0.0.1') => {
  let matchedUser = null;
  if (payload.email) {
    matchedUser = await User.findOne({ email: payload.email.toLowerCase(), restaurant: restaurantId });
  }

  const processedPayload = { ...payload };
  if (processedPayload.sensitiveInfo) {
    processedPayload.sensitiveInfo = {
      bankAccount: processedPayload.sensitiveInfo.bankAccount ? encrypt(processedPayload.sensitiveInfo.bankAccount) : '',
      bankIfsc: processedPayload.sensitiveInfo.bankIfsc ? encrypt(processedPayload.sensitiveInfo.bankIfsc) : '',
      bankName: processedPayload.sensitiveInfo.bankName ? encrypt(processedPayload.sensitiveInfo.bankName) : '',
      panNumber: processedPayload.sensitiveInfo.panNumber ? encrypt(processedPayload.sensitiveInfo.panNumber) : '',
    };
  }

  const employee = await Employee.create({
    ...processedPayload,
    restaurant: restaurantId,
    user: matchedUser ? matchedUser._id : null,
  });

  if (requestingUser) {
    await logAction({
      restaurantId,
      userId: requestingUser._id,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: 'EMPLOYEE_CREATE',
      resource: `Employee:${employee._id}`,
      ipAddress,
      status: 'Success',
      details: { employeeCode: employee.employeeCode, name: `${employee.firstName} ${employee.lastName}` },
    });
  }

  return maskEmployeeSensitiveData(employee);
};

const createEmployeeUser = async (restaurantId, employeeId, { password, role = 'staff' }) => {
  const employee = await Employee.findOne({ _id: employeeId, restaurant: restaurantId });
  if (!employee) throw ApiError.notFound('Employee profile not found.');

  if (employee.user) {
    throw ApiError.badRequest('Employee already has an active system user account.');
  }

  const existingUser = await User.findOne({ email: employee.email.toLowerCase(), restaurant: restaurantId });
  if (existingUser) {
    employee.user = existingUser._id;
    await employee.save();
    return { employee: maskEmployeeSensitiveData(employee), user: existingUser.toSafeObject() };
  }

  const allowedRoles = ['staff', 'chef', 'manager'];
  const userRole = allowedRoles.includes(role) ? role : 'staff';

  const newUser = await User.create({
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    email: employee.email.toLowerCase(),
    phone: employee.phone || null,
    password,
    role: userRole,
    restaurant: restaurantId,
    isEmailVerified: true,
  });

  employee.user = newUser._id;
  await employee.save();

  return { employee: maskEmployeeSensitiveData(employee), user: newUser.toSafeObject() };
};

const listEmployees = async (restaurantId, { department, status, search = '' }) => {
  const query = { restaurant: restaurantId };
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

  const list = await Employee.find(query).sort({ lastName: 1, firstName: 1 });
  return list.map(maskEmployeeSensitiveData);
};

const getEmployee = async (restaurantId, employeeId) => {
  const employee = await Employee.findOne({ _id: employeeId, restaurant: restaurantId });
  if (!employee) throw ApiError.notFound('Employee profile not found.');

  const attendance = await Attendance.find({ employee: employeeId }).sort({ date: -1 }).limit(30);
  const leaves = await Leave.find({ employee: employeeId }).sort({ startDate: -1 });
  const shifts = await Shift.find({ assignedEmployees: employeeId });
  const payroll = await Payroll.find({ employee: employeeId }).sort({ month: -1 });
  const advances = await Advance.find({ employee: employeeId }).sort({ createdAt: -1 });

  return {
    employee: maskEmployeeSensitiveData(employee),
    attendance,
    leaves,
    shifts,
    payroll,
    advances,
  };
};

const getEmployeeSensitiveInfo = async (restaurantId, employeeId, requestingUser, ipAddress = '127.0.0.1') => {
  const employee = await Employee.findOne({ _id: employeeId, restaurant: restaurantId });
  if (!employee) throw ApiError.notFound('Employee profile not found.');

  await logAction({
    restaurantId,
    userId: requestingUser?._id,
    userEmail: requestingUser?.email || 'system',
    userRole: requestingUser?.role || 'system',
    action: 'EMPLOYEE_SENSITIVE_VIEW',
    resource: `Employee:${employeeId}`,
    ipAddress,
    status: 'Success',
    details: { employeeCode: employee.employeeCode, fieldsAccessed: ['bankAccount', 'bankIfsc', 'bankName', 'panNumber'] },
  });

  return {
    employeeId: employee._id,
    employeeCode: employee.employeeCode,
    bankAccount: decrypt(employee.sensitiveInfo?.bankAccount || ''),
    bankIfsc: decrypt(employee.sensitiveInfo?.bankIfsc || ''),
    bankName: decrypt(employee.sensitiveInfo?.bankName || ''),
    panNumber: decrypt(employee.sensitiveInfo?.panNumber || ''),
  };
};

const updateEmployee = async (restaurantId, employeeId, payload, requestingUser = null, ipAddress = '127.0.0.1') => {
  const processedPayload = { ...payload };
  if (processedPayload.sensitiveInfo) {
    const existing = await Employee.findOne({ _id: employeeId, restaurant: restaurantId });
    if (!existing) throw ApiError.notFound('Employee profile not found.');

    const sensitiveInfo = {
      bankAccount: processedPayload.sensitiveInfo.bankAccount
        ? encrypt(processedPayload.sensitiveInfo.bankAccount)
        : existing.sensitiveInfo?.bankAccount || '',
      bankIfsc: processedPayload.sensitiveInfo.bankIfsc
        ? encrypt(processedPayload.sensitiveInfo.bankIfsc)
        : existing.sensitiveInfo?.bankIfsc || '',
      bankName: processedPayload.sensitiveInfo.bankName
        ? encrypt(processedPayload.sensitiveInfo.bankName)
        : existing.sensitiveInfo?.bankName || '',
      panNumber: processedPayload.sensitiveInfo.panNumber
        ? encrypt(processedPayload.sensitiveInfo.panNumber)
        : existing.sensitiveInfo?.panNumber || '',
    };
    processedPayload.sensitiveInfo = sensitiveInfo;

    if (requestingUser) {
      await logAction({
        restaurantId,
        userId: requestingUser._id,
        userEmail: requestingUser.email,
        userRole: requestingUser.role,
        action: 'EMPLOYEE_SENSITIVE_UPDATE',
        resource: `Employee:${employeeId}`,
        ipAddress,
        status: 'Success',
        details: { employeeCode: existing.employeeCode },
      });
    }
  }

  const employee = await Employee.findOneAndUpdate(
    { _id: employeeId, restaurant: restaurantId },
    processedPayload,
    { new: true, runValidators: true }
  );
  if (!employee) throw ApiError.notFound('Employee profile not found.');
  return maskEmployeeSensitiveData(employee);
};

const deleteEmployee = async (restaurantId, employeeId) => {
  const employee = await Employee.findOneAndUpdate(
    { _id: employeeId, restaurant: restaurantId },
    { status: 'Resigned' },
    { new: true }
  );
  if (!employee) throw ApiError.notFound('Employee not found.');
  return maskEmployeeSensitiveData(employee);
};

// ==========================================
// ATTENDANCE ACTIVE TIMERS & CORRECTIONS
// ==========================================

const assertPayPeriodNotPaid = async (restaurantId, dateOrMonth, employeeId = null) => {
  const month = typeof dateOrMonth === 'string' && dateOrMonth.length === 7
    ? dateOrMonth
    : String(dateOrMonth).slice(0, 7);

  const query = { month, $or: [{ paymentStatus: 'Paid' }, { isClosed: true }] };
  if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) query.restaurant = restaurantId;
  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) query.employee = employeeId;

  try {
    const paidPayroll = await Payroll.findOne(query);
    if (paidPayroll) {
      throw ApiError.badRequest(`Pay period ${month} is closed and marked Paid. Reopen payroll period to make retro changes.`);
    }
  } catch (err) {
    if (err.statusCode || err.status) throw err;
  }
};

const clockIn = async (restaurantId, employeeId, payload) => {
  const dateStr = new Date().toISOString().slice(0, 10);

  const exists = await Attendance.exists({ employee: employeeId, date: dateStr });
  if (exists) {
    throw ApiError.badRequest('Employee has already clocked in for today.');
  }

  const attendance = await Attendance.create({
    employee: employeeId,
    restaurant: restaurantId,
    date: dateStr,
    checkIn: new Date(),
    status: payload.status || 'Present',
    notes: payload.notes || '',
    source: payload.source || 'MANUAL_CLOCK_IN',
  });

  return attendance;
};

const handlePosLoginClockIn = async (restaurantId, userId) => {
  try {
    const employee = await Employee.findOne({ user: userId, restaurant: restaurantId });
    if (!employee) return null;

    const dateStr = new Date().toISOString().slice(0, 10);
    const existing = await Attendance.findOne({ employee: employee._id, date: dateStr });
    if (!existing) {
      return await Attendance.create({
        employee: employee._id,
        restaurant: restaurantId,
        date: dateStr,
        checkIn: new Date(),
        status: 'Present',
        source: 'POS_LOGIN',
        notes: 'Auto clock-in on POS login',
      });
    }
    return existing;
  } catch (err) {
    return null;
  }
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

  const diffMs = checkOutTime - attendance.checkIn;
  const rawHours = diffMs / (1000 * 60 * 60);

  let totalBreakMs = 0;
  attendance.breaks.forEach((b) => {
    if (b.start && b.end) {
      totalBreakMs += b.end - b.start;
    } else if (b.start && !b.end) {
      totalBreakMs += checkOutTime - b.start;
      b.end = checkOutTime;
    }
  });

  const netHours = Math.max(0, rawHours - totalBreakMs / (1000 * 60 * 60));
  attendance.workingHours = Math.round(netHours * 100) / 100;

  if (attendance.workingHours > 8.0) {
    attendance.overtime = Math.round((attendance.workingHours - 8.0) * 100) / 100;
  }

  await attendance.save();
  return attendance;
};

const markBatchAttendance = async (restaurantId, { date, entries }, requestingUser, ipAddress = '127.0.0.1') => {
  if (!date || !entries || !Array.isArray(entries)) {
    throw ApiError.badRequest('Date and entries array are required for batch attendance marking.');
  }

  await assertPayPeriodNotPaid(restaurantId, date);

  const results = [];
  for (const entry of entries) {
    const { employeeId, status = 'Present', workingHours, notes = '' } = entry;

    let computedHours = workingHours;
    if (computedHours === undefined || computedHours === null) {
      if (status === 'Present') computedHours = 8.0;
      else if (status === 'Half-day') computedHours = 4.0;
      else if (status === 'Holiday') computedHours = 8.0;
      else computedHours = 0;
    }

    const defaultCheckIn = new Date(`${date}T09:00:00Z`);
    const defaultCheckOut = new Date(`${date}T${status === 'Half-day' ? '13:00:00' : '17:00:00'}Z`);

    const checkIn = entry.checkIn ? new Date(entry.checkIn) : defaultCheckIn;
    const checkOut = entry.checkOut ? new Date(entry.checkOut) : defaultCheckOut;

    const overtime = computedHours > 8.0 ? Math.round((computedHours - 8.0) * 100) / 100 : 0;

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date, restaurant: restaurantId },
      {
        employee: employeeId,
        restaurant: restaurantId,
        date,
        checkIn,
        checkOut,
        workingHours: computedHours,
        overtime,
        status,
        notes,
        source: 'MANAGER_ENTRY',
        $push: {
          corrections: {
            modifiedBy: requestingUser._id,
            newCheckIn: checkIn,
            newCheckOut: checkOut,
            reason: entry.reason || 'Manager batch manual entry',
            timestamp: new Date(),
          },
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    results.push(attendance);
  }

  await logAction({
    restaurantId,
    userId: requestingUser._id,
    userEmail: requestingUser.email,
    userRole: requestingUser.role,
    action: 'ATTENDANCE_MANUAL_BATCH_MARK',
    resource: `AttendanceBatch:${date}`,
    ipAddress,
    status: 'Success',
    details: { date, entriesCount: entries.length },
  });

  return results;
};

const correctAttendance = async (restaurantId, attendanceId, payload, requestingUser, ipAddress = '127.0.0.1') => {
  const attendance = await Attendance.findOne({ _id: attendanceId, restaurant: restaurantId });
  if (!attendance) throw ApiError.notFound('Attendance record not found.');

  await assertPayPeriodNotPaid(restaurantId, attendance.date, attendance.employee);

  const previousCheckIn = attendance.checkIn;
  const previousCheckOut = attendance.checkOut;

  const newCheckIn = payload.checkIn ? new Date(payload.checkIn) : attendance.checkIn;
  const newCheckOut = payload.checkOut ? new Date(payload.checkOut) : attendance.checkOut;

  attendance.checkIn = newCheckIn;
  attendance.checkOut = newCheckOut;
  if (payload.status) attendance.status = payload.status;
  if (payload.notes) attendance.notes = payload.notes;

  if (newCheckIn && newCheckOut) {
    const diffMs = newCheckOut - newCheckIn;
    const rawHours = Math.max(0, diffMs / (1000 * 60 * 60));
    attendance.workingHours = Math.round(rawHours * 100) / 100;
    attendance.overtime = attendance.workingHours > 8.0 ? Math.round((attendance.workingHours - 8.0) * 100) / 100 : 0;
  }

  attendance.corrections.push({
    modifiedBy: requestingUser._id,
    previousCheckIn,
    previousCheckOut,
    newCheckIn,
    newCheckOut,
    reason: payload.reason || 'Manager manual correction',
    timestamp: new Date(),
  });

  await attendance.save();

  await logAction({
    restaurantId,
    userId: requestingUser._id,
    userEmail: requestingUser.email,
    userRole: requestingUser.role,
    action: 'ATTENDANCE_MANUAL_CORRECTION',
    resource: `Attendance:${attendanceId}`,
    ipAddress,
    status: 'Success',
    details: {
      employeeId: attendance.employee,
      previousCheckIn,
      previousCheckOut,
      newCheckIn,
      newCheckOut,
      reason: payload.reason || 'Manager manual correction',
    },
  });

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
// LEAVE SCHEDULER & BALANCE TRACKING
// ==========================================

const applyLeave = async (restaurantId, employeeId, payload) => {
  const employee = await Employee.findOne({ _id: employeeId, restaurant: restaurantId });
  if (!employee) throw ApiError.notFound('Employee profile not found.');

  const leaveTypeKey = payload.leaveType === 'Casual Leave' ? 'casualLeave' :
                       payload.leaveType === 'Sick Leave' ? 'sickLeave' :
                       payload.leaveType === 'Paid Leave' ? 'paidLeave' : null;

  if (leaveTypeKey && employee.leaveBalances && employee.leaveBalances[leaveTypeKey]) {
    const quota = employee.leaveBalances[leaveTypeKey];
    if (quota.taken >= quota.allocated) {
      throw ApiError.badRequest(`Insufficient ${payload.leaveType} balance. Allocated: ${quota.allocated}, Taken: ${quota.taken}.`);
    }
  }

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
    const employee = await Employee.findById(leave.employee);
    if (employee) {
      employee.status = 'On Leave';

      const leaveTypeKey = leave.leaveType === 'Casual Leave' ? 'casualLeave' :
                           leave.leaveType === 'Sick Leave' ? 'sickLeave' :
                           leave.leaveType === 'Paid Leave' ? 'paidLeave' : null;

      if (leaveTypeKey && employee.leaveBalances && employee.leaveBalances[leaveTypeKey]) {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const diffMs = Math.abs(endDate - startDate);
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
        employee.leaveBalances[leaveTypeKey].taken += days;
      }
      await employee.save();
    }
  }

  return leave;
};

// ==========================================
// SHIFT ROSTERING & VARIANCE COMPARISON
// ==========================================

const createShift = async (restaurantId, payload) => {
  const shift = await Shift.create({
    ...payload,
    restaurant: restaurantId,
  });
  return shift;
};

const listShifts = async (restaurantId) => {
  return Shift.find({ restaurant: restaurantId }).populate(
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

const getScheduledVsActualHours = async (restaurantId, employeeId, startDate, endDate) => {
  const employee = await Employee.findOne({ _id: employeeId, restaurant: restaurantId });
  if (!employee) throw ApiError.notFound('Employee profile not found.');

  const shifts = await Shift.find({ restaurant: restaurantId, assignedEmployees: employeeId });

  let dailyScheduledHours = 0;
  shifts.forEach((s) => {
    if (s.startTime && s.endTime) {
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      let totalMins = endMinutes - startMinutes;
      if (totalMins < 0) totalMins += 24 * 60;
      totalMins -= s.breakDuration || 0;
      dailyScheduledHours += Math.max(0, totalMins / 60);
    }
  });

  const query = { employee: employeeId, restaurant: restaurantId };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  const attendanceRecords = await Attendance.find(query);

  let actualHoursWorked = 0;
  let actualOvertimeHours = 0;
  attendanceRecords.forEach((a) => {
    actualHoursWorked += a.workingHours || 0;
    actualOvertimeHours += a.overtime || 0;
  });

  const totalDays = attendanceRecords.length || 1;
  const totalScheduledHours = Math.round(dailyScheduledHours * totalDays * 100) / 100;

  return {
    employeeId: employee._id,
    employeeCode: employee.employeeCode,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    scheduledShiftsCount: shifts.length,
    totalScheduledHours,
    actualHoursWorked: Math.round(actualHoursWorked * 100) / 100,
    actualOvertimeHours: Math.round(actualOvertimeHours * 100) / 100,
    varianceHours: Math.round((actualHoursWorked - totalScheduledHours) * 100) / 100,
  };
};

// ==========================================
// PHASE 3 — WAGE CALCULATION & TIP POOLING
// ==========================================

const generateMonthlyPayroll = async (restaurantId, month) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw ApiError.notFound('Restaurant tenant not found.');

  const payrollSettings = restaurant.settings?.payrollSettings || {};
  const overtimeThresholdHours = payrollSettings.overtimeThresholdHours || 8;
  const overtimeMultiplier = payrollSettings.overtimeMultiplier || 1.5;
  const tipDistributionModel = payrollSettings.tipDistributionModel || 'ROLE_WEIGHTED';

  const defaultWeights = { Service: 50, Kitchen: 30, Cashier: 10, Management: 10 };
  const rawWeights = payrollSettings.departmentTipWeights;
  const deptWeights = rawWeights instanceof Map ? Object.fromEntries(rawWeights) : (rawWeights || defaultWeights);

  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
  const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));

  // Aggregate tips and service charges from paid invoices
  const invoices = await Invoice.find({
    restaurant: restaurantId,
    invoiceStatus: 'Paid',
    invoiceDate: { $gte: startDate, $lte: endDate },
  });

  let totalCollectedTipPool = 0;
  invoices.forEach((inv) => {
    totalCollectedTipPool += (inv.serviceCharge || 0) + (inv.tipAmount || 0);
  });

  const employees = await Employee.find({ restaurant: restaurantId, status: { $ne: 'Resigned' } });
  const createdRecords = [];

  const empAttendanceMap = new Map();
  const deptTotalHoursMap = new Map();
  let totalCompanyHoursWorked = 0;

  for (const emp of employees) {
    const attendanceList = await Attendance.find({
      employee: emp._id,
      date: { $regex: `^${month}` },
      restaurant: restaurantId,
    });

    let totalHoursWorked = 0;
    let totalOvertimeHours = 0;
    let daysPresent = 0;

    attendanceList.forEach((att) => {
      totalHoursWorked += att.workingHours || 0;
      totalOvertimeHours += att.overtime || 0;
      if (['Present', 'Late', 'Holiday'].includes(att.status)) daysPresent += 1;
      else if (att.status === 'Half-day') daysPresent += 0.5;
    });

    empAttendanceMap.set(emp._id.toString(), {
      totalHoursWorked,
      totalOvertimeHours,
      daysPresent,
    });

    const dept = emp.department || 'Service';
    const currentDeptHours = deptTotalHoursMap.get(dept) || 0;
    deptTotalHoursMap.set(dept, currentDeptHours + totalHoursWorked);
    totalCompanyHoursWorked += totalHoursWorked;
  }

  for (const emp of employees) {
    const empIdStr = emp._id.toString();
    const attData = empAttendanceMap.get(empIdStr) || { totalHoursWorked: 0, totalOvertimeHours: 0, daysPresent: 0 };
    const { totalHoursWorked, totalOvertimeHours, daysPresent } = attData;

    // Tip Share Calculation
    let empTipShare = 0;
    if (totalCollectedTipPool > 0) {
      if (tipDistributionModel === 'EQUAL_SPLIT') {
        empTipShare = totalCompanyHoursWorked > 0
          ? Math.round((totalCollectedTipPool * (totalHoursWorked / totalCompanyHoursWorked)) * 100) / 100
          : 0;
      } else {
        const dept = emp.department || 'Service';
        const weight = deptWeights[dept] || 0;
        const totalWeightSum = Object.values(deptWeights).reduce((a, b) => a + Number(b), 0) || 100;
        const deptPoolShare = totalCollectedTipPool * (weight / totalWeightSum);
        const deptTotalHours = deptTotalHoursMap.get(dept) || 0;

        empTipShare = deptTotalHours > 0
          ? Math.round((deptPoolShare * (totalHoursWorked / deptTotalHours)) * 100) / 100
          : 0;
      }
    }

    // Gross Salary Calculation
    let basicPay = 0;
    let hra = 0;
    let allowances = 0;
    let proDataDeduction = 0;
    let overtimeHourlyRate = 0;

    const salaryType = emp.salaryType || (emp.employmentType === 'Daily Wage' ? 'Daily' : 'Monthly');

    if (salaryType === 'Monthly' || emp.employmentType === 'Full Time') {
      const bSalary = emp.salaryStructure?.basicSalary || emp.basicSalary || 0;
      const hSalary = emp.salaryStructure?.hra || 0;
      const sAllow = (emp.salaryStructure?.specialAllowance || 0) + (emp.salaryStructure?.conveyanceAllowance || 0);

      basicPay = bSalary;
      hra = hSalary;
      allowances = sAllow;

      const unpaidLeaves = await Leave.find({
        employee: emp._id,
        restaurant: restaurantId,
        status: 'Approved',
        leaveType: 'Unpaid Leave',
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      });

      let unpaidDays = 0;
      unpaidLeaves.forEach((l) => {
        const s = new Date(Math.max(new Date(l.startDate), startDate));
        const e = new Date(Math.min(new Date(l.endDate), endDate));
        const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
        unpaidDays += diff;
      });

      const totalMonthlyBase = basicPay + hra + allowances;
      proDataDeduction = Math.round(((totalMonthlyBase / daysInMonth) * unpaidDays) * 100) / 100;
      overtimeHourlyRate = Math.round(((basicPay / (daysInMonth * overtimeThresholdHours)) * overtimeMultiplier) * 100) / 100;

    } else if (salaryType === 'Daily' || emp.employmentType === 'Daily Wage') {
      const dailyRate = emp.salaryStructure?.dailyRate || emp.basicSalary || 0;
      basicPay = Math.round(daysPresent * dailyRate * 100) / 100;
      overtimeHourlyRate = Math.round(((dailyRate / overtimeThresholdHours) * overtimeMultiplier) * 100) / 100;

    } else if (salaryType === 'Hourly' || emp.employmentType === 'Part Time' || emp.employmentType === 'Contract') {
      const hourlyRate = emp.salaryStructure?.hourlyRate || emp.basicSalary || 0;
      const regularHours = Math.max(0, totalHoursWorked - totalOvertimeHours);
      basicPay = Math.round(regularHours * hourlyRate * 100) / 100;
      overtimeHourlyRate = Math.round((hourlyRate * overtimeMultiplier) * 100) / 100;
    }

    const overtimePay = Math.round(totalOvertimeHours * overtimeHourlyRate * 100) / 100;
    const grossSalary = Math.round((basicPay + hra + allowances + overtimePay + empTipShare - proDataDeduction) * 100) / 100;

    // Active Advance Deduction Logic
    let advanceDeduction = 0;
    let advanceDeductionDetails = {
      advanceId: null,
      installmentNumber: 0,
      totalInstallments: 0,
      originalScheduledAmount: 0,
      cappedAmount: 0,
    };

    let activeAdvance = null;
    try {
      const query = Advance.findOne({
        employee: emp._id,
        restaurant: restaurantId,
        status: 'Active',
        'repaymentPlan.balance': { $gt: 0 },
      });
      activeAdvance = typeof query?.sort === 'function' ? await query.sort({ createdAt: 1 }) : await query;
    } catch (e) {
      activeAdvance = null;
    }

    if (activeAdvance) {
      const plan = activeAdvance.repaymentPlan;
      const scheduledAmount = Math.min(plan.installmentAmount, plan.balance);
      const maxAllowedDeduction = Math.max(0, grossSalary);

      // Capping safeguard: net salary must not fall below 0
      const actualDeduction = Math.min(scheduledAmount, maxAllowedDeduction);
      const isCapped = actualDeduction < scheduledAmount;

      if (actualDeduction > 0) {
        advanceDeduction = actualDeduction;
        plan.paidAmount += actualDeduction;
        plan.balance = Math.max(0, plan.totalAmount - plan.paidAmount);

        if (plan.balance === 0) {
          activeAdvance.status = 'Completed';
          plan.remainingInstallments = 0;
        } else {
          if (!isCapped) {
            plan.remainingInstallments = Math.max(0, plan.remainingInstallments - 1);
          }
        }

        const currentInstallmentNum = activeAdvance.repaymentHistory.length + 1;

        advanceDeductionDetails = {
          advanceId: activeAdvance._id,
          installmentNumber: currentInstallmentNum,
          totalInstallments: plan.totalInstallments,
          originalScheduledAmount: scheduledAmount,
          cappedAmount: actualDeduction,
        };

        const alreadyLoggedForMonth = activeAdvance.repaymentHistory.find((rh) => rh.payrollMonth === month);
        if (!alreadyLoggedForMonth) {
          activeAdvance.repaymentHistory.push({
            payrollMonth: month,
            deductedAmount: actualDeduction,
            timestamp: new Date(),
            capped: isCapped,
            note: isCapped
              ? `Capped from ₹${scheduledAmount} to ₹${actualDeduction} to prevent negative net pay`
              : `Installment ${currentInstallmentNum} of ${plan.totalInstallments}`,
          });
        }

        await activeAdvance.save();
      }
    }

    const deductions = advanceDeduction;
    const netSalary = Math.max(0, Math.round((grossSalary - deductions) * 100) / 100);

    let existingPayroll = null;
    try {
      const q = { employee: emp._id, month };
      if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) q.restaurant = restaurantId;
      existingPayroll = await Payroll.findOne(q);
    } catch (e) {
      existingPayroll = null;
    }
    const isClosed = existingPayroll ? existingPayroll.isClosed : false;
    const paymentStatus = existingPayroll ? existingPayroll.paymentStatus : 'Unpaid';

    const pr = await Payroll.findOneAndUpdate(
      { employee: emp._id, month },
      {
        employee: emp._id,
        restaurant: restaurantId,
        month,
        employmentType: emp.employmentType,
        salaryType,
        basicSalary: basicPay,
        hra,
        allowances,
        proDataDeduction,
        workingDays: daysPresent,
        actualHoursWorked: totalHoursWorked,
        overtimeHours: totalOvertimeHours,
        overtimeRate: overtimeHourlyRate,
        overtimePay,
        tipShare: empTipShare,
        grossSalary,
        advanceDeduction,
        advanceDeductionDetails,
        deductions,
        netSalary,
        paymentStatus,
        isClosed,
      },
      { upsert: true, new: true }
    );

    createdRecords.push(pr);
  }

  return createdRecords;
};

const listPayroll = async (restaurantId, month) => {
  return Payroll.find({ restaurant: restaurantId, month })
    .populate('employee', 'firstName lastName employeeCode department designation')
    .sort({ netSalary: -1 });
};

const paySalary = async (restaurantId, payrollId, payload = {}, requestingUser = null, ipAddress = '127.0.0.1') => {
  const query = Payroll.findOneAndUpdate(
    { _id: payrollId, restaurant: restaurantId },
    {
      paymentStatus: 'Paid',
      paidDate: new Date(),
      isClosed: true,
      paymentReference: payload.paymentReference || '',
      paymentNote: payload.paymentNote || '',
      paidBy: requestingUser ? requestingUser._id : null,
    },
    { new: true }
  );

  const pr = typeof query?.populate === 'function'
    ? await query.populate('employee', 'firstName lastName employeeCode')
    : await query;

  if (!pr) throw ApiError.notFound('Payroll log not found.');

  if (requestingUser) {
    await logAction({
      restaurantId,
      userId: requestingUser._id,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: 'PAYROLL_MARK_PAID',
      resource: `Payroll:${payrollId}`,
      ipAddress,
      status: 'Success',
      details: { employeeId: pr.employee?._id, month: pr.month, reference: pr.paymentReference },
    });
  }

  return pr;
};

// ==========================================
// ADVANCES MANAGEMENT OPERATIONS
// ==========================================

const requestAdvance = async (restaurantId, employeeId, payload, requestingUser, ipAddress = '127.0.0.1') => {
  const employee = await Employee.findOne({ _id: employeeId, restaurant: restaurantId });
  if (!employee) throw ApiError.notFound('Employee profile not found.');

  const amount = Number(payload.amount);
  if (!amount || amount <= 0) throw ApiError.badRequest('Advance amount must be greater than zero.');

  const advance = await Advance.create({
    employee: employeeId,
    restaurant: restaurantId,
    amount,
    reason: payload.reason || '',
    requestType: 'STAFF_REQUESTED',
    status: 'Pending',
    requestedBy: requestingUser._id,
    repaymentPlan: {
      totalInstallments: 1,
      installmentAmount: amount,
      remainingInstallments: 1,
      totalAmount: amount,
      paidAmount: 0,
      balance: amount,
    },
  });

  await logAction({
    restaurantId,
    userId: requestingUser._id,
    userEmail: requestingUser.email,
    userRole: requestingUser.role,
    action: 'ADVANCE_REQUEST',
    resource: `Advance:${advance._id}`,
    ipAddress,
    status: 'Success',
    details: { employeeId, amount },
  });

  return advance;
};

const logManagerAdvance = async (restaurantId, employeeId, payload, requestingUser, ipAddress = '127.0.0.1') => {
  const employee = await Employee.findOne({ _id: employeeId, restaurant: restaurantId });
  if (!employee) throw ApiError.notFound('Employee profile not found.');

  const amount = Number(payload.amount);
  const totalInstallments = Math.max(1, parseInt(payload.totalInstallments || 1, 10));
  if (!amount || amount <= 0) throw ApiError.badRequest('Advance amount must be greater than zero.');

  const installmentAmount = Math.round((amount / totalInstallments) * 100) / 100;

  const advance = await Advance.create({
    employee: employeeId,
    restaurant: restaurantId,
    amount,
    reason: payload.reason || 'Manager logged informal advance',
    requestType: 'MANAGER_LOGGED',
    status: 'Active',
    approvedBy: requestingUser._id,
    date: payload.date ? new Date(payload.date) : new Date(),
    repaymentPlan: {
      totalInstallments,
      installmentAmount,
      remainingInstallments: totalInstallments,
      totalAmount: amount,
      paidAmount: 0,
      balance: amount,
    },
  });

  await logAction({
    restaurantId,
    userId: requestingUser._id,
    userEmail: requestingUser.email,
    userRole: requestingUser.role,
    action: 'ADVANCE_MANAGER_LOG',
    resource: `Advance:${advance._id}`,
    ipAddress,
    status: 'Success',
    details: { employeeId, amount, totalInstallments },
  });

  return advance;
};

const reviewAdvance = async (restaurantId, advanceId, payload, requestingUser, ipAddress = '127.0.0.1') => {
  const advance = await Advance.findOne({ _id: advanceId, restaurant: restaurantId });
  if (!advance) throw ApiError.notFound('Salary advance request not found.');

  if (!['Approved', 'Rejected'].includes(payload.status)) {
    throw ApiError.badRequest('Status must be Approved or Rejected.');
  }

  if (payload.status === 'Rejected') {
    advance.status = 'Rejected';
  } else {
    const totalInstallments = Math.max(1, parseInt(payload.totalInstallments || advance.repaymentPlan.totalInstallments || 1, 10));
    const installmentAmount = Math.round((advance.amount / totalInstallments) * 100) / 100;

    advance.status = 'Active';
    advance.approvedBy = requestingUser._id;
    advance.repaymentPlan = {
      totalInstallments,
      installmentAmount,
      remainingInstallments: totalInstallments,
      totalAmount: advance.amount,
      paidAmount: 0,
      balance: advance.amount,
    };
  }

  if (payload.note) advance.notes = payload.note;
  await advance.save();

  await logAction({
    restaurantId,
    userId: requestingUser._id,
    userEmail: requestingUser.email,
    userRole: requestingUser.role,
    action: 'ADVANCE_REVIEW',
    resource: `Advance:${advanceId}`,
    ipAddress,
    status: 'Success',
    details: { status: advance.status, totalInstallments: advance.repaymentPlan.totalInstallments },
  });

  return advance;
};

const updateAdvancePlan = async (restaurantId, advanceId, payload, requestingUser, ipAddress = '127.0.0.1') => {
  const advance = await Advance.findOne({ _id: advanceId, restaurant: restaurantId });
  if (!advance) throw ApiError.notFound('Salary advance record not found.');

  if (payload.status && ['Active', 'Completed', 'Cancelled'].includes(payload.status)) {
    advance.status = payload.status;
  }

  if (payload.balance !== undefined) {
    const newBalance = Math.max(0, Number(payload.balance));
    advance.repaymentPlan.balance = newBalance;
    advance.repaymentPlan.paidAmount = Math.max(0, advance.amount - newBalance);
    if (newBalance === 0) advance.status = 'Completed';
  }

  if (payload.remainingInstallments !== undefined) {
    advance.repaymentPlan.remainingInstallments = Math.max(0, parseInt(payload.remainingInstallments, 10));
  }

  if (payload.installmentAmount !== undefined) {
    advance.repaymentPlan.installmentAmount = Math.max(0, Number(payload.installmentAmount));
  }

  if (payload.note) advance.notes = payload.note;
  await advance.save();

  await logAction({
    restaurantId,
    userId: requestingUser._id,
    userEmail: requestingUser.email,
    userRole: requestingUser.role,
    action: 'ADVANCE_PLAN_UPDATE',
    resource: `Advance:${advanceId}`,
    ipAddress,
    status: 'Success',
    details: { balance: advance.repaymentPlan.balance, status: advance.status },
  });

  return advance;
};

const getEmployeeAdvances = async (restaurantId, employeeId) => {
  const list = await Advance.find({ restaurant: restaurantId, employee: employeeId }).sort({ createdAt: -1 });
  const activeBalances = list
    .filter((a) => a.status === 'Active')
    .reduce((sum, a) => sum + (a.repaymentPlan?.balance || 0), 0);

  return {
    advances: list,
    totalOutstandingBalance: activeBalances,
  };
};

const reopenPayrollPeriod = async (restaurantId, { month, employeeId, reason }, requestingUser, ipAddress = '127.0.0.1') => {
  if (!reason || !reason.trim()) {
    throw ApiError.badRequest('Reason is required to reopen a closed payroll period.');
  }

  const query = { restaurant: restaurantId };
  if (month) query.month = month;
  if (employeeId) query.employee = employeeId;

  const payrolls = await Payroll.find(query);
  if (!payrolls || payrolls.length === 0) {
    throw ApiError.notFound('No payroll records found for the specified period.');
  }

  const reopenedIds = [];
  for (const pr of payrolls) {
    pr.paymentStatus = 'Unpaid';
    pr.isClosed = false;
    pr.reopenedAt = new Date();
    pr.reopenedBy = requestingUser._id;
    pr.reopenReason = reason.trim();
    await pr.save();
    reopenedIds.push(pr._id);
  }

  await logAction({
    restaurantId,
    userId: requestingUser._id,
    userEmail: requestingUser.email,
    userRole: requestingUser.role,
    action: 'PAYROLL_PERIOD_REOPEN',
    resource: `PayrollMonth:${month || 'all'}`,
    ipAddress,
    status: 'Success',
    details: { month, reopenedCount: reopenedIds.length, reason },
  });

  return { reopenedCount: reopenedIds.length, month, reason };
};

// ==========================================
// REPORTS & DASHBOARDS
// ==========================================

const getEmployeeStats = async (restaurantId) => {
  const query = { restaurant: restaurantId };

  const employees = await Employee.find(query);
  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const leaveCount = employees.filter((e) => e.status === 'On Leave').length;

  const dateStr = new Date().toISOString().slice(0, 10);
  const todayCheckIns = await Attendance.find({
    restaurant: restaurantId,
    date: dateStr,
  });

  const presentCount = todayCheckIns.length;
  const absentCount = Math.max(0, activeCount - presentCount);

  const todayMonthDay = new Date().toISOString().slice(5, 10);
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
  createEmployeeUser,
  listEmployees,
  getEmployee,
  getEmployeeSensitiveInfo,
  updateEmployee,
  deleteEmployee,
  clockIn,
  handlePosLoginClockIn,
  clockOut,
  correctAttendance,
  markBatchAttendance,
  toggleBreak,
  applyLeave,
  listLeaves,
  approveLeave,
  createShift,
  listShifts,
  assignEmployeesToShift,
  getScheduledVsActualHours,
  generateMonthlyPayroll,
  listPayroll,
  paySalary,
  requestAdvance,
  logManagerAdvance,
  reviewAdvance,
  updateAdvancePlan,
  getEmployeeAdvances,
  reopenPayrollPeriod,
  getEmployeeStats,
};
