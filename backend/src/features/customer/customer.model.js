const mongoose = require('mongoose');

const { Schema } = mongoose;

const MEMBERSHIP_TIERS = Object.freeze(['Bronze', 'Silver', 'Gold', 'Platinum']);
const DIETARY_PREFERENCES = Object.freeze(['Veg', 'Non Veg', 'Vegan', 'Jain']);

const customerSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Customer full name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    preferredBranch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    dietaryPreference: {
      type: String,
      enum: DIETARY_PREFERENCES,
      default: 'Non Veg',
    },
    favoriteItems: [
      {
        type: Schema.Types.ObjectId,
        ref: 'MenuItem',
      },
    ],
    visitCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    membershipTier: {
      type: String,
      enum: MEMBERSHIP_TIERS,
      default: 'Bronze',
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    marketingConsent: {
      type: Boolean,
      default: false,
    },
    notes: {
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

// Ensure phone is unique per restaurant
customerSchema.index({ restaurant: 1, phoneNumber: 1 }, { unique: true });

// Pre-validate hook to generate customerId and referralCode
customerSchema.pre('validate', async function preValidateCustomer(next) {
  const CustomerModel = this.constructor;

  // Generate unique customer ID (e.g. CUST-20260727-4829)
  if (!this.customerId) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let isIdUnique = false;
    let candidateId = '';

    while (!isIdUnique) {
      const random = Math.floor(1000 + Math.random() * 9000);
      candidateId = `CUST-${dateStr}-${random}`;
      // eslint-disable-next-line no-await-in-loop
      const exists = await CustomerModel.exists({ customerId: candidateId });
      if (!exists) isIdUnique = true;
    }
    this.customerId = candidateId;
  }

  // Generate unique referralCode (e.g. AARAV1234)
  if (!this.referralCode) {
    let isCodeUnique = false;
    let candidateCode = '';
    const cleanName = this.fullName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);

    while (!isCodeUnique) {
      const random = Math.floor(1000 + Math.random() * 9000);
      candidateCode = `${cleanName || 'CUST'}${random}`;
      // eslint-disable-next-line no-await-in-loop
      const exists = await CustomerModel.exists({ referralCode: candidateCode });
      if (!exists) isCodeUnique = true;
    }
    this.referralCode = candidateCode;
  }

  next();
});

const CustomerModel = mongoose.model('Customer', customerSchema);
CustomerModel.MEMBERSHIP_TIERS = MEMBERSHIP_TIERS;
CustomerModel.DIETARY_PREFERENCES = DIETARY_PREFERENCES;

module.exports = CustomerModel;
