import { Clock, DollarSign, Utensils, MapPin, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TYPE_THEMES = {
  'Dine-In': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400',
  Takeaway: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400',
  Delivery: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400',
  'QR Order': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400',
};

const STATUS_THEMES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400',
  Accepted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400',
  Preparing: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400',
  Ready: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400',
  Served: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400',
};

const PAYMENT_STATUS_THEMES = {
  Pending: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
  Refunded: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400',
};

export default function OrderCard({ order, onClick, onStatusChange, canManage = false }) {
  const currentStatus = order.orderStatus;
  const currentPayment = order.paymentStatus;

  const handleStatusClick = async (e, nextStatus) => {
    e.stopPropagation();
    if (onStatusChange) {
      await onStatusChange(order._id, nextStatus);
    }
  };

  const tableNum =
    order.table?.tableNumber ??
    order.table?.tableName ??
    (typeof order.table === 'number' || (typeof order.table === 'string' && !order.table.match(/^[0-9a-fA-F]{24}$/)) ? order.table : null) ??
    order.tableNumber;

  return (
    <Card
      onClick={onClick}
      className="relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer border border-border"
    >
      <CardContent className="p-5 space-y-4">
        {/* Header: Order No, Type & Date */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-2 py-0.5">
              {order.orderNumber}
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                TYPE_THEMES[order.orderType] || 'bg-muted'
              }`}>
                {order.orderType}
              </span>
              {tableNum && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground bg-muted/40 rounded px-1.5 py-0.5">
                  Table {tableNum}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
              STATUS_THEMES[currentStatus] || 'bg-muted'
            }`}>
              {currentStatus}
            </span>
            <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-semibold capitalize border ${
              PAYMENT_STATUS_THEMES[currentPayment] || 'bg-muted'
            }`}>
              {currentPayment}
            </span>
          </div>
        </div>

        {/* Item Summary Preview */}
        <div className="text-xs space-y-1 text-muted-foreground border-y border-border/40 py-3">
          {order.items.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex justify-between font-medium">
              <span className="truncate max-w-[170px] text-foreground">
                {item.itemName}
                {item.modifiers.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">
                    (+{item.modifiers.length} mods)
                  </span>
                )}
              </span>
              <span>x{item.quantity}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-[10px] text-muted-foreground italic mt-1">
              +{order.items.length - 3} more items...
            </p>
          )}
        </div>

        {/* Card Footer: Time, Price, Context Action */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="flex items-center gap-3">
            <p className="font-bold text-foreground text-sm">₹{order.grandTotal.toFixed(2)}</p>

            {/* Quick Status Advancing Triggers */}
            {canManage && (
              <div className="flex items-center">
                {currentStatus === 'Pending' && (
                  <Button
                    size="xs"
                    onClick={(e) => handleStatusClick(e, 'Accepted')}
                    className="h-7 text-[10px] px-2"
                  >
                    Accept
                  </Button>
                )}
                {currentStatus === 'Accepted' && (
                  <Button
                    size="xs"
                    onClick={(e) => handleStatusClick(e, 'Preparing')}
                    className="h-7 text-[10px] px-2 bg-orange-600 hover:bg-orange-700"
                  >
                    Prepare
                  </Button>
                )}
                {currentStatus === 'Preparing' && (
                  <Button
                    size="xs"
                    onClick={(e) => handleStatusClick(e, 'Ready')}
                    className="h-7 text-[10px] px-2 bg-purple-600 hover:bg-purple-700"
                  >
                    Ready
                  </Button>
                )}
                {currentStatus === 'Ready' && (
                  <Button
                    size="xs"
                    onClick={(e) => handleStatusClick(e, 'Served')}
                    className="h-7 text-[10px] px-2 bg-teal-600 hover:bg-teal-700"
                  >
                    Serve
                  </Button>
                )}
                {currentStatus === 'Served' && currentPayment === 'Paid' && (
                  <Button
                    size="xs"
                    onClick={(e) => handleStatusClick(e, 'Completed')}
                    className="h-7 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Complete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
