const mongoose = require('mongoose');

const { Schema } = mongoose;

const managerBranchSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Ensures a manager cannot be assigned to the same branch twice
managerBranchSchema.index({ manager: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model('ManagerBranch', managerBranchSchema);
