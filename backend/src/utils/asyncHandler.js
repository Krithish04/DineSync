/**
 * Wraps an async Express route/controller handler so that any rejected
 * promise or thrown error is forwarded to the global error middleware
 * via next(), instead of crashing the process or requiring try/catch
 * boilerplate in every controller.
 *
 * @param {Function} fn Async (req, res, next) => {}
 * @returns {Function} Express-compatible handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
