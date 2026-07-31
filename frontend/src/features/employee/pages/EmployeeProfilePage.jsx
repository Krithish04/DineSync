import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, AlertCircle, DollarSign } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Loader from '@/components/common/Loader';
import RoleBadge from '../components/RoleBadge';
import AttendanceTable from '../components/AttendanceTable';
import useAuthStore from '@/features/auth/store/auth.store';
import * as employeeApi from '../api/employee.api';

export default function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const restaurantId = useAuthStore((s) => s.restaurant?._id);
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await employeeApi.getEmployee(restaurantId, employeeId);
      setProfileData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employee profile.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, employeeId]);

  useEffect(() => { if (restaurantId && employeeId) loadProfile(); }, [restaurantId, employeeId, loadProfile]);

  if (isLoading) return <RestaurantLayout title="Employee Profile"><Loader label="Opening staff file..." /></RestaurantLayout>;
  if (error) return <RestaurantLayout title="Employee Profile"><div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div></RestaurantLayout>;

  const { employee, attendance, leaves, shifts, payroll } = profileData || {};

  return (
    <RestaurantLayout title="Restaurant Management" description="Staff biography, attendance logs, leave history, and payroll slips.">
      <div className="space-y-6">
        <button onClick={() => navigate('/restaurant/employees/list')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Staff Directory
        </button>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 border border-border rounded-lg bg-card shadow-sm">
          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-lg shrink-0">
            {employee?.firstName?.[0]}{employee?.lastName?.[0]}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold text-foreground">{employee?.firstName} {employee?.lastName}</h2>
              <RoleBadge type="department" value={employee?.department} />
              <RoleBadge type="status" value={employee?.status} />
              <RoleBadge type="employment" value={employee?.employmentType} />
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="font-mono font-semibold bg-muted px-2 py-0.5 rounded">{employee?.employeeId}</span>
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{employee?.email}</span>
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{employee?.phone}</span>
              {employee?.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{employee?.address}</span>}
            </div>
          </div>
          <div className="text-right shrink-0 text-xs">
            <span className="text-muted-foreground block uppercase font-semibold text-[9px]">Basic Salary</span>
            <span className="font-mono font-black text-xl text-foreground">₹{employee?.basicSalary?.toLocaleString()}</span>
            <span className="text-muted-foreground font-mono block text-[10px]">/ {employee?.salaryType}</span>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Summary info */}
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground font-bold">Staff Details</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2.5">
                {[
                  ['Designation', employee?.designation],
                  ['Department', employee?.department],
                  ['Employee Code', employee?.employeeCode],
                  ['Joining Date', employee?.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : '-'],
                  ['Date of Birth', employee?.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '-'],
                  ['Gender', employee?.gender || '-'],
                  ['Emergency Contact', employee?.emergencyContact || '-'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-border/30 pb-2 last:border-none last:pb-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground text-right max-w-[150px] truncate">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Assigned shifts */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground font-bold">Assigned Shifts</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                {(!shifts || shifts.length === 0) ? (
                  <p className="text-muted-foreground italic">No shifts assigned.</p>
                ) : shifts.map((s) => (
                  <div key={s._id} className="border border-border/50 rounded p-2">
                    <p className="font-bold text-foreground">{s.shiftName}</p>
                    <p className="text-muted-foreground font-mono">{s.startTime} — {s.endTime}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Leave history */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground font-bold">Leave History</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                {(!leaves || leaves.length === 0) ? (
                  <p className="text-muted-foreground italic">No leaves applied.</p>
                ) : leaves.map((l) => (
                  <div key={l._id} className="flex justify-between items-center border-b border-border/30 pb-2 last:border-none">
                    <div>
                      <p className="font-semibold text-foreground">{l.leaveType}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}</p>
                    </div>
                    <span className={`inline-flex rounded px-1.5 py-0.2 text-[8px] font-bold border uppercase ${
                      l.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      l.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                      'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>{l.status}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: Attendance & Payroll */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold">Attendance History (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <AttendanceTable attendance={attendance || []} />
              </CardContent>
            </Card>

            {/* Payroll slips */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Payroll Records</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(!payroll || payroll.length === 0) ? (
                  <p className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded">No payroll records generated.</p>
                ) : (
                  <div className="overflow-x-auto border rounded bg-card">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px]">
                          {['Month', 'Basic', 'Allowances', 'OT Pay', 'Deductions', 'Net Salary', 'Status'].map((h) => (
                            <th key={h} className="p-2.5 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {payroll.map((pr) => (
                          <tr key={pr._id} className="border-b border-border/40 last:border-none">
                            <td className="p-2.5 font-mono font-semibold">{pr.month}</td>
                            <td className="p-2.5 font-mono">₹{pr.basicSalary?.toLocaleString()}</td>
                            <td className="p-2.5 font-mono text-emerald-600">+₹{pr.allowances}</td>
                            <td className="p-2.5 font-mono text-amber-600">+₹{pr.overtimePay}</td>
                            <td className="p-2.5 font-mono text-rose-600">-₹{pr.deductions}</td>
                            <td className="p-2.5 font-mono font-bold text-foreground">₹{pr.netSalary?.toLocaleString()}</td>
                            <td className="p-2.5">
                              <span className={`inline-flex rounded px-1.5 py-0.2 text-[8px] font-bold border uppercase ${
                                pr.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                'bg-amber-100 text-amber-800 border-amber-200'
                              }`}>{pr.paymentStatus}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}
