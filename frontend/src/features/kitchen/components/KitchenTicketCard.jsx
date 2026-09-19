import { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle2, UserCheck, AlertTriangle, CornerDownLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PRIORITY_THEMES = {
  high: 'border-l-4 border-l-rose-500 bg-rose-50/10 dark:bg-rose-950/5',
  medium: 'border-l-4 border-l-amber-500 bg-amber-50/10 dark:bg-amber-950/5',
  low: 'border-l-4 border-l-slate-400 bg-slate-50/10 dark:bg-slate-900/5',
};

export default function KitchenTicketCard({
  ticket,
  queuePosition,
  onStatusChange,
  onItemStatusChange,
  onSelectTicket,
  isDraggable = true,
  isReadOnly = false,
  isPeakMode = false,
  isLeadTicket = false,
}) {
  const [elapsed, setElapsed] = useState('');
  const [elapsedMinsNum, setElapsedMinsNum] = useState(0);
  const [showPeakModifiers, setShowPeakModifiers] = useState(false);
  const canDrag = isDraggable && !isReadOnly;

  // Helper to compute ticking time elapsed and minutes number for color escalation
  useEffect(() => {
    const computeElapsed = () => {
      const start = new Date(ticket.createdAt);
      const diffMs = Date.now() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);

      setElapsedMinsNum(diffMins);
      const pad = (n) => (n < 10 ? `0${n}` : n);
      setElapsed(`${diffMins}:${pad(diffSecs)}`);
    };

    computeElapsed();
    const interval = setInterval(computeElapsed, 1000);
    return () => clearInterval(interval);
  }, [ticket.createdAt]);

  const handleDragStart = (e) => {
    if (canDrag) {
      e.dataTransfer.setData('text/plain', ticket._id);
    }
  };

  const tableNum =
    ticket.table?.tableNumber ??
    ticket.table?.tableName ??
    (typeof ticket.table === 'number' || (typeof ticket.table === 'string' && !ticket.table.match(/^[0-9a-fA-F]{24}$/)) ? ticket.table : null) ??
    ticket.tableNumber ??
    ticket.order?.table?.tableNumber ??
    ticket.order?.tableNumber;

  const custName =
    ticket.customerName ??
    ticket.customer?.fullName ??
    ticket.order?.customerName ??
    ticket.order?.customer?.fullName ??
    ticket.order?.currentHostName;

  const flag = ticket.priorityFlag || (elapsedMinsNum >= 15 ? 'late' : elapsedMinsNum >= 10 ? 'at-risk' : 'on-track');

  // Target ready time calculation string
  const targetReadyStr = ticket.targetReadyTime
    ? new Date(ticket.targetReadyTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Urgency Top Stripe Color
  const getTopStripeColor = () => {
    if (flag === 'late' || ticket.status === 'Delayed') return 'bg-rose-500';
    if (flag === 'at-risk') return 'bg-amber-500';
    if (ticket.status === 'Ready' || ticket.status === 'Served') return 'bg-emerald-500';
    return 'bg-primary';
  };

  return (
    <Card
      draggable={canDrag}
      onDragStart={handleDragStart}
      className={`relative overflow-hidden transition-all border shadow-xs rounded-xl bg-card animate-in slide-in-from-top-2 fade-in duration-200 ${
        isLeadTicket
          ? 'border-amber-500/80 ring-2 ring-amber-500/30 shadow-sm'
          : flag === 'late' || ticket.status === 'Delayed'
          ? 'border-rose-500/50'
          : flag === 'at-risk'
          ? 'border-amber-500/40'
          : 'border-border/80'
      } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Urgency Top Edge Stripe */}
      <div className={`h-1.5 w-full ${getTopStripeColor()}`} />

      <CardContent className="p-3 space-y-2.5">
        {/* Ticket Header: Table # / Order Type, Order ID, Priority Chip & Compact Timer Badge */}
        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
          <div className="cursor-pointer flex-1 min-w-0" onClick={() => onSelectTicket && onSelectTicket(ticket)}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base text-foreground tracking-tight truncate">
                {tableNum ? `Table #${tableNum}` : ticket.orderType || 'General Order'}
              </h3>
              {custName && <span className="text-xs text-muted-foreground font-semibold truncate">({custName})</span>}
              {isLeadTicket && (
                <span className="text-[10px] font-extrabold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded uppercase shrink-0">
                  🔥 Priority #1
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mt-0.5">
              <span>#{ticket.ticketNumber || ticket._id?.slice(-4)}</span>
              {queuePosition && <span className="text-amber-700 dark:text-amber-300 font-bold">• #{queuePosition} Queue</span>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* Compact Timer Badge */}
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-black border flex items-center gap-1 ${
                flag === 'late'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse'
                  : flag === 'at-risk'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                  : 'bg-muted text-foreground border-border/80'
              }`}
              title="Time elapsed"
            >
              <Clock size={12} className="shrink-0" />
              {elapsed}
            </span>

            {/* Status Pill */}
            <span
              className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                ticket.status === 'Pending' ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30' :
                ticket.status === 'Preparing' ? 'bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/30' :
                ticket.status === 'Ready' ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30' :
                'bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/30'
              }`}
            >
              {ticket.status}
            </span>
          </div>
        </div>

        {/* Ticket Items List & Allergy/Dietary Note Strip */}
        <div className="space-y-1.5 cursor-pointer" onClick={() => onSelectTicket && onSelectTicket(ticket)}>
          {ticket.items.map((item) => {
            const hasModifiers = item.modifiers?.length > 0 || item.specialInstructions;
            return (
              <div key={item._id} className="space-y-1 border-b border-border/30 pb-1.5 last:border-none last:pb-0">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-foreground leading-snug flex items-center flex-wrap">
                    {item.itemName} <span className="font-mono text-primary font-black text-xs sm:text-sm ml-1">x{item.quantity}</span>
                    {(flag === 'late' || ticket.status === 'Delayed' || item.kitchenStatus === 'Delayed') && item.kitchenStatus !== 'Ready' && (
                      <span className="ml-1.5 text-[10px] font-mono font-extrabold text-rose-600 bg-rose-500/15 border border-rose-500/40 px-1.5 py-0.5 rounded animate-pulse">
                        🚨 DELAYED
                      </span>
                    )}
                  </span>

                  {!isReadOnly && onItemStatusChange && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {item.kitchenStatus === 'Pending' && (
                        <button
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                          className="h-7 px-2 text-[11px] font-bold border rounded-md bg-background hover:bg-muted text-foreground touch-manipulation cursor-pointer"
                        >
                          Accept
                        </button>
                      )}
                      {item.kitchenStatus === 'Preparing' && (
                        <button
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Ready')}
                          className="h-7 px-2 text-[11px] font-bold border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md touch-manipulation cursor-pointer"
                        >
                          Ready ✓
                        </button>
                      )}
                      {item.kitchenStatus === 'Ready' && (
                        <button
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                          className="h-7 px-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-md touch-manipulation cursor-pointer"
                          title="Recall item"
                        >
                          <CornerDownLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Modifiers & Special Allergy/Dietary Instructions Strip */}
                {hasModifiers && (
                  <div className="space-y-0.5">
                    {item.modifiers?.length > 0 && (
                      <p className="text-[11px] font-semibold text-primary pl-2 border-l-2 border-primary">
                        • {item.modifiers.map((m) => m.optionName).join(', ')}
                      </p>
                    )}
                    {item.specialInstructions && (
                      <div className="text-[11px] text-amber-950 dark:text-amber-200 font-bold px-2 py-0.5 bg-amber-500/15 border-l-2 border-amber-500 rounded-r shadow-2xs">
                        ⚠️ NOTE: <span>{item.specialInstructions}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Compact Footer Actions */}
        {!isReadOnly && onStatusChange && (
          <div className="flex items-center gap-2 border-t border-border/60 pt-2" onClick={(e) => e.stopPropagation()}>
            {ticket.status === 'Pending' && (
              <Button
                size="sm"
                className="w-full h-8 text-xs font-bold gap-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground touch-manipulation cursor-pointer"
                onClick={() => onStatusChange(ticket._id, 'Preparing')}
              >
                <Play className="h-3.5 w-3.5" /> Start Cooking
              </Button>
            )}

            {ticket.status === 'Preparing' && (
              <>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs font-bold gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white touch-manipulation cursor-pointer"
                  onClick={() => onStatusChange(ticket._id, 'Ready')}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Ready ✓
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs font-bold gap-1 rounded-lg border-rose-600/40 text-rose-600 hover:bg-rose-500/10 touch-manipulation cursor-pointer"
                  onClick={() => onStatusChange(ticket._id, 'Delayed')}
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Delay
                </Button>
              </>
            )}

            {ticket.status === 'Delayed' && (
              <Button
                size="sm"
                className="w-full h-8 text-xs font-bold gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white touch-manipulation cursor-pointer"
                onClick={() => onStatusChange(ticket._id, 'Preparing')}
              >
                <Play className="h-3.5 w-3.5" /> Resume Cooking
              </Button>
            )}

            {ticket.status === 'Ready' && (
              <>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs font-bold gap-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white touch-manipulation cursor-pointer"
                  onClick={() => onStatusChange(ticket._id, 'Served')}
                >
                  <UserCheck className="h-3.5 w-3.5" /> Mark Served
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs font-bold rounded-lg touch-manipulation cursor-pointer"
                  onClick={() => onStatusChange(ticket._id, 'Preparing')}
                >
                  Recall
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

