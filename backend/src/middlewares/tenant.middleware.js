const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Restaurant = require('../features/tenant/tenant.model');

/**
 * Resolves the restaurant tenant for the current request based on,
 * in order of priority:
 *   1. `x-tenant-slug` header
 *   2. `tenant` query parameter
 *   3. subdomain (e.g. `pizzahub.dinesync.ai`)
 *
 * Attaches the resolved restaurant document to req.resolvedTenant.
 * Use this on public routes (e.g. login, menu browsing) where the tenant
 * must be known before a JWT even exists.
 */
const resolveTenant = asyncHandler(async (req, res, next) => {
  let slug = req.headers['x-tenant-slug'] || req.query.tenant || null;

  if (!slug && req.hostname) {
    const parts = req.hostname.split('.');
    if (parts.length > 2) {
      slug = parts[0];
    }
  }

  if (!slug) {
    throw ApiError.badRequest(
      'Restaurant tenant could not be resolved. Provide an x-tenant-slug header or tenant query param.'
    );
  }

  const restaurant = await Restaurant.findOne({ slug, isActive: true });
  if (!restaurant) {
    throw ApiError.notFound(`No active restaurant found for tenant "${slug}"`);
  }

  req.resolvedTenant = restaurant;
  next();
});

/**
 * Same as resolveTenant but does not throw if the tenant is missing —
 * useful for platform-level routes that optionally accept a tenant scope.
 */
const resolveTenantOptional = asyncHandler(async (req, res, next) => {
  const slug = req.headers['x-tenant-slug'] || req.query.tenant || null;
  if (!slug) return next();

  const restaurant = await Restaurant.findOne({ slug, isActive: true });
  req.resolvedTenant = restaurant || null;
  next();
});

module.exports = { resolveTenant, resolveTenantOptional };
