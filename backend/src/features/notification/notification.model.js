const mongoose = require('mongoose');

const { Schema } = mongoose;

const CATEGORIES = Object.freeze(['Order', 'Reservation', 'Inventory', 'AI', 'Employee', 'Billing', 'Customer']);
const PRIORITIES = Object.freeze(['Critical', 'Warning', 'Info']);
const CHANNELS = Object.freeze(['In-App', 'Email', 'SMS', 'WhatsApp', 'Push']);

const notificationSchema = new Schema(
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
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'Order',
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'Info',
    },
    channel: {
      type: String,
      enum: CHANNELS,
      default: 'In-App',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const NotificationModel = mongoose.model('Notification', notificationSchema);
NotificationModel.CATEGORIES = CATEGORIES;
NotificationModel.PRIORITIES = PRIORITIES;
NotificationModel.CHANNELS = CHANNELS;

module.exports = NotificationModel;
