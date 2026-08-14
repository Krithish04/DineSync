const env = require('../config/env.config');
const ApiError = require('../utils/ApiError');

/**
 * Converts known error types (Mongoose, JWT, etc.) into a normalized ApiError.
 */
const normalizeError = (err) => {
  if (err instanceof ApiError) return err;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new ApiError(400, 'Validation failed', errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const keys = Object.keys(err.keyValue || {});
    // Ignore tenant scoping field 'restaurant' if present alongside specific identifiers
    const duplicateFields = keys.filter((k) => k !== 'restaurant');
    const targetField = duplicateFields[0] || keys[0] || 'field';

    let label = targetField;
    if (targetField === 'phoneNumber') label = 'Phone number';
    else if (targetField === 'email') label = 'Email';
    else if (targetField === 'customerId') label = 'Customer ID';
    else if (targetField === 'referralCode') label = 'Referral code';

    return new ApiError(409, `${label} already exists`, [
      { field: targetField, message: `${label} must be unique` },
    ]);
  }

  // Mongoose invalid ObjectId cast
  if (err.name === 'CastError') {
    return new ApiError(400, `Invalid value for field: ${err.path}`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Invalid authentication token');
  }
  if (err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Authentication token has expired');
  }

  // Fallback: unknown/unexpected error
  return new ApiError(err.statusCode || 500, err.message || 'Internal Server Error');
};

/**
 * Express global error handler. Must be registered last, after all routes.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  const normalized = normalizeError(err);

  if (env.isDevelopment) {
    // eslint-disable-next-line no-console
    console.error(`[Error] ${req.method} ${req.originalUrl} ->`, err);
  }

  res.status(normalized.statusCode).json({
    success: false,
    message: normalized.message,
    errors: normalized.errors || [],
    ...(env.isDevelopment ? { stack: err.stack } : {}),
  });
};

module.exports = errorMiddleware;
