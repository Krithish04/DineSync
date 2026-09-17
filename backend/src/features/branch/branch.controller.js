const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const branchService = require('./branch.service');

const createBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.createBranch(req.params.restaurantId, req.body, req.user);
  return new ApiResponse(201, { branch }, 'Branch created successfully').send(res);
});

const getBranchDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await branchService.getBranchDashboardSummary(req.params.restaurantId);
  return new ApiResponse(200, summary, 'Admin multi-branch dashboard summary fetched successfully').send(res);
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

const createBranchManager = asyncHandler(async (req, res) => {
  const result = await branchService.createBranchManager(
    req.params.restaurantId,
    req.params.branchId,
    req.body,
    req.user
  );
  return new ApiResponse(201, result, 'Branch manager account created/assigned successfully').send(res);
});

const createBranchStaff = asyncHandler(async (req, res) => {
  const staff = await branchService.createBranchStaff(
    req.params.restaurantId,
    req.user,
    req.body
  );
  return new ApiResponse(201, { staff }, 'Branch staff account created successfully').send(res);
});

const listBranchUsers = asyncHandler(async (req, res) => {
  const users = await branchService.listBranchUsers(req.params.restaurantId, req.params.branchId);
  return new ApiResponse(200, { users }, 'Branch user accounts fetched successfully').send(res);
});

module.exports = {
  createBranch,
  getBranchDashboardSummary,
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
  createBranchManager,
  createBranchStaff,
  listBranchUsers,
};

