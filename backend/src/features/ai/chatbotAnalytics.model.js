const mongoose = require('mongoose');

const { Schema } = mongoose;

const chatbotAnalyticsSchema = new Schema(
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
    },
    sessionId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'conversation_start',
        'query',
        'recommendation_click',
        'add_to_cart',
        'order_created',
        'failed_query',
      ],
      index: true,
    },
    intent: {
      type: String,
      trim: true,
      default: 'general_query',
    },
    moodFilter: {
      type: String,
      trim: true,
      default: null,
    },
    allergyFilters: {
      type: [String],
      default: [],
    },
    dietaryFilters: {
      type: [String],
      default: [],
    },
    budgetRequested: {
      type: Number,
      default: null,
    },
    recommendedItem: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      default: null,
    },
    queryText: {
      type: String,
      trim: true,
      default: '',
    },
    aiResponseText: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatbotAnalytics', chatbotAnalyticsSchema);
