import { useState, useEffect, useCallback } from 'react';
import { Users, ChefHat, Plus, Clock, X, LogIn, LogOut, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/common/Loader';
import * as branchApi from '../api/branch.api';

export default function ManagerAccountSection({ restaurantId, assignedBranches = [] }) {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'kitchen'
  const [accounts, setAccounts] = useState([]);
  const [logsTab, setLogsTab] = useState('staff'); // 'staff' | 'kitchen'
  const [logs, setLogs] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountTypeToCreate, setAccountTypeToCreate] = useState('staff'); // 'staff' | 'kitchen'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    branchId: assignedBranches[0]?._id || assignedBranches[0] || '',
    designation: 'Floor Staff',
    department: 'Service',
    kitchenStation: 'Main Kitchen',
  });

  const loadAccounts = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await branchApi.listScopedAccounts(restaurantId, { role: activeTab });
      setAccounts(res?.accounts || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load accounts.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, activeTab]);

  const loadLogs = useCallback(async () => {
    if (!restaurantId) return;
    setIsLogsLoading(true);
    try {
      const res = await branchApi.getScopedLogs(restaurantId, { role: logsTab });
      setLogs(res?.logs || []);
    } catch (err) {
      // Non-critical
    } finally {
      setIsLogsLoading(false);
    }
  }, [restaurantId, logsTab]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (assignedBranches.length > 0 && !form.branchId) {
      setForm((p) => ({ ...p, branchId: assignedBranches[0]?._id || assignedBranches[0] }));
    }
  }, [assignedBranches, form.branchId]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.branchId) {
      return setError('Please select a branch.');
    }

    setIsSubmitting(true);
    try {
      if (accountTypeToCreate === 'kitchen') {
        await branchApi.createScopedKitchen(restaurantId, {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          branchId: form.branchId,
          kitchenStation: form.kitchenStation,
        });
        setSuccess('Kitchen account created successfully.');
      } else {
        await branchApi.createScopedStaff(restaurantId, {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          branchId: form.branchId,
          designation: form.designation,
          department: form.department,
        });
        setSuccess('Staff account created successfully.');
      }

      setIsModalOpen(false);
      setForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        branchId: assignedBranches[0]?._id || assignedBranches[0] || '',
        designation: 'Floor Staff',
        department: 'Service',
        kitchenStation: 'Main Kitchen',
      });
      loadAccounts();
      loadLogs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = (type) => {
    setAccountTypeToCreate(type);
    setIsModalOpen(true);
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'Active Session';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) return `${hrs}h ${remMins}m`;
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-8 bg-card p-6 rounded-2xl border border-border shadow-xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="text-primary h-5 w-5" />
            Branch Staff & Kitchen Account Operations
          </h3>
          <p className="text-xs text-muted-foreground">
            Create and manage Staff and Kitchen accounts scoped strictly to your assigned branch(es).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => openCreateModal('staff')} className="h-9 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Staff Account
          </Button>
          <Button size="sm" onClick={() => openCreateModal('kitchen')} className="h-9 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white">
            <ChefHat className="h-3.5 w-3.5 mr-1" /> Add Kitchen Account
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">{error}</div>}
      {success && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-xs text-primary">{success}</div>}

      {/* Account Type Tabs */}
      <div className="space-y-4">
        <div className="flex border-b border-border text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`pb-2.5 px-4 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'staff' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Users size={14} /> Staff Accounts ({activeTab === 'staff' ? accounts.length : '...'})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kitchen')}
            className={`pb-2.5 px-4 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'kitchen' ? 'border-amber-600 text-amber-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <ChefHat size={14} /> Kitchen Accounts ({activeTab === 'kitchen' ? accounts.length : '...'})
          </button>
        </div>

        {isLoading ? (
          <Loader label="Loading accounts..." />
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground italic border border-dashed rounded-xl">
            No {activeTab} accounts created for your assigned branch(es) yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-xl bg-background">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Assigned Branch</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc._id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-semibold text-foreground">{acc.name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{acc.email}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[10px] uppercase font-mono ${acc.role === 'kitchen' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}`}>
                        {acc.role}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium">
                      📍 {acc.branch?.name || 'Branch'} ({acc.branch?.code || 'CODE'})
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${acc.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                        {acc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Logs Section */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" /> Branch Activity Logs (Login & Logout Sessions)
            </h4>
            <p className="text-[11px] text-muted-foreground">Real-time audit log of staff and kitchen session activity.</p>
          </div>

          <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-xs font-bold">
            <button
              type="button"
              onClick={() => setLogsTab('staff')}
              className={`px-3 py-1 rounded-md transition-all ${logsTab === 'staff' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Staff Activity Logs
            </button>
            <button
              type="button"
              onClick={() => setLogsTab('kitchen')}
              className={`px-3 py-1 rounded-md transition-all ${logsTab === 'kitchen' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Kitchen Activity Logs
            </button>
          </div>
        </div>

        {isLogsLoading ? (
          <Loader label="Loading session logs..." />
        ) : logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded-xl">
            No {logsTab} login/logout activity logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-xl bg-background">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
                  <th className="p-3">Time</th>
                  <th className="p-3">User Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Login Time</th>
                  <th className="p-3">Logout Time</th>
                  <th className="p-3">Session Duration</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {new Date(log.createdAt || log.loginAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-foreground">
                      <div>{log.userName}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{log.userEmail}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {log.role}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium">
                      📍 {log.branch?.name || 'Branch'} ({log.branch?.code || 'CODE'})
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.eventType === 'login' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                        {log.eventType === 'login' ? <LogIn size={11} /> : <LogOut size={11} />}
                        {log.eventType}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px]">{new Date(log.loginAt).toLocaleTimeString()}</td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {log.logoutAt ? new Date(log.logoutAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="p-3 font-mono font-bold text-foreground">
                      {formatDuration(log.sessionDurationSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                {accountTypeToCreate === 'kitchen' ? (
                  <><ChefHat className="text-amber-600 h-4 w-4" /> Create Kitchen Account</>
                ) : (
                  <><Users className="text-primary h-4 w-4" /> Create Staff Account</>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="accBranch">Select Assigned Branch *</Label>
                <select
                  id="accBranch"
                  required
                  value={form.branchId}
                  onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-bold focus:outline-none"
                >
                  {assignedBranches.map((bItem) => {
                    const b = bItem.branch || bItem;
                    return (
                      <option key={b._id || b} value={b._id || b}>
                        📍 {b.name || 'Branch'} ({b.code || 'CODE'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accName">Full Name *</Label>
                  <Input
                    id="accName"
                    required
                    placeholder="e.g. John Doe"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accPhone">Phone Number</Label>
                  <Input
                    id="accPhone"
                    placeholder="+91 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accEmail">Email Address *</Label>
                  <Input
                    id="accEmail"
                    type="email"
                    required
                    placeholder="staff@restaurant.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accPass">Password *</Label>
                  <Input
                    id="accPass"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {accountTypeToCreate === 'kitchen' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="kStation">Kitchen Station</Label>
                  <Input
                    id="kStation"
                    placeholder="e.g. Main Kitchen, Tandoor, Bar"
                    value={form.kitchenStation}
                    onChange={(e) => setForm((p) => ({ ...p, kitchenStation: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sDesignation">Designation</Label>
                    <Input
                      id="sDesignation"
                      placeholder="e.g. Waiter / Captain"
                      value={form.designation}
                      onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sDept">Department</Label>
                    <Input
                      id="sDept"
                      placeholder="e.g. Service"
                      value={form.department}
                      onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="text-xs font-bold">
                  Create {accountTypeToCreate === 'kitchen' ? 'Kitchen' : 'Staff'} Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
