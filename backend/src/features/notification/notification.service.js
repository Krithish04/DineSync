const Notification = require('./notification.model');
const NotificationPreference = require('./notificationPreference.model');
const { sendEmail } = require('../../utils/email.util');
const socketConfig = require('../../config/socket.config');
const ApiError = require('../../utils/ApiError');

// ==========================================
// CENTRALIZED DISPATCH SERVICE
// ==========================================

/**
 * Dispatches multi-channel notification (In-App, Email, SMS, WhatsApp, Push)
 */
const dispatchNotification = async (restaurantId, options) => {
  const {
    recipientId,
    title,
    message,
    category = 'Order',
    priority = 'Info',
    channels = ['In-App', 'Email'],
    emailTo,
    phoneTo,
    metadata = {},
  } = options;

  // 1. Create In-App Notification document
  const notification = await Notification.create({
    restaurant: restaurantId,
    recipient: recipientId || null,
    title,
    message,
    category,
    priority,
    channel: channels[0] || 'In-App',
    metadata,
  });

  // 2. Broadcast Socket.IO real-time event to connected frontend clients
  socketConfig.broadcastEvent(restaurantId, 'notification:new', notification);

  // 3. Multi-channel dispatching
  for (const channel of channels) {
    if (channel === 'Email' && emailTo) {
      sendEmail({
        to: emailTo,
        subject: `[DineSync AI] ${title}`,
        html: `
          <div style="font-family:sans-serif;padding:20px;background:#f9fafb">
            <div style="max-width:500px;margin:0 auto;background:#fff;padding:20px;border-radius:10px;border:1px solid #eee">
              <h2 style="color:#c2440f;margin-top:0">${title}</h2>
              <p style="color:#374151;line-height:1.5">${message}</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
              <p style="font-size:12px;color:#9ca3af">DineSync AI Notification Service</p>
            </div>
          </div>`,
      }).catch((err) => console.error('[NotificationService Email Error]:', err.message));
    }

    if (channel === 'SMS' && phoneTo) {
      // Simulated SMS client logging
      // eslint-disable-next-line no-console
      console.log(`[SMS DISPATCH] To: ${phoneTo} | Body: ${title} - ${message}`);
    }

    if (channel === 'WhatsApp' && phoneTo) {
      // Simulated WhatsApp API client logging
      // eslint-disable-next-line no-console
      console.log(`[WHATSAPP DISPATCH] To: ${phoneTo} | Body: ${title} - ${message}`);
    }

    if (channel === 'Push') {
      // Web Push Notification simulation
      // eslint-disable-next-line no-console
      console.log(`[PUSH DISPATCH] Title: ${title} | Body: ${message}`);
    }
  }

  return notification;
};

// ==========================================
// ALERT CENTER CRUD & QUERIES
// ==========================================

const listNotifications = async (restaurantId, query = {}) => {
  const { category, priority, isRead, isArchived, limit = 50, page = 1 } = query;

  const match = { restaurant: restaurantId };
  if (category) match.category = category;
  if (priority) match.priority = priority;
  if (isRead !== undefined) match.isRead = isRead === 'true';
  if (isArchived !== undefined) match.isArchived = isArchived === 'true';

  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(match).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Notification.countDocuments(match),
    Notification.countDocuments({ restaurant: restaurantId, isRead: false, isArchived: false }),
  ]);

  return { notifications, total, unreadCount, page: Number(page), limit: Number(limit) };
};

const markAsRead = async (restaurantId, notificationId) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, restaurant: restaurantId },
    { isRead: true },
    { new: true }
  );
  if (!notif) throw ApiError.notFound('Notification not found.');
  return notif;
};

const markAllAsRead = async (restaurantId) => {
  await Notification.updateMany({ restaurant: restaurantId, isRead: false }, { isRead: true });
  return { success: true };
};

const archiveNotification = async (restaurantId, notificationId) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, restaurant: restaurantId },
    { isArchived: true },
    { new: true }
  );
  if (!notif) throw ApiError.notFound('Notification not found.');
  return notif;
};

const deleteNotification = async (restaurantId, notificationId) => {
  const notif = await Notification.findOneAndDelete({ _id: notificationId, restaurant: restaurantId });
  if (!notif) throw ApiError.notFound('Notification not found.');
  return { deleted: true };
};

// ==========================================
// PREFERENCES
// ==========================================

const getPreferences = async (restaurantId, userId = null) => {
  let pref = await NotificationPreference.findOne({ restaurant: restaurantId, user: userId });
  if (!pref) {
    pref = await NotificationPreference.create({ restaurant: restaurantId, user: userId });
  }
  return pref;
};

const updatePreferences = async (restaurantId, userId = null, updates) => {
  let pref = await NotificationPreference.findOneAndUpdate(
    { restaurant: restaurantId, user: userId },
    updates,
    { new: true, upsert: true }
  );
  return pref;
};

module.exports = {
  dispatchNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  getPreferences,
  updatePreferences,
};
