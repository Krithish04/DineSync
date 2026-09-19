const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const env = require('./config/env.config');
const routes = require('./routes/index.routes');
const notFoundMiddleware = require('./middlewares/notFound.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

const { corsOptions } = require('./config/cors.config');

const nosqlSanitizeMiddleware = require('./middlewares/nosqlSanitize.middleware');

const app = express();

// Trust proxy setup for reverse proxies (Nginx / Cloud Load Balancers / Tunnels)
app.set('trust proxy', env.TRUST_PROXY);

// Force HTTPS redirect in production if forwarded over HTTP
app.use((req, res, next) => {
  if (env.isProduction && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Security headers
app.use(helmet());

// CORS - allows configured CLIENT_URL, dev tunnels, and local environments
app.use(cors(corsOptions));

// Body & cookie parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// NoSQL Operator Injection Sanitization
app.use(nosqlSanitizeMiddleware);

// Logging
if (env.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting on API routes (relaxed in development to prevent 429 errors during testing)
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.isDevelopment ? 10000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// Root
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the DineSync AI API',
    data: { docs: '/api/v1/health' },
  });
});

// Versioned API routes
app.use('/api/v1', routes);

// 404 + global error handler (must be last)
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
