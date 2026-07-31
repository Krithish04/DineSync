const cron = require('node-cron');
const ScheduledReport = require('./scheduledReport.model');
const reportService = require('./report.service');
const { sendEmail } = require('../../utils/email.util');
const ApiError = require('../../utils/ApiError');

// ==========================================
// CRUD
// ==========================================

const createScheduledReport = async (restaurantId, payload, userId) => {
  return ScheduledReport.create({
    ...payload,
    restaurant: restaurantId,
    createdBy: userId,
  });
};

const listScheduledReports = async (restaurantId) => {
  return ScheduledReport.find({ restaurant: restaurantId }).sort({ createdAt: -1 });
};

const updateScheduledReport = async (restaurantId, reportId, updates) => {
  const report = await ScheduledReport.findOneAndUpdate(
    { _id: reportId, restaurant: restaurantId },
    updates,
    { new: true }
  );
  if (!report) throw ApiError.notFound('Scheduled report not found.');
  return report;
};

const deleteScheduledReport = async (restaurantId, reportId) => {
  const report = await ScheduledReport.findOneAndDelete({ _id: reportId, restaurant: restaurantId });
  if (!report) throw ApiError.notFound('Scheduled report not found.');
  return { deleted: true };
};

// ==========================================
// REPORT EMAIL BUILDER
// ==========================================

const REPORT_LABELS = {
  sales_summary: 'Sales Summary',
  order_summary: 'Order Summary',
  financial_summary: 'Financial Summary',
  inventory_summary: 'Inventory Summary',
  customer_summary: 'Customer Summary',
  employee_attendance: 'Employee Attendance Summary',
};

const buildReportHtml = (reportType, data, dateLabel) => {
  const rows = Object.entries(data)
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;text-transform:capitalize">${k.replace(/([A-Z])/g, ' $1')}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${typeof v === 'number' ? v.toLocaleString() : v}</td></tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>DineSync AI Report</title></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    <div style="background:#c2440f;padding:24px 28px">
      <h1 style="margin:0;font-size:22px;color:#fff">DineSync AI</h1>
      <p style="margin:4px 0 0;color:#fde6d0;font-size:14px">Scheduled ${REPORT_LABELS[reportType] || 'Report'}</p>
    </div>
    <div style="padding:24px 28px">
      <p style="color:#374151;margin:0 0 16px">Period: <strong>${dateLabel}</strong></p>
      <table style="width:100%;border-collapse:collapse">
        ${rows}
      </table>
    </div>
    <div style="background:#f3f4f6;padding:16px 28px;font-size:12px;color:#9ca3af">
      This is an automated report from DineSync AI. Do not reply to this email.
    </div>
  </div>
</body>
</html>`;
};

// ==========================================
// FETCH REPORT DATA BY TYPE
// ==========================================

const fetchReportData = async (restaurantId, reportType) => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endDate = now.toISOString().slice(0, 10);
  const params = { startDate, endDate };

  switch (reportType) {
    case 'sales_summary': {
      const r = await reportService.getSalesSummary(restaurantId, params);
      return r.totals || {};
    }
    case 'order_summary': {
      const r = await reportService.getOrderSummary(restaurantId, params);
      return r.summary || {};
    }
    case 'financial_summary':
      return reportService.getFinancialSummary(restaurantId, params);
    case 'inventory_summary':
      return reportService.getInventorySummary(restaurantId);
    case 'customer_summary': {
      const r = await reportService.getCustomerSummary(restaurantId, params);
      return { newCustomers: r.newCustomers, returningCustomers: r.returningCustomers };
    }
    case 'employee_attendance': {
      const r = await reportService.getAttendanceSummary(restaurantId, {
        startDate: now.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
      });
      return { employeesPresent: r.avgWorkingHours, totalOvertime: r.totalOvertime };
    }
    default:
      return {};
  }
};

// ==========================================
// CRON RUNNER
// ==========================================

/**
 * Dispatches all active scheduled reports whose frequency matches the current
 * trigger (daily, weekly, monthly).  Called by the cron jobs below.
 */
const dispatchScheduledReports = async (frequency) => {
  const reports = await ScheduledReport.find({ isActive: true, frequency });

  for (const report of reports) {
    try {
      const data = await fetchReportData(report.restaurant.toString(), report.reportType);

      const now = new Date();
      const dateLabel = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

      await sendEmail({
        to: report.recipientEmails.join(', '),
        subject: `[DineSync AI] ${REPORT_LABELS[report.reportType] || 'Report'} — ${dateLabel}`,
        html: buildReportHtml(report.reportType, data, dateLabel),
      });

      report.lastSentAt = new Date();
      await report.save();

      // eslint-disable-next-line no-console
      console.log(`[ScheduledReport] Sent "${report.reportType}" (${frequency}) to ${report.recipientEmails.join(', ')}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[ScheduledReport] Failed for report ${report._id}:`, err.message);
    }
  }
};

/**
 * Registers all cron jobs.  Call once at server boot.
 */
const startScheduledReportRunner = () => {
  // Daily at 07:00 AM
  cron.schedule('0 7 * * *', () => dispatchScheduledReports('daily'));

  // Weekly — every Monday at 07:00 AM
  cron.schedule('0 7 * * 1', () => dispatchScheduledReports('weekly'));

  // Monthly — 1st of every month at 07:00 AM
  cron.schedule('0 7 1 * *', () => dispatchScheduledReports('monthly'));

  // eslint-disable-next-line no-console
  console.log('[ScheduledReport] Cron runner started (daily@07:00, weekly@Mon07:00, monthly@1st07:00)');
};

module.exports = {
  createScheduledReport,
  listScheduledReports,
  updateScheduledReport,
  deleteScheduledReport,
  startScheduledReportRunner,
};
