const mongoose = require('mongoose');
const Table = require('./table.model');
const Branch = require('../branch/branch.model');
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
  // 1. Verify branch exists and belongs to the restaurant
  const branchExists = await Branch.findOne({
    _id: payload.branch,
    restaurant: restaurantId,
  });

  if (!branchExists) {
    throw ApiError.notFound('Branch not found.');
  }

  // 2. Check for duplicate table number within the branch (among active tables)
  const existingByNumber = await Table.findOne({
    branch: payload.branch,
    tableNumber: { $regex: new RegExp(`^${payload.tableNumber}$`, 'i') },
    isDeleted: false,
  });

  if (existingByNumber) {
    throw ApiError.conflict('A table with this number already exists at this branch.');
  }

  // 3. Generate a pre-allocated table ID for the QR code target URL
  const tableId = new mongoose.Types.ObjectId();

  // 4. Construct the short QR target URL (/t/:tableId)
  const targetMenuUrl = `${env.CLIENT_URL}/t/${tableId}`;

  // 5. Create Table document
  const table = await Table.create({
    _id: tableId,
    ...payload,
    restaurant: restaurantId,
    qrCode: targetMenuUrl,
  });

  return table;
};

/**
 * Lists active tables. Supports pagination, filtering by branch and status, and searching by tableNumber.
 */
const listTables = async (restaurantId, { page = 1, limit = 20, branch, status, search = '' }) => {
  const query = { restaurant: restaurantId, isDeleted: false };

  if (branch) {
    query.branch = branch;
  }

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
      .limit(limit)
      .populate('branch', 'name code'),
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
  const table = await Table.findOne({ _id: tableId, restaurant: restaurantId, isDeleted: false })
    .populate('branch', 'name code');
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

  // If branch is being changed, verify it exists
  const targetBranchId = updates.branch || table.branch;
  if (updates.branch && updates.branch !== table.branch.toString()) {
    const branchExists = await Branch.findOne({
      _id: updates.branch,
      restaurant: restaurantId,
    });
    if (!branchExists) {
      throw ApiError.notFound('Branch not found.');
    }
  }

  // If tableNumber or branch is changing, check for uniqueness collisions
  const checkNumber = updates.tableNumber || table.tableNumber;
  if (
    (updates.tableNumber && updates.tableNumber !== table.tableNumber) ||
    (updates.branch && updates.branch !== table.branch.toString())
  ) {
    const existing = await Table.findOne({
      branch: targetBranchId,
      tableNumber: { $regex: new RegExp(`^${checkNumber}$`, 'i') },
      _id: { $ne: tableId },
      isDeleted: false,
    });
    if (existing) {
      throw ApiError.conflict('Another table with this number already exists at the selected branch.');
    }
  }

  // Ensure short QR URL format (/t/:tableId)
  updates.qrCode = `${env.CLIENT_URL}/t/${tableId}`;

  Object.assign(table, updates);
  await table.save();

  // Populate branch fields before returning
  await table.populate('branch', 'name code');

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
  await table.populate('branch', 'name code');

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
