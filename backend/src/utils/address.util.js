const { Schema } = require('mongoose');

const addressSchema = new Schema(
  {
    line1: {
      type: String,
      trim: true,
      required: [true, 'Address line 1 is required'],
    },
    line2: {
      type: String,
      trim: true,
      default: '',
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      required: [true, 'City is required'],
    },
    state: {
      type: String,
      trim: true,
      required: [true, 'State is required'],
    },
    postalCode: {
      type: String,
      trim: true,
      required: [true, 'Postal code is required'],
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
  },
  { _id: false }
);

module.exports = { addressSchema };
