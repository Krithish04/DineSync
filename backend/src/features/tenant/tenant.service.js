const Restaurant = require('./tenant.model');
const ApiError = require('../../utils/ApiError');
const { ROLES } = require('../../constants/roles.constant');

/**
 * Loads a restaurant by id and enforces that the requesting user either is a
 * super_admin or belongs to that exact restaurant tenant.
 */
const getById = async (id, requestingUser) => {
  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    throw ApiError.notFound('Restaurant not found.');
  }
  if (
    requestingUser.role !== ROLES.SUPER_ADMIN &&
    requestingUser.restaurant?.toString() !== restaurant._id.toString()
  ) {
    throw ApiError.forbidden('You cannot access this restaurant.');
  }
  return restaurant;
};

const getPublicBySlug = async (slug) => {
  const restaurant = await Restaurant.findOne({ slug, isActive: true }).select(
    'name slug description address phone email website cuisine logoUrl coverImageUrl socialLinks openingHours'
  );
  if (!restaurant) {
    throw ApiError.notFound(`No active restaurant found for tenant "${slug}"`);
  }
  return restaurant;
};

const listAll = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Restaurant.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Restaurant.countDocuments(),
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const deactivate = async (id, requestingUser) => {
  const restaurant = await getById(id, requestingUser);
  restaurant.isActive = false;
  await restaurant.save();
  return restaurant;
};

// --- Profile ---
const getProfile = async (id, requestingUser) => {
  const restaurant = await getById(id, requestingUser);
  return {
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    address: restaurant.address,
    phone: restaurant.phone,
    email: restaurant.email,
    website: restaurant.website,
    cuisine: restaurant.cuisine,
    logoUrl: restaurant.logoUrl,
    coverImageUrl: restaurant.coverImageUrl,
    socialLinks: restaurant.socialLinks,
  };
};

const updateProfile = async (id, updates, requestingUser) => {
  const restaurant = await getById(id, requestingUser);

  const allowedFields = [
    'name',
    'description',
    'address',
    'phone',
    'email',
    'website',
    'cuisine',
    'logoUrl',
    'coverImageUrl',
    'socialLinks',
  ];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      if (field === 'socialLinks') {
        restaurant.socialLinks = { ...restaurant.socialLinks.toObject(), ...updates.socialLinks };
      } else {
        restaurant[field] = updates[field];
      }
    }
  });

  await restaurant.save();
  return getProfile(id, requestingUser);
};

const DEFAULT_STATIONS = ['Main Kitchen', 'Tandoor', 'Bar', 'Dessert', 'Beverage'];

// --- Settings ---
const getSettings = async (id, requestingUser) => {
  const restaurant = await getById(id, requestingUser);
  if (!restaurant.settings.kitchenStations || restaurant.settings.kitchenStations.length === 0) {
    restaurant.settings.kitchenStations = DEFAULT_STATIONS;
    await restaurant.save();
  }
  return restaurant.settings;
};

const updateSettings = async (id, updates, requestingUser) => {
  const restaurant = await getById(id, requestingUser);
  const MenuItem = require('../menu/menuItem.model');

  let reassignedCount = 0;
  let fallbackStation = 'Main Kitchen';

  if (updates.kitchenStations && Array.isArray(updates.kitchenStations)) {
    const sanitizedStations = updates.kitchenStations
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0);

    if (sanitizedStations.length === 0) {
      throw ApiError.badRequest('At least one kitchen station is required.');
    }

    updates.kitchenStations = [...new Set(sanitizedStations)];
    fallbackStation = updates.kitchenStations[0];

    const unassignedItems = await MenuItem.find({
      restaurant: id,
      kitchenStation: { $nin: updates.kitchenStations },
    });

    if (unassignedItems.length > 0) {
      reassignedCount = unassignedItems.length;
      await MenuItem.updateMany(
        { restaurant: id, kitchenStation: { $nin: updates.kitchenStations } },
        { kitchenStation: fallbackStation }
      );
    }
  }

  restaurant.settings = { ...restaurant.settings.toObject(), ...updates };
  await restaurant.save();

  const settingsObj = restaurant.settings.toObject();
  if (reassignedCount > 0) {
    settingsObj.reassignedCount = reassignedCount;
    settingsObj.fallbackStation = fallbackStation;
  }

  // Real-time broadcast to connected KDS, Kitchen Dashboard, and Staff clients
  try {
    const socketConfig = require('../../config/socket.config');
    socketConfig.broadcastEvent(id, 'restaurant:settings_updated', settingsObj);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Tenant] Settings broadcast failed:', err);
  }

  return settingsObj;
};

// --- GST ---
const getGst = async (id, requestingUser) => {
  const restaurant = await getById(id, requestingUser);
  return restaurant.gst;
};

const updateGst = async (id, updates, requestingUser) => {
  const restaurant = await getById(id, requestingUser);
  restaurant.gst = { ...restaurant.gst.toObject(), ...updates };
  await restaurant.save();
  return restaurant.gst;
};

// --- Opening hours ---
const getOpeningHours = async (id, requestingUser) => {
  const restaurant = await getById(id, requestingUser);
  return restaurant.openingHours;
};

const updateOpeningHours = async (id, openingHours, requestingUser) => {
  const restaurant = await getById(id, requestingUser);
  restaurant.openingHours = openingHours;
  await restaurant.save();
  return restaurant.openingHours;
};

const backfillKitchenStations = async () => {
  try {
    await Restaurant.updateMany(
      {
        $or: [
          { 'settings.kitchenStations': { $exists: false } },
          { 'settings.kitchenStations': { $eq: [] } },
          { 'settings.kitchenStations': null },
        ],
      },
      { $set: { 'settings.kitchenStations': DEFAULT_STATIONS } }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Tenant] Failed to backfill kitchenStations:', err.message);
  }
};

module.exports = {
  getById,
  getPublicBySlug,
  listAll,
  deactivate,
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
  getGst,
  updateGst,
  getOpeningHours,
  updateOpeningHours,
  backfillKitchenStations,
};
