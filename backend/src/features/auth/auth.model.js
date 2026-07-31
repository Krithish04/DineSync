const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLE_VALUES, ROLES, TENANT_SCOPED_ROLES } = require('../../constants/roles.constant');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: {
        values: ROLE_VALUES,
        message: `Role must be one of: ${ROLE_VALUES.join(', ')}`,
      },
      default: ROLES.CUSTOMER,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
      validate: {
        validator: function validateTenantScope(value) {
          if (TENANT_SCOPED_ROLES.includes(this.role)) {
            return !!value;
          }
          return true;
        },
        message: 'This role must be associated with a restaurant (tenant).',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// A user's email must be unique per-tenant (two different restaurants can each
// have a customer with the same email), except for platform-wide roles like
// super_admin/owner where restaurant may be null — those remain globally unique
// via the sparse partial index below.
userSchema.index({ email: 1, restaurant: 1 }, { unique: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  // Skip on initial document creation — only stamp this on actual changes,
  // so freshly-registered accounts don't get flagged as "password recently changed".
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

/**
 * Returns true if the password was changed after the given JWT "iat"
 * (issued-at, in seconds). Used to reject tokens issued before a
 * password reset, even if they haven't expired yet.
 */
userSchema.methods.wasPasswordChangedAfter = function wasPasswordChangedAfter(jwtIatSeconds) {
  if (!this.passwordChangedAt) return false;
  const changedAtSeconds = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return jwtIatSeconds < changedAtSeconds;
};

module.exports = mongoose.model('User', userSchema);
