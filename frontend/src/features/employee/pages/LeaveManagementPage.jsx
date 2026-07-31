import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, CheckCircle2, XCircle, Search } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import LeaveForm from '../components/LeaveForm';
import useAuthStore from '@/features/auth/store/auth.store';
import * as employeeApi from '../api/employee.api';

export default function LeaveManagementPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Apply leave modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [leavesRes, empRes] = await Promise.all([
        employeeApi.listLeaves(restaurantId, {}),
        employeeApi.listEmployees(restaurantId, { status: 'Active' }),
      ]);
      setLeaves(leavesRes || []);
      setEmployees(empRes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leave records.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { if (restaurantId) loadData(); }, [restaurantId, loadData]);

  const handleApplyLeave = async (payload) => {
    if (!selectedEmployeeId) return setError('Please select an employee.');
    setIsSaving(true);
    setError('');
    try {
      await employeeApi.applyLeave(restaurantId, selectedEmployeeId, payload);
      setSuccess('Leave request submitted successfully.');
      setShowApplyModal(false);
      setSelectedEmployeeId('');
      loadData();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveLeave = async (leaveId, status) => {
    setError(''); setSuccess('');
    try {
      await employeeApi.approveLeave(restaurantId, leaveId, status);
      setSuccess(`Leave request ${status.toLowerCase()} successfully.`);
      loadData();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update leave status.');
    }
  };

  const filtered = useMemo(() => leaves.filter((l) => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const empName = `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.toLowerCase();
    const matchSearch = empName.includes(search.toLowerCase()) || l.employee?.employeeCode?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [leaves, statusFilter, search]);

  return (
    <RestaurantLayout title="Restaurant Management" description="Review pending leave requests and approve or reject applications.">
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Leave Management</CardTitle>
            <CardDescription>All leave applications across branches.</CardDescription>
          </div>
          <Button size="xs" onClick={() => setShowApplyModal(true)} className="h-8">
            <Plus className="h-4 w-4 mr-1" /> Apply Leave
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          {success && <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{success}</div>}

          <div className="flex flex-wrap gap-4 border-b border-border/40 pb-4">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded border border-input bg-background px-3 text-xs font-semibold focus:outline-none min-w-[160px]">
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by employee name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
            </div>
          </div>

          {isLoading ? <Loader label="Loading leave records..." /> : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded">No leave requests found.</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-xs text-left min-w-[750px]">
                <thead>
                  <tr className="border-b bg-muted/20 text-muted-foreground uppercase text-[10px]">
                    {['Employee', 'Leave Type', 'From', 'To', 'Duration', 'Reason', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="p-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const days = Math.max(1, Math.round((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1);
                    return (
                      <tr key={l._id} className="border-b border-border hover:bg-muted/5 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{l.employee?.firstName} {l.employee?.lastName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{l.employee?.employeeCode}</div>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{l.leaveType}</td>
                        <td className="p-3 font-mono text-muted-foreground">{new Date(l.startDate).toLocaleDateString()}</td>
                        <td className="p-3 font-mono text-muted-foreground">{new Date(l.endDate).toLocaleDateString()}</td>
                        <td className="p-3 font-mono text-center">{days} day{days !== 1 ? 's' : ''}</td>
                        <td className="p-3 text-muted-foreground max-w-[140px] truncate">{l.reason}</td>
                        <td className="p-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold border uppercase ${
                            l.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            l.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                            'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>{l.status}</span>
                        </td>
                        <td className="p-3">
                          {l.status === 'Pending' && (
                            <div className="flex gap-1">
                              <Button size="xs" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-0.5"
                                onClick={() => handleApproveLeave(l._id, 'Approved')}>
                                <CheckCircle2 className="h-3 w-3" /> Approve
                              </Button>
                              <Button size="xs" variant="outline" className="h-7 text-[10px] border-rose-200 text-rose-700 hover:bg-rose-50 gap-0.5"
                                onClick={() => handleApproveLeave(l._id, 'Rejected')}>
                                <XCircle className="h-3 w-3" /> Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b bg-muted/20 font-bold text-sm">Apply Leave for Employee</div>
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Select Employee *</label>
                <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="flex h-9 w-full rounded border border-input bg-background px-3 text-xs focus:outline-none">
                  <option value="">Choose employee...</option>
                  {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
                </select>
              </div>
              <LeaveForm
                onSubmit={handleApplyLeave}
                onCancel={() => { setShowApplyModal(false); setSelectedEmployeeId(''); }}
                isSaving={isSaving}
              />
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
