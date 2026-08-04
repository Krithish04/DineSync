const mongoose = require('mongoose');

const { Schema } = mongoose;

const ATTENDANCE_STATUSES = Object.freeze(['Present', 'Absent', 'On Leave', 'Late']);

const attendanceSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    date: {
      type: String, // format YYYY-MM-DD
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    breaks: [
      {
        start: { type: Date, required: true },
        end: { type: Date, default: null },
      },
    ],
    workingHours: {
      type: Number,
      default: 0, // calculated in hours
    },
    overtime: {
      type: Number,
      default: 0, // calculated in hours (e.g. > 8 hours)
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: 'Present',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Ensure index exists to prevent double clock-in per employee per date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const AttendanceModel = mongoose.model('Attendance', attendanceSchema);
AttendanceModel.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;

module.exports = AttendanceModel;
