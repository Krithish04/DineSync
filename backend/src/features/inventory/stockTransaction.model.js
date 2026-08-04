const mongoose = require('mongoose');

const { Schema } = mongoose;

const TRANSACTION_TYPES = Object.freeze(['Purchase', 'Consumption', 'Adjustment', 'Waste']);

const stockTransactionSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    ingredient: {
      type: Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, 'Ingredient reference is required'],
      index: true,
    },
    transactionType: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const StockTransactionModel = mongoose.model('StockTransaction', stockTransactionSchema);
StockTransactionModel.TRANSACTION_TYPES = TRANSACTION_TYPES;

module.exports = StockTransactionModel;
