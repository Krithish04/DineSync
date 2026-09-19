const mongoose = require('mongoose');

const { Schema } = mongoose;

const authLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      index: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    assignedBranches: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
      },
    ],
    eventType: {
      type: String,
      enum: ['login', 'logout'],
      required: true,
      index: true,
    },
    loginAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    logoutAt: {
      type: Date,
      default: null,
    },
    sessionDurationSeconds: {
      type: Number,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

authLogSchema.index({ restaurant: 1, role: 1, createdAt: -1 });
authLogSchema.index({ restaurant: 1, branch: 1, role: 1, createdAt: -1 });

module.exports = mongoose.model('AuthLog', authLogSchema);
