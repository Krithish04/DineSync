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

const app = express();

// Security headers
app.use(helmet());

// CORS - restricted to the configured client origin, credentials enabled for cookies
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Body & cookie parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

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
