const jwt = require('jsonwebtoken');
const env = require('../config/env.config');

/**
 * Signs a JWT access token embedding tenant + role context.
 * @param {{ id: string, role: string, restaurantId: string|null }} payload
 * @returns {string}
 */
const signToken = (payload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

/**
 * Verifies a JWT and returns its decoded payload.
 * Throws jsonwebtoken errors (TokenExpiredError, JsonWebTokenError) on failure.
 * @param {string} token
 */
const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);

/**
 * Sets the JWT as an httpOnly cookie on the response.
 */
const setTokenCookie = (res, token) => {
  const expiresInMs = env.JWT_COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    expires: new Date(Date.now() + expiresInMs),
  });
};

const clearTokenCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
  });
};

module.exports = { signToken, verifyToken, setTokenCookie, clearTokenCookie };
