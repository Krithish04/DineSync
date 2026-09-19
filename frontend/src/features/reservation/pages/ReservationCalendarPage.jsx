import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Loader from '@/components/common/Loader';
import CalendarView from '../components/CalendarView';
import useAuthStore from '@/features/auth/store/auth.store';
import * as reservationApi from '../api/reservation.api';
import * as tableApi from '@/features/table/api/table.api';
import ReservationHeader from '../components/ReservationHeader';

export default function ReservationCalendarPage() {
  const restaurantId = useAuthStore((state) => {
    if (state.restaurant?._id) return state.restaurant._id.toString();
    if (typeof state.restaurant === 'string') return state.restaurant;
    if (state.user?.restaurant?._id) return state.user.restaurant._id.toString();
    if (typeof state.user?.restaurant === 'string') return state.user.restaurant;
    if (state.user?.restaurantId) return state.user.restaurantId.toString();
    return null;
  });
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load tables
  const loadTables = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const res = await tableApi.listTables(restaurantId, { limit: 100 });
      setTables(res.items || []);
    } catch {
      setTables([]);
    }
  }, [restaurantId]);

  // Load bookings for the calendar scope
  const loadCalendarBookings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {};

      if (viewMode === 'day') {
        params.date = selectedDate;
      }
      
      const result = await reservationApi.listReservations(restaurantId, {
        ...params,
        limit: 200,
      });
      setReservations(result.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservations.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedDate, viewMode]);

  useEffect(() => {
    if (restaurantId) {
      loadTables();
      loadCalendarBookings();
    }
  }, [restaurantId, loadTables, loadCalendarBookings]);

  // Calendar shift buttons
  const shiftDate = (amount) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + amount);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);

  const handleCardClick = (res) => {
    if (canManage) {
      navigate(`/restaurant/reservations/${res._id}/edit`);
    }
  };

  return (
    <RestaurantLayout
      title="Reservation Management"
      description="View, filter, create, and manage dining table bookings."
    >
      <div className="space-y-6">
        <ReservationHeader
          activeView="calendar"
          title="Reservations Sheet"
          description="Visual hourly sheet centered on dining tables or calendar days."
        />

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card className="w-full">
          <CardContent className="pt-6 space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            {/* Date shift & Picker */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 text-xs w-[140px]"
              />

              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Daily/Weekly mode toggle */}
            <div className="flex rounded border border-border overflow-hidden bg-muted/40 p-0.5">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  viewMode === 'day' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Daily Grid
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  viewMode === 'week' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Weekly Sheet
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Sheet Grid */}
          {isLoading ? (
            <Loader label="Mapping reservation sheet..." />
          ) : (
            <CalendarView
              viewMode={viewMode}
              selectedDate={selectedDate}
              reservations={reservations}
              tables={tables}
              onCardClick={handleCardClick}
            />
          )}
        </CardContent>
        </Card>
      </div>
    </RestaurantLayout>
  );
}
