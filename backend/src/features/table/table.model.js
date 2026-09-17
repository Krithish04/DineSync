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

const TABLE_SHAPES = Object.freeze({
  SQUARE: 'Square',
  ROUND: 'Round',
  RECTANGLE: 'Rectangle',
  BOOTH: 'Booth',
});

const TABLE_ZONES = Object.freeze({
  MAIN_HALL: 'Main Hall',
  PATIO_OUTDOOR: 'Patio/Outdoor',
  VIP_LOUNGE: 'VIP Lounge',
  PRIVATE_DINING: 'Private Dining',
  BAR_AREA: 'Bar Area',
});

const tableSchema = new Schema(
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
    // Architectural Floor Plan Layout properties
    positionX: {
      type: Number,
      default: 100,
    },
    positionY: {
      type: Number,
      default: 100,
    },
    shape: {
      type: String,
      enum: Object.values(TABLE_SHAPES),
      default: TABLE_SHAPES.SQUARE,
    },
    zone: {
      type: String,
      default: TABLE_ZONES.MAIN_HALL,
    },
    isAccessible: {
      type: Boolean,
      default: false,
    },
    rotation: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 90,
    },
    height: {
      type: Number,
      default: 90,
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
TableModel.TABLE_SHAPES = TABLE_SHAPES;
TableModel.TABLE_ZONES = TABLE_ZONES;

module.exports = TableModel;
