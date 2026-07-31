const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATIONS = Object.freeze(['Main Kitchen', 'Tandoor', 'Bar', 'Dessert', 'Beverage']);
const TICKET_STATUSES = Object.freeze({
  PENDING: 'Pending',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  DELAYED: 'Delayed',
});

const kitchenTicketItemSchema = new Schema(
  {
    orderItemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    modifiers: {
      type: Array,
      default: [],
    },
    specialInstructions: {
      type: String,
      default: '',
    },
    kitchenStatus: {
      type: String,
      enum: ['Pending', 'Preparing', 'Ready', 'Served', 'Delayed'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    preparationTime: {
      type: Number,
      default: 15, // in minutes
    },
    preparingAt: {
      type: Date,
      default: null,
    },
    readyAt: {
      type: Date,
      default: null,
    },
    servedAt: {
      type: Date,
      default: null,
    },
    delayedAt: {
      type: Date,
      default: null,
    },
    actualDuration: {
      type: Number,
      default: 0, // in minutes
    },
  },
  { _id: true }
);

const kitchenTicketSchema = new Schema(
  {
    ticketNumber: {
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
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    table: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
    },
    orderType: {
      type: String,
      required: true,
    },
    station: {
      type: String,
      enum: STATIONS,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TICKET_STATUSES),
      default: TICKET_STATUSES.PENDING,
      index: true,
    },
    items: {
      type: [kitchenTicketItemSchema],
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Compound Index for KDS query acceleration
kitchenTicketSchema.index({ restaurant: 1, status: 1 });

const KitchenTicketModel = mongoose.model('KitchenTicket', kitchenTicketSchema);
KitchenTicketModel.STATIONS = STATIONS;
KitchenTicketModel.TICKET_STATUSES = TICKET_STATUSES;

module.exports = KitchenTicketModel;
