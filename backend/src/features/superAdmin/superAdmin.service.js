const mongoose = require('mongoose');
const axios = require('axios');
const Restaurant = require('../tenant/tenant.model');
const Branch = require('../branch/branch.model');
const User = require('../auth/auth.model');
const TenantSubscription = require('./tenantSubscription.model');
const subscriptionService = require('./subscription.service');
const auditService = require('./audit.service');
const jobSchedulerService = require('../notification/jobScheduler.service');
const env = require('../../config/env.config');
const ApiError = require('../../utils/ApiError');

// ==========================================
// 1. SAAS PLATFORM OVERVIEW METRICS
// ==========================================
const getPlatformOverview = async () => {
  const [totalTenants, activeTenants, totalUsers, totalBranches, subscriptions] = await Promise.all([
    Restaurant.countDocuments(),
    Restaurant.countDocuments({ isActive: true }),
    User.countDocuments({ isDeleted: false }),
    Branch.countDocuments(),
    TenantSubscription.find({ status: 'Active' }),
  ]);

  const mrr = subscriptions.reduce((sum, sub) => {
    const priceMap = { starter: 1999, pro: 4999, enterprise: 9999 };
    return sum + (priceMap[sub.planCode] || 1999);
  }, 0);

  const arr = mrr * 12;

  return {
    mrr,
    arr,
    totalTenants,
    activeTenants,
    pendingTenants: Math.max(0, totalTenants - activeTenants),
    totalUsers,
    totalBranches,
    estimatedStorageMb: totalTenants * 150 + totalUsers * 5, // 150MB avg per tenant
  };
};

// ==========================================
// 2. TENANT LIFECYCLE MANAGEMENT
// ==========================================
const listTenants = async (query = {}) => {
  const { search, status, limit = 50, page = 1 } = query;
  const match = {};

  if (status === 'active') match.isActive = true;
  if (status === 'suspended') match.isActive = false;

  if (search) {
    match.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [tenants, total] = await Promise.all([
    Restaurant.find(match)
      .populate('owner', 'fullName email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Restaurant.countDocuments(match),
  ]);

  return { tenants, total, page: Number(page), limit: Number(limit) };
};

const getTenantDetails = async (restaurantId) => {
  const restaurant = await Restaurant.findById(restaurantId).populate('owner', 'fullName email phoneNumber role');
  if (!restaurant) throw ApiError.notFound('Restaurant tenant not found.');

  const [branchesCount, usersCount, subscription] = await Promise.all([
    Branch.countDocuments({ restaurant: restaurantId }),
    User.countDocuments({ restaurant: restaurantId, isDeleted: false }),
    subscriptionService.getTenantSubscription(restaurantId),
  ]);

  return {
    restaurant,
    branchesCount,
    usersCount,
    subscription,
    storageUsageMb: branchesCount * 120 + usersCount * 10 + 200,
  };
};

const updateTenantStatus = async (restaurantId, action, adminUser) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw ApiError.notFound('Restaurant tenant not found.');

  if (action === 'approve' || action === 'reactivate') {
    restaurant.isActive = true;
    await subscriptionService.updateTenantSubscription(restaurantId, { status: 'Active' });
  } else if (action === 'suspend') {
    restaurant.isActive = false;
    await subscriptionService.updateTenantSubscription(restaurantId, { status: 'Suspended' });
  } else if (action === 'delete') {
    restaurant.isActive = false;
    await subscriptionService.updateTenantSubscription(restaurantId, { status: 'Cancelled' });
  }

  await restaurant.save();

  await auditService.logAction({
    restaurantId,
    userId: adminUser?._id,
    userEmail: adminUser?.email,
    userRole: adminUser?.role,
    action: `TENANT_${action.toUpperCase()}`,
    resource: restaurant.name,
  });

  return restaurant;
};

// ==========================================
// 3. SYSTEM HEALTH & MONITORING
// ==========================================
const getSystemHealth = async () => {
  const dbState = mongoose.connection.readyState === 1 ? 'Healthy (Connected)' : 'Degraded';

  // Check FastAPI AI microservice
  let aiStatus = 'Offline';
  try {
    const res = await axios.get(`${env.AI_SERVICE_URL.replace('/api/v1', '')}/`, { timeout: 2000 });
    if (res.status === 200) aiStatus = 'Healthy (Online)';
  } catch {
    aiStatus = 'Offline (Fallback active)';
  }

  const jobs = jobSchedulerService.getJobLogs();

  return {
    apiStatus: 'Healthy (Online)',
    databaseStatus: dbState,
    aiServiceStatus: aiStatus,
    backgroundJobsRunner: 'Healthy (Running)',
    activeCronJobsCount: jobs.length,
    uptimeSeconds: Math.round(process.uptime()),
    nodeMemoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };
};

module.exports = {
  getPlatformOverview,
  listTenants,
  getTenantDetails,
  updateTenantStatus,
  getSystemHealth,
};
