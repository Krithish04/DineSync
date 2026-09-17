const mongoose = require('mongoose');

const { Schema } = mongoose;

const systemHealthSnapshotSchema = new Schema(
  {
    apiStatus: { type: String, required: true, default: 'Healthy' },
    databaseStatus: { type: String, required: true, default: 'Healthy' },
    aiServiceStatus: { type: String, required: true, default: 'Healthy' },
    backgroundJobsRunner: { type: String, default: 'Healthy' },
    activeCronJobsCount: { type: Number, default: 0 },
    uptimeSeconds: { type: Number, default: 0 },
    nodeMemoryUsageMb: { type: Number, default: 0 },
    degradedComponents: { type: [String], default: [] },
  },
  { timestamps: true }
);

systemHealthSnapshotSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SystemHealthSnapshot', systemHealthSnapshotSchema);
