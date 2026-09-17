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

    const { expiresAt, devOtp } = await otpService.createAndSendOtp({
      email: createdUser.email,
      restaurantId: createdRestaurant._id,
      purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
      skipCooldown: true,
    });

    return {
      user: createdUser.toSafeObject(),
      restaurant: createdRestaurant,
      requiresVerification: true,
      expiresAt,
      devOtp,
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

  const { expiresAt, devOtp } = await otpService.createAndSendOtp({
    email: user.email,
    restaurantId: restaurant._id,
    purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    skipCooldown: true,
  });

  return { user: user.toSafeObject(), restaurant, requiresVerification: true, expiresAt, devOtp };
};

/**
 * Confirms a registration OTP, marks the account verified, and immediately
 * issues a JWT (auto-login after successful verification).
 */
const verifyEmail = async ({ email, restaurantSlug, otp }) => {
  let restaurant = null;
  if (restaurantSlug) {
    restaurant = await resolveRestaurantBySlug(restaurantSlug);
  }

  const query = restaurant ? { email, restaurant: restaurant._id } : { email };
  const user = await User.findOne(query);
  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  const restaurantId = restaurant ? restaurant._id : user.restaurant || null;

  await otpService.verifyOtp({
    email,
    restaurantId,
    purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    code: otp,
  });

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
    restaurantId: user.restaurant ? user.restaurant.toString() : null,
  });

  return { user: user.toSafeObject(), restaurant: restaurant || user.restaurant, token };
};

/**
 * Resends an OTP for either email verification or password reset,
 * subject to the service-level cooldown to prevent abuse.
 */
const resendOtp = async ({ email, restaurantSlug, purpose }) => {
  let restaurant = null;
  if (restaurantSlug) {
    restaurant = await resolveRestaurantBySlug(restaurantSlug);
  }

  const user = await User.findOne(restaurant ? { email, restaurant: restaurant._id } : { email });

  if (purpose === OTP_PURPOSES.EMAIL_VERIFICATION) {
    if (user?.isEmailVerified) {
      throw ApiError.badRequest('This account is already verified. Please log in.');
    }
  }

  const restaurantId = restaurant ? restaurant._id : user?.restaurant || null;

  const { expiresAt, devOtp } = await otpService.createAndSendOtp({
    email,
    restaurantId,
    purpose,
  });

  return { expiresAt, devOtp };
};

/**
 * Authenticates a user by email/password, optionally scoped to a restaurant tenant.
 * Blocks login for unverified accounts.
 */
const login = async ({ email, password, restaurantSlug }) => {
  const t0 = performance.now();
  let user;
  let restaurant = null;

  if (restaurantSlug) {
    restaurant = await resolveRestaurantBySlug(restaurantSlug);
    user = await User.findOne({ email, restaurant: restaurant ? restaurant._id : null }).select('+password');
  } else {
    user = await User.findOne({ email }).select('+password');
    if (user && user.restaurant) {
      restaurant = await Restaurant.findById(user.restaurant);
    }
  }
  const t1 = performance.now();

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const isMatch = await user.comparePassword(password);
  const t2 = performance.now();
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  if (restaurant && !restaurant.isActive && user.role !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('Your restaurant tenant is pending Super Admin review & approval or has been suspended.');
  }

  if (!user.isEmailVerified) {
    throw ApiError.forbidden('Please verify your email before logging in.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  const t3 = performance.now();

  // Auto clock-in employee on POS/KDS login if staff account
  if (user.restaurant && ['staff', 'chef', 'manager'].includes(user.role)) {
    try {
      const employeeService = require('../employee/employee.service');
      await employeeService.handlePosLoginClockIn(user.restaurant, user._id);
    } catch (autoClockInErr) {
      // Non-blocking fallback
    }
  }
  const t4 = performance.now();

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
    restaurantId: user.restaurant ? user.restaurant.toString() : null,
  });
  const t5 = performance.now();

  // eslint-disable-next-line no-console
  console.log(`[PROFILE login] Total: ${(t5 - t0).toFixed(2)}ms | FindUser: ${(t1 - t0).toFixed(2)}ms | BcryptCompare: ${(t2 - t1).toFixed(2)}ms | SaveUser: ${(t3 - t2).toFixed(2)}ms | AutoClockIn: ${(t4 - t3).toFixed(2)}ms | TokenSign: ${(t5 - t4).toFixed(2)}ms`);

  return { user: user.toSafeObject(), restaurant, token };
};

/**
 * Starts the forgot-password flow. Always resolves successfully regardless
 * of whether the email exists, to avoid leaking account existence — but
 * only actually sends an OTP when a matching, active user is found.
 */
const forgotPassword = async ({ email, restaurantSlug }) => {
  let restaurant = null;
  if (restaurantSlug) {
    restaurant = await resolveRestaurantBySlug(restaurantSlug);
  }
  const user = await User.findOne(restaurant ? { email, restaurant: restaurant._id } : { email });

  let devOtp;
  if (user && user.isActive) {
    const otpRes = await otpService.createAndSendOtp({
      email,
      restaurantId: user.restaurant || (restaurant ? restaurant._id : null),
      purpose: OTP_PURPOSES.PASSWORD_RESET,
    });
    devOtp = otpRes.devOtp;
  }

  return {
    message: 'If an account exists for this email, a password reset code has been sent.',
    devOtp,
  };
};

