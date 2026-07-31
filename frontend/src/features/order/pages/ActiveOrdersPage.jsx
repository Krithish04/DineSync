import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LayoutGrid, ShoppingBag, List, ClipboardList } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import OrderCard from '../components/OrderCard';
import useAuthStore from '@/features/auth/store/auth.store';
import * as orderApi from '../api/order.api';
import * as branchApi from '@/features/branch/api/branch.api';

export default function ActiveOrdersPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = ['super_admin', 'owner', 'manager'].includes(userRole);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const res = await branchApi.listBranches(restaurantId, { limit: 100 });
      setBranches(res.items || []);
      if (res.items?.length > 0) {
        setSelectedBranch(res.items[0]._id);
      }
    } catch {
      // Fail silently
    }
  }, [restaurantId]);

  // Load active orders (Pending, Accepted, Preparing, Ready, Served)
  const loadActiveOrders = useCallback(async () => {
    if (!selectedBranch) return;
    setIsLoading(true);
    setError('');
    try {
      // List active orders by listing all and then filtering (or filtering on backend)
      const res = await orderApi.listOrders(restaurantId, {
        branch: selectedBranch,
        limit: 100,
      });
      // Keep only active states on this board
      const activeStates = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'];
      setOrders((res.items || []).filter((o) => activeStates.includes(o.orderStatus)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load active orders.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedBranch]);

  useEffect(() => {
    if (restaurantId) {
      loadBranches();
    }
  }, [restaurantId, loadBranches]);

  useEffect(() => {
    if (selectedBranch) {
      loadActiveOrders();
    }
  }, [selectedBranch, loadActiveOrders]);

  // Socket.IO Integration for Live Updates
  useEffect(() => {
    if (!restaurantId || !selectedBranch) return;

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    const socketURL = baseURL.replace('/api/v1', '');
    
    const socket = io(socketURL, {
      withCredentials: true,
      transports: ['websocket'], // Ensure fast connection
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join:restaurant', restaurantId);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Real-Time Event handlers
    socket.on('order:created', (newOrder) => {
      // Only append if it matches selected branch
      const matchesBranch = newOrder.branch?._id === selectedBranch || newOrder.branch === selectedBranch;
      if (matchesBranch) {
        setOrders((prev) => {
          if (prev.some((o) => o._id === newOrder._id)) return prev;
          return [newOrder, ...prev];
        });
      }
    });

    socket.on('order:updated', (updatedOrder) => {
      const activeStates = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'];
      const isStillActive = activeStates.includes(updatedOrder.orderStatus);
      const matchesBranch = updatedOrder.branch?._id === selectedBranch || updatedOrder.branch === selectedBranch;

      setOrders((prev) => {
        const exists = prev.some((o) => o._id === updatedOrder._id);
        
        if (exists) {
          if (isStillActive && matchesBranch) {
            return prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o));
          } else {
            // Remove if transitioned out of active states (e.g. Completed)
            return prev.filter((o) => o._id !== updatedOrder._id);
          }
        } else if (isStillActive && matchesBranch) {
          return [updatedOrder, ...prev];
        }
        return prev;
      });
    });

    socket.on('order:cancelled', (cancelledOrder) => {
      setOrders((prev) => prev.filter((o) => o._id !== cancelledOrder._id));
    });

    socket.on('order:payment_completed', (completedOrder) => {
      setOrders((prev) => prev.filter((o) => o._id !== completedOrder._id));
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId, selectedBranch]);

  // Handle Quick State Shift
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const updated = await orderApi.updateOrderStatus(restaurantId, orderId, newStatus);
      const activeStates = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'];
      
      setOrders((prev) => {
        if (activeStates.includes(updated.orderStatus)) {
          return prev.map((o) => (o._id === orderId ? updated : o));
        } else {
          return prev.filter((o) => o._id !== orderId);
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  // Divide orders into Kanban lanes
  const lanes = useMemo(() => {
    return {
      pending: orders.filter((o) => o.orderStatus === 'Pending'),
      kitchen: orders.filter((o) => ['Accepted', 'Preparing'].includes(o.orderStatus)),
      ready: orders.filter((o) => o.orderStatus === 'Ready'),
      serving: orders.filter((o) => o.orderStatus === 'Served'),
    };
  }, [orders]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Kitchen display system and active customer queue monitor."
    >
      <div className="space-y-6">
        {/* Controls bar */}
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
              {socketConnected ? 'Live Connection Active' : 'Disconnected (Auto-Retrying)'}
            </span>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/orders/new')} className="h-8">
              <ShoppingBag className="h-4 w-4 mr-1.5" /> POS Register
            </Button>
            <Button size="xs" variant="outline" onClick={() => navigate('/restaurant/orders/history')} className="h-8">
              <List className="h-4 w-4 mr-1.5" /> Order Logs
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Kanban Board Grid */}
        {isLoading ? (
          <Loader label="Loading active board..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Lane 1: Pending */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center bg-amber-50/50 border border-amber-200/50 rounded-lg p-2.5">
                <span className="text-xs font-bold text-amber-800">Pending Action</span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {lanes.pending.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {lanes.pending.map((o) => (
                  <OrderCard
                    key={o._id}
                    order={o}
                    onClick={() => navigate(`/restaurant/orders/${o._id}`)}
                    onStatusChange={handleStatusChange}
                    canManage={canManage}
                  />
                ))}
                {lanes.pending.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-6 border border-dashed rounded italic">No pending orders.</p>
                )}
              </div>
            </div>

            {/* Lane 2: Kitchen */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center bg-orange-50/50 border border-orange-200/50 rounded-lg p-2.5">
                <span className="text-xs font-bold text-orange-800">Preparing (Kitchen)</span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  {lanes.kitchen.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {lanes.kitchen.map((o) => (
                  <OrderCard
                    key={o._id}
                    order={o}
                    onClick={() => navigate(`/restaurant/orders/${o._id}`)}
                    onStatusChange={handleStatusChange}
                    canManage={canManage}
                  />
                ))}
                {lanes.kitchen.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-6 border border-dashed rounded italic">Kitchen queue is clear.</p>
                )}
              </div>
            </div>

            {/* Lane 3: Ready */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center bg-purple-50/50 border border-purple-200/50 rounded-lg p-2.5">
                <span className="text-xs font-bold text-purple-800">Ready to Serve</span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {lanes.ready.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {lanes.ready.map((o) => (
                  <OrderCard
                    key={o._id}
                    order={o}
                    onClick={() => navigate(`/restaurant/orders/${o._id}`)}
                    onStatusChange={handleStatusChange}
                    canManage={canManage}
                  />
                ))}
                {lanes.ready.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-6 border border-dashed rounded italic">No ready orders.</p>
                )}
              </div>
            </div>

            {/* Lane 4: Serving */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center bg-teal-50/50 border border-teal-200/50 rounded-lg p-2.5">
                <span className="text-xs font-bold text-teal-800">Dining Room (Served)</span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {lanes.serving.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {lanes.serving.map((o) => (
                  <OrderCard
                    key={o._id}
                    order={o}
                    onClick={() => navigate(`/restaurant/orders/${o._id}`)}
                    onStatusChange={handleStatusChange}
                    canManage={canManage}
                  />
                ))}
                {lanes.serving.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-6 border border-dashed rounded italic">No orders currently seated.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
