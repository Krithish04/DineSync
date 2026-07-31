const mongoose = require('mongoose');

const { Schema } = mongoose;

const notificationTemplateSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: ['Email', 'SMS', 'WhatsApp', 'Push'],
      required: true,
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    bodyTemplate: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
