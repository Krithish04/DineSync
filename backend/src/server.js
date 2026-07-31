const http = require('http');
const app = require('./app');
const env = require('./config/env.config');
const { connectDB, disconnectDB } = require('./config/db.config');
const { initSocket } = require('./config/socket.config');
const { startScheduledReportRunner } = require('./features/reports/scheduledReport.service');
const { startJobScheduler } = require('./features/notification/jobScheduler.service');

const server = http.createServer(app);
initSocket(server);

const start = async () => {
  await connectDB();
  startScheduledReportRunner();
  startJobScheduler();

  server.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[Server] DineSync AI backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
};

const shutdown = async (signal) => {
  // eslint-disable-next-line no-console
  console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await disconnectDB();
    // eslint-disable-next-line no-console
    console.log('[Server] Shutdown complete.');
    process.exit(0);
  });

  // Force-exit if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[Server] Unhandled Promise Rejection:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  // eslint-disable-next-line no-console
  console.error('[Server] Uncaught Exception:', error);
  process.exit(1);
});

start();
