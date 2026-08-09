const mongoose = require('mongoose');

const { Schema } = mongoose;

const OCCASIONS = Object.freeze(['Birthday', 'Anniversary', 'Business', 'Family', 'Other']);

const RESERVATION_STATUSES = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SEATED: 'Seated',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
});

const BOOKING_SOURCES = Object.freeze(['Walk In', 'Phone', 'Website', 'QR']);

const reservationSchema = new Schema(
  {
    reservationNumber: {
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
      required: [true, 'Customer phone number is required'],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    numberOfGuests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'Must have at least 1 guest'],
    },
    reservationDate: {
      type: String, // Stored as YYYY-MM-DD
      required: [true, 'Reservation date is required'],
      index: true,
    },
    reservationTime: {
      type: String, // Stored as HH:mm
      required: [true, 'Reservation time is required'],
    },
    duration: {
      type: Number, // Stored in minutes
      required: [true, 'Duration is required'],
      default: 90,
      min: [15, 'Minimum duration is 15 minutes'],
    },
    occasion: {
      type: String,
      enum: OCCASIONS,
      default: 'Other',
    },
    specialRequest: {
      type: String,
      trim: true,
      default: '',
    },
    reservationStatus: {
      type: String,
      enum: Object.values(RESERVATION_STATUSES),
      default: RESERVATION_STATUSES.PENDING,
      index: true,
    },
    bookingSource: {
      type: String,
      enum: BOOKING_SOURCES,
      default: 'Phone',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
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
reservationSchema.index({ restaurant: 1, reservationDate: 1 });
reservationSchema.index({ restaurant: 1, reservationStatus: 1 });

// Auto-generate reservation number on document validation if not preset
reservationSchema.pre('validate', async function generateReservationNumber(next) {
  if (this.reservationNumber) return next();

  // e.g. RES-20260727-4829
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let isUnique = false;
  let candidate = '';
  
  const ReservationModel = this.constructor;

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000);
    candidate = `RES-${dateStr}-${random}`;
    
    // eslint-disable-next-line no-await-in-loop
    const exists = await ReservationModel.exists({ reservationNumber: candidate });
    if (!exists) {
      isUnique = true;
    }
  }

  this.reservationNumber = candidate;
  next();
});

const ReservationModel = mongoose.model('Reservation', reservationSchema);
ReservationModel.OCCASIONS = OCCASIONS;
ReservationModel.RESERVATION_STATUSES = RESERVATION_STATUSES;
ReservationModel.BOOKING_SOURCES = BOOKING_SOURCES;

module.exports = ReservationModel;
