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

router
  .route('/:employeeId')
  .get(employeeController.getEmployee)
  .patch(canManage, validateBody(updateEmployeeSchema), employeeController.updateEmployee)
  .delete(canManage, employeeController.deleteEmployee);

// Attendance Active Timers
router.post('/attendance/clock-in', validateBody(clockInSchema), employeeController.clockIn);
router.post('/:employeeId/clock-out', employeeController.clockOut);
router.post('/:employeeId/break', employeeController.toggleBreak);

// Leaves Scheduler
router.post('/:employeeId/leaves', validateBody(leaveSchema), employeeController.applyLeave);
router.get('/leaves/all', employeeController.listLeaves);
router.patch('/leaves/:leaveId/approve', canManage, validateBody(leaveApprovalSchema), employeeController.approveLeave);

// Shifts Rostering
router
  .route('/shifts/all')
  .post(canManage, validateBody(shiftSchema), employeeController.createShift)
  .get(employeeController.listShifts);

router.patch('/shifts/:shiftId/assign', canManage, employeeController.assignEmployeesToShift);

// Payroll Foundation
router.post('/payroll/generate', canManage, employeeController.generateMonthlyPayroll);
router.get('/payroll/all', employeeController.listPayroll);
router.patch('/payroll/:payrollId/pay', canManage, employeeController.paySalary);

module.exports = router;
