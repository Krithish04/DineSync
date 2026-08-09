import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, ChevronDown, ChevronUp, Utensils, Lock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import useSocketStore from '@/store/socket.store';
import * as customerApi from '../api/customerPlatform.api';

/**
 * In-Menu Active Order Tracker Card.
 * Displays live table orders & ordered items for both the Table Host and View-Only secondary diners.
 */
export default function InMenuOrderTracker() {
  const {
    restaurantId,
    tableId,
    tableNumber,
    placedOrders = [],
    isViewOnly,
    isInactiveTable,
    activeSessionHostName,
  } = useCartStore();

  const socket = useSocketStore((state) => state.socket);

  const [tableOrders, setTableOrders] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Load live orders for this table
  const loadTableOrders = useCallback(async () => {
    if (!tableId || !restaurantId) return;
    try {
      const res = await customerApi.getActiveTableOrders(restaurantId, tableId);
      setTableOrders(res.orders || []);
    } catch {
      /* non-fatal */
    }
  }, [restaurantId, tableId]);

  useEffect(() => {
    loadTableOrders();
  }, [loadTableOrders]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      if (data?.table === tableId || data?.tableId === tableId || data?.restaurant === restaurantId) {
        loadTableOrders();
      }
    };

    socket.on('order:created', handleUpdate);
    socket.on('order:updated', handleUpdate);
    return () => {
      socket.off('order:created', handleUpdate);
      socket.off('order:updated', handleUpdate);
    };
  }, [socket, tableId, restaurantId, loadTableOrders]);

  // Tick timer every second for cancellation countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Merge locally placed orders and backend fetched table orders
  const displayOrders = tableOrders.length > 0 ? tableOrders : placedOrders;

  if (!displayOrders || displayOrders.length === 0) return null;

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingId(orderId);
    try {
      await customerApi.cancelCustomerOrder(restaurantId, orderId).catch(() => null);
      useCartStore.setState((state) => ({
        placedOrders: state.placedOrders.filter((o) => o._id !== orderId),
      }));
      loadTableOrders();
    } catch {
      /* non-fatal */
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-4 shadow-sm space-y-3 transition-all animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
            isViewOnly ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
          }`}>
            {isViewOnly ? <Lock size={16} /> : <Utensils size={16} />}
          </div>
          <div>
            <h4 className="text-xs font-bold font-display text-foreground flex items-center gap-2">
              <span>
                {isViewOnly
                  ? `Table ${tableNumber ? `#${tableNumber}` : ''} Active Orders (View Only)`
                  : `${displayOrders.length} Active Order${displayOrders.length > 1 ? 's' : ''} Sent to Kitchen`}
              </span>
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {isViewOnly
                ? `Ordered by ${activeSessionHostName || 'Table Host'}`
                : 'Keep adding items below anytime'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Order Tracking & Itemized Breakdown */}
      {expanded && (
        <div className="space-y-3 pt-2 border-t border-border/40">
          {displayOrders.map((ord) => {
            const createdAtMs = new Date(ord.createdAt || Date.now()).getTime();
            const elapsedSec = Math.floor((now - createdAtMs) / 1000);
            const remainingSec = Math.max(0, 10 - elapsedSec);
            const isCanCancel = !isViewOnly && remainingSec > 0;
            const items = ord.items || [];

            return (
              <div
                key={ord._id}
                className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{ord.orderNumber || `ORD-${ord._id.toString().slice(-4)}`}</span>
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> {ord.orderStatus || 'Kitchen Preparing'}
                    </span>
                  </div>
                  <span className="font-bold text-primary font-display">
                    ₹{(ord.grandTotal || 0).toFixed(2)}
                  </span>
                </div>

                {/* Ordered Items Breakdown */}
                {items.length > 0 && (
                  <div className="bg-background/80 rounded-lg p-2 space-y-1 text-[11px] border border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Dishes Ordered:</span>
                    {items.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center justify-between text-foreground">
                        <span>
                          {item.quantity}x {item.itemName || item.menuItem?.name || 'Dish'}
                        </span>
                        <span className="text-muted-foreground">₹{((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cancellation Timer (Only for Host) */}
                {isCanCancel && (
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelOrder(ord._id)}
                      disabled={cancellingId === ord._id}
                      className="h-7 text-[11px] px-2.5 font-semibold gap-1 bg-rose-600 hover:bg-rose-700 animate-pulse"
                    >
                      <Clock size={12} />
                      <span>{cancellingId === ord._id ? 'Cancelling...' : `Cancel (${remainingSec}s)`}</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
