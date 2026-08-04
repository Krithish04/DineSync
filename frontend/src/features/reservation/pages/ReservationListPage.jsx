import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Filter, FileText } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import ReservationCard from '../components/ReservationCard';
import useAuthStore from '@/features/auth/store/auth.store';
import useSocketStore from '@/store/socket.store';
import * as reservationApi from '../api/reservation.api';

export default function ReservationListPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const userRole = useAuthStore((state) => state.user?.role);
  const connectSocket = useSocketStore((state) => state.connect);
  const socket = useSocketStore((state) => state.socket);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter States
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Real-time socket room join
  useEffect(() => {
    if (restaurantId) connectSocket(restaurantId);
  }, [restaurantId, connectSocket]);

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

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

      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedDate) params.date = selectedDate;

      const res = await reservationApi.listReservations(restaurantId, params);
      setReservations(res.items || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservations.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, page, searchDebounced, selectedStatus, selectedDate]);

  useEffect(() => {
    if (restaurantId) {
      loadReservations();
    }
  }, [restaurantId, loadReservations]);

  // Socket.IO Listener for real-time booking updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => loadReservations();
    socket.on('reservation:created', handleUpdate);
    socket.on('reservation:updated', handleUpdate);
    return () => {
      socket.off('reservation:created', handleUpdate);
      socket.off('reservation:updated', handleUpdate);
    };
  }, [socket, loadReservations]);

  // Status Change
  const handleStatusUpdate = async (reservationId, status) => {
    try {
      const updated = await reservationApi.updateReservationStatus(restaurantId, reservationId, status);
      setReservations((prev) => prev.map((r) => (r._id === reservationId ? updated : r)));
      setSuccess(`Reservation marked as ${status}.`);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update reservation status.');
    }
  };

  // Delete
  const handleDelete = async (resv) => {
    if (!window.confirm(`Are you sure you want to cancel & delete reservation for ${resv.customerName}?`)) return;
    try {
      await reservationApi.deleteReservation(restaurantId, resv._id);
      setSuccess('Reservation deleted.');
      loadReservations();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete reservation.');
    }
  };

  return (
    <RestaurantLayout
      title="Reservation Management"
      description="View, filter, create, and manage dining table bookings."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Bookings &amp; Guest List</CardTitle>
            <CardDescription>Filter reservations by status, date, or search customer details.</CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => navigate('/restaurant/reservations/new')}>
              <Plus className="mr-1.5 h-4 w-4" /> Book Table
            </Button>
          )}
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

          {/* Filter Bar */}
          <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, ref #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

            <div className="relative">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                className="text-sm"
              />
            </div>
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <Loader label="Loading reservations..." />
          ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-lg bg-muted/10">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {searchDebounced || selectedStatus !== 'all' || selectedDate
                  ? 'No reservations match your filters.'
                  : 'No table reservations booked yet.'}
              </p>
              {canManage && (
                <Button size="sm" onClick={() => navigate('/restaurant/reservations/new')}>
                  <Plus className="mr-1.5 h-4 w-4" /> Book Table
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {reservations.map((resv) => (
                  <ReservationCard
                    key={resv._id}
                    reservation={resv}
                    onEdit={(r) => navigate(`/restaurant/reservations/${r._id}/edit`)}
                    onDelete={handleDelete}
                    onStatusUpdate={handleStatusUpdate}
                    canManage={canManage}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
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
    </RestaurantLayout>
  );
}
