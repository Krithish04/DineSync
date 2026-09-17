const mongoose = require('mongoose');
const env = require('./env.config');

// Register all Mongoose models
require('../models');

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB using Mongoose.
 * Exits the process on failure so orchestrators (pm2/docker) can restart it.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      autoIndex: !env.isProduction,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    // eslint-disable-next-line no-console
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Run heavy maintenance tasks in the background so server startup is instant
    setImmediate(async () => {
      try {
        const { syncPaidInvoicesAndCustomerStats } = require('../utils/syncData.util');
        await syncPaidInvoicesAndCustomerStats();
      } catch (backgroundErr) {
        // eslint-disable-next-line no-console
        console.warn(`[MongoDB Background Sync] Warning: ${backgroundErr.message}`);
      }
    });

    mongoose.connection.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error(`[MongoDB] Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      // eslint-disable-next-line no-console
      console.warn('[MongoDB] Disconnected');
    });

    return conn;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[MongoDB] Initial connection failed: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
};

module.exports = { connectDB, disconnectDB };
