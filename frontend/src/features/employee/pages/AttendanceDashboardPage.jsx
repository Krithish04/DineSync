import { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Coffee, LogIn, LogOut, Search } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as employeeApi from '../api/employee.api';

export default function AttendanceDashboardPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeOps, setActiveOps] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadEmployees = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await employeeApi.listEmployees(restaurantId, { status: 'Active' });
      setEmployees(res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff list.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { if (restaurantId) loadEmployees(); }, [restaurantId, loadEmployees]);

  const setOp = (empId, val) => setActiveOps((prev) => ({ ...prev, [empId]: val }));

  const handleClockIn = async (emp) => {
    setOp(emp._id, 'clockin');
    setError(''); setSuccess('');
    try {
      await employeeApi.clockIn(restaurantId, { employeeId: emp._id });
      setSuccess(`${emp.firstName} ${emp.lastName} clocked in successfully.`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Clock in failed.');
    } finally {
      setOp(emp._id, null);
    }
  };

  const handleClockOut = async (emp) => {
    setOp(emp._id, 'clockout');
    setError(''); setSuccess('');
    try {
      await employeeApi.clockOut(restaurantId, emp._id);
      setSuccess(`${emp.firstName} ${emp.lastName} clocked out successfully.`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Clock out failed.');
    } finally {
      setOp(emp._id, null);
    }
  };

  const handleBreak = async (emp, action) => {
    setOp(emp._id, `break-${action}`);
    setError(''); setSuccess('');
    try {
      await employeeApi.toggleBreak(restaurantId, emp._id, action);
      setSuccess(`Break ${action === 'start' ? 'started' : 'ended'} for ${emp.firstName}.`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || `Break ${action} failed.`);
    } finally {
      setOp(emp._id, null);
    }
  };

  const filtered = useMemo(() => employees.filter((e) =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(search.toLowerCase())
  ), [employees, search]);

  return (
    <RestaurantLayout title="Restaurant Management" description="Clock in/out, manage breaks, and log daily attendance sessions.">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 border-b border-border/40 pb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>
        </div>

        {error && <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {success && <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{success}</div>}

        {isLoading ? <Loader label="Loading active staff roster..." /> : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded">No active staff found.</div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((emp) => {
              return (
                <Card key={emp._id} className="border border-border/80 shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    {/* Staff identity */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{emp.firstName} {emp.lastName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{emp.employeeCode} · {emp.designation}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="xs" className="h-8 gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleClockIn(emp)} isLoading={activeOps[emp._id] === 'clockin'}>
                        <LogIn className="h-3.5 w-3.5" /> Clock In
                      </Button>
                      <Button size="xs" variant="outline" className="h-8 gap-1 text-[10px] border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => handleClockOut(emp)} isLoading={activeOps[emp._id] === 'clockout'}>
                        <LogOut className="h-3.5 w-3.5" /> Clock Out
                      </Button>
                      <Button size="xs" variant="outline" className="h-8 gap-1 text-[10px]"
                        onClick={() => handleBreak(emp, 'start')} isLoading={activeOps[emp._id] === 'break-start'}>
                        <Coffee className="h-3.5 w-3.5" /> Break Start
                      </Button>
                      <Button size="xs" variant="outline" className="h-8 gap-1 text-[10px]"
                        onClick={() => handleBreak(emp, 'end')} isLoading={activeOps[emp._id] === 'break-end'}>
                        <Clock className="h-3.5 w-3.5" /> Break End
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
