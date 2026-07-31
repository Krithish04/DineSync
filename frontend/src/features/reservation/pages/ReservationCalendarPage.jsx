import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Loader from '@/components/common/Loader';
import CalendarView from '../components/CalendarView';
import useAuthStore from '@/features/auth/store/auth.store';
import * as reservationApi from '../api/reservation.api';
import * as tableApi from '@/features/table/api/table.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function ReservationCalendarPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load branches initially
  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
      if (res.items?.length > 0) {
        setSelectedBranch(res.items[0]._id); // Preselect first branch
      }
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load tables for the selected branch
  const loadBranchTables = useCallback(async () => {
    if (!selectedBranch) return;
    try {
      const res = await tableApi.listTables(restaurantId, { branch: selectedBranch, limit: 100 });
      setTables(res.items || []);
    } catch {
      setTables([]);
    }
  }, [restaurantId, selectedBranch]);

  // Load bookings for the calendar scope
  const loadCalendarBookings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedBranch) params.branch = selectedBranch;

      // In weekly view, fetch all active bookings. In daily view, filter by date.
      if (viewMode === 'day') {
        params.date = selectedDate;
      }
      
      const result = await reservationApi.listReservations(restaurantId, {
        ...params,
        limit: 200, // Fetch up to 200 bookings for the calendar grid
      });
      setReservations(result.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservations.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedBranch, selectedDate, viewMode]);

  useEffect(() => {
    if (restaurantId) {
      loadBranches();
    }
  }, [restaurantId, loadBranches]);

  useEffect(() => {
    if (selectedBranch) {
      loadBranchTables();
    }
  }, [selectedBranch, loadBranchTables]);

  useEffect(() => {
    if (restaurantId) {
      loadCalendarBookings();
    }
  }, [restaurantId, selectedBranch, selectedDate, viewMode, loadCalendarBookings]);

  // Calendar shift buttons
  const shiftDate = (amount) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + amount);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleCardClick = (res) => {
    navigate(`/restaurant/reservations/${res._id}/edit`);
  };

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Visual grid scheduling interface for reservations and tables."
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Reservations Sheet</CardTitle>
            <CardDescription>Visual hourly sheet centered on branch tables or calendar days.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/reservations/list')} className="h-8">
              <List className="h-4 w-4 mr-1.5" /> List View
            </Button>
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/reservations/dashboard')} className="h-8">
              <Grid className="h-4 w-4 mr-1.5" /> Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters, Controls bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            {/* Branch selector */}
            <div className="flex items-center gap-2">
              <Label htmlFor="branch-picker" className="text-xs font-semibold shrink-0">Branch:</Label>
              <select
                id="branch-picker"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="flex h-9 w-full appearance-none rounded border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none min-w-[160px]"
              >
                {branches.length === 0 && <option value="">No branches</option>}
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

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
    </RestaurantLayout>
  );
}
