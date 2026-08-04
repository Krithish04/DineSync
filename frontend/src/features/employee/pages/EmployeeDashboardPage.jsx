import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, UserX, CalendarOff, Gift, Download } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as employeeApi from '../api/employee.api';

export default function EmployeeDashboardPage() {
  const restaurantId = useAuthStore((s) => s.restaurant?._id);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const [statsRes, empRes] = await Promise.all([
        employeeApi.getEmployeeStats(restaurantId),
        employeeApi.listEmployees(restaurantId),
      ]);
      setStats(statsRes);
      setEmployees(empRes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employee dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  // Client-side CSV export of employee directory
  const exportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Code', 'Email', 'Phone', 'Department', 'Designation', 'Status', 'Salary'];
    const rows = employees.map((e) => [
      e.employeeId,
      `${e.firstName} ${e.lastName}`,
      e.employeeCode,
      e.email,
      e.phone,
      e.department,
      e.designation,
      e.status,
      `${e.basicSalary}/${e.salaryType}`,
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employee-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <RestaurantLayout title="Restaurant Management" description="Staff headcount, daily attendance, leave counters, and birthday logs.">
      <div className="space-y-8">
        {/* Header controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Staff Overview</h2>
          <div className="flex gap-2">
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/employees/list')} className="h-8">
              <Users className="h-4 w-4 mr-1" /> Staff Directory
            </Button>
            <Button size="xs" variant="outline" onClick={exportCSV} className="h-8">
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {error && <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        {isLoading ? <Loader label="Loading staff metrics..." /> : (
          <>
            {/* KPI Grid */}
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total Staff', value: stats?.totalEmployees || 0, icon: Users, color: 'bg-blue-100 text-blue-800' },
                { label: 'Present Today', value: stats?.presentToday || 0, icon: UserCheck, color: 'bg-emerald-100 text-emerald-800' },
                { label: 'Absent Today', value: stats?.absentToday || 0, icon: UserX, color: 'bg-rose-100 text-rose-800' },
                { label: 'On Leave', value: stats?.onLeave || 0, icon: CalendarOff, color: 'bg-amber-100 text-amber-800' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-muted-foreground uppercase">{label}</span>
                      <p className="text-2xl font-black font-mono text-foreground mt-0.5">{value}</p>
                    </div>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent employees table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Staff Directory</CardTitle>
                  <CardDescription className="text-xs">All active employees.</CardDescription>
                </CardHeader>
                <CardContent>
                  {employees.length === 0 ? (
                    <p className="text-center py-8 text-xs text-muted-foreground italic border border-dashed rounded">No employees registered yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b text-[10px] uppercase text-muted-foreground">
                            <th className="pb-2">Name</th>
                            <th className="pb-2 text-center">Dept</th>
                            <th className="pb-2 text-center">Type</th>
                            <th className="pb-2 text-right">Salary (₹)</th>
                            <th className="pb-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employees.slice(0, 8).map((emp) => (
                            <tr key={emp._id} className="border-b border-border/40 hover:bg-muted/5 transition-colors cursor-pointer"
                              onClick={() => navigate(`/restaurant/employees/${emp._id}/profile`)}>
                              <td className="py-2.5">
                                <div className="font-semibold text-foreground">{emp.firstName} {emp.lastName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{emp.employeeCode}</div>
                              </td>
                              <td className="py-2.5 text-center text-muted-foreground">{emp.department}</td>
                              <td className="py-2.5 text-center text-muted-foreground">{emp.employmentType}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-foreground">₹{emp.basicSalary?.toLocaleString()}</td>
                              <td className="py-2.5 text-center">
                                <span className={`inline-flex rounded-full px-2 py-0.2 text-[8px] font-bold border uppercase ${
                                  emp.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                  emp.status === 'On Leave' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  'bg-rose-100 text-rose-800 border-rose-200'
                                }`}>{emp.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Birthdays today */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><Gift className="h-4 w-4 text-pink-500" /> Birthdays Today</CardTitle>
                  <CardDescription className="text-xs">Staff celebrating birthdays today.</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!stats?.birthdaysToday || stats.birthdaysToday.length === 0) ? (
                    <p className="text-center py-8 text-xs text-muted-foreground italic border border-dashed rounded">No birthdays today.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.birthdaysToday.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs">
                          <div className="h-8 w-8 rounded-full bg-pink-100 text-pink-800 flex items-center justify-center font-bold text-xs shrink-0">🎂</div>
                          <div>
                            <p className="font-semibold text-foreground">{b.name}</p>
                            <p className="text-[10px] text-muted-foreground">{b.designation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
