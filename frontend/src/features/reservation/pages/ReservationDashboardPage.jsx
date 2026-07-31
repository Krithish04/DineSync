import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, XCircle, Grid, Play, Eye, Plus } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as reservationApi from '../api/reservation.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function ReservationDashboardPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
    } catch {
      // Fail silently
    }
  }, [restaurantId]);

  // Load Stats & Today's reservations
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedBranch !== 'all') params.branch = selectedBranch;

      // Fetch Stats
      const statsResult = await reservationApi.getDashboardStats(restaurantId, params);
      setStats(statsResult);

      // Fetch Today's Reservations
      const todayStr = new Date().toISOString().slice(0, 10);
      const bookingsResult = await reservationApi.listReservations(restaurantId, {
        ...params,
        date: todayStr,
        limit: 5, // Top 5 bookings for today
      });
      setTodayBookings(bookingsResult.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservation stats.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedBranch]);

  useEffect(() => {
    if (restaurantId) {
      loadBranches();
      loadDashboardData();
    }
  }, [restaurantId, loadBranches, loadDashboardData]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Overview of booking stats, active schedules, and floor occupancy."
    >
      <div className="space-y-8">
        {/* Dashboard Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="branch-filter" className="text-sm font-semibold shrink-0">Filter Branch:</Label>
            <div className="relative min-w-[200px]">
              <select
                id="branch-filter"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Locations</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/restaurant/reservations/list')}>
              <Eye className="h-4 w-4 mr-1.5" /> Bookings List
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/restaurant/reservations/calendar')}>
              <Calendar className="h-4 w-4 mr-1.5" /> Calendar Sheet
            </Button>
            {canManage && (
              <Button size="sm" onClick={() => navigate('/restaurant/reservations/new')}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Booking
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <Loader label="Loading statistics..." />
        ) : (
          <>
            {/* Stat Cards Grid */}
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
              {/* Today's count */}
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Today</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                      {stats?.todayReservations || 0}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming count */}
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Upcoming</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                      {stats?.upcomingReservations || 0}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              {/* Completed count */}
              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Completed</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                      {stats?.completedReservations || 0}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              {/* Cancelled count */}
              <Card className="border-l-4 border-l-rose-500">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Cancelled</span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                      {stats?.cancelledReservations || 0}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center">
                    <XCircle className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Table occupancy grid counters */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
              <Card className="bg-emerald-50/10 border-emerald-200/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Available Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {stats?.availableTables || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Seating ready for walk-ins or bookings.</p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50/10 border-orange-200/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-orange-800 dark:text-orange-400">Occupied Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-orange-600 dark:text-orange-400">
                    {stats?.occupiedTables || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Tables currently seated with dining guests.</p>
                </CardContent>
              </Card>
            </div>

            {/* Today's Bookings overview */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Today's Reservations</CardTitle>
                  <CardDescription>Top active bookings for today.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/restaurant/reservations/list')} className="text-xs text-primary">
                  View all
                </Button>
              </CardHeader>
              <CardContent>
                {todayBookings.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground italic border border-dashed rounded">
                    No reservations scheduled for today.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="pb-2 font-medium">Customer</th>
                          <th className="pb-2 font-medium">Time / Duration</th>
                          <th className="pb-2 font-medium">Guests</th>
                          <th className="pb-2 font-medium">Table</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayBookings.map((b) => (
                          <tr key={b._id} className="border-b border-border last:border-none">
                            <td className="py-3">
                              <p className="font-semibold text-foreground">{b.customerName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{b.reservationNumber}</p>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {b.reservationTime} ({b.duration}m)
                            </td>
                            <td className="py-3 font-semibold text-foreground">{b.numberOfGuests} Guests</td>
                            <td className="py-3 text-muted-foreground">
                              Table {b.table?.tableNumber || 'Unassigned'}
                            </td>
                            <td className="py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                  b.reservationStatus === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                  b.reservationStatus === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                                  b.reservationStatus === 'Seated' ? 'bg-orange-100 text-orange-800' :
                                  b.reservationStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {b.reservationStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
