const AuditLog = require('./auditLog.model');

const logAction = async (options) => {
  const {
    restaurantId = null,
    userId = null,
    userEmail = 'system',
    userRole = 'system',
    action,
    resource = '',
    ipAddress = '127.0.0.1',
    status = 'Success',
    details = {},
  } = options;

  return AuditLog.create({
    restaurant: restaurantId,
    user: userId,
    userEmail,
    userRole,
    action,
    resource,
    ipAddress,
    status,
    details,
  });
};

const listAuditLogs = async (query = {}) => {
  const { restaurantId, action, status, limit = 50, page = 1 } = query;
  const match = {};
  if (restaurantId) match.restaurant = restaurantId;
  if (action) match.action = action;
  if (status) match.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    AuditLog.find(match).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(match),
  ]);

  return { logs, total, page: Number(page), limit: Number(limit) };
};

module.exports = {
  logAction,
  listAuditLogs,
};
