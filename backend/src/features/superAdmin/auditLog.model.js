const mongoose = require('mongoose');

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userEmail: {
      type: String,
      trim: true,
      default: 'system',
    },
    userRole: {
      type: String,
      trim: true,
      default: 'system',
    },
    action: {
      type: String,
      required: true,
      trim: true, // e.g. 'LOGIN', 'TENANT_SUSPEND', 'PERMISSION_CHANGE', 'DATA_EXPORT'
    },
    resource: {
      type: String,
      trim: true,
      default: '',
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '127.0.0.1',
    },
    status: {
      type: String,
      enum: ['Success', 'Failed'],
      default: 'Success',
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ restaurant: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
