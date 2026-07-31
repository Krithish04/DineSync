import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Utensils, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import * as customerApi from '../api/customerPlatform.api';

/**
 * In-Menu Active Order Tracker Card.
 * Appears at top of digital menu screen with a 10-second cancellation countdown timer
 * and live kitchen order tracking.
 */
export default function InMenuOrderTracker() {
  const {
    restaurantId = '66aa11112222333344445555',
    placedOrders = [],
    signOutHost,
  } = useCartStore();

  const [expanded, setExpanded] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Tick timer every second for 10-second cancellation countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!placedOrders || placedOrders.length === 0) return null;

  // Get most recent active order
  const latestOrder = placedOrders[placedOrders.length - 1];

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingId(orderId);
    try {
      await customerApi.cancelCustomerOrder(restaurantId, orderId).catch(() => null);
      // Remove order from Zustand placedOrders store
      useCartStore.setState((state) => ({
        placedOrders: state.placedOrders.filter((o) => o._id !== orderId),
      }));
    } catch {
      // Non-fatal
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-4 shadow-sm space-y-3 transition-all animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
            <Utensils size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold font-display text-foreground flex items-center gap-2">
              <span>{placedOrders.length} Active Order{placedOrders.length > 1 ? 's' : ''} Sent to Kitchen</span>
            </h4>
            <p className="text-[10px] text-muted-foreground">Keep adding items below anytime</p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Order Tracking Details */}
      {expanded && (
        <div className="space-y-2 pt-1 border-t border-border/40">
          {placedOrders.map((ord) => {
            const createdAtMs = new Date(ord.createdAt || Date.now()).getTime();
            const elapsedSec = Math.floor((now - createdAtMs) / 1000);
            const remainingSec = Math.max(0, 10 - elapsedSec);
            const isCanCancel = remainingSec > 0;

            return (
              <div
                key={ord._id}
                className="bg-muted/30 border border-border/60 rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{ord.orderNumber}</span>
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Kitchen Preparing
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {ord.itemsCount || 1} item(s) • Total ₹{(ord.grandTotal || 0).toFixed(2)}
                  </p>
                </div>

                {/* 10-Second Cancellation Timer Button */}
                {isCanCancel ? (
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
                ) : (
                  <span className="text-[10px] text-muted-foreground italic font-medium">
                    Order In Prep
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
