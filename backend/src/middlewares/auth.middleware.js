const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt.util');
const User = require('../features/auth/auth.model');
const { ROLES } = require('../constants/roles.constant');

/**
 * Extracts a bearer token from the Authorization header or the httpOnly cookie.
 */
const Customer = require('../features/customer/customer.model');

/**
 * Extracts a bearer token from the Authorization header or the httpOnly cookie.
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

/**
 * Verifies the JWT, loads the user/customer, and attaches it to req.user.
 * Also attaches req.tenantId derived from the token for convenience.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw ApiError.unauthorized('Authentication required. No token provided.');
  }

  const decoded = verifyToken(token);

  if (decoded.role === ROLES.CUSTOMER || decoded.role === 'customer') {
    const customer = await Customer.findById(decoded.id);
    if (!customer) {
      throw ApiError.unauthorized('Customer belonging to this token no longer exists.');
    }
    if (customer.isActive === false || customer.isDeleted) {
      throw ApiError.forbidden('This customer account has been deactivated.');
    }

    req.user = {
      id: customer._id.toString(),
      _id: customer._id,
      role: ROLES.CUSTOMER,
      restaurant: customer.restaurant,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
    };
    req.tenantId = customer.restaurant ? customer.restaurant.toString() : null;
    return next();
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    throw ApiError.unauthorized('User belonging to this token no longer exists.');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }
  if (user.wasPasswordChangedAfter(decoded.iat)) {
    throw ApiError.unauthorized('Password was changed recently. Please log in again.');
  }

  req.user = user;
  req.tenantId = user.restaurant ? user.restaurant.toString() : null;
  next();
});

/**
 * Restricts a route to the given list of roles.
 * @param  {...string} roles
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required.');
  }
  if (!roles.includes(req.user.role)) {
    throw ApiError.forbidden('You do not have permission to perform this action.');
  }
  next();
};

/**
 * Ensures a tenant-scoped user can only access resources within their own
 * restaurant. Super admins bypass this check.
 */
const enforceTenantIsolation = (req, res, next) => {
  if (req.user.role === ROLES.SUPER_ADMIN) return next();

  const targetTenantId =
    req.params.restaurantId || req.body.restaurant || req.query.restaurantId;

  if (targetTenantId && targetTenantId !== req.tenantId) {
    throw ApiError.forbidden('You cannot access resources outside your restaurant.');
  }
  next();
};

/**
 * Authorizes menu catalog modification.
 * Standard roles: SUPER_ADMIN, OWNER, MANAGER.
 * STAFF role: Allowed if tenant settings.staffCanEditMenu is true.
 */
const authorizeMenuEdit = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER];
  if (allowedRoles.includes(req.user.role)) {
    return next();
  }

  if (req.user.role === ROLES.STAFF) {
    const RestaurantModel = require('../features/tenant/tenant.model');
    const tenantId = req.tenantId || req.user.restaurant;
    if (tenantId) {
      const restaurant = await RestaurantModel.findById(tenantId).select('settings');
      if (restaurant?.settings?.staffCanEditMenu) {
        return next();
      }
    }
    throw ApiError.forbidden('Staff menu editing is not enabled for this restaurant.');
  }

  throw ApiError.forbidden('You do not have permission to modify menu catalog.');
});

module.exports = { protect, authorize, enforceTenantIsolation, authorizeMenuEdit };
