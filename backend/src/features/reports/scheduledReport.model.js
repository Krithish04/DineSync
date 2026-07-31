const mongoose = require('mongoose');

const { Schema } = mongoose;

const FREQUENCIES = Object.freeze(['daily', 'weekly', 'monthly']);
const REPORT_TYPES = Object.freeze([
  'sales_summary',
  'order_summary',
  'financial_summary',
  'inventory_summary',
  'customer_summary',
  'employee_attendance',
]);

const scheduledReportSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: REPORT_TYPES,
      required: [true, 'Report type is required'],
    },
    frequency: {
      type: String,
      enum: FREQUENCIES,
      required: [true, 'Frequency is required'],
    },
    recipientEmails: {
      type: [String],
      required: [true, 'At least one recipient email is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one recipient email is required.',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const ScheduledReportModel = mongoose.model('ScheduledReport', scheduledReportSchema);
ScheduledReportModel.FREQUENCIES = FREQUENCIES;
ScheduledReportModel.REPORT_TYPES = REPORT_TYPES;

module.exports = ScheduledReportModel;
