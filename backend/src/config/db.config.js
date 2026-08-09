const mongoose = require('mongoose');
const env = require('./env.config');

// Register all Mongoose models
require('../models');

mongoose.set('strictQuery', true);

const cleanupLegacyIndexes = async () => {
  try {
    const collections = await mongoose.connection.db.collections();
    for (const col of collections) {
      const indexes = await col.indexes();
      for (const idx of indexes) {
        if (idx.name !== '_id_' && Object.keys(idx.key || {}).includes('branch')) {
          // eslint-disable-next-line no-console
          console.log(`[MongoDB] Dropping legacy index '${idx.name}' on collection '${col.collectionName}'...`);
          await col.dropIndex(idx.name);
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[MongoDB] Warning cleaning up legacy indexes: ${err.message}`);
  }
};

/**
 * Connects to MongoDB using Mongoose.
 * Exits the process on failure so orchestrators (pm2/docker) can restart it.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      autoIndex: !env.isProduction,
    });

    // eslint-disable-next-line no-console
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Drop obsolete legacy indexes (e.g. branch_1_tableNumber_1_isDeleted_1) that cause duplicate key conflicts
    await cleanupLegacyIndexes();

    // Auto-sync paid orders, invoice records, and customer CRM metrics
    const { syncPaidInvoicesAndCustomerStats } = require('../utils/syncData.util');
    await syncPaidInvoicesAndCustomerStats();

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
