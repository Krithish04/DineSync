const Branch = require('./branch.model');
const User = require('../auth/auth.model');
const ApiError = require('../../utils/ApiError');
const { ROLES } = require('../../constants/roles.constant');

const MANAGER_ELIGIBLE_ROLES = [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF];

/**
 * Validates that a candidate manager belongs to the given restaurant tenant
 * and holds a role eligible to manage a branch. Returns the user document.
 */
const assertValidManager = async (managerId, restaurantId) => {
  if (!managerId) return null;

  const user = await User.findOne({ _id: managerId, restaurant: restaurantId });
  if (!user) {
    throw ApiError.notFound('Manager not found in this restaurant.');
  }
  if (!MANAGER_ELIGIBLE_ROLES.includes(user.role)) {
    throw ApiError.badRequest('Only owners, managers, or staff can be assigned as a branch manager.');
  }
  if (!user.isActive) {
    throw ApiError.badRequest('Cannot assign a deactivated user as branch manager.');
  }
  return user;
};

/**
 * Loads a branch by id and verifies it belongs to the given restaurant tenant.
 */
const getBranchOrFail = async (restaurantId, branchId) => {
  const branch = await Branch.findOne({ _id: branchId, restaurant: restaurantId });
  if (!branch) {
    throw ApiError.notFound('Branch not found.');
  }
  return branch;
};

/**
 * Ensures that every restaurant has at least a primary default branch ("Main Branch")
 * representing the present restaurant location.
 */
const ensurePrimaryBranch = async (restaurantId) => {
  if (!restaurantId) return;
  try {
    const count = await Branch.countDocuments({ restaurant: restaurantId });
    if (count > 0) return;

    const Restaurant = require('../tenant/tenant.model');
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return;

    const managerUser = await User.findOne({
      restaurant: restaurantId,
      role: { $in: [ROLES.OWNER, ROLES.MANAGER] },
      isActive: true,
    });

    const branchPhone = (restaurant.phone && restaurant.phone.trim()) || managerUser?.phone || '+919876543210';

    const branchAddress =
      typeof restaurant.address === 'object' && restaurant.address?.line1
        ? restaurant.address
        : {
            line1: typeof restaurant.address === 'string' && restaurant.address.trim() ? restaurant.address : 'Main Restaurant Premises',
            city: 'Main City',
            state: 'State',
            postalCode: '560001',
            country: 'India',
          };

    const primaryBranch = await Branch.create({
      restaurant: restaurantId,
      name: `${restaurant.name} (Main Branch)`,
      code: 'MAIN',
      address: branchAddress,
      contact: {
        phone: branchPhone,
        email: restaurant.email || managerUser?.email || 'main@dinesync.ai',
      },
      manager: managerUser?._id || null,
      status: 'active',
    });

    if (managerUser && !managerUser.branch) {
      managerUser.branch = primaryBranch._id;
      await managerUser.save();
    }

    return primaryBranch;
  } catch (err) {
    console.error('[ensurePrimaryBranch Error]', err.message);
  }
};

