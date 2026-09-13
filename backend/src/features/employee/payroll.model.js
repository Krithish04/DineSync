const mongoose = require('mongoose');

const { Schema } = mongoose;

const PAYROLL_STATUSES = Object.freeze(['Unpaid', 'Paid']);

const payrollSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    month: {
      type: String, // format YYYY-MM
      required: true,
      index: true,
    },
    employmentType: {
      type: String,
      default: 'Full Time',
    },
    salaryType: {
      type: String,
      default: 'Monthly',
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    hra: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },
    proDataDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    workingDays: {
      type: Number,
      default: 0,
    },
    actualHoursWorked: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimeRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimePay: {
      type: Number,
      default: 0,
      min: 0,
    },
    tipShare: {
      type: Number,
      default: 0,
      min: 0,
    },
    grossSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    advanceDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    advanceDeductionDetails: {
      advanceId: { type: Schema.Types.ObjectId, ref: 'Advance', default: null },
      installmentNumber: { type: Number, default: 0 },
      totalInstallments: { type: Number, default: 0 },
      originalScheduledAmount: { type: Number, default: 0 },
      cappedAmount: { type: Number, default: 0 },
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: PAYROLL_STATUSES,
      default: 'Unpaid',
      index: true,
    },
    paidDate: {
      type: Date,
      default: null,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: '',
    },
    paymentNote: {
      type: String,
      trim: true,
      default: '',
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isClosed: {
      type: Boolean,
      default: false,
      index: true,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
    reopenedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reopenReason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Ensure index exists to prevent double payroll logs per employee per month
payrollSchema.index({ employee: 1, month: 1 }, { unique: true });

const PayrollModel = mongoose.model('Payroll', payrollSchema);
PayrollModel.PAYROLL_STATUSES = PAYROLL_STATUSES;

module.exports = PayrollModel;
