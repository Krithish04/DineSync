const mongoose = require('mongoose');

const { Schema } = mongoose;

const ORDER_TYPES = Object.freeze(['Dine-In', 'Takeaway', 'Delivery', 'QR Order']);

const ORDER_STATUSES = Object.freeze({
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
});

const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'Pending',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
});

const KITCHEN_STATUSES = Object.freeze(['Pending', 'Preparing', 'Ready', 'Served']);

const modifierSelectionSchema = new Schema(
  {
    groupName: {
      type: String,
      required: true,
      trim: true,
    },
    optionName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Menu Item ID is required'],
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    modifiers: {
      type: [modifierSelectionSchema],
      default: [],
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    kitchenStatus: {
      type: String,
      enum: KITCHEN_STATUSES,
      default: 'Pending',
    },
  },
  { _id: true }
);

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    table: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
      index: true,
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: 'TableSession',
      default: null,
      index: true,
    },
    reservation: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    orderType: {
      type: String,
      enum: ORDER_TYPES,
      required: [true, 'Order type is required'],
    },
    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      default: ORDER_STATUSES.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.PENDING,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must contain at least 1 item.',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    tax: {
      type: Number,
      min: 0,
      default: 0,
    },
    serviceCharge: {
      type: Number,
      min: 0,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    loyaltyAccrued: {
      type: Boolean,
      default: false,
      index: true,
    },
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

// Compound Indexes for fast query execution
orderSchema.index({ restaurant: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, orderStatus: 1 });

// Auto-generate order number on document validation if not preset
orderSchema.pre('validate', async function generateOrderNumber(next) {
  if (this.orderNumber) return next();

  // e.g. ORD-20260727-8394
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let isUnique = false;
  let candidate = '';

  const OrderModel = this.constructor;

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    candidate = `ORD-${dateStr}-${random}`;

    // eslint-disable-next-line no-await-in-loop
    const exists = await OrderModel.exists({ orderNumber: candidate });
    if (!exists) {
      isUnique = true;
    }
  }

  this.orderNumber = candidate;
  next();
});

const OrderModel = mongoose.model('Order', orderSchema);
OrderModel.ORDER_TYPES = ORDER_TYPES;
OrderModel.ORDER_STATUSES = ORDER_STATUSES;
OrderModel.PAYMENT_STATUSES = PAYMENT_STATUSES;
OrderModel.KITCHEN_STATUSES = KITCHEN_STATUSES;

module.exports = OrderModel;
