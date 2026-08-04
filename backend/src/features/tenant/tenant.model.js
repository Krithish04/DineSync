const mongoose = require('mongoose');
const slugify = require('slugify');
const { dayScheduleSchema, buildDefaultSchedule, WEEK_DAYS } = require('../../utils/schedule.util');

const { Schema } = mongoose;

// Standard 15-character Indian GSTIN format, e.g. 22AAAAA0000A1Z5
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const socialLinksSchema = new Schema(
  {
    facebook: { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    twitter: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const settingsSchema = new Schema(
  {
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
    },
    timezone: {
      type: String,
      trim: true,
      default: 'Asia/Kolkata',
    },
    orderPrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ORD',
      maxlength: [8, 'Order prefix cannot exceed 8 characters'],
    },
    allowOnlineOrders: {
      type: Boolean,
      default: true,
    },
    allowTableReservations: {
      type: Boolean,
      default: true,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative'],
    },
    serviceChargePercent: {
      type: Number,
      default: 0,
      min: [0, 'Service charge cannot be negative'],
      max: [100, 'Service charge cannot exceed 100%'],
    },
    taxEnabled: {
      type: Boolean,
      default: true,
    },
    staffCanEditMenu: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const gstSchema = new Schema(
  {
    gstRegistered: {
      type: Boolean,
      default: false,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      validate: {
        validator: function validateGstin(value) {
          if (!this.gstRegistered) return true;
          return !!value && GSTIN_REGEX.test(value);
        },
        message: 'A valid 15-character GSTIN is required when GST registered is enabled.',
      },
    },
    legalBusinessName: {
      type: String,
      trim: true,
      default: '',
    },
    placeOfSupply: {
      type: String,
      trim: true,
      default: '',
    },
    gstCertificateUrl: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const restaurantSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      minlength: [2, 'Restaurant name must be at least 2 characters'],
      maxlength: [150, 'Restaurant name cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // --- Profile ---
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
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
    website: {
      type: String,
      trim: true,
      default: '',
    },
    cuisine: {
      type: [String],
      default: [],
    },
    logoUrl: {
      type: String,
      default: null,
    },
    coverImageUrl: {
      type: String,
      default: null,
    },
    socialLinks: {
      type: socialLinksSchema,
      default: () => ({}),
    },

    // --- Settings ---
    settings: {
      type: settingsSchema,
      default: () => ({}),
    },

    // --- GST ---
    gst: {
      type: gstSchema,
      default: () => ({}),
    },

    // --- Opening hours ---
    openingHours: {
      type: [dayScheduleSchema],
      default: buildDefaultSchedule,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
  },
  { timestamps: true }
);

restaurantSchema.pre('validate', async function generateSlug(next) {
  if (!this.isModified('name') && this.slug) return next();

  const baseSlug = slugify(this.name, { lower: true, strict: true });
  let candidate = baseSlug;
  let counter = 1;

  const RestaurantModel = this.constructor;
  // Ensure uniqueness by appending a numeric suffix on collision.
  while (
    // eslint-disable-next-line no-await-in-loop
    await RestaurantModel.exists({ slug: candidate, _id: { $ne: this._id } })
  ) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  this.slug = candidate;
  next();
});

const RestaurantModel = mongoose.model('Restaurant', restaurantSchema);
RestaurantModel.WEEK_DAYS = WEEK_DAYS;
RestaurantModel.buildDefaultOpeningHours = buildDefaultSchedule;

module.exports = RestaurantModel;
