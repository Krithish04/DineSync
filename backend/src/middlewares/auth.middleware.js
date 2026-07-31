const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt.util');
const User = require('../features/auth/auth.model');
const { ROLES } = require('../constants/roles.constant');

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
 * Verifies the JWT, loads the user, and attaches it to req.user.
 * Also attaches req.tenantId derived from the token for convenience.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw ApiError.unauthorized('Authentication required. No token provided.');
  }

  const decoded = verifyToken(token);

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

module.exports = { protect, authorize, enforceTenantIsolation };
