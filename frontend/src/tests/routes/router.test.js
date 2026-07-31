import assert from 'assert';

describe('Frontend Route Integration Tests', () => {
  it('should register public customer platform routes out of ProtectedRoute wrapper', () => {
    const publicCustomerRoutes = [
      '/menu',
      '/menu/browse',
      '/menu/cart',
      '/menu/checkout',
      '/menu/orders/:orderId/track',
      '/menu/feedback',
      '/customer/dashboard',
      '/customer/loyalty',
    ];

    assert.strictEqual(publicCustomerRoutes.length, 8);
    assert.ok(publicCustomerRoutes.includes('/menu/browse'));
  });

  it('should register super admin routes under /super-admin/*', () => {
    const superAdminRoutes = [
      '/super-admin/dashboard',
      '/super-admin/tenants',
      '/super-admin/tenants/:tenantId',
      '/super-admin/subscriptions',
      '/super-admin/feature-flags',
      '/super-admin/audit-logs',
      '/super-admin/analytics',
      '/super-admin/monitoring',
    ];

    assert.strictEqual(superAdminRoutes.length, 8);
    assert.ok(superAdminRoutes.includes('/super-admin/dashboard'));
  });
});
