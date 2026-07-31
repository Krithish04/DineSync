const ApiError = require('../utils/ApiError');

/**
 * Creates an Express middleware that validates req.body against a Zod schema.
 * On failure, forwards a 400 ApiError with field-level messages.
 * On success, replaces req.body with the parsed (typed/defaulted) data.
 *
 * @param {import('zod').ZodSchema} schema
 */
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(ApiError.badRequest('Validation failed', errors));
  }

  req.body = result.data;
  next();
};

module.exports = { validateBody };
