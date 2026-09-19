import { useState, useEffect, useCallback } from 'react';
import { UserCheck, Plus, ShieldCheck, Clock, Building2, ChevronRight, X, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/common/Loader';
import * as branchApi from '../api/branch.api';

export default function OwnerManagerSection({ restaurantId, branches = [] }) {
  const [managers, setManagers] = useState([]);
  const [managerLogs, setManagerLogs] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?._id || branches[0]?.branch?._id || '');
  const [branchLogs, setBranchLogs] = useState([]);
  const [branchLogType, setBranchLogType] = useState('staff'); // 'staff' | 'kitchen'

  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isBranchLogsLoading, setIsBranchLogsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    selectedBranchIds: [],
  });

  const loadManagersAndLogs = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const [mgrsData, logsData] = await Promise.all([
        branchApi.listOwnerManagers(restaurantId),
        branchApi.getOwnerManagerLogs(restaurantId),
      ]);
      setManagers(mgrsData?.managers || []);
      setManagerLogs(logsData?.logs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load manager accounts and logs.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  const loadBranchDrilldownLogs = useCallback(async () => {
    if (!restaurantId || !selectedBranchId) return;
    setIsBranchLogsLoading(true);
    try {
      const res = await branchApi.getOwnerBranchLogs(restaurantId, selectedBranchId, branchLogType);
      setBranchLogs(res?.logs || []);
    } catch (err) {
      // ignore non-critical drilldown log error
    } finally {
      setIsBranchLogsLoading(false);
    }
  }, [restaurantId, selectedBranchId, branchLogType]);

  useEffect(() => {
    loadManagersAndLogs();
  }, [loadManagersAndLogs]);

  useEffect(() => {
    if (selectedBranchId) {
      loadBranchDrilldownLogs();
    }
  }, [selectedBranchId, branchLogType, loadBranchDrilldownLogs]);

  const handleBranchToggle = (bId) => {
    setForm((prev) => {
      const exists = prev.selectedBranchIds.includes(bId);
      return {
        ...prev,
        selectedBranchIds: exists
          ? prev.selectedBranchIds.filter((id) => id !== bId)
          : [...prev.selectedBranchIds, bId],
      };
    });
  };

  const handleCreateManager = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.selectedBranchIds.length === 0) {
      return setError('Please select at least one branch for this manager.');
    }

    setIsSubmitting(true);
    try {
      await branchApi.createOwnerManager(restaurantId, {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        branchIds: form.selectedBranchIds,
      });

      setSuccess('Manager account created and multi-branch assignment saved.');
      setIsModalOpen(false);
      setForm({ name: '', email: '', password: '', phone: '', selectedBranchIds: [] });
      loadManagersAndLogs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manager.');
    } finally {
      setIsSubmitting(false);
    }
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <UserCheck className="text-primary h-5 w-5" />
            Manager Roster & Activity Logs
          </h3>
          <p className="text-xs text-muted-foreground">
            Create manager accounts, assign single or multi-branch responsibility, and monitor login/logout sessions.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)} className="h-9 font-semibold text-xs">
          <Plus className="h-4 w-4 mr-1.5" /> Create Manager Account
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">{error}</div>}
      {success && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-xs text-primary">{success}</div>}

      {isLoading ? (
        <Loader label="Loading manager accounts & session audit logs..." />
      ) : (
        <>
          {/* Managers List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Managers</h4>
            {managers.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded-xl">
                No managers created yet. Click "Create Manager Account" to assign branch managers.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map((m) => (
                  <div key={m._id} className="p-4 rounded-xl border border-border bg-background/50 hover:bg-background transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">{m.name}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono bg-purple-500/10 text-purple-600 border-purple-500/20">
                        Manager
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{m.email}</div>
                    {m.phone && <div className="text-[11px] text-muted-foreground">📞 {m.phone}</div>}
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Assigned Branches:</span>
                      <div className="flex flex-wrap gap-1">
                        {m.assignedBranches && m.assignedBranches.length > 0 ? (
                          m.assignedBranches.map((b) => (
                            <Badge key={b._id || b} variant="outline" className="text-[10px] bg-muted/40 font-medium">
                              📍 {b.name || 'Branch'} ({b.code || 'CODE'})
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">No branches assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manager Login/Logout Activity Logs */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" /> Manager Login & Logout Audit Trail
            </h4>
            {managerLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded-xl">
                No manager login/logout events recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl bg-background">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
                      <th className="p-3">Event Time</th>
                      <th className="p-3">Manager</th>
                      <th className="p-3">Event</th>
                      <th className="p-3">Branch Context</th>
                      <th className="p-3">Login Time</th>
                      <th className="p-3">Logout Time</th>
                      <th className="p-3">Session Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerLogs.map((log) => (
                      <tr key={log._id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {new Date(log.createdAt || log.loginAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          <div>{log.userName}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{log.userEmail}</div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.eventType === 'login' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                            {log.eventType === 'login' ? <LogIn size={11} /> : <LogOut size={11} />}
                            {log.eventType}
                          </span>
                        </td>
                        <td className="p-3 font-medium">
                          {log.assignedBranches && log.assignedBranches.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {log.assignedBranches.map((b) => (
                                <span key={b._id || b} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {b.name || b.code || 'Branch'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Multi-branch</span>
                          )}
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

          {/* Branch Staff & Kitchen Log Drilldown (Owner On-Demand Inspection) */}
          <div className="space-y-4 pt-6 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Branch Staff & Kitchen Log Inspection (Drilldown)
                </h4>
                <p className="text-[11px] text-muted-foreground">Inspect staff and kitchen logins/logouts for any specific branch.</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-3 text-xs font-bold focus:outline-none"
                >
                  {branches.map((bItem) => {
                    const b = bItem.branch || bItem;
                    return (
                      <option key={b._id} value={b._id}>
                        📍 {b.name} ({b.code || 'MAIN'})
                      </option>
                    );
                  })}
                </select>

                <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBranchLogType('staff')}
                    className={`px-3 py-1 rounded-md transition-all ${branchLogType === 'staff' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Staff Logs
                  </button>
                  <button
                    type="button"
                    onClick={() => setBranchLogType('kitchen')}
                    className={`px-3 py-1 rounded-md transition-all ${branchLogType === 'kitchen' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Kitchen Logs
                  </button>
                </div>
              </div>
            </div>

            {isBranchLogsLoading ? (
              <Loader label="Loading branch audit logs..." />
            ) : branchLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded-xl">
                No {branchLogType} activity logs found for this branch.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl bg-background">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
                      <th className="p-3">Time</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Event</th>
                      <th className="p-3">Login Time</th>
                      <th className="p-3">Logout Time</th>
                      <th className="p-3">Session Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchLogs.map((log) => (
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
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.eventType === 'login' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
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
        </>
      )}

      {/* Create Manager Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <ShieldCheck className="text-primary h-4 w-4" /> Create Manager Account
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

            <form onSubmit={handleCreateManager} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mName">Manager Name *</Label>
                  <Input
                    id="mName"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mPhone">Phone Number</Label>
                  <Input
                    id="mPhone"
                    placeholder="+91 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mEmail">Email Address *</Label>
                  <Input
                    id="mEmail"
                    type="email"
                    required
                    placeholder="manager@restaurant.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mPass">Password *</Label>
                  <Input
                    id="mPass"
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

              {/* Multi-Branch Selector */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-bold text-foreground block">
                  Assign Branch Responsibility (Single or Multi-Branch) *
                </Label>
                <p className="text-[11px] text-muted-foreground">Select all branches this manager will oversee:</p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 border border-border rounded-xl p-3 bg-muted/10">
                  {branches.map((bItem) => {
                    const b = bItem.branch || bItem;
                    const isChecked = form.selectedBranchIds.includes(b._id);
                    return (
                      <label
                        key={b._id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${isChecked ? 'bg-primary/10 border-primary/40 font-bold text-foreground' : 'border-border hover:bg-muted/40 text-muted-foreground'}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleBranchToggle(b._id)}
                            className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span>📍 {b.name}</span>
                        </div>
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{b.code || 'MAIN'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="text-xs font-bold">
                  Create & Assign Manager
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