// --- Add Branch ---
const createBranch = async (restaurantId, payload, adminUser) => {
  const { managerId, managerName, managerEmail, managerPassword, managerPhone, ...rest } = payload;

  // Phase 1 Decision #3: Mandatory Manager Assignment check
  if (!managerId && (!managerEmail || !managerName || !managerPassword)) {
    throw ApiError.badRequest('Mandatory Manager assignment is required to create a branch. Provide an existing managerId or inline manager details (managerName, managerEmail, managerPassword).');
  }

  await ensurePrimaryBranch(restaurantId);
  const auditService = require('../superAdmin/audit.service');
  const TenantSubscription = require('../superAdmin/tenantSubscription.model');

  const existingByName = await Branch.findOne({ restaurant: restaurantId, name: rest.name });
  if (existingByName) {
    throw ApiError.conflict('A branch with this name already exists for this restaurant.');
  }

  if (rest.code) {
    const existingByCode = await Branch.findOne({ restaurant: restaurantId, code: rest.code });
    if (existingByCode) {
      throw ApiError.conflict('A branch with this code already exists for this restaurant.');
    }
  }

  let finalManagerId = managerId || null;

  // Create branch record
  const branch = await Branch.create({
    ...rest,
    restaurant: restaurantId,
    manager: null,
  });

  // Handle inline Manager creation or assignment
  if (managerEmail && managerName && managerPassword) {
    const managerRes = await createBranchManager(
      restaurantId,
      branch._id.toString(),
      { name: managerName, email: managerEmail, password: managerPassword, phone: managerPhone },
      adminUser
    );
    finalManagerId = managerRes.manager._id;
  } else if (managerId) {
    await assignManager(restaurantId, branch._id.toString(), managerId);
    finalManagerId = managerId;
  }

  branch.manager = finalManagerId;
  await branch.save();

  // Phase 1 Decision #2 & #4: Update subscription immediately with incremental add-on cost (+₹1,999/mo per branch)
  const existingBranchesCount = await Branch.countDocuments({ restaurant: restaurantId });
  const incrementalCostDelta = 1999;
  const sub = await TenantSubscription.findOne({ restaurant: restaurantId });
  if (sub) {
    sub.billingHistory = sub.billingHistory || [];
    sub.billingHistory.push({
      invoiceNumber: `INV-ADDON-${Date.now()}`,
      amount: incrementalCostDelta,
      billingDate: new Date(),
      paymentMethod: 'Auto-Debit Mandate',
      status: 'Paid',
    });
    await sub.save();
  }

  // Audit Logs
  await auditService.logAction({
    restaurantId,
    userId: adminUser?._id || null,
    userEmail: adminUser?.email || 'admin@dinesync.ai',
    userRole: adminUser?.role || 'owner',
    action: 'BRANCH_CREATED',
    resource: branch.name,
    details: { branchId: branch._id.toString(), code: branch.code, managerId: finalManagerId },
  });

  await auditService.logAction({
    restaurantId,
    userId: adminUser?._id || null,
    userEmail: adminUser?.email || 'admin@dinesync.ai',
    userRole: adminUser?.role || 'owner',
    action: 'BRANCH_BILLING_INCREMENTED',
    resource: 'TenantSubscription',
    details: { branchId: branch._id.toString(), incrementalCostDelta, totalBranches: existingBranchesCount },
  });

  return branch;
};

/**
 * Phase 2 — Admin All-Branches Dashboard Summary Aggregator
 * Safely aggregates live snapshots across branches under restaurantId without cross-branch leaks.
 */
const getBranchDashboardSummary = async (restaurantId) => {
  await ensurePrimaryBranch(restaurantId);
  const branches = await Branch.find({ restaurant: restaurantId }).populate('manager', 'name email phone role');
  const TableModel = require('../table/table.model');
  const OrderModel = require('../order/order.model');
  const TenantSubscription = require('../superAdmin/tenantSubscription.model');
  const SubscriptionPlan = require('../superAdmin/subscriptionPlan.model');

  const sub = await TenantSubscription.findOne({ restaurant: restaurantId });
  const planCode = sub?.planCode || 'starter';
  const planConfig = await SubscriptionPlan.findOne({ code: planCode });

  const perBranchUserLimit = planConfig?.userLimit || 25;
  const perBranchStorageLimitMb = planConfig?.storageLimitMb || 10240;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const branchSummaries = await Promise.all(
    branches.map(async (branch) => {
      const bId = branch._id;

      const [
        totalTablesCount,
        occupiedTablesCount,
        onShiftStaffCount,
        todayOrders,
        usersCount
      ] = await Promise.all([
        TableModel.countDocuments({ restaurant: restaurantId, branch: bId }),
        TableModel.countDocuments({ restaurant: restaurantId, branch: bId, status: 'Occupied' }),
        User.countDocuments({ restaurant: restaurantId, branch: bId, isActive: true }),
        OrderModel.find({ restaurant: restaurantId, branch: bId, createdAt: { $gte: startOfDay } }),
        User.countDocuments({ restaurant: restaurantId, branch: bId }),
      ]);

      const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const storageUsedMb = usersCount * 10 + 150;

      return {
        branch: branch.toObject(),
        manager: branch.manager ? { name: branch.manager.name, email: branch.manager.email, phone: branch.manager.phone } : null,
        status: branch.status || 'Active',
        todaySnapshot: {
          totalTables: totalTablesCount,
          activeTables: occupiedTablesCount,
          staffOnShift: onShiftStaffCount,
          orderCount: todayOrders.length,
          revenue: Math.round(todayRevenue),
        },
        limitsConsumption: {
          usersUsed: usersCount,
          userLimit: perBranchUserLimit,
          storageUsedMb,
          storageLimitMb: perBranchStorageLimitMb,
        },
      };
    })
  );

  return {
    branches: branchSummaries,
    totalBranches: branches.length,
    planCode,
  };
};


