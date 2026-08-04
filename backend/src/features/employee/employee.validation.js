const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const employeeSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  employeeCode: z.string().trim().min(1, 'Employee code is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().trim().min(1, 'Phone number is required'),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  emergencyContact: z.string().optional().or(z.literal('')),
  joiningDate: z.string().optional().or(z.literal('')),
  employmentType: z.enum(['Full Time', 'Part Time', 'Contract', 'Temporary']).default('Full Time'),
  designation: z.string().trim().min(1, 'Designation is required'),
  department: z.enum([
    'Management',
    'Kitchen',
    'Service',
    'Cashier',
    'Reception',
    'Inventory',
    'Delivery',
  ]).default('Service'),
  salaryType: z.enum(['Monthly', 'Hourly']).default('Monthly'),
  basicSalary: z.number().min(0, 'Basic salary cannot be negative'),
  status: z.enum(['Active', 'On Leave', 'Suspended', 'Resigned']).optional(),
  permissions: z.record(z.array(z.string())).optional(),
});

const updateEmployeeSchema = employeeSchema.partial();

const clockInSchema = z.object({
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID'),
  status: z.enum(['Present', 'Absent', 'On Leave', 'Late']).optional().default('Present'),
  notes: z.string().trim().optional().or(z.literal('')),
});

const shiftSchema = z.object({
  shiftName: z.string().trim().min(1, 'Shift name is required'),
  startTime: z.string().trim().min(1, 'Start time is required'),
  endTime: z.string().trim().min(1, 'End time is required'),
  breakDuration: z.number().min(0).default(30),
  assignedEmployees: z.array(z.string().regex(objectIdRegex)).optional().default([]),
});

const leaveSchema = z.object({
  leaveType: z.enum(['Casual Leave', 'Sick Leave', 'Paid Leave', 'Unpaid Leave']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().trim().min(1, 'Leave reason is required'),
});

const leaveApprovalSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
});

const createEmployeeUserSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['staff', 'chef', 'manager']).default('staff'),
});

module.exports = {
  employeeSchema,
  updateEmployeeSchema,
  clockInSchema,
  shiftSchema,
  leaveSchema,
  leaveApprovalSchema,
  createEmployeeUserSchema,
};
