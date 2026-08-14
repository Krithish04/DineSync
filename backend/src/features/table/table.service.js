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

  // Sync isActive and status
  if (payload.isActive === false) {
    payload.status = 'Inactive';
  } else if (payload.status === 'Inactive') {
    payload.isActive = false;
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
  // Auto-clean any stale or abandoned occupied table sessions
  try {
    const { cleanupStaleTableSessions } = require('../order/autoServe.service');
    await cleanupStaleTableSessions(restaurantId);
  } catch (cleanErr) {
    // Ignore cleanup errors to prevent blocking table retrieval
  }

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
      .populate('mergedTables', 'tableNumber tableName capacity status')
      .populate('mergedInto', 'tableNumber tableName')
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
  const table = await Table.findOne({ _id: tableId, restaurant: restaurantId, isDeleted: false })
    .populate('mergedTables', 'tableNumber tableName capacity status')
    .populate('mergedInto', 'tableNumber tableName');
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

  // Synchronize isActive and status
  if (updates.isActive === false) {
    updates.status = 'Inactive';
  } else if (updates.isActive === true && (table.status === 'Inactive' || updates.status === 'Inactive')) {
    updates.status = 'Available';
  }

  if (updates.status === 'Inactive') {
    updates.isActive = false;
  } else if (updates.status && updates.status !== 'Inactive' && updates.isActive === undefined && !table.isActive) {
    updates.isActive = true;
  }

  Object.assign(table, updates);
  await table.save();

  // Broadcast real-time Socket.IO event to dashboards
  socketConfig.broadcastEvent(restaurantId, 'table:updated', {
    tableId: table._id,
    tableNumber: table.tableNumber,
    status: table.status,
    isActive: table.isActive,
    forceLogout: !table.isActive || table.status === 'Available',
  });

  return table;
};

/**
 * Soft deletes a table by setting isDeleted: true.
 */
const deleteTable = async (restaurantId, tableId) => {
  const table = await getTableOrFail(restaurantId, tableId);
  table.isDeleted = true;
  table.deletedAt = new Date();
  table.tableNumber = `${table.tableNumber}_deleted_${Date.now()}`;
  await table.save();
  return { deleted: true };
};

/**
 * Updates table status specifically.
 */
const updateTableStatus = async (restaurantId, tableId, status) => {
  const table = await getTableOrFail(restaurantId, tableId);
  table.status = status;
  if (status === 'Inactive') {
    table.isActive = false;
  } else if (!table.isActive) {
    table.isActive = true;
  }

  if (status !== 'Occupied') {
    table.currentHostName = '';
    table.currentHostPhone = '';
    const TableSession = require('./tableSession.model');
    const activeSession = await TableSession.findOne({ table: tableId, status: 'active' });
    if (activeSession) {
      activeSession.status = 'released';
      activeSession.endedAt = new Date();
      await activeSession.save();
      socketConfig.broadcastEvent(restaurantId, 'table:session-ended', {
        sessionId: activeSession._id,
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: 'released',
      });
    }
  }

  await table.save();

  // Broadcast real-time Socket.IO event to all connected storefronts & manager dashboards
  socketConfig.broadcastEvent(restaurantId, 'table:updated', {
    tableId: table._id,
    tableNumber: table.tableNumber,
    status: table.status,
    isActive: table.isActive,
    currentHostName: table.currentHostName,
    currentHostPhone: table.currentHostPhone,
    forceLogout: !table.isActive || status === 'Available',
  });

  return table;
};

const getTableSession = async (restaurantId, tableId) => {
  await getTableOrFail(restaurantId, tableId);
  const customerExperienceService = require('../customerExperience/customerExperience.service');
  return customerExperienceService.getActiveTableSession(restaurantId, tableId);
};

/**
 * Merges multiple tables into one primary seating group.
 */