// --- List branches ---
const listBranches = async (restaurantId, options = {}) => {
  await ensurePrimaryBranch(restaurantId);
  const { page = 1, limit = 20, status } = options;
  const skip = (page - 1) * limit;
  const query = { restaurant: restaurantId };
  if (status) query.status = status;

  const [items, total] = await Promise.all([
    Branch.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('manager', 'name email role'),
    Branch.countDocuments(query),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// --- Get single branch ---
const getBranch = async (restaurantId, branchId) => {
  const branch = await Branch.findOne({ _id: branchId, restaurant: restaurantId }).populate(
    'manager',
    'name email role'
  );
  if (!branch) {
    throw ApiError.notFound('Branch not found.');
  }
  return branch;
};

// --- Update Branch (name/code) ---
const updateBranch = async (restaurantId, branchId, updates) => {
  const branch = await getBranchOrFail(restaurantId, branchId);

  if (updates.name && updates.name !== branch.name) {
    const existing = await Branch.findOne({
      restaurant: restaurantId,
      name: updates.name,
      _id: { $ne: branchId },
    });
    if (existing) {
      throw ApiError.conflict('A branch with this name already exists for this restaurant.');
    }
  }

  if (updates.code && updates.code !== branch.code) {
    const existing = await Branch.findOne({
      restaurant: restaurantId,
      code: updates.code,
      _id: { $ne: branchId },
    });
    if (existing) {
      throw ApiError.conflict('A branch with this code already exists for this restaurant.');
    }
  }

  Object.assign(branch, updates);
  await branch.save();
  return branch;
};

// --- Delete Branch ---
const deleteBranch = async (restaurantId, branchId) => {
  const branch = await getBranchOrFail(restaurantId, branchId);
  await branch.deleteOne();
  return { deleted: true };
};

// --- Branch Address ---
const updateAddress = async (restaurantId, branchId, address) => {
  const branch = await getBranchOrFail(restaurantId, branchId);
  branch.address = address;
  await branch.save();
  return branch.address;
};

// --- Contact Details ---
const updateContact = async (restaurantId, branchId, contact) => {
  const branch = await getBranchOrFail(restaurantId, branchId);
  branch.contact = contact;
  await branch.save();
  return branch.contact;
};

// --- Operating Hours ---
const updateOperatingHours = async (restaurantId, branchId, operatingHours) => {
  const branch = await getBranchOrFail(restaurantId, branchId);
  branch.operatingHours = operatingHours;
  await branch.save();
  return branch.operatingHours;
};

// --- Branch Manager Assignment ---
const assignManager = async (restaurantId, branchId, managerId) => {
  const branch = await getBranchOrFail(restaurantId, branchId);

  if (managerId) {
    await assertValidManager(managerId, restaurantId);
  }

  branch.manager = managerId || null;
  await branch.save();
  await branch.populate('manager', 'name email role');
  return branch.manager;
};

// --- Branch Status ---
const updateStatus = async (restaurantId, branchId, status) => {
  const branch = await getBranchOrFail(restaurantId, branchId);
  branch.status = status;
  await branch.save();
  return branch;
};

// --- Eligible managers lookup (for the manager-assignment picker) ---
const listEligibleManagers = async (restaurantId) => {
  const users = await User.find({
    restaurant: restaurantId,
    role: { $in: MANAGER_ELIGIBLE_ROLES },
    isActive: true,
  })
    .select('name email role')
    .sort({ name: 1 });
  return users;
};

/**
 * Phase 2 — Admin Creates Manager Account (1 per branch).
 * Enforces strict 1-to-1 relationship. Reassignments leave old branch managerless (Option A transfer).
 */
const createBranchManager = async (restaurantId, branchId, { name, email, password, phone }, adminUser) => {
  const auditService = require('../superAdmin/audit.service');

  const branch = await getBranchOrFail(restaurantId, branchId);

  // Check if an account with this email already exists
  let existingUser = await User.findOne({ email, restaurant: restaurantId });
  let managerUser;

  if (existingUser) {
    if (existingUser.role !== ROLES.MANAGER) {
      throw ApiError.badRequest('An account with this email exists but is not a Manager.');
    }
    // Reassign existing Manager to this branch (Option A Transfer)
    if (existingUser.branch && existingUser.branch.toString() !== branchId) {
      // Clear old branch's manager pointer
      await Branch.updateOne({ _id: existingUser.branch }, { manager: null });
    }
    existingUser.name = name || existingUser.name;
    existingUser.phone = phone || existingUser.phone;
    existingUser.branch = branch._id;
    if (password) {
      existingUser.password = password;
      existingUser.isPasswordResetRequired = true;
    }
    await existingUser.save();
    managerUser = existingUser;
  } else {
    // Create brand new Manager account
    managerUser = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role: ROLES.MANAGER,
      restaurant: restaurantId,
      branch: branch._id,
      isEmailVerified: true,
      isActive: true,
      isPasswordResetRequired: true,
    });
  }

  // Clear previous branch manager's branch ref if branch had a different manager
  if (branch.manager && branch.manager.toString() !== managerUser._id.toString()) {
    await User.updateOne({ _id: branch.manager }, { branch: null });
  }

  branch.manager = managerUser._id;
  await branch.save();

  // Audit log
  await auditService.logAction({
    restaurantId,
    userId: adminUser?._id || null,
    userEmail: adminUser?.email || 'admin',
    userRole: adminUser?.role || 'owner',
    action: 'MANAGER_CREATED',
    resource: 'Branch',
    details: { branchId, branchName: branch.name, managerEmail: managerUser.email },
  });

  return { manager: managerUser.toSafeObject(), branch };
};

/**
 * Phase 3 — Manager Creates Staff or Kitchen (Chef) Accounts strictly scoped to their branch.
 */
const createBranchStaff = async (restaurantId, managerUser, { name, email, password, phone, role }) => {
  const auditService = require('../superAdmin/audit.service');

  if (!managerUser.branch) {
    throw ApiError.forbidden('Manager account is not assigned to any branch.');
  }

  const targetRole = role === ROLES.CHEF ? ROLES.CHEF : ROLES.STAFF;
  const branchId = managerUser.branch.toString();

  const existingUser = await User.findOne({ email, restaurant: restaurantId });
  if (existingUser) {
    throw ApiError.conflict('An account with this email address already exists for this restaurant.');
  }

  const staffUser = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: targetRole,
    restaurant: restaurantId,
    branch: branchId,
    isEmailVerified: true,
    isActive: true,
    isPasswordResetRequired: true,
  });

  // Audit log
  await auditService.logAction({
    restaurantId,
    userId: managerUser._id,
    userEmail: managerUser.email,
    userRole: managerUser.role,
    action: 'STAFF_CREATED',
    resource: 'User',
    details: { staffId: staffUser._id, role: targetRole, branchId },
  });

  return staffUser.toSafeObject();
};

