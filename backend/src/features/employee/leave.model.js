const mongoose = require('mongoose');

const { Schema } = mongoose;

const LEAVE_TYPES = Object.freeze(['Casual Leave', 'Sick Leave', 'Paid Leave', 'Unpaid Leave']);
const LEAVE_STATUSES = Object.freeze(['Pending', 'Approved', 'Rejected']);

const leaveSchema = new Schema(
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
    leaveType: {
      type: String,
      enum: LEAVE_TYPES,
      required: [true, 'Leave type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    reason: {
      type: String,
      required: [true, 'Leave reason is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: LEAVE_STATUSES,
      default: 'Pending',
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const LeaveModel = mongoose.model('Leave', leaveSchema);
LeaveModel.LEAVE_TYPES = LEAVE_TYPES;
LeaveModel.LEAVE_STATUSES = LEAVE_STATUSES;

module.exports = LeaveModel;