const mergeTables = async (restaurantId, primaryTableId, secondaryTableIds = []) => {
  if (!secondaryTableIds || secondaryTableIds.length === 0) {
    throw ApiError.badRequest('At least one secondary table must be specified to merge.');
  }

  const primaryTable = await getTableOrFail(restaurantId, primaryTableId);

  if (primaryTable.mergedInto) {
    throw ApiError.badRequest(`Table ${primaryTable.tableNumber} is already merged into another table and cannot act as primary.`);
  }

  const cleanSecondaryIds = secondaryTableIds
    .map((id) => id.toString())
    .filter((id) => id !== primaryTableId.toString());

  if (cleanSecondaryIds.length === 0) {
    throw ApiError.badRequest('Secondary tables must be distinct from the primary table.');
  }

  const secondaryTables = await Table.find({
    _id: { $in: cleanSecondaryIds },
    restaurant: restaurantId,
    isDeleted: false,
  });

  if (secondaryTables.length !== cleanSecondaryIds.length) {
    throw ApiError.notFound('One or more secondary tables were not found.');
  }

  for (const st of secondaryTables) {
    if (st.mergedInto && st.mergedInto.toString() !== primaryTableId.toString()) {
      throw ApiError.badRequest(`Table ${st.tableNumber} is already merged into Table ID ${st.mergedInto}. Unmerge it first.`);
    }
    if (st.mergedTables && st.mergedTables.length > 0) {
      throw ApiError.badRequest(`Table ${st.tableNumber} is currently acting as a primary table for other merged tables and cannot be merged into another group.`);
    }
  }

  // Combine existing mergedTables array with new ones to avoid duplicates
  const existingMergedSet = new Set((primaryTable.mergedTables || []).map((id) => id.toString()));
  cleanSecondaryIds.forEach((id) => existingMergedSet.add(id));
  const newMergedArray = Array.from(existingMergedSet);

  // Update secondary tables
  await Table.updateMany(
    { _id: { $in: cleanSecondaryIds }, restaurant: restaurantId },
    {
      $set: {
        mergedInto: primaryTable._id,
        mergedTables: [],
        status: 'Occupied',
      },
    }
  );

  // Update primary table
  primaryTable.mergedTables = newMergedArray;
  primaryTable.mergedInto = null;
  primaryTable.status = 'Occupied';
  await primaryTable.save();

  // Populate primary table for response
  await primaryTable.populate('mergedTables', 'tableNumber tableName capacity status');

  // Broadcast Socket events
  socketConfig.broadcastEvent(restaurantId, 'table:updated', {
    tableId: primaryTable._id,
    tableNumber: primaryTable.tableNumber,
    status: primaryTable.status,
    mergedTables: primaryTable.mergedTables,
  });

  secondaryTables.forEach((st) => {
    socketConfig.broadcastEvent(restaurantId, 'table:updated', {
      tableId: st._id,
      tableNumber: st.tableNumber,
      status: 'Occupied',
      mergedInto: primaryTable._id,
    });
  });

  socketConfig.broadcastEvent(restaurantId, 'tables:merged', {
    primaryTableId: primaryTable._id,
    secondaryTableIds: cleanSecondaryIds,
  });

  return primaryTable;
};

/**
 * Unmerges a primary table seating group back into independent tables.
 */
const unmergeTables = async (restaurantId, primaryTableId, { force = false } = {}) => {
  const primaryTable = await getTableOrFail(restaurantId, primaryTableId);

  if (!primaryTable.mergedTables || primaryTable.mergedTables.length === 0) {
    throw ApiError.badRequest(`Table ${primaryTable.tableNumber} is not currently merged with any tables.`);
  }

  // Check for active orders or active TableSession on primary table
  const TableSession = require('./tableSession.model');
  const Order = require('../order/order.model');

  const [activeSession, activeOrders] = await Promise.all([
    TableSession.findOne({ table: primaryTableId, status: 'active' }),
    Order.find({
      restaurant: restaurantId,
      table: primaryTableId,
      orderStatus: { $nin: ['Completed', 'Cancelled'] },
      paymentStatus: { $ne: 'Paid' },
    }),
  ]);

  if ((activeSession || activeOrders.length > 0) && !force) {
    throw ApiError.badRequest(
      `Table ${primaryTable.tableNumber} has active orders or an ongoing diner session. Settle the session/orders first or confirm force unmerge.`
    );
  }

  const secondaryIds = primaryTable.mergedTables;

  // Reset secondary tables
  await Table.updateMany(
    { _id: { $in: secondaryIds }, restaurant: restaurantId },
    {
      $set: {
        mergedInto: null,
        status: 'Available',
        currentHostName: '',
        currentHostPhone: '',
      },
    }
  );

  // Reset primary table
  primaryTable.mergedTables = [];
  if (!activeSession) {
    primaryTable.status = 'Available';
  }
  await primaryTable.save();

  // Broadcast Socket events
  socketConfig.broadcastEvent(restaurantId, 'table:updated', {
    tableId: primaryTable._id,
    tableNumber: primaryTable.tableNumber,
    status: primaryTable.status,
    mergedTables: [],
  });

  secondaryIds.forEach((id) => {
    socketConfig.broadcastEvent(restaurantId, 'table:updated', {
      tableId: id,
      status: 'Available',
      mergedInto: null,
    });
  });

  socketConfig.broadcastEvent(restaurantId, 'tables:unmerged', {
    primaryTableId: primaryTable._id,
    secondaryTableIds: secondaryIds,
  });

  return primaryTable;
};

module.exports = {
  createTable,
  listTables,
  getTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  getTableSession,
  mergeTables,
  unmergeTables,
};
