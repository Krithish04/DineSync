const ApiError = require('../utils/ApiError');

/**
 * Catches any request that did not match a defined route and forwards
 * a 404 ApiError to the global error middleware.
 */
const notFoundMiddleware = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundMiddleware;
