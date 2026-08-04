const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const employeeService = require('./employee.service');

const createEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.params.restaurantId, req.body);
  return new ApiResponse(201, { employee }, 'Employee registered successfully').send(res);
});

const createEmployeeUser = asyncHandler(async (req, res) => {
  const result = await employeeService.createEmployeeUser(
    req.params.restaurantId,
    req.params.employeeId,
    req.body
  );
  return new ApiResponse(201, result, 'Employee system user account created successfully').send(res);
});

const listEmployees = asyncHandler(async (req, res) => {
  const department = req.query.department || undefined;
  const status = req.query.status || undefined;
  const search = req.query.search || '';

  const employees = await employeeService.listEmployees(req.params.restaurantId, { department, status, search });
  return new ApiResponse(200, { employees }, 'Employee directory fetched successfully').send(res);
});

const getEmployee = asyncHandler(async (req, res) => {
  const data = await employeeService.getEmployee(req.params.restaurantId, req.params.employeeId);
  return new ApiResponse(200, data, 'Employee details fetched successfully').send(res);
});

const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.params.restaurantId, req.params.employeeId, req.body);
  return new ApiResponse(200, { employee }, 'Employee profile updated successfully').send(res);
});

const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.deleteEmployee(req.params.restaurantId, req.params.employeeId);
  return new ApiResponse(200, { employee }, 'Employee marked as Resigned successfully').send(res);
});

const clockIn = asyncHandler(async (req, res) => {
  const attendance = await employeeService.clockIn(
    req.params.restaurantId,
    req.body.employeeId,
    req.body
  );
  return new ApiResponse(201, { attendance }, 'Clock In timestamp registered').send(res);
});

const clockOut = asyncHandler(async (req, res) => {
  const attendance = await employeeService.clockOut(req.params.restaurantId, req.params.employeeId);
  return new ApiResponse(200, { attendance }, 'Clock Out timestamp registered').send(res);
});

const toggleBreak = asyncHandler(async (req, res) => {
  const attendance = await employeeService.toggleBreak(
    req.params.restaurantId,
    req.params.employeeId,
    req.body.action // 'start' or 'end'
  );
  return new ApiResponse(200, { attendance }, `Break session ${req.body.action}ed successfully`).send(res);
});

const applyLeave = asyncHandler(async (req, res) => {
  const leave = await employeeService.applyLeave(req.params.restaurantId, req.params.employeeId, req.body);
  return new ApiResponse(201, { leave }, 'Leave request submitted successfully').send(res);
});

const listLeaves = asyncHandler(async (req, res) => {
  const status = req.query.status || undefined;
  const leaves = await employeeService.listLeaves(req.params.restaurantId, { status });
  return new ApiResponse(200, { leaves }, 'Leave requests fetched successfully').send(res);
});

const approveLeave = asyncHandler(async (req, res) => {
  const leave = await employeeService.approveLeave(
    req.params.restaurantId,
    req.params.leaveId,
    req.body.status,
    req.user?._id
  );
  return new ApiResponse(200, { leave }, `Leave request status updated to ${req.body.status}`).send(res);
});

const createShift = asyncHandler(async (req, res) => {
  const shift = await employeeService.createShift(req.params.restaurantId, req.body);
  return new ApiResponse(201, { shift }, 'Shift schedule created successfully').send(res);
});

const listShifts = asyncHandler(async (req, res) => {
  const shifts = await employeeService.listShifts(req.params.restaurantId);
  return new ApiResponse(200, { shifts }, 'Weekly shifts fetched successfully').send(res);
});

const assignEmployeesToShift = asyncHandler(async (req, res) => {
  const shift = await employeeService.assignEmployeesToShift(
    req.params.restaurantId,
    req.params.shiftId,
    req.body.employeeIds
  );
  return new ApiResponse(200, { shift }, 'Staff roster updated successfully').send(res);
});

const generateMonthlyPayroll = asyncHandler(async (req, res) => {
  const payrolls = await employeeService.generateMonthlyPayroll(req.params.restaurantId, req.body.month);
  return new ApiResponse(201, { payrolls }, 'Monthly payroll ledger generated').send(res);
});

const listPayroll = asyncHandler(async (req, res) => {
  const payrolls = await employeeService.listPayroll(req.params.restaurantId, req.query.month);
  return new ApiResponse(200, { payrolls }, 'Monthly payroll slips fetched').send(res);
});

const paySalary = asyncHandler(async (req, res) => {
  const payroll = await employeeService.paySalary(req.params.restaurantId, req.params.payrollId);
  return new ApiResponse(200, { payroll }, 'Salary invoice marked as Paid').send(res);
});

const getEmployeeStats = asyncHandler(async (req, res) => {
  const stats = await employeeService.getEmployeeStats(req.params.restaurantId);
  return new ApiResponse(200, { stats }, 'Employee stats fetched successfully').send(res);
});

module.exports = {
  createEmployee,
  createEmployeeUser,
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
