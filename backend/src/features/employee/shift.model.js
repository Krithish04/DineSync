const mongoose = require('mongoose');

const { Schema } = mongoose;

const shiftSchema = new Schema(
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
      required: true,
      index: true,
    },
    shiftName: {
      type: String,
      required: [true, 'Shift name is required'],
      trim: true,
    },
    startTime: {
      type: String, // e.g. "09:00"
      required: [true, 'Shift start time is required'],
      trim: true,
    },
    endTime: {
      type: String, // e.g. "17:00"
      required: [true, 'Shift end time is required'],
      trim: true,
    },
    breakDuration: {
      type: Number, // in minutes
      default: 30,
    },
    assignedEmployees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shift', shiftSchema);
