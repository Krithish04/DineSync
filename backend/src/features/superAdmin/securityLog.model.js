const mongoose = require('mongoose');

const { Schema } = mongoose;

const securityLogSchema = new Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ['FailedLogin', 'SuspiciousActivity', 'PermissionDenied', 'IPBlocked'],
      required: true,
    },
    userEmail: {
      type: String,
      default: '',
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SecurityLog', securityLogSchema);
