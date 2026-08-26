const mongoose = require('mongoose');

const { Schema } = mongoose;

const chatbotConfigSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
      index: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    greetingMessage: {
      type: String,
      trim: true,
      default: "Hello! I'm DineSync AI Assistant 👨‍🍳 Your personal food consultant. What are you in the mood for today?",
    },
    tone: {
      type: String,
      enum: ['friendly', 'formal', 'enthusiastic'],
      default: 'friendly',
    },
    supportedAllergies: {
      type: [String],
      default: [
        'peanuts',
        'tree_nuts',
        'milk',
        'dairy',
        'eggs',
        'soy',
        'wheat',
        'gluten',
        'fish',
        'shellfish',
        'sesame',
      ],
    },
    supportedDietaryTags: {
      type: [String],
      default: [
        'vegetarian',
        'vegan',
        'jain',
        'gluten_free',
        'dairy_free',
        'high_protein',
        'low_calorie',
        'low_sugar',
        'spicy',
        'non_spicy',
      ],
    },
    enableMoodRecommendations: {
      type: Boolean,
      default: true,
    },
    enableBudgetFilter: {
      type: Boolean,
      default: true,
    },
    enableNoveltySuggestions: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatbotConfig', chatbotConfigSchema);
