import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import ShiftCalendar from '../components/ShiftCalendar';
import useAuthStore from '@/features/auth/store/auth.store';
import * as employeeApi from '../api/employee.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function ShiftManagementPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [shifts, setShifts] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create shift form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ shiftName: '', startTime: '09:00', endTime: '17:00', breakDuration: 30 });

  // Assign roster modal
  const [assignShift, setAssignShift] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
      if (res.items?.length > 0) setSelectedBranch(res.items[0]._id);
    } catch { /* non-fatal */ }
  }, [restaurantId]);

  const loadShifts = useCallback(async () => {
    if (!selectedBranch) return;
    setIsLoading(true);
    try {
      const [shiftRes, empRes] = await Promise.all([
        employeeApi.listShifts(restaurantId, selectedBranch),
        employeeApi.listEmployees(restaurantId, { branch: selectedBranch }),
      ]);
      setShifts(shiftRes || []);
      setAllEmployees(empRes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shifts.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedBranch]);

  useEffect(() => { if (restaurantId) loadBranches(); }, [restaurantId, loadBranches]);
  useEffect(() => { if (selectedBranch) loadShifts(); }, [selectedBranch, loadShifts]);

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!form.shiftName.trim()) return setError('Shift name is required.');
    setIsSaving(true);
    setError('');
    try {
      await employeeApi.createShift(restaurantId, selectedBranch, { ...form, breakDuration: parseInt(form.breakDuration, 10) });
      setSuccess('Shift created successfully.');
      setShowForm(false);
      setForm({ shiftName: '', startTime: '09:00', endTime: '17:00', breakDuration: 30 });
      loadShifts();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create shift.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignRoster = async () => {
    setIsSaving(true);
    setError('');
    try {
      await employeeApi.assignEmployeesToShift(restaurantId, assignShift._id, selectedEmployees);
      setSuccess('Shift roster updated successfully.');
      setAssignShift(null);
      setSelectedEmployees([]);
      loadShifts();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign roster.');
    } finally {
      setIsSaving(false);
    }
  };

  const openAssign = (shift) => {
    setAssignShift(shift);
    setSelectedEmployees(shift.assignedEmployees?.map((e) => e._id || e) || []);
  };

  const toggleEmp = (empId) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  return (
    <RestaurantLayout title="Restaurant Management" description="Create weekly shifts and assign staff rosters by branch.">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 border-b border-border/40 pb-4">
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}
            className="h-9 rounded border border-input bg-background px-3 text-xs font-semibold focus:outline-none min-w-[160px]">
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <Button size="xs" onClick={() => setShowForm((v) => !v)} className="h-8 ml-auto">
            <Plus className="h-4 w-4 mr-1" /> Create Shift
          </Button>
        </div>

        {error && <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {success && <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{success}</div>}

        {/* Create shift inline form */}
        {showForm && (
          <Card className="border border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Create New Shift Schedule</CardTitle>
              <CardDescription className="text-xs">Define time bounds and break duration for a new shift.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateShift} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <Label htmlFor="shiftName">Shift Name *</Label>
                  <Input id="shiftName" value={form.shiftName} onChange={(e) => setForm((p) => ({ ...p, shiftName: e.target.value }))} className="text-xs h-9" placeholder="Morning Kitchen" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} className="text-xs h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} className="text-xs h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="breakDuration">Break (mins)</Label>
                  <Input id="breakDuration" type="number" min="0" value={form.breakDuration} onChange={(e) => setForm((p) => ({ ...p, breakDuration: e.target.value }))} className="text-xs h-9 font-mono" />
                </div>
                <div className="col-span-2 md:col-span-4 flex gap-3 pt-2 border-t border-border/40">
                  <Button type="submit" size="sm" isLoading={isSaving} className="text-xs">Create Shift</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)} className="text-xs">Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? <Loader label="Loading shift schedules..." /> : (
          <ShiftCalendar shifts={shifts} onAssignRoster={openAssign} />
        )}
      </div>

      {/* Assign roster modal */}
      {assignShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b bg-muted/20 font-bold text-sm">Assign Roster: {assignShift.shiftName}</div>
            <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto">
              {allEmployees.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center">No employees in this branch.</p>
              ) : allEmployees.map((emp) => (
                <label key={emp._id} className="flex items-center gap-3 p-2 rounded border border-border hover:bg-muted/5 cursor-pointer">
                  <input type="checkbox" checked={selectedEmployees.includes(emp._id)}
                    onChange={() => toggleEmp(emp._id)} className="h-4 w-4 rounded" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.designation} · {emp.department}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <Button size="sm" variant="outline" onClick={() => setAssignShift(null)} className="text-xs">Cancel</Button>
              <Button size="sm" isLoading={isSaving} onClick={handleAssignRoster} className="text-xs">Save Roster</Button>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
