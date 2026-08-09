const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const tableService = require('./table.service');

const createTable = asyncHandler(async (req, res) => {
  const table = await tableService.createTable(req.params.restaurantId, req.body);
  return new ApiResponse(201, { table }, 'Table created successfully').send(res);
});

const listTables = asyncHandler(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const search = req.query.search || '';
  const status = req.query.status || undefined;

  const result = await tableService.listTables(req.params.restaurantId, {
    page,
    limit,
    search,
    status,
  });

  return new ApiResponse(200, result, 'Tables fetched successfully').send(res);
});

const getTable = asyncHandler(async (req, res) => {
  const table = await tableService.getTable(req.params.restaurantId, req.params.tableId);
  return new ApiResponse(200, { table }, 'Table fetched successfully').send(res);
});

const updateTable = asyncHandler(async (req, res) => {
  const table = await tableService.updateTable(
    req.params.restaurantId,
    req.params.tableId,
    req.body
  );
  return new ApiResponse(200, { table }, 'Table updated successfully').send(res);
});

const deleteTable = asyncHandler(async (req, res) => {
  await tableService.deleteTable(req.params.restaurantId, req.params.tableId);
  return new ApiResponse(200, null, 'Table deleted successfully').send(res);
});

const updateTableStatus = asyncHandler(async (req, res) => {
  const table = await tableService.updateTableStatus(
    req.params.restaurantId,
    req.params.tableId,
    req.body.status
  );
  return new ApiResponse(200, { table }, 'Table status updated successfully').send(res);
});

const getTableSession = asyncHandler(async (req, res) => {
  const data = await tableService.getTableSession(req.params.restaurantId, req.params.tableId);
  return new ApiResponse(200, data, 'Table session fetched successfully').send(res);
});

const mergeTables = asyncHandler(async (req, res) => {
  const table = await tableService.mergeTables(
    req.params.restaurantId,
    req.params.tableId,
    req.body.tableIds || req.body.secondaryTableIds
  );
  return new ApiResponse(200, { table }, 'Tables merged successfully').send(res);
});

const unmergeTables = asyncHandler(async (req, res) => {
  const table = await tableService.unmergeTables(
    req.params.restaurantId,
    req.params.tableId,
    { force: Boolean(req.body.force) }
  );
  return new ApiResponse(200, { table }, 'Tables unmerged successfully').send(res);
});

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
