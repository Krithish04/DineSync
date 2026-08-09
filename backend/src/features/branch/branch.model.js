const mongoose = require('mongoose');
const slugify = require('slugify');
const { addressSchema } = require('../../utils/address.util');
const { dayScheduleSchema, buildDefaultSchedule } = require('../../utils/schedule.util');

const { Schema } = mongoose;

const BRANCH_STATUSES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

const contactSchema = new Schema(
  {
    phone: {
      type: String,
      trim: true,
      required: [true, 'Branch phone number is required'],
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
  },
  { _id: false }
);

const branchSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      minlength: [2, 'Branch name must be at least 2 characters'],
      maxlength: [150, 'Branch name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    address: {
      type: addressSchema,
      required: [true, 'Branch address is required'],
    },
    contact: {
      type: contactSchema,
      required: [true, 'Branch contact details are required'],
    },
    operatingHours: {
      type: [dayScheduleSchema],
      default: () => buildDefaultSchedule(),
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(BRANCH_STATUSES),
      default: BRANCH_STATUSES.ACTIVE,
    },
  },
  { timestamps: true }
);

// A branch code must be unique within its restaurant (not globally), and the
// same applies to the branch name to avoid duplicate/ambiguous locations.
branchSchema.index({ restaurant: 1, code: 1 }, { unique: true });
branchSchema.index({ restaurant: 1, name: 1 }, { unique: true });

/**
 * Auto-generates a short, restaurant-unique branch code from the name
 * (e.g. "Koramangala Outlet" -> "KORAMANGALA-OUTLET"), appending a numeric
 * suffix on collision — mirrors the slug-generation pattern used on the
 * Restaurant model for consistency.
 */
branchSchema.pre('validate', async function generateCode(next) {
  if (this.code || !this.isModified('name')) return next();

  const base = slugify(this.name, { lower: true, strict: true, replacement: '-' }).toUpperCase();
  let candidate = base;
  let counter = 1;

  const BranchModel = this.constructor;
  while (
    // eslint-disable-next-line no-await-in-loop
    await BranchModel.exists({
      restaurant: this.restaurant,
      code: candidate,
      _id: { $ne: this._id },
    })
  ) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  this.code = candidate;
  next();
});

const BranchModel = mongoose.model('Branch', branchSchema);
BranchModel.BRANCH_STATUSES = BRANCH_STATUSES;

module.exports = BranchModel;
