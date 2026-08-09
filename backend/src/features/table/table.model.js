const mongoose = require('mongoose');

const { Schema } = mongoose;

const TABLE_TYPES = Object.freeze({
  INDOOR: 'Indoor',
  OUTDOOR: 'Outdoor',
  VIP: 'VIP',
  PRIVATE: 'Private',
});

const TABLE_STATUSES = Object.freeze({
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  CLEANING: 'Cleaning',
  MAINTENANCE: 'Maintenance',
  INACTIVE: 'Inactive',
});

const tableSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    tableNumber: {
      type: String,
      required: [true, 'Table number is required'],
      trim: true,
    },
    tableName: {
      type: String,
      trim: true,
      default: '',
    },
    capacity: {
      type: Number,
      required: [true, 'Table capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    type: {
      type: String,
      enum: Object.values(TABLE_TYPES),
      default: TABLE_TYPES.INDOOR,
    },
    status: {
      type: String,
      enum: Object.values(TABLE_STATUSES),
      default: TABLE_STATUSES.AVAILABLE,
    },
    qrCode: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentHostName: {
      type: String,
      trim: true,
      default: '',
    },
    currentHostPhone: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    mergedInto: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
      index: true,
    },
    mergedTables: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Table',
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Unique table number within active (non-deleted) tables of a specific restaurant
tableSchema.index(
  { restaurant: 1, tableNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

const TableModel = mongoose.model('Table', tableSchema);
TableModel.TABLE_TYPES = TABLE_TYPES;
TableModel.TABLE_STATUSES = TABLE_STATUSES;

module.exports = TableModel;
