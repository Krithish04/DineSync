const mongoose = require('mongoose');

const { Schema } = mongoose;

const DAYS_OF_WEEK = Object.freeze([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]);

const recurringReservationSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    dayOfWeek: {
      type: String,
      enum: DAYS_OF_WEEK,
      required: [true, 'Day of week is required'],
    },
    preferredTime: {
      type: String, // HH:mm
      required: [true, 'Preferred time is required'],
    },
    numberOfGuests: {
      type: Number,
      default: 2,
      min: 1,
    },
    table: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
    },
    specialRequests: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastAutoBookedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

recurringReservationSchema.index({ restaurant: 1, dayOfWeek: 1, isActive: 1 });

const RecurringReservation = mongoose.model('RecurringReservation', recurringReservationSchema);
RecurringReservation.DAYS_OF_WEEK = DAYS_OF_WEEK;

module.exports = RecurringReservation;
