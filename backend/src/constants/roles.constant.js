/**
 * Platform-wide roles.
 * - super_admin: DineSync AI platform owner, not tied to any single restaurant tenant.
 * - owner: Owns/manages a restaurant tenant, created together with the tenant.
 * - manager / staff: Operate within a restaurant tenant.
 * - customer: End diner, may belong to a specific restaurant's customer base
 *   or be a platform-wide customer depending on business rules.
 */
const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
  CUSTOMER: 'customer',
});

const ROLE_VALUES = Object.values(ROLES);

// Roles that must always belong to a restaurant (tenant) document.
const TENANT_SCOPED_ROLES = [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER];

module.exports = { ROLES, ROLE_VALUES, TENANT_SCOPED_ROLES };
