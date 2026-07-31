const mongoose = require('mongoose');
const User = require('./auth.model');
const Restaurant = require('../tenant/tenant.model');
const otpService = require('./otp.service');
const { OTP_PURPOSES } = require('./otp.model');
const ApiError = require('../../utils/ApiError');
const { signToken } = require('../../utils/jwt.util');
const { ROLES } = require('../../constants/roles.constant');

/**
 * Resolves a restaurant by slug when provided. Throws if the slug is
 * given but no active restaurant matches it.
 */
const resolveRestaurantBySlug = async (restaurantSlug) => {
  if (!restaurantSlug) return null;
  const restaurant = await Restaurant.findOne({ slug: restaurantSlug, isActive: true });
  if (!restaurant) {
    throw ApiError.notFound(`No active restaurant found for tenant "${restaurantSlug}"`);
  }
  return restaurant;
};

/**
 * Registers a brand-new restaurant tenant together with its owner user.
 * The owner account starts unverified; an OTP is emailed immediately and
 * must be confirmed via verifyEmail before the account can log in.
 */
const registerRestaurant = async ({ restaurantName, ownerName, email, password, phone, address }) => {
  const session = await mongoose.startSession();
  try {
    let createdUser;
    let createdRestaurant;

    await session.withTransaction(async () => {
      const [restaurant] = await Restaurant.create(
        [{ name: restaurantName, address, phone }],
        { session }
      );

      const existingOwner = await User.findOne({ email, restaurant: restaurant._id }).session(
        session
      );
      if (existingOwner) {
        throw ApiError.conflict('A user with this email already exists for this restaurant.');
      }

      const [owner] = await User.create(
        [
          {
            name: ownerName,
            email,
            password,
            phone,
            role: ROLES.OWNER,
            restaurant: restaurant._id,
            isEmailVerified: false,
          },
        ],
        { session }
      );

      restaurant.owner = owner._id;
      await restaurant.save({ session });

      createdUser = owner;
      createdRestaurant = restaurant;
    });

    await otpService.createAndSendOtp({
      email: createdUser.email,
      restaurantId: createdRestaurant._id,
      purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
      skipCooldown: true,
    });

    return {
      user: createdUser.toSafeObject(),
      restaurant: createdRestaurant,
      requiresVerification: true,
    };
  } finally {
    session.endSession();
  }
};

/**
 * Registers a staff member or customer under an existing restaurant tenant.
 * Also starts unverified and requires OTP confirmation before login.
 */
const registerUser = async ({ name, email, password, phone, role, restaurantSlug }) => {
  const restaurant = await resolveRestaurantBySlug(restaurantSlug);

  const existingUser = await User.findOne({ email, restaurant: restaurant._id });
  if (existingUser) {
    throw ApiError.conflict('A user with this email already exists for this restaurant.');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || ROLES.CUSTOMER,
    restaurant: restaurant._id,
    isEmailVerified: false,
  });

  await otpService.createAndSendOtp({
    email: user.email,
    restaurantId: restaurant._id,
    purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    skipCooldown: true,
  });

  return { user: user.toSafeObject(), restaurant, requiresVerification: true };
};

/**
 * Confirms a registration OTP, marks the account verified, and immediately
 * issues a JWT (auto-login after successful verification).
 */
const verifyEmail = async ({ email, restaurantSlug, otp }) => {
  const restaurant = await resolveRestaurantBySlug(restaurantSlug);

  await otpService.verifyOtp({
    email,
    restaurantId: restaurant ? restaurant._id : null,
    purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    code: otp,
  });

  const query = { email, restaurant: restaurant ? restaurant._id : null };
  const user = await User.findOne(query);
  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
    restaurantId: user.restaurant ? user.restaurant.toString() : null,
  });

  return { user: user.toSafeObject(), restaurant, token };
};

/**
 * Resends an OTP for either email verification or password reset,
 * subject to the service-level cooldown to prevent abuse.
 */
const resendOtp = async ({ email, restaurantSlug, purpose }) => {
  const restaurant = await resolveRestaurantBySlug(restaurantSlug);

  if (purpose === OTP_PURPOSES.EMAIL_VERIFICATION) {
    const user = await User.findOne({ email, restaurant: restaurant ? restaurant._id : null });
    if (user?.isEmailVerified) {
      throw ApiError.badRequest('This account is already verified. Please log in.');
    }
  }

  const { expiresAt } = await otpService.createAndSendOtp({
    email,
    restaurantId: restaurant ? restaurant._id : null,
    purpose,
  });

  return { expiresAt };
};

/**
 * Authenticates a user by email/password, optionally scoped to a restaurant tenant.
 * Blocks login for unverified accounts.
 */
const login = async ({ email, password, restaurantSlug }) => {
  const restaurant = await resolveRestaurantBySlug(restaurantSlug);
  const query = { email, restaurant: restaurant ? restaurant._id : null };

  const user = await User.findOne(query).select('+password');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  if (!user.isEmailVerified) {
    throw ApiError.forbidden('Please verify your email before logging in.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
    restaurantId: user.restaurant ? user.restaurant.toString() : null,
  });

  return { user: user.toSafeObject(), restaurant, token };
};

/**
 * Starts the forgot-password flow. Always resolves successfully regardless
 * of whether the email exists, to avoid leaking account existence — but
 * only actually sends an OTP when a matching, active user is found.
 */
const forgotPassword = async ({ email, restaurantSlug }) => {
  const restaurant = await resolveRestaurantBySlug(restaurantSlug);
  const user = await User.findOne({ email, restaurant: restaurant ? restaurant._id : null });

  if (user && user.isActive) {
    await otpService.createAndSendOtp({
      email,
      restaurantId: restaurant ? restaurant._id : null,
      purpose: OTP_PURPOSES.PASSWORD_RESET,
    });
  }

  return {
    message: 'If an account exists for this email, a password reset code has been sent.',
  };
};

/**
 * Completes the forgot-password flow: verifies the OTP and sets the new
 * password. Saving the document (with a modified password) automatically
 * stamps passwordChangedAt via the model's pre-save hook, invalidating any
 * previously issued JWTs.
 */
const resetPassword = async ({ email, restaurantSlug, otp, newPassword }) => {
  const restaurant = await resolveRestaurantBySlug(restaurantSlug);

  await otpService.verifyOtp({
    email,
    restaurantId: restaurant ? restaurant._id : null,
    purpose: OTP_PURPOSES.PASSWORD_RESET,
    code: otp,
  });

  const user = await User.findOne({
    email,
    restaurant: restaurant ? restaurant._id : null,
  }).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  user.password = newPassword;
  await user.save();

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
    restaurantId: user.restaurant ? user.restaurant.toString() : null,
  });

  return { user: user.toSafeObject(), restaurant, token };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).populate('restaurant', 'name slug');
  if (!user) {
    throw ApiError.notFound('User not found.');
  }
  return user;
};

module.exports = {
  registerRestaurant,
  registerUser,
  verifyEmail,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
