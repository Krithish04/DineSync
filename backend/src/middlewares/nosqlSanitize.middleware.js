/**
 * NoSQL Injection Protection Middleware.
 * Recursively inspects and sanitizes req.body, req.query, and req.params
 * to strip any MongoDB query operators (keys starting with '$' or containing '.')
 * preventing query injection attacks.
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const key of Object.keys(obj)) {
    // Strip keys starting with '$' or containing '.' (MongoDB operators like $gt, $ne, $where)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    sanitized[key] = sanitizeObject(obj[key]);
  }
  return sanitized;
};

const nosqlSanitizeMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

module.exports = nosqlSanitizeMiddleware;
