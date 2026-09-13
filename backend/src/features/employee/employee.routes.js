const express = require('express');
const employeeController = require('./employee.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const {
  employeeSchema,
  updateEmployeeSchema,
  clockInSchema,
  shiftSchema,
  leaveSchema,
  leaveApprovalSchema,
  createEmployeeUserSchema,
} = require('./employee.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

// Directory CRUD
router
  .route('/')
  .post(canManage, validateBody(employeeSchema), employeeController.createEmployee)
  .get(employeeController.listEmployees);

router.get('/stats', employeeController.getEmployeeStats);

router.post(
  '/:employeeId/create-account',
  canManage,
  validateBody(createEmployeeUserSchema),
  employeeController.createEmployeeUser
);

router.get('/:employeeId/sensitive', canManage, employeeController.getEmployeeSensitiveInfo);
router.get('/:employeeId/hours-variance', employeeController.getScheduledVsActualHours);

router
  .route('/:employeeId')
  .get(employeeController.getEmployee)
  .patch(canManage, validateBody(updateEmployeeSchema), employeeController.updateEmployee)
  .delete(canManage, employeeController.deleteEmployee);

// Attendance Active Timers & Corrections
router.post('/attendance/clock-in', validateBody(clockInSchema), employeeController.clockIn);
router.post('/attendance/batch', canManage, employeeController.markBatchAttendance);
router.post('/:employeeId/clock-out', employeeController.clockOut);
router.post('/:employeeId/break', employeeController.toggleBreak);
router.patch('/attendance/:attendanceId/correct', canManage, employeeController.correctAttendance);

// Leaves Scheduler
router.post('/:employeeId/leaves', validateBody(leaveSchema), employeeController.applyLeave);
router.get('/leaves/all', employeeController.listLeaves);
router.patch('/leaves/:leaveId/approve', canManage, validateBody(leaveApprovalSchema), employeeController.approveLeave);

// Salary Advances
router.post('/:employeeId/advances', canManage, employeeController.requestAdvance);
router.post('/:employeeId/advances/manager-log', canManage, employeeController.logManagerAdvance);
router.get('/:employeeId/advances', canManage, employeeController.getEmployeeAdvances);
router.patch('/advances/:advanceId/review', canManage, employeeController.reviewAdvance);
router.patch('/advances/:advanceId/plan', canManage, employeeController.updateAdvancePlan);

// Shifts Rostering
router
  .route('/shifts/all')
  .post(canManage, validateBody(shiftSchema), employeeController.createShift)
  .get(employeeController.listShifts);

router.patch('/shifts/:shiftId/assign', canManage, employeeController.assignEmployeesToShift);

// Payroll Foundation & Safeguards
router.post('/payroll/generate', canManage, employeeController.generateMonthlyPayroll);
router.get('/payroll/all', canManage, employeeController.listPayroll);
router.patch('/payroll/:payrollId/pay', canManage, employeeController.paySalary);
router.post('/payroll/reopen', canManage, employeeController.reopenPayrollPeriod);

module.exports = router;
