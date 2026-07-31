import { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { ChefHat, Maximize, Minimize, Filter, Clock, Play, CheckSquare, AlertOctagon } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import KitchenQueue from '../components/KitchenQueue';
import useAuthStore from '@/features/auth/store/auth.store';
import * as kitchenApi from '../api/kitchen.api';
import * as branchApi from '@/features/branch/api/branch.api';

const STATIONS = ['Main Kitchen', 'Tandoor', 'Bar', 'Dessert', 'Beverage'];

export default function KitchenDashboardPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStation, setSelectedStation] = useState('Main Kitchen');
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
      if (res.items?.length > 0) {
        setSelectedBranch(res.items[0]._id);
      }
    } catch {
      // Non-fatal
    }
  }, [restaurantId]);

  // Load KDS Tickets & Stats
  const loadKDSData = useCallback(async () => {
    if (!selectedBranch) return;
    setIsLoading(true);
    setError('');
    try {
      const params = { branch: selectedBranch };
      
      const [ticketsResult, statsResult] = await Promise.all([
        kitchenApi.listTickets(restaurantId, { ...params, station: selectedStation }),
        kitchenApi.getKitchenStats(restaurantId, params),
      ]);

      setTickets(ticketsResult || []);
      setStats(statsResult);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load KDS dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedBranch, selectedStation]);

  useEffect(() => {
    if (restaurantId) {
      loadBranches();
    }
  }, [restaurantId, loadBranches]);

  useEffect(() => {
    if (selectedBranch) {
      loadKDSData();
    }
  }, [selectedBranch, selectedStation, loadKDSData]);

  // Socket.IO Integration for Live KDS Updates
  useEffect(() => {
    if (!restaurantId || !selectedBranch) return;

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    const socketURL = baseURL.replace('/api/v1', '');

    const socket = io(socketURL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join:restaurant', restaurantId);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('kitchen:tickets_created', (newTickets) => {
      // Filter for current station & branch
      const matched = newTickets.filter(
        (t) =>
          t.station === selectedStation &&
          (t.branch?._id === selectedBranch || t.branch === selectedBranch)
      );

      if (matched.length > 0) {
        setTickets((prev) => {
          // Prevent duplicates
          const filterNew = matched.filter((m) => !prev.some((p) => p._id === m._id));
          return [...prev, ...filterNew];
        });

        // Recalculate stats counters
        kitchenApi.getKitchenStats(restaurantId, { branch: selectedBranch }).then(setStats).catch(() => {});
      }
    });

    socket.on('kitchen:ticket_updated', (updatedTicket) => {
      const isCorrectStation = updatedTicket.station === selectedStation;
      const isCorrectBranch = updatedTicket.branch?._id === selectedBranch || updatedTicket.branch === selectedBranch;

      setTickets((prev) => {
        const exists = prev.some((t) => t._id === updatedTicket._id);
        
        if (exists) {
          // If ticket moved out of active lanes (e.g. Served), remove it
          if (['Served'].includes(updatedTicket.status) || !isCorrectStation || !isCorrectBranch) {
            return prev.filter((t) => t._id !== updatedTicket._id);
          } else {
            return prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t));
          }
        } else if (['Pending', 'Preparing', 'Ready', 'Delayed'].includes(updatedTicket.status) && isCorrectStation && isCorrectBranch) {
          return [...prev, updatedTicket];
        }
        return prev;
      });

      // Recalculate stats counters
      kitchenApi.getKitchenStats(restaurantId, { branch: selectedBranch }).then(setStats).catch(() => {});
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId, selectedBranch, selectedStation]);

  // Handle Full Screen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Status transitions
  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const updated = await kitchenApi.updateTicketStatus(restaurantId, ticketId, newStatus);
      // Remove served tickets immediately from active dashboard lanes
      if (newStatus === 'Served') {
        setTickets((prev) => prev.filter((t) => t._id !== ticketId));
      } else {
        setTickets((prev) => prev.map((t) => (t._id === ticketId ? updated : t)));
      }
      
      // Update stats counters
      const newStats = await kitchenApi.getKitchenStats(restaurantId, { branch: selectedBranch });
      setStats(newStats);
    } catch {
      // Non-fatal
    }
  };

  // Drag and drop handler
  const handleTicketDrop = async (ticketId, targetStatus) => {
    await handleStatusChange(ticketId, targetStatus);
  };

  // Item check actions (preparing/ready checklist)
  const handleItemStatusChange = async (ticketId, itemId, itemStatus) => {
    try {
      const updated = await kitchenApi.updateTicketItemStatus(restaurantId, ticketId, itemId, itemStatus);
      setTickets((prev) => prev.map((t) => (t._id === ticketId ? updated : t)));
    } catch {
      // Non-fatal
    }
  };

  // Separate tickets into lanes
  const lanes = useMemo(() => {
    return {
      pending: tickets.filter((t) => t.status === 'Pending'),
      preparing: tickets.filter((t) => ['Preparing', 'Delayed'].includes(t.status)),
      ready: tickets.filter((t) => t.status === 'Ready'),
    };
  }, [tickets]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Kitchen display dashboard monitoring live cook queues."
    >
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground shrink-0">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="flex h-9 w-full appearance-none rounded border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none min-w-[170px]"
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs font-semibold text-muted-foreground">
              {socketConnected ? 'KDS Display Online' : 'Offline'}
            </span>
          </div>

          <Button size="xs" variant="outline" onClick={toggleFullscreen} className="h-8 gap-1">
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            Fullscreen KDS
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* KDS Stats widgets */}
        {!isLoading && stats && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Pending Tickets</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.pendingTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ChefHat className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Preparing Tickets</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.preparingTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center">
                  <Play className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Ready Tickets</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.readyTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">
                  <CheckSquare className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Delayed Tickets</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{stats.delayedTickets || 0}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center">
                  <AlertOctagon className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 col-span-2 lg:col-span-1">
              <CardContent className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase">Avg Prep Duration</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                    {stats.averagePrepTimeMinutes ? `${stats.averagePrepTimeMinutes}m` : '0m'}
                  </p>
                </div>
                <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Station Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/40">
          {STATIONS.map((station) => (
            <button
              key={station}
              onClick={() => setSelectedStation(station)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg shrink-0 border-b-2 transition-all ${
                selectedStation === station
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {station}
            </button>
          ))}
        </div>

        {/* Drag-and-Drop Columns Board */}
        {isLoading ? (
          <Loader label="Opening KDS console..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KitchenQueue
              title="Pending Confirmation"
              status="Pending"
              tickets={lanes.pending}
              onTicketDrop={handleTicketDrop}
              onStatusChange={handleStatusChange}
              onItemStatusChange={handleItemStatusChange}
            />

            <KitchenQueue
              title="Preparing (Cooking)"
              status="Preparing"
              tickets={lanes.preparing}
              onTicketDrop={handleTicketDrop}
              onStatusChange={handleStatusChange}
              onItemStatusChange={handleItemStatusChange}
            />

            <KitchenQueue
              title="Ready for Service"
              status="Ready"
              tickets={lanes.ready}
              onTicketDrop={handleTicketDrop}
              onStatusChange={handleStatusChange}
              onItemStatusChange={handleItemStatusChange}
            />
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
