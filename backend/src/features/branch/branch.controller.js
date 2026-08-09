const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const branchService = require('./branch.service');

const createBranch = asyncHandler(async (req, res) => {
  const { managerId, ...rest } = req.body;
  const branch = await branchService.createBranch(req.params.restaurantId, {
    ...rest,
    managerId: managerId || null,
  });
  return new ApiResponse(201, { branch }, 'Branch created successfully').send(res);
});

const listBranches = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { status } = req.query;
  const result = await branchService.listBranches(req.params.restaurantId, { page, limit, status });
  return new ApiResponse(200, result, 'Branches fetched successfully').send(res);
});

const getBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.getBranch(req.params.restaurantId, req.params.branchId);
  return new ApiResponse(200, { branch }, 'Branch fetched successfully').send(res);
});

const updateBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.updateBranch(
    req.params.restaurantId,
    req.params.branchId,
    req.body
  );
  return new ApiResponse(200, { branch }, 'Branch updated successfully').send(res);
});

const deleteBranch = asyncHandler(async (req, res) => {
  await branchService.deleteBranch(req.params.restaurantId, req.params.branchId);
  return new ApiResponse(200, null, 'Branch deleted successfully').send(res);
});

const updateAddress = asyncHandler(async (req, res) => {
  const address = await branchService.updateAddress(
    req.params.restaurantId,
    req.params.branchId,
    req.body.address
  );
  return new ApiResponse(200, { address }, 'Branch address updated successfully').send(res);
});

const updateContact = asyncHandler(async (req, res) => {
  const contact = await branchService.updateContact(
    req.params.restaurantId,
    req.params.branchId,
    req.body.contact
  );
  return new ApiResponse(200, { contact }, 'Branch contact details updated successfully').send(res);
});

const updateOperatingHours = asyncHandler(async (req, res) => {
  const operatingHours = await branchService.updateOperatingHours(
    req.params.restaurantId,
    req.params.branchId,
    req.body.operatingHours
  );
  return new ApiResponse(200, { operatingHours }, 'Operating hours updated successfully').send(res);
});

const assignManager = asyncHandler(async (req, res) => {
  const manager = await branchService.assignManager(
    req.params.restaurantId,
    req.params.branchId,
    req.body.managerId
  );
  return new ApiResponse(200, { manager }, 'Branch manager updated successfully').send(res);
});

const updateStatus = asyncHandler(async (req, res) => {
  const branch = await branchService.updateStatus(
    req.params.restaurantId,
    req.params.branchId,
    req.body.status
  );
  return new ApiResponse(200, { branch }, 'Branch status updated successfully').send(res);
});

const listEligibleManagers = asyncHandler(async (req, res) => {
  const managers = await branchService.listEligibleManagers(req.params.restaurantId);
  return new ApiResponse(200, { managers }, 'Eligible managers fetched successfully').send(res);
});

module.exports = {
  createBranch,
  listBranches,
  getBranch,
  updateBranch,
  deleteBranch,
  updateAddress,
  updateContact,
  updateOperatingHours,
  assignManager,
  updateStatus,
  listEligibleManagers,
};
