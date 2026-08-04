const mongoose = require('mongoose');
const Table = require('./table.model');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env.config');
const socketConfig = require('../../config/socket.config');

/**
 * Loads a table by ID and verifies it belongs to the given restaurant tenant.
 * Ignores soft-deleted tables.
 */
const getTableOrFail = async (restaurantId, tableId) => {
  const table = await Table.findOne({ _id: tableId, restaurant: restaurantId, isDeleted: false });
  if (!table) {
    throw ApiError.notFound('Table not found.');
  }
  return table;
};

/**
 * Creates a new dining table with a sleek short QR URL: /t/:tableId
 */
const createTable = async (restaurantId, payload) => {
  // 1. Check for duplicate table number within the restaurant (among active tables)
  const existingByNumber = await Table.findOne({
    restaurant: restaurantId,
    tableNumber: { $regex: new RegExp(`^${payload.tableNumber}$`, 'i') },
    isDeleted: false,
  });

  if (existingByNumber) {
    throw ApiError.conflict('A table with this number already exists.');
  }

  // 2. Generate a pre-allocated table ID for the QR code target URL
  const tableId = new mongoose.Types.ObjectId();

  // 3. Construct the short QR target URL (/t/:tableId)
  const targetMenuUrl = `${env.CLIENT_URL}/t/${tableId}`;

  // 4. Create Table document
  const table = await Table.create({
    _id: tableId,
    ...payload,
    restaurant: restaurantId,
    qrCode: targetMenuUrl,
  });

  return table;
};

/**
 * Lists active tables. Supports pagination, filtering by status, and searching by tableNumber.
 */
const listTables = async (restaurantId, { page = 1, limit = 20, status, search = '' }) => {
  const query = { restaurant: restaurantId, isDeleted: false };

  if (status) {
    query.status = status;
  }

  if (search) {
    query.tableNumber = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Table.find(query)
      .sort({ tableNumber: 1 })
      .skip(skip)
      .limit(limit),
    Table.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Fetches a single table.
 */
const getTable = async (restaurantId, tableId) => {
  const table = await Table.findOne({ _id: tableId, restaurant: restaurantId, isDeleted: false });
  if (!table) {
    throw ApiError.notFound('Table not found.');
  }
  return table;
};

/**
 * Updates a table.
 */
const updateTable = async (restaurantId, tableId, updates) => {
  const table = await getTableOrFail(restaurantId, tableId);

  // If tableNumber is changing, check for uniqueness collisions
  const checkNumber = updates.tableNumber || table.tableNumber;
  if (updates.tableNumber && updates.tableNumber !== table.tableNumber) {
    const existing = await Table.findOne({
      restaurant: restaurantId,
      tableNumber: { $regex: new RegExp(`^${checkNumber}$`, 'i') },
      _id: { $ne: tableId },
      isDeleted: false,
    });
    if (existing) {
      throw ApiError.conflict('Another table with this number already exists.');
    }
  }

  // Ensure short QR URL format (/t/:tableId)
  updates.qrCode = `${env.CLIENT_URL}/t/${tableId}`;

  Object.assign(table, updates);
  await table.save();

  return table;
};

/**
 * Soft deletes a table by setting isDeleted: true.
 */
const deleteTable = async (restaurantId, tableId) => {
  const table = await getTableOrFail(restaurantId, tableId);
  table.isDeleted = true;
  table.deletedAt = new Date();
  await table.save();
  return { deleted: true };
};

/**
 * Updates table status specifically.
 */
const updateTableStatus = async (restaurantId, tableId, status) => {
  const table = await getTableOrFail(restaurantId, tableId);
  table.status = status;
  await table.save();

  // Broadcast real-time Socket.IO event to all connected storefronts & manager dashboards
  socketConfig.broadcastEvent(restaurantId, 'table:updated', {
    tableId: table._id,
    tableNumber: table.tableNumber,
    status: table.status,
    forceLogout: status === 'Available',
  });

  return table;
};

module.exports = {
  createTable,
  listTables,
  getTable,
  updateTable,
  deleteTable,
  updateTableStatus,
};
