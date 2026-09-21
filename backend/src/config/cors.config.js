const env = require('./env.config');

const rawClientUrls = env.CLIENT_URL || 'http://localhost:5173';
const configuredOrigins = rawClientUrls
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

/**
 * Validates whether an incoming request origin is permitted.
 * Supports:
 * - Server-to-server / non-browser clients (!origin)
 * - Explicitly configured CLIENT_URL(s) in environment
 * - Dev tunnels (.devtunnels.ms, .ngrok-free.app, .loca.lt)
 * - Localhost & loopback addresses (localhost, 127.0.0.1)
 */
const isAllowedOrigin = (origin, callback) => {
  if (!origin) {
    return callback ? callback(null, true) : true;
  }

  const isConfigured = configuredOrigins.some(
    (allowed) => allowed === origin || allowed === origin.replace(/\/$/, '')
  );

  const isLocalOrTunnel =
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.onrender.com') ||
    origin.endsWith('.devtunnels.ms') ||
    origin.endsWith('.ngrok-free.app') ||
    origin.endsWith('.ngrok.io') ||
    origin.endsWith('.loca.lt');

  if (isConfigured || isLocalOrTunnel) {
    return callback ? callback(null, true) : true;
  }

  const error = new Error(`CORS policy blocked request from origin: ${origin}`);
  return callback ? callback(error, false) : false;
};

const corsOptions = {
  origin: isAllowedOrigin,
  credentials: true,
};

module.exports = {
  corsOptions,
  isAllowedOrigin,
};
