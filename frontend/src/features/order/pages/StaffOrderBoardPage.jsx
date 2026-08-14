import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ShoppingBag, Clock, Utensils, Eye, RefreshCw, Layers, Users, User, CheckCircle2, Bell, Volume2, X, ChefHat } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import Loader from '@/components/common/Loader';
import TableOrderDetailModal from '@/features/table/components/TableOrderDetailModal';
import MergeTablesModal from '@/features/table/components/MergeTablesModal';
import useAuthStore from '@/features/auth/store/auth.store';
import { playStaffAlertSound, playBillSettledAlertSound } from '@/utils/soundAlert.util';
import * as orderApi from '../api/order.api';
import * as tableApi from '@/features/table/api/table.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const STATUS_THEMES = {
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Accepted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Preparing: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Ready: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Served: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

function formatElapsed(createdAt) {
  if (!createdAt) return '0m';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function StaffOrderBoardPage() {
  const navigate = useNavigate();
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'Occupied', 'Available'
  const [selectedOrderTable, setSelectedOrderTable] = useState(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [staffAlerts, setStaffAlerts] = useState([]);

  // Fetch tables and live active orders
  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const [tablesRes, ordersRes] = await Promise.allSettled([
        tableApi.listTables(restaurantId, { limit: 100 }),
        orderApi.listOrders(restaurantId, { limit: 100 }),
      ]);

      let fetchedTables = [];
      if (tablesRes.status === 'fulfilled' && tablesRes.value) {
        fetchedTables = tablesRes.value.items || [];
        // Sort tables numerically by tableNumber
        fetchedTables.sort((a, b) => {
          const numA = parseInt(a.tableNumber, 10) || 0;
          const numB = parseInt(b.tableNumber, 10) || 0;
          return numA - numB;
        });
        setTables(fetchedTables);
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value) {
        const activeStates = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'];
        const occupiedTableIds = new Set(
          fetchedTables
            .filter((t) => t.status === 'Occupied' || (t.mergedInto && t.status !== 'Available'))
            .map((t) => String(t._id))
        );

        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
        const filteredOrders = (ordersRes.value.items || []).filter((o) => {
          if (!activeStates.includes(o.orderStatus)) return false;
          if (o.orderStatus === 'Completed' || o.paymentStatus === 'Paid') return false;

          // Exclude old finished orders created more than 12 hours ago
          if (o.createdAt && (Date.now() - new Date(o.createdAt).getTime()) > TWELVE_HOURS_MS) {
            return false;
          }

          const orderTableId = o.table?._id || o.table;
          if (orderTableId) {
            return occupiedTableIds.has(String(orderTableId));
          }
          return true;
        });

        setOrders(filteredOrders);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load floor tables and live orders.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadData();
    }
  }, [restaurantId, loadData]);

  // Socket.IO Integration for Real-Time Updates
  useEffect(() => {
    if (!restaurantId) return;

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    const socketURL = baseURL.replace('/api/v1', '');

    const socket = io(socketURL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join:restaurant', restaurantId);
    });

    // 1. Table status updates (Occupied, Available, Session Start)
    socket.on('table:updated', (data) => {
      if (!data?.tableId) return;
      const targetId = String(data.tableId);

      setTables((prev) =>
        prev.map((t) => {
          if (String(t._id) === targetId) {
            return {
              ...t,
              status: data.status || t.status,
              currentHostName: data.currentHostName !== undefined ? data.currentHostName : t.currentHostName,
            };
          }
          return t;
        })
      );

      // If table becomes Available, clear out its orders
      if (data.status === 'Available' || data.forceLogout) {
        setOrders((prev) => prev.filter((o) => String(o.table?._id || o.table) !== targetId));
      }
    });

    socket.on('table:session-started', (data) => {
      if (!data?.tableId) return;
      const targetId = String(data.tableId);

      setTables((prev) =>
        prev.map((t) =>
          String(t._id) === targetId
            ? { ...t, status: 'Occupied', currentHostName: data.hostName || t.currentHostName }
            : t
        )
      );
    });

    // 2. Session Ended event -> Clear orders and mark Available
    socket.on('table:session-ended', (data) => {
      if (!data?.tableId) return;
      const targetId = String(data.tableId);

      setTables((prev) =>
        prev.map((t) =>
          String(t._id) === targetId ? { ...t, status: 'Available', currentHostName: '' } : t
        )
      );

      // Clear orders for this table immediately
      setOrders((prev) => prev.filter((o) => String(o.table?._id || o.table) !== targetId));
    });

    // 3. Order created/updated/cancelled
    socket.on('order:created', (newOrder) => {
      setOrders((prev) => {
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });
    });

    socket.on('order:updated', (updatedOrder) => {
      const activeStates = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'];
      const isStillActive = activeStates.includes(updatedOrder.orderStatus);

      setOrders((prev) => {
        const exists = prev.some((o) => o._id === updatedOrder._id);
        if (exists) {
          if (isStillActive) {
            return prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o));
          }
          return prev.filter((o) => o._id !== updatedOrder._id);
        }
        if (isStillActive) {
          return [updatedOrder, ...prev];
        }
        return prev;
      });
    });

    socket.on('order:cancelled', (cancelledOrder) => {
      setOrders((prev) => prev.filter((o) => o._id !== cancelledOrder._id));
    });

    // 4. Customer Assistance Request -> Trigger Sound Alert & Add to Active Alerts
    socket.on('assistance:requested', (data) => {
      playStaffAlertSound();
      const alertId = `alert-${Date.now()}`;
      const newAlert = {
        id: alertId,
        type: 'assistance',
        tableId: data.tableId,
        tableName: data.tableName || (data.tableNumber ? `Table #${data.tableNumber}` : 'Table'),
        note: data.note || 'Customer requested staff assistance.',
        time: new Date(),
      };

      setStaffAlerts((prev) => [newAlert, ...prev.filter((a) => String(a.tableId) !== String(data.tableId))]);
    });

    // 5. Bill Settlement / Cash Payment -> Trigger Cash Chime Sound & Add Settlement Alert
    socket.on('bill:settled', (data) => {
      playBillSettledAlertSound();
      const alertId = `settle-${Date.now()}`;
      const newAlert = {
        id: alertId,
        type: 'bill_settled',
        tableId: data.tableId,
        tableName: data.tableNumber ? `Table #${data.tableNumber}` : 'Table',
        note: `Bill settled via ${data.paymentMethod || 'Cash/UPI'} (₹${Number(data.totalAmount || 0).toFixed(2)})`,
        time: new Date(),
      };

      setStaffAlerts((prev) => [newAlert, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId]);

  // Group active orders by table ID
  const ordersByTable = useMemo(() => {
    const map = {};
    orders.forEach((ord) => {
      const tableId = String(ord.table?._id || ord.table || '');
      if (tableId) {
        if (!map[tableId]) map[tableId] = [];
        map[tableId].push(ord);
      }
    });
    return map;
  }, [orders]);

  // Separate non-table takeaway orders
  const takeawayOrders = useMemo(
    () => orders.filter((o) => !o.table),
    [orders]
  );

  // Filtered tables list
  const filteredTables = useMemo(() => {
    if (filterMode === 'Occupied') {
      return tables.filter((t) => t.status === 'Occupied' || (ordersByTable[String(t._id)] || []).length > 0);
    }
    if (filterMode === 'Available') {
      return tables.filter((t) => t.status === 'Available' && (!ordersByTable[String(t._id)] || ordersByTable[String(t._id)].length === 0));
    }
    return tables;
  }, [tables, filterMode, ordersByTable]);

  const occupiedCount = useMemo(
    () => tables.filter((t) => t.status === 'Occupied' || (ordersByTable[String(t._id)] || []).length > 0).length,
    [tables, ordersByTable]
  );

  const availableCount = useMemo(
    () => tables.filter((t) => t.status === 'Available' && (!ordersByTable[String(t._id)] || ordersByTable[String(t._id)].length === 0)).length,
    [tables, ordersByTable]
  );

  return (
    <RestaurantLayout
      title="Staff Live Table & Order Board"
      description="Monitor physical tables, view live items ordered for active sessions, and track session status."
    >
      <div className="space-y-6">
        {/* Top Header Bar & Action Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" /> Live Table & Order Board
            </h2>
            <p className="text-xs text-muted-foreground">
              {tables.length} tables total • {occupiedCount} occupied with live orders
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/restaurant/kitchen')}
              className="gap-1.5 border-orange-500/30 text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-500/10"
              title="Open Live Kitchen Monitor Console"
            >
              <ChefHat className="h-4 w-4 text-orange-600" /> Kitchen Monitor
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => playStaffAlertSound()}
              className="gap-1.5 text-xs text-amber-700 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
              title="Test Chime Sound Alert"
            >
              <Volume2 className="h-4 w-4 text-amber-600" /> Test Alert
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsMergeModalOpen(true)} className="gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 font-semibold">
              <Layers className="h-4 w-4" /> Merge Tables
            </Button>
            <Button size="sm" variant="outline" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* CUSTOMER ASSISTANCE & BILL SETTLEMENT SOUND ALERT BANNERS */}
        {staffAlerts.length > 0 && (
          <div className="space-y-2">
            {staffAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl p-3.5 shadow-lg border flex items-center justify-between animate-in slide-in-from-top duration-300 ${
                  alert.type === 'bill_settled'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-amber-500 text-white border-amber-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-white/20 text-white animate-bounce">
                    {alert.type === 'bill_settled' ? <CheckCircle2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <span>{alert.type === 'bill_settled' ? `💳 ${alert.tableName} Payment Received` : `🔔 ${alert.tableName} Assistance Call`}</span>
                      <span className="text-[10px] font-normal opacity-85">({formatElapsed(alert.time)})</span>
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">{alert.note}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (alert.type === 'bill_settled') {
                        playBillSettledAlertSound();
                      } else {
                        playStaffAlertSound();
                      }
                      setStaffAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                    }}
                    className="h-8 text-xs font-bold bg-white text-slate-900 hover:bg-slate-50 px-3 rounded-lg shadow-sm"
                  >
                    Dismiss Alert
                  </Button>
                  <button
                    onClick={() => setStaffAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                    className="opacity-80 hover:opacity-100 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3 Compact Stat Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:border-primary/40 transition-colors shadow-xs">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">Total Floor Tables</span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Utensils className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-semibold font-display text-foreground tracking-tight">
                  {tables.length}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">Physical dining layout</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-orange-500/40 transition-colors shadow-xs">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">Occupied Tables</span>
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-semibold font-display text-foreground tracking-tight">
                  {occupiedCount}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">Active dining sessions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-emerald-500/40 transition-colors shadow-xs">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">Available Tables</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-semibold font-display text-foreground tracking-tight">
                  {availableCount}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">Ready for new diners</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'all', label: `All Tables (${tables.length})` },
            { id: 'Occupied', label: `Occupied (${occupiedCount})` },
            { id: 'Available', label: `Available (${availableCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap capitalize ${
                filterMode === tab.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Live Tables Grid */}
        {isLoading ? (
          <Loader label="Loading live floor tables & orders..." />
        ) : filteredTables.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Utensils className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold text-foreground">No tables found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {filterMode === 'all'
                ? 'No dining tables configured yet.'
                : `No tables currently with status "${filterMode}".`}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTables.map((table) => {
              const tableId = String(table._id);
              const tableOrders = ordersByTable[tableId] || [];
              const isOccupied = table.status === 'Occupied' || tableOrders.length > 0;
              const allItems = tableOrders.flatMap((o) => o.items || []);

              return (
                <Card
                  key={table._id}
                  className={`border-l-4 transition-all duration-200 hover:shadow-md ${
                    table.mergedInto
                      ? 'border-l-purple-500 bg-purple-500/5 border-border'
                      : isOccupied
                      ? 'border-l-orange-500 bg-orange-500/5 border-border'
                      : 'border-l-emerald-500 border-border bg-card'
                  }`}
                >
                  <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardTitle className="text-base font-bold text-foreground">
                          Table {table.tableNumber}
                        </CardTitle>
                        {table.tableName && (
                          <span className="text-xs text-muted-foreground italic">
                            ({table.tableName})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 font-medium">
                        <Users className="h-3 w-3" />
                        {table.capacity} Seats
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {staffAlerts.some((a) => String(a.tableId) === String(table._id)) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white animate-bounce shadow-sm">
                          <Bell size={11} className="animate-spin" /> Staff Requested!
                        </span>
                      ) : table.mergedInto ? (
                        <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                          Merged → Table #{table.mergedInto.tableNumber || 'Primary'}
                        </span>
                      ) : isOccupied ? (
                        <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold text-orange-600">
                          Occupied
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                          Available
                        </span>
                      )}

                      {table.mergedTables && table.mergedTables.length > 0 && (
                        <span className="text-[10px] font-semibold text-purple-600">
                          Group ({table.mergedTables.length + 1} Tables)
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3 space-y-3">
                    {/* Occupied State -> Show Host & Live Items Ordered */}
                    {isOccupied ? (
                      <div className="space-y-2.5">
                        {table.currentHostName && (
                          <div className="flex items-center gap-1.5 text-xs text-orange-700 dark:text-orange-400 font-semibold bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
                            <User className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                            <span className="truncate">Host: <strong>{table.currentHostName}</strong></span>
                          </div>
                        )}

                        {/* Active Order Badges & Timestamps */}
                        {tableOrders.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {tableOrders.map((ord) => (
                              <span
                                key={ord._id}
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/40"
                              >
                                #{ord.orderNumber.slice(-4)}
                                <span className="text-[9px] opacity-75">({formatElapsed(ord.createdAt)})</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Live Items Ordered List */}
                        <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                          <div className="flex items-center justify-between text-[11px] font-bold text-foreground border-b border-border/30 pb-1 mb-1">
                            <span className="flex items-center gap-1">
                              <Utensils className="h-3 w-3 text-primary" /> Items Ordered ({allItems.length})
                            </span>
                            <span className="text-[10px] font-normal text-muted-foreground">Live Session</span>
                          </div>

                          {allItems.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic py-1">Session active • No items ordered yet.</p>
                          ) : (
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                              {allItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-xs py-0.5 border-b border-border/20 last:border-0">
                                  <span className="font-medium text-foreground pr-2">
                                    {item.quantity}× {item.itemName}
                                  </span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                    STATUS_THEMES[item.kitchenStatus || 'Pending'] || 'bg-muted text-muted-foreground'
                                  }`}>
                                    {item.kitchenStatus || 'Pending'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* View Session Details Action */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrderTable(table)}
                          className="w-full h-8 text-xs font-semibold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 gap-1.5 mt-1 rounded-lg"
                        >
                          <Eye size={13} /> View Session Details
                        </Button>
                      </div>
                    ) : (
                      /* Available State -> Cleared Items Empty State */
                      <div className="py-5 text-center border border-dashed rounded-lg bg-muted/10 space-y-1">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500/70 mx-auto" />
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Table Available</p>
                        <p className="text-[10px] text-muted-foreground">No active session • Items cleared</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Takeaway / Non-Table Active Orders (if any exist) */}
        {takeawayOrders.length > 0 && (
          <div className="pt-6 border-t border-border space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" /> Takeaway &amp; Quick Orders ({takeawayOrders.length})
            </h3>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {takeawayOrders.map((order) => (
                <Card key={order._id} className="border border-border">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <span className="text-[10px] font-mono bg-muted rounded px-2 py-0.5">#{order.orderNumber}</span>
                      <CardTitle className="text-sm font-bold mt-1">Takeaway Order</CardTitle>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_THEMES[order.orderStatus] || 'bg-muted'}`}>
                      {order.orderStatus}
                    </span>
                  </CardHeader>
                  <CardContent className="pt-2 text-xs space-y-1">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.itemName}</span>
                        <span className="text-[10px] font-bold">{item.kitchenStatus || 'Pending'}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table Session Order Details Modal */}
      {selectedOrderTable && (
        <TableOrderDetailModal
          isOpen={!!selectedOrderTable}
          onClose={() => setSelectedOrderTable(null)}
          table={selectedOrderTable}
          restaurantId={restaurantId}
        />
      )}

      {/* Merge Tables Modal */}
      <MergeTablesModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        tables={tables}
        restaurantId={restaurantId}
        onSuccess={loadData}
      />
    </RestaurantLayout>
  );
}