/**
 * List all users belonging to a specific branch.
 */
const listBranchUsers = async (restaurantId, branchId) => {
  const users = await User.find({ restaurant: restaurantId, branch: branchId })
    .select('-password')
    .sort({ role: 1, name: 1 });
  return users;
};

/**
 * Owner creates a Manager account assigned to one or more branches (M:N mapping).
 */
const createOwnerManager = async (restaurantId, { name, email, password, phone, branchIds }, requestingUser) => {
  if (!branchIds || !Array.isArray(branchIds) || branchIds.length === 0) {
    throw ApiError.badRequest('At least one branch must be assigned to the manager.');
  }

  // Verify all branchIds belong to the restaurant
  const validBranches = await Branch.find({ _id: { $in: branchIds }, restaurant: restaurantId });
  if (validBranches.length !== branchIds.length) {
    throw ApiError.badRequest('One or more selected branches do not belong to this restaurant.');
  }

  const existing = await User.findOne({ email, restaurant: restaurantId });
  if (existing) {
    throw ApiError.conflict('A user with this email already exists in this restaurant.');
  }

  const managerUser = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: ROLES.MANAGER,
    restaurant: restaurantId,
    branch: branchIds[0], // primary branch context
    isEmailVerified: true,
    isActive: true,
  });

  // Create ManagerBranch M:N mappings
  const ManagerBranch = require('./managerBranch.model');
  const mappings = branchIds.map((bId) => ({
    restaurant: restaurantId,
    manager: managerUser._id,
    branch: bId,
    assignedBy: requestingUser?._id || null,
  }));
  await ManagerBranch.insertMany(mappings);

  const safeManager = managerUser.toSafeObject();
  safeManager.assignedBranches = validBranches;

  return safeManager;
};

