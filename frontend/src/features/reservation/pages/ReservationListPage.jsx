import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, ClipboardList, Plus, Eye } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import ReservationCard from '../components/ReservationCard';
import CustomerDetailsCard from '../components/CustomerDetailsCard';
import useAuthStore from '@/features/auth/store/auth.store';
import * as reservationApi from '../api/reservation.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function ReservationListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedResDetails, setSelectedResDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering & Search
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(''); // empty matches all dates
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load reservations
  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        search: searchDebounced,
      };

      if (selectedBranch !== 'all') params.branch = selectedBranch;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedDate) params.date = selectedDate;

      const result = await reservationApi.listReservations(restaurantId, params);
      setReservations(result.items || []);
      setPagination(result.pagination || null);

      // Reset selection details if selected item is no longer in list or update it
      if (selectedResDetails) {
        const updatedItem = result.items?.find((item) => item._id === selectedResDetails._id);
        setSelectedResDetails(updatedItem || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservations.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, page, searchDebounced, selectedBranch, selectedStatus, selectedDate]);

  useEffect(() => {
    if (restaurantId) {
      loadBranches();
      loadReservations();
    }
  }, [restaurantId, loadBranches, loadReservations]);

  // Quick Action status change
  const handleStatusUpdate = async (resId, newStatus) => {
    try {
      const updated = await reservationApi.updateReservationStatus(restaurantId, resId, newStatus);
      setReservations((prev) => prev.map((item) => (item._id === resId ? updated : item)));
      if (selectedResDetails?._id === resId) {
        setSelectedResDetails(updated);
      }
      setSuccess(`Reservation status changed to ${newStatus}.`);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update reservation status.');
    }
  };

  // Delete booking action (soft delete)
  const handleDelete = async (resId) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) return;

    try {
      await reservationApi.deleteReservation(restaurantId, resId);
      setSuccess('Reservation deleted successfully.');
      loadReservations();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete reservation.');
    }
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="View, filter, and coordinate your table booking sheets."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Reservations list */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="w-full">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
              <div>
                <CardTitle>Seating Bookings</CardTitle>
                <CardDescription>Grid and search catalogue for all customer reservations.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/reservations/calendar')} className="h-8">
                  <Calendar className="h-4 w-4 mr-1.5" /> Calendar View
                </Button>
                {canManage && (
                  <Button size="xs" onClick={() => navigate('/restaurant/reservations/new')} className="h-8">
                    <Plus className="h-4 w-4 mr-1" /> New Booking
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Notifications */}
              {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                  {success}
                </div>
              )}

              {/* Filtering Controls */}
              <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="relative col-span-1 sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search customer name, phone, reservation number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>

                <div className="relative">
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      setPage(1);
                    }}
                    className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm focus:outline-none"
                  >
                    <option value="all">All Branches</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>

                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setPage(1);
                    }}
                    className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Seated">Seated</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="No Show">No Show</option>
                  </select>
                  <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>

                <div className="space-y-1 col-span-1 sm:col-span-2">
                  <Label htmlFor="date-picker" className="text-xs text-muted-foreground">Filter by Specific Date</Label>
                  <Input
                    id="date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setPage(1);
                    }}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Reservations lists */}
              {isLoading ? (
                <Loader label="Loading reservations..." />
              ) : reservations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchDebounced || selectedBranch !== 'all' || selectedStatus !== 'all' || selectedDate
                      ? 'No reservations match your filters.'
                      : 'No reservations booked yet.'}
                  </p>
                  {canManage && !searchDebounced && (
                    <Button size="sm" onClick={() => navigate('/restaurant/reservations/new')}>
                      <Plus className="mr-1.5 h-4 w-4" /> Add Reservation
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    {reservations.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => setSelectedResDetails(item)}
                        className={`cursor-pointer rounded-lg border-2 transition-all ${
                          selectedResDetails?._id === item._id
                            ? 'border-primary shadow-sm'
                            : 'border-transparent'
                        }`}
                      >
                        <ReservationCard
                          reservation={item}
                          onEdit={(b) => navigate(`/restaurant/reservations/${b._id}/edit`)}
                          onDelete={(bId) => handleDelete(bId)}
                          onStatusUpdate={handleStatusUpdate}
                          canManage={canManage}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <span className="text-xs text-muted-foreground">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} bookings)
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                          disabled={page === pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Customer Log Details */}
        <div className="lg:col-span-1">
          <CustomerDetailsCard reservation={selectedResDetails} />
        </div>
      </div>
    </RestaurantLayout>
  );
}
