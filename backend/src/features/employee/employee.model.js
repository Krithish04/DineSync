const mongoose = require('mongoose');

const { Schema } = mongoose;

const EMPLOYMENT_TYPES = Object.freeze(['Full Time', 'Part Time', 'Contract', 'Temporary', 'Daily Wage']);
const DEPARTMENTS = Object.freeze([
  'Management',
  'Kitchen',
  'Service',
  'Cashier',
  'Reception',
  'Inventory',
  'Delivery',
]);
const SALARY_TYPES = Object.freeze(['Monthly', 'Daily', 'Hourly']);
const EMPLOYEE_STATUSES = Object.freeze(['Active', 'On Leave', 'Suspended', 'Resigned']);

const salaryStructureSchema = new Schema(
  {
    basicSalary: { type: Number, default: 0, min: 0 },
    hra: { type: Number, default: 0, min: 0 },
    specialAllowance: { type: Number, default: 0, min: 0 },
    conveyanceAllowance: { type: Number, default: 0, min: 0 },
    dailyRate: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const sensitiveInfoSchema = new Schema(
  {
    bankAccount: { type: String, trim: true, default: '' }, // Encrypted
    bankIfsc: { type: String, trim: true, default: '' }, // Encrypted
    bankName: { type: String, trim: true, default: '' }, // Encrypted
    panNumber: { type: String, trim: true, default: '' }, // Encrypted
  },
  { _id: false }
);

const leaveQuotaSchema = new Schema(
  {
    allocated: { type: Number, default: 12, min: 0 },
    taken: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const leaveBalancesSchema = new Schema(
  {
    casualLeave: { type: leaveQuotaSchema, default: () => ({ allocated: 12, taken: 0 }) },
    sickLeave: { type: leaveQuotaSchema, default: () => ({ allocated: 12, taken: 0 }) },
    paidLeave: { type: leaveQuotaSchema, default: () => ({ allocated: 15, taken: 0 }) },
  },
  { _id: false }
);

const employeeSchema = new Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    employeeCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContact: {
      type: String,
      trim: true,
      default: '',
    },
    joiningDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    employmentType: {
      type: String,
      enum: EMPLOYMENT_TYPES,
      default: 'Full Time',
    },
    designation: {
      type: String,
      required: true,
      trim: true,
      default: 'Staff',
    },
    department: {
      type: String,
      enum: DEPARTMENTS,
      default: 'Service',
    },
    salaryType: {
      type: String,
      enum: SALARY_TYPES,
      default: 'Monthly',
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    salaryStructure: {
      type: salaryStructureSchema,
      default: () => ({}),
    },
    sensitiveInfo: {
      type: sensitiveInfoSchema,
      default: () => ({}),
    },
    leaveBalances: {
      type: leaveBalancesSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: EMPLOYEE_STATUSES,
      default: 'Active',
      index: true,
    },
    profileImage: {
      type: String,
      trim: true,
      default: '',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    permissions: {
      type: Map,
      of: [String],
      default: () => ({
        Menu: ['View'],
        Orders: ['View', 'Create', 'Update'],
        Billing: ['View'],
        Inventory: ['View'],
        Customers: ['View'],
        Staff: ['View'],
        Reports: [],
        Settings: [],
      }),
    },
  },
  { timestamps: true }
);

// Ensure employeeCode is unique per-restaurant (sparse indices fallback)
employeeSchema.index({ employeeCode: 1, restaurant: 1 }, { unique: true });

// Pre-validate hook to generate sequential employeeId
employeeSchema.pre('validate', async function generateEmployeeId(next) {
  if (this.employeeId) return next();

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let isUnique = false;
  let candidate = '';

  const EmployeeModel = this.constructor;

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    candidate = `EMP-${dateStr}-${random}`;

    // eslint-disable-next-line no-await-in-loop
    const exists = await EmployeeModel.exists({ employeeId: candidate });
    if (!exists) {
      isUnique = true;
    }
  }

  this.employeeId = candidate;
  next();
});

const EmployeeModel = mongoose.model('Employee', employeeSchema);
EmployeeModel.EMPLOYMENT_TYPES = EMPLOYMENT_TYPES;
EmployeeModel.DEPARTMENTS = DEPARTMENTS;
EmployeeModel.SALARY_TYPES = SALARY_TYPES;
EmployeeModel.EMPLOYEE_STATUSES = EMPLOYEE_STATUSES;

module.exports = EmployeeModel;
