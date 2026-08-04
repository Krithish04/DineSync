const mongoose = require('mongoose');

const { Schema } = mongoose;

const ingredientSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    ingredientName: {
      type: String,
      required: [true, 'Ingredient name is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required (e.g. kg, L, pcs)'],
      trim: true,
    },
    currentStock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    minimumStock: {
      type: Number,
      min: [0, 'Minimum stock cannot be negative'],
      default: 0,
    },
    maximumStock: {
      type: Number,
      min: [0, 'Maximum stock cannot be negative'],
      default: 0,
    },
    reorderLevel: {
      type: Number,
      min: [0, 'Reorder level cannot be negative'],
      default: 0,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: [0, 'Purchase price cannot be negative'],
      default: 0,
    },
    sellingPrice: {
      type: Number,
      min: [0, 'Selling price cannot be negative'],
      default: 0,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

// Ingredient name must be unique per restaurant
ingredientSchema.index({ restaurant: 1, ingredientName: 1 }, { unique: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);
