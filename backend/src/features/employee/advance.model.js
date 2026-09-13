const mongoose = require('mongoose');

const { Schema } = mongoose;

const ADVANCE_REQUEST_TYPES = Object.freeze(['STAFF_REQUESTED', 'MANAGER_LOGGED']);
const ADVANCE_STATUSES = Object.freeze(['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Cancelled']);

const repaymentPlanSchema = new Schema(
  {
    totalInstallments: { type: Number, required: true, min: 1, default: 1 },
    installmentAmount: { type: Number, required: true, min: 0, default: 0 },
    remainingInstallments: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balance: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const repaymentHistorySchema = new Schema(
  {
    payrollMonth: { type: String, required: true },
    deductedAmount: { type: Number, required: true, min: 0 },
    timestamp: { type: Date, default: Date.now },
    capped: { type: Boolean, default: false },
    note: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const advanceSchema = new Schema(
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
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    requestType: {
      type: String,
      enum: ADVANCE_REQUEST_TYPES,
      default: 'STAFF_REQUESTED',
    },
    status: {
      type: String,
      enum: ADVANCE_STATUSES,
      default: 'Pending',
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    repaymentPlan: {
      type: repaymentPlanSchema,
      required: true,
    },
    repaymentHistory: [repaymentHistorySchema],
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

advanceSchema.index({ restaurant: 1, employee: 1, status: 1 });

const AdvanceModel = mongoose.model('Advance', advanceSchema);
AdvanceModel.ADVANCE_REQUEST_TYPES = ADVANCE_REQUEST_TYPES;
AdvanceModel.ADVANCE_STATUSES = ADVANCE_STATUSES;

module.exports = AdvanceModel;
