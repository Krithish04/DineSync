import { useState, useEffect, useCallback } from 'react';
import { UserCheck, Clock, Coffee, FileX } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import KpiCard from '../components/KpiCard';
import ChartWidget from '../components/ChartWidget';
import ReportFilters from '../components/ReportFilters';
import ExportToolbar from '../components/ExportToolbar';
import * as reportsApi from '../api/reports.api';
import * as branchApi from '@/features/branch/api/branch.api';

const today = new Date();
const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const defaultEnd = today.toISOString().slice(0, 10);

export default function EmployeeReportPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [filters, setFilters] = useState({ startDate: defaultStart, endDate: defaultEnd });
  const [branches, setBranches] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [workingHours, setWorkingHours] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
    } catch { /* non-fatal */ }
  }, [restaurantId]);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    const params = { startDate: filters.startDate, endDate: filters.endDate, branch: filters.branch || undefined };
    try {
      const [attRes, whRes, leaveRes] = await Promise.all([
        reportsApi.getAttendanceSummary(restaurantId, params),
        reportsApi.getWorkingHoursReport(restaurantId, params),
        reportsApi.getLeaveSummary(restaurantId, params),
      ]);
      setAttendance(attRes);
      setWorkingHours(whRes || []);
      setLeaves(leaveRes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employee data.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, filters]);

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { loadData(); }, [loadData]);

  const statusData = (attendance?.statusBreakdown || []).map((s) => ({ name: s._id, count: s.count }));
  const leaveData = leaves.map((l) => ({ name: l._id, count: l.count }));
  const whExport = workingHours.map((w) => ({
    Employee: w.employeeName,
    Designation: w.designation,
    Department: w.department,
    'Days Present': w.daysPresent,
    'Working Hours': w.totalWorkingHours?.toFixed(1),
    'Overtime Hours': w.totalOvertime?.toFixed(1),
  }));

  return (
    <RestaurantLayout title="Employee Reports" description="Attendance, working hours, overtime, and leave analytics.">
      <div className="space-y-6 max-w-full">
        <ReportFilters filters={filters} onChange={setFilters} branches={branches} />

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

        {!isLoading && !error && attendance && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="Avg Working Hours/Day" value={attendance.avgWorkingHours} suffix="h" icon={Clock} colorClass="text-primary" bgClass="bg-primary/10" />
              <KpiCard title="Total Overtime Hours" value={attendance.totalOvertime} suffix="h" icon={Coffee} colorClass="text-amber-600" bgClass="bg-amber-50" />
              <KpiCard
                title="Present Days (total)"
                value={(attendance.statusBreakdown || []).find((s) => s._id === 'Present')?.count || 0}
                icon={UserCheck}
                colorClass="text-emerald-600"
                bgClass="bg-emerald-50"
              />
              <KpiCard
                title="Leave Requests"
                value={leaves.reduce((s, l) => s + l.count, 0)}
                icon={FileX}
                colorClass="text-rose-600"
                bgClass="bg-rose-50"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Attendance Status Breakdown</h2>
                <ChartWidget
                  type="donut"
                  data={statusData}
                  nameKey="name"
                  valueKey="count"
                  height={260}
                  emptyLabel="No attendance records found."
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Leave Requests by Status</h2>
                <ChartWidget
                  type="pie"
                  data={leaveData}
                  nameKey="name"
                  valueKey="count"
                  height={260}
                  emptyLabel="No leave requests found."
                />
              </div>
            </div>

            {/* Working Hours Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Working Hours per Employee</h2>
                <ExportToolbar data={whExport} fileName="working-hours-report" title="Employee Working Hours Report" />
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Department</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Days</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Hours</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Overtime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingHours.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No working hours data for the selected period.</td></tr>
                    ) : workingHours.map((w, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{w.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{w.designation}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{w.department}</td>
                        <td className="px-4 py-3 text-right">{w.daysPresent}</td>
                        <td className="px-4 py-3 text-right font-semibold">{w.totalWorkingHours?.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-right text-amber-600 font-semibold">{w.totalOvertime?.toFixed(1)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
