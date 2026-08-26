const mongoose = require('mongoose');

const { Schema } = mongoose;

const modifierOptionSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Modifier option name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Modifier option price is required'],
      min: [0, 'Modifier option price cannot be negative'],
      default: 0,
    },
  },
  { _id: true }
);

const modifierGroupSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Modifier group name is required'],
      trim: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    multiSelect: {
      type: Boolean,
      default: false,
    },
    minSelection: {
      type: Number,
      default: 0,
      min: [0, 'Minimum selection cannot be negative'],
    },
    maxSelection: {
      type: Number,
      default: 1,
      min: [1, 'Maximum selection must be at least 1'],
    },
    options: {
      type: [modifierOptionSchema],
      default: [],
    },
  },
  { _id: true }
);

const menuItemSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: [2, 'Item name must be at least 2 characters'],
      maxlength: [100, 'Item name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    shortDescription: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Short description cannot exceed 150 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Cost price cannot be negative'],
    },
    gst: {
      type: Number,
      default: 0,
      min: [0, 'GST percentage cannot be negative'],
      max: [100, 'GST percentage cannot exceed 100%'],
    },
    preparationTime: {
      type: Number,
      default: 15,
      min: [1, 'Preparation time must be at least 1 minute'],
    },
    kitchenStation: {
      type: String,
      trim: true,
      default: 'Main Kitchen',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be one of: low, medium, high',
      },
      default: 'medium',
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
    dietaryType: {
      type: String,
      required: [true, 'Dietary type is required'],
      enum: {
        values: ['veg', 'non-veg', 'vegan', 'jain'],
        message: 'Dietary type must be one of: veg, non-veg, vegan, jain',
      },
    },
    spiceLevel: {
      type: String,
      default: 'none',
      enum: {
        values: ['none', 'mild', 'medium', 'hot'],
        message: 'Spice level must be one of: none, mild, medium, hot',
      },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    availableBranches: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
    modifierGroups: {
      type: [modifierGroupSchema],
      default: [],
    },
    allergens: {
      type: [String],
      default: [],
    },
    dietaryTags: {
      type: [String],
      default: [],
    },
    ingredientsList: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    popularityScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// A menu item name must be unique within its restaurant (not globally)
menuItemSchema.index({ restaurant: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