/**
 * Lists all Managers for an Owner with populated multi-branch assignments.
 */
const listOwnerManagers = async (restaurantId) => {
  const ManagerBranch = require('./managerBranch.model');
  const managers = await User.find({ restaurant: restaurantId, role: ROLES.MANAGER })
    .select('-password')
    .sort({ name: 1 });

  const managerIds = managers.map((m) => m._id);
  const mappings = await ManagerBranch.find({ manager: { $in: managerIds } })
    .populate('branch', 'name code status address contact');

  const mappingMap = new Map();
  mappings.forEach((m) => {
    const key = m.manager.toString();
    if (!mappingMap.has(key)) mappingMap.set(key, []);
    if (m.branch) mappingMap.get(key).push(m.branch);
  });

  return managers.map((m) => {
    const obj = m.toObject();
    obj.assignedBranches = mappingMap.get(m._id.toString()) || [];
    return obj;
  });
};

/**
 * Gets Manager activity logs for Owner dashboard.
 */
const getOwnerManagerLogs = async (restaurantId) => {
  const AuthLog = require('../auth/authLog.model');
  const logs = await AuthLog.find({ restaurant: restaurantId, role: ROLES.MANAGER })
    .populate('branch', 'name code')
    .populate('assignedBranches', 'name code')
    .sort({ createdAt: -1 })
    .limit(100);
  return logs;
};

/**
 * Drilldown into a specific branch's Staff or Kitchen activity logs (Owner view).
 */
const getOwnerBranchLogs = async (restaurantId, branchId, accountType) => {
  const AuthLog = require('../auth/authLog.model');
  const targetRoles = accountType === 'kitchen' ? [ROLES.KITCHEN, ROLES.CHEF] : [ROLES.STAFF];
  const logs = await AuthLog.find({
    restaurant: restaurantId,
    branch: branchId,
    role: { $in: targetRoles },
  })
    .populate('branch', 'name code')
    .sort({ createdAt: -1 })
    .limit(100);
  return logs;
};

/**
 * Helper to get a Manager's assigned branch IDs.
 */
const getManagerAssignedBranchIds = async (managerId) => {
  const ManagerBranch = require('./managerBranch.model');
  const mappings = await ManagerBranch.find({ manager: managerId }).select('branch');
  return mappings.map((m) => m.branch.toString());
};

/**
 * Creates a Staff account scoped to a manager's assigned branch.
 */
const createManagerScopedStaff = async (restaurantId, { name, email, password, phone, branchId, designation, department }, requestingUser) => {
  if (requestingUser.role === ROLES.MANAGER) {
    const assignedBranchIds = await getManagerAssignedBranchIds(requestingUser._id);
    if (!assignedBranchIds.includes(branchId.toString())) {
      throw ApiError.forbidden('You are not assigned to manage this branch.');
    }
  }

  await getBranchOrFail(restaurantId, branchId);

  const existing = await User.findOne({ email, restaurant: restaurantId });
  if (existing) {
    throw ApiError.conflict('A user with this email already exists in this restaurant.');
  }

  const staffUser = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: ROLES.STAFF,
    restaurant: restaurantId,
    branch: branchId,
    isEmailVerified: true,
    isActive: true,
  });

  return staffUser.toSafeObject();
};

