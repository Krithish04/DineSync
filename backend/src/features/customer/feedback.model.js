const mongoose = require('mongoose');

const { Schema } = mongoose;

const feedbackSchema = new Schema(
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
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    customerName: {
      type: String,
      trim: true,
      default: 'Guest Diner',
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      trim: true,
      default: '',
    },
    foodRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    serviceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    staffRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    sentiment: {
      type: String,
      enum: ['Positive', 'Neutral', 'Negative'],
      default: 'Positive',
    },
    sentimentScore: {
      type: Number,
      default: 8.5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
