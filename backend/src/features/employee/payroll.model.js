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
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimePay: {
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
  },
  { timestamps: true }
);

// Ensure index exists to prevent double payroll logs per employee per month
payrollSchema.index({ employee: 1, month: 1 }, { unique: true });

const PayrollModel = mongoose.model('Payroll', payrollSchema);
PayrollModel.PAYROLL_STATUSES = PAYROLL_STATUSES;

module.exports = PayrollModel;
