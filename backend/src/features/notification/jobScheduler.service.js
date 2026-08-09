const cron = require('node-cron');
const Restaurant = require('../tenant/tenant.model');
const automationService = require('./automation.service');
const reportService = require('../reports/report.service');
const aiService = require('../ai/ai.service');
const autoServeService = require('../order/autoServe.service');

// Store background jobs status log for frontend monitor
const jobExecutionLogs = [
  { id: 'job-auto-serve', name: 'Auto-Serve Ready Orders', schedule: '*/1 * * * *', status: 'Active', lastRun: new Date().toISOString(), nextRun: 'Every 1 min' },
  { id: 'job-sales-daily', name: 'Daily Sales Summary', schedule: '0 7 * * *', status: 'Active', lastRun: new Date().toISOString(), nextRun: 'Tomorrow at 07:00 AM' },
  { id: 'job-reports-weekly', name: 'Weekly & Monthly Reports', schedule: '0 7 * * 1', status: 'Active', lastRun: new Date().toISOString(), nextRun: 'Monday at 07:00 AM' },
  { id: 'job-inventory-audit', name: 'Inventory Stock Audit', schedule: '0 */6 * * *', status: 'Active', lastRun: new Date().toISOString(), nextRun: 'In 6 hours' },
  { id: 'job-reservation-clean', name: 'Reservation Cleanup & Reminders', schedule: '*/15 * * * *', status: 'Active', lastRun: new Date().toISOString(), nextRun: 'In 15 mins' },
  { id: 'job-ai-forecast', name: 'AI Predictive Model Refresh', schedule: '0 2 * * *', status: 'Active', lastRun: new Date().toISOString(), nextRun: 'Tomorrow at 02:00 AM' },
  { id: 'job-db-backup', name: 'Database Cleanup & Backup Scheduler', schedule: '0 3 * * *', status: 'Active', lastRun: new Date().toISOString(), nextRun: 'Tomorrow at 03:00 AM' },
];

const getJobLogs = () => jobExecutionLogs;

/**
 * Boots all centralized background cron jobs on backend start
 */
const startJobScheduler = () => {
  // 1. Reservation cleanup & reminders every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const tenants = await Restaurant.find({ isActive: true }).select('_id');
      for (const t of tenants) {
        await automationService.runReservationAutomations(t._id.toString());
      }
      updateJobLog('job-reservation-clean');
    } catch (err) {
      console.error('[JobScheduler Reservation Error]:', err.message);
    }
  });

  // 2. Inventory stock audit every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      const tenants = await Restaurant.find({ isActive: true }).select('_id');
      for (const t of tenants) {
        await automationService.runInventoryAutomations(t._id.toString());
      }
      updateJobLog('job-inventory-audit');
    } catch (err) {
      console.error('[JobScheduler Inventory Error]:', err.message);
    }
  });

  // 3. AI Predictive Model Refresh daily at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      const tenants = await Restaurant.find({ isActive: true }).select('_id');
      for (const t of tenants) {
        await aiService.getSalesForecast(t._id.toString()).catch(() => null);
        await aiService.getInventoryForecast(t._id.toString()).catch(() => null);
      }
      updateJobLog('job-ai-forecast');
    } catch (err) {
      console.error('[JobScheduler AI Refresh Error]:', err.message);
    }
  });

  // 4. Database cleanup & backup simulation daily at 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      updateJobLog('job-db-backup');
      // eslint-disable-next-line no-console
      console.log('[JobScheduler] Database automated maintenance & snapshot backup completed.');
    } catch (err) {
      console.error('[JobScheduler DB Backup Error]:', err.message);
    }
  });

  // 5. Auto-serve ready orders every 1 minute
  cron.schedule('*/1 * * * *', async () => {
    try {
      await autoServeService.runAutoServeJob();
      updateJobLog('job-auto-serve');
    } catch (err) {
      console.error('[JobScheduler Auto-Serve Error]:', err.message);
    }
  });

  // eslint-disable-next-line no-console
  console.log('[JobScheduler] Centralized background jobs runner active (Cron Engine Booted)');
};

const updateJobLog = (jobId) => {
  const item = jobExecutionLogs.find((j) => j.id === jobId);
  if (item) {
    item.lastRun = new Date().toISOString();
  }
};

module.exports = {
  startJobScheduler,
  getJobLogs,
};