/**
 * Completes the forgot-password flow: verifies the OTP and sets the new
 * password. Saving the document (with a modified password) automatically
 * stamps passwordChangedAt via the model's pre-save hook, invalidating any
 * previously issued JWTs.
 */
const resetPassword = async ({ email, restaurantSlug, otp, newPassword }) => {
  let restaurant = null;
  if (restaurantSlug) {
    restaurant = await resolveRestaurantBySlug(restaurantSlug);
  }

  const user = await User.findOne(restaurant ? { email, restaurant: restaurant._id } : { email }).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  const restaurantId = restaurant ? restaurant._id : user.restaurant || null;

  await otpService.verifyOtp({
    email,
    restaurantId,
    purpose: OTP_PURPOSES.PASSWORD_RESET,
    code: otp,
  });

  user.password = newPassword;
  await user.save();

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
    restaurantId: user.restaurant ? user.restaurant.toString() : null,
  });

  return { user: user.toSafeObject(), restaurant: restaurant || user.restaurant, token };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).populate('restaurant', 'name slug');
  if (!user) {
    throw ApiError.notFound('User not found.');
  }
  return user;
};

/**
  * Registers a brand-new restaurant tenant via self-serve onboarding.
  * Evaluates concrete flag conditions: Auto-approves if clean, routes to manual review if flagged.
  */
const registerTenant = async ({ restaurantName, ownerName, email, password, phone, address, cuisine, gstin, planCode = 'starter' }) => {
  const subscriptionService = require('../superAdmin/subscription.service');
  const auditService = require('../superAdmin/audit.service');

  // 1. Evaluate auto-flag conditions
  const flaggedReasons = await subscriptionService.evaluateRegistrationFlags({
    email,
    phone,
    restaurantName,
    address,
    gstin,
  });

  const isAutoApproved = flaggedReasons.length === 0;
  const approvalStatus = isAutoApproved ? 'Auto Approved' : 'Pending Review';
  const isActive = isAutoApproved;

  const session = await mongoose.startSession();
  let createdUser;
  let createdRestaurant;

  try {
    await session.withTransaction(async () => {
      const [restaurant] = await Restaurant.create(
        [
          {
            name: restaurantName,
            address: address || '',
            phone: phone || '',
            email: email || '',
            cuisine: cuisine || [],
            isActive,
            approvalStatus,
            flaggedReasons,
            subscriptionPlan: (planCode || 'starter').toLowerCase(),
            gst: {
              gstRegistered: Boolean(gstin),
              gstin: gstin ? String(gstin).trim().toUpperCase() : null,
            },
          },
        ],
        { session }
      );

      const existingUser = await User.findOne({ email }).session(session);
      if (existingUser) {
        throw ApiError.conflict('An account with this email address already exists.');
      }

      const [owner] = await User.create(
        [
          {
            name: ownerName,
            email,
            password,
            phone: phone || '',
            role: ROLES.OWNER,
            restaurant: restaurant._id,
            isEmailVerified: true,
            isActive: true,
          },
        ],
        { session }
      );

      restaurant.owner = owner._id;
      await restaurant.save({ session });

      createdUser = owner;
      createdRestaurant = restaurant;
    });
  } finally {
    session.endSession();
  }

  let subscription = null;

  if (isAutoApproved) {
    // 2. Initialize trial & Razorpay mandate
    subscription = await subscriptionService.initializeTenantTrialAndMandate(createdRestaurant._id, planCode);

    await auditService.logAction({
      restaurantId: createdRestaurant._id,
      userId: createdUser._id,
      userEmail: createdUser.email,
      userRole: 'OWNER',
      action: 'TENANT_REGISTRATION_AUTO_APPROVED',
      resource: 'Restaurant',
      details: { planCode, trialDays: 14, mandateUrl: subscription.mandateUrl },
    });
  } else {
    await auditService.logAction({
      restaurantId: createdRestaurant._id,
      userId: createdUser._id,
      userEmail: createdUser.email,
      userRole: 'OWNER',
      action: 'TENANT_REGISTRATION_FLAGGED_FOR_REVIEW',
      resource: 'Restaurant',
      details: { flaggedReasons, planCode },
    });
  }

  return {
    user: createdUser.toSafeObject(),
    restaurant: createdRestaurant,
    subscription,
    isAutoApproved,
    flaggedReasons,
    message: isAutoApproved
      ? `Registration approved! Your 14-day free trial under the ${planCode.toUpperCase()} plan is now active.`
      : `Registration submitted! Placed in Super Admin review queue due to flags: ${flaggedReasons.join('; ')}`,
  };
};

module.exports = {
  registerRestaurant,
  registerTenant,
  registerUser,
  verifyEmail,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
