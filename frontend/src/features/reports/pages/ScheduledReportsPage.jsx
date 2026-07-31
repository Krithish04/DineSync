import { useState, useEffect, useCallback } from 'react';
import { Mail, Clock, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as reportsApi from '../api/reports.api';

const REPORT_TYPE_OPTIONS = [
  { value: 'sales_summary', label: 'Sales Summary' },
  { value: 'order_summary', label: 'Order Summary' },
  { value: 'financial_summary', label: 'Financial Summary' },
  { value: 'inventory_summary', label: 'Inventory Summary' },
  { value: 'customer_summary', label: 'Customer Summary' },
  { value: 'employee_attendance', label: 'Employee Attendance Summary' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily (7:00 AM)' },
  { value: 'weekly', label: 'Weekly (Mondays 7:00 AM)' },
  { value: 'monthly', label: 'Monthly (1st of month 7:00 AM)' },
];

export default function ScheduledReportsPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    reportType: 'sales_summary',
    frequency: 'daily',
    emails: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReports = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await reportsApi.listScheduledReports(restaurantId);
      setReports(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load scheduled reports.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const emailList = formData.emails
      .split(',')
      .map((em) => em.trim())
      .filter((em) => em.length > 0);

    if (emailList.length === 0) {
      setError('Please provide at least one valid recipient email address.');
      setIsSubmitting(false);
      return;
    }

    try {
      await reportsApi.createScheduledReport(restaurantId, {
        reportType: formData.reportType,
        frequency: formData.frequency,
        recipientEmails: emailList,
      });
      setSuccess('Scheduled report created successfully.');
      setShowModal(false);
      setFormData({ reportType: 'sales_summary', frequency: 'daily', emails: '' });
      loadReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create scheduled report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;
    try {
      await reportsApi.deleteScheduledReport(restaurantId, id);
      setSuccess('Scheduled report removed.');
      loadReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete scheduled report.');
    }
  };

  const handleToggleActive = async (report) => {
    try {
      await reportsApi.updateScheduledReport(restaurantId, report._id, {
        isActive: !report.isActive,
      });
      loadReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update schedule status.');
    }
  };

  return (
    <RestaurantLayout title="Scheduled Reports" description="Automate recurring email delivery of operational & financial digests.">
      <div className="space-y-6 max-w-full">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Configured Email Schedules</p>
          <Button onClick={() => setShowModal(true)} size="sm" className="gap-1.5">
            <Plus size={16} /> Schedule New Report
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {isLoading && <Loader />}

        {!isLoading && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Report Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Frequency</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Recipients</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Last Sent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No automated reports scheduled yet. Click "Schedule New Report" to configure one.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium capitalize">
                        {r.reportType.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize flex items-center gap-1.5 mt-1">
                        <Clock size={14} /> {r.frequency}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground max-w-xs truncate">
                        {r.recipientEmails.join(', ')}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.lastSentAt ? new Date(r.lastSentAt).toLocaleString('en-IN') : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(r)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            r.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                          }`}
                        >
                          {r.isActive ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(r._id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal Overlay */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-semibold font-display">Schedule Automated Report</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Report Digest Type</label>
                  <select
                    value={formData.reportType}
                    onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  >
                    {REPORT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Delivery Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Recipient Email(s)</label>
                  <input
                    type="text"
                    required
                    placeholder="manager@restaurant.com, owner@restaurant.com"
                    value={formData.emails}
                    onChange={(e) => setFormData({ ...formData, emails: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Separate multiple emails with commas.</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? 'Scheduling...' : 'Save Schedule'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
