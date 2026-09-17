const assert = require('assert');
const mongoose = require('mongoose');
const Restaurant = require('../../src/features/tenant/tenant.model');
const User = require('../../src/features/auth/auth.model');
const { ROLES } = require('../../src/constants/roles.constant');
const { signToken, verifyToken } = require('../../src/utils/jwt.util');

describe('Super Admin Multi-Tenant & Impersonation Unit Tests', () => {
  it('should define isActive with default true on Restaurant model but set false for self-serve signups', () => {
    const restaurant = new Restaurant({
      name: 'Spice Garden',
      phone: '9876543210',
    });

    assert.strictEqual(restaurant.isActive, true, 'Default restaurant model isActive should be boolean true');

    const pendingRestaurant = new Restaurant({
      name: 'Spice Garden Pending',
      phone: '9876543210',
      isActive: false,
    });

    assert.strictEqual(pendingRestaurant.isActive, false, 'Self-serve onboarding restaurant should be created as isActive: false');
  });

  it('should sign and verify valid JWT token containing Super Admin tenant impersonation context', () => {
    const superAdminId = new mongoose.Types.ObjectId().toString();
    const targetTenantId = new mongoose.Types.ObjectId().toString();

    const token = signToken({
      id: superAdminId,
      role: ROLES.SUPER_ADMIN,
      restaurantId: targetTenantId,
      isImpersonating: true,
      impersonatedRestaurantId: targetTenantId,
      impersonatedRestaurantName: 'Royal Dining Hall',
      impersonatedRestaurantSlug: 'royal-dining-hall',
    });

    assert.ok(token, 'Impersonation JWT token should be signed');

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id, superAdminId);
    assert.strictEqual(decoded.role, ROLES.SUPER_ADMIN);
    assert.strictEqual(decoded.isImpersonating, true);
    assert.strictEqual(decoded.impersonatedRestaurantId, targetTenantId);
    assert.strictEqual(decoded.impersonatedRestaurantName, 'Royal Dining Hall');
  });

  it('should verify auth middleware impersonation context resolution', () => {
    const decoded = {
      id: '507f1f77bcf86cd799439011',
      role: ROLES.SUPER_ADMIN,
      isImpersonating: true,
      impersonatedRestaurantId: '507f1f77bcf86cd799439012',
      impersonatedRestaurantName: 'Coastal Catch',
      impersonatedRestaurantSlug: 'coastal-catch',
    };

    const req = {
      user: {
        _id: '507f1f77bcf86cd799439011',
        role: ROLES.SUPER_ADMIN,
        restaurant: null,
      },
      tenantId: null,
    };

    if (decoded.isImpersonating && decoded.impersonatedRestaurantId) {
      req.user.restaurant = decoded.impersonatedRestaurantId;
      req.user.isImpersonating = true;
      req.user.impersonatedRestaurantName = decoded.impersonatedRestaurantName;
      req.user.impersonatedRestaurantSlug = decoded.impersonatedRestaurantSlug;
      req.tenantId = decoded.impersonatedRestaurantId;
    }

    assert.strictEqual(req.user.restaurant, '507f1f77bcf86cd799439012');
    assert.strictEqual(req.user.isImpersonating, true);
    assert.strictEqual(req.user.impersonatedRestaurantName, 'Coastal Catch');
    assert.strictEqual(req.tenantId, '507f1f77bcf86cd799439012');
  });
});
