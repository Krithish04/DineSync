const mongoose = require('mongoose');

const { Schema } = mongoose;

const SESSION_STATUSES = Object.freeze({
  ACTIVE: 'active',
  SETTLED: 'settled',
  RELEASED: 'released',
});

const tableSessionSchema = new Schema(
  {
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
    },
    table: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    hostName: {
      type: String,
      required: [true, 'Host name is required'],
      trim: true,
    },
    hostPhone: {
      type: String,
      required: [true, 'Host phone number is required'],
      trim: true,
    },
    hostToken: {
      type: String,
      required: [true, 'Host token is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUSES),
      default: SESSION_STATUSES.ACTIVE,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Compound indexes for quick active session lookups
tableSessionSchema.index({ table: 1, status: 1 });
tableSessionSchema.index({ restaurant: 1, table: 1, status: 1 });

const TableSessionModel = mongoose.model('TableSession', tableSessionSchema);
TableSessionModel.SESSION_STATUSES = SESSION_STATUSES;

module.exports = TableSessionModel;