/**
 * Creates a Kitchen account scoped to a manager's assigned branch.
 */
const createManagerScopedKitchen = async (restaurantId, { name, email, password, phone, branchId, kitchenStation }, requestingUser) => {
  if (requestingUser.role === ROLES.MANAGER) {
    const assignedBranchIds = await getManagerAssignedBranchIds(requestingUser._id);
    if (!assignedBranchIds.includes(branchId.toString())) {
      throw ApiError.forbidden('You are not assigned to manage this branch.');
    }
  }

  await getBranchOrFail(restaurantId, branchId);

  const existing = await User.findOne({ email, restaurant: restaurantId });
  if (existing) {
    throw ApiError.conflict('A user with this email already exists in this restaurant.');
  }

  const kitchenUser = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: ROLES.KITCHEN,
    restaurant: restaurantId,
    branch: branchId,
    isEmailVerified: true,
    isActive: true,
  });

  return kitchenUser.toSafeObject();
};

/**
 * Lists Staff & Kitchen accounts scoped to a Manager's assigned branches.
 */
const listManagerScopedAccounts = async (restaurantId, { branchId, role }, requestingUser) => {
  let targetBranchIds = [];
  if (requestingUser.role === ROLES.MANAGER) {
    targetBranchIds = await getManagerAssignedBranchIds(requestingUser._id);
    if (branchId && !targetBranchIds.includes(branchId.toString())) {
      throw ApiError.forbidden('You do not have access to this branch.');
    }
    if (branchId) targetBranchIds = [branchId];
  } else if (branchId) {
    targetBranchIds = [branchId];
  }

  const filter = { restaurant: restaurantId };
  if (targetBranchIds.length > 0) {
    filter.branch = { $in: targetBranchIds };
  }
  if (role) {
    filter.role = role === 'kitchen' ? { $in: [ROLES.KITCHEN, ROLES.CHEF] } : role;
  } else {
    filter.role = { $in: [ROLES.STAFF, ROLES.KITCHEN, ROLES.CHEF] };
  }

  const users = await User.find(filter)
    .populate('branch', 'name code')
    .select('-password')
    .sort({ role: 1, name: 1 });
  return users;
};

/**
 * Retrieves activity logs for Staff or Kitchen accounts scoped to Manager's assigned branches.
 */
const getManagerScopedLogs = async (restaurantId, targetRole, queryBranchId, requestingUser) => {
  let targetBranchIds = [];
  if (requestingUser.role === ROLES.MANAGER) {
    targetBranchIds = await getManagerAssignedBranchIds(requestingUser._id);
    if (queryBranchId && !targetBranchIds.includes(queryBranchId.toString())) {
      throw ApiError.forbidden('You do not have access to logs for this branch.');
    }
    if (queryBranchId) targetBranchIds = [queryBranchId];
  } else if (queryBranchId) {
    targetBranchIds = [queryBranchId];
  }

  const roleFilter = targetRole === 'kitchen' ? [ROLES.KITCHEN, ROLES.CHEF] : [ROLES.STAFF];
  const filter = { restaurant: restaurantId, role: { $in: roleFilter } };
  if (targetBranchIds.length > 0) {
    filter.branch = { $in: targetBranchIds };
  }

  const AuthLog = require('../auth/authLog.model');
  const logs = await AuthLog.find(filter)
    .populate('branch', 'name code')
    .sort({ createdAt: -1 })
    .limit(100);
  return logs;
};

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
  createOwnerManager,
  listOwnerManagers,
  getOwnerManagerLogs,
  getOwnerBranchLogs,
  createManagerScopedStaff,
  createManagerScopedKitchen,
  listManagerScopedAccounts,
  getManagerScopedLogs,
};

