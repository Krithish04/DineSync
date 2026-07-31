const mongoose = require('mongoose');

const { Schema } = mongoose;

const recipeIngredientSchema = new Schema(
  {
    ingredient: {
      type: Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, 'Ingredient reference is required'],
    },
    quantityNeeded: {
      type: Number,
      required: [true, 'Quantity ratio is required'],
      min: [0.0001, 'Quantity must be positive'],
    },
  },
  { _id: false }
);

const recipeSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Menu Item reference is required'],
      unique: true,
      index: true,
    },
    ingredients: {
      type: [recipeIngredientSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Recipe must map at least 1 ingredient.',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipe', recipeSchema);
