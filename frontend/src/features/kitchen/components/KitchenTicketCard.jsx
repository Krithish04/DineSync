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

  // Dynamic visual SLA escalation card themes (Phase 1 & 2)
  const getSlaTheme = () => {
    if (isLeadTicket) {
      return 'border-l-[24px] border-l-rose-600 bg-gradient-to-br from-rose-500/20 via-rose-950/30 to-amber-950/20 border-rose-500 ring-8 ring-rose-500/60 shadow-[0_0_40px_rgba(225,29,72,0.5)] scale-[1.01]';
    }
    if (ticket.status === 'Ready' || ticket.status === 'Served') {
      return 'border-l-[16px] border-l-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/30';
    }
    if (flag === 'late' || ticket.status === 'Delayed') {
      return 'border-l-[20px] border-l-rose-600 bg-rose-500/15 dark:bg-rose-950/40 border-rose-500/50 ring-4 ring-rose-500/40 shadow-[0_0_25px_rgba(225,29,72,0.35)] animate-pulse';
    }
    if (flag === 'at-risk') {
      return 'border-l-[16px] border-l-amber-500 bg-amber-500/15 dark:bg-amber-950/35 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]';
    }
    return 'border-l-[16px] border-l-primary bg-card border-border';
  };

  return (
    <Card
      draggable={canDrag}
      onDragStart={handleDragStart}
      className={`relative overflow-hidden transition-all duration-300 border-3 shadow-xl rounded-3xl animate-in slide-in-from-top-4 fade-in duration-300 ${getSlaTheme()} ${
        canDrag ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <CardContent className={`space-y-4 ${isLeadTicket ? 'p-6 sm:p-8 space-y-6' : isPeakMode ? 'p-4' : 'p-5 sm:p-6'}`}>
        {/* Lead Ticket Special Dominance Banner */}
        {isLeadTicket && (
          <div className="bg-rose-600 text-white p-3 rounded-2xl flex items-center justify-between font-mono font-black text-sm sm:text-base tracking-wider uppercase shadow-xl animate-pulse">
            <span className="flex items-center gap-2">
              🚨 MOST URGENT TICKET — IMMEDIATE KITCHEN PRIORITY
            </span>
            <span className="bg-white text-rose-950 px-3 py-1 rounded-xl font-mono text-xs font-black">
              1-SECOND GLANCE LEAD
            </span>
          </div>
        )}
        {/* SLA Priority Flag Banner */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs sm:text-sm font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            {flag === 'late' && (
              <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-mono shadow-md animate-bounce flex items-center gap-1.5 text-xs sm:text-sm font-black">
                🚨 OVERDUE SLA
              </span>
            )}
            {flag === 'at-risk' && (
              <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-955 font-mono shadow-md flex items-center gap-1.5 text-xs sm:text-sm font-black">
                ⚠️ AT-RISK SLA (-3m)
              </span>
            )}
            {flag === 'on-track' && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-mono border border-emerald-500/40 flex items-center gap-1.5 text-xs sm:text-sm font-extrabold">
                ✓ ON TRACK
              </span>
            )}
          </div>

          {targetReadyStr && (
            <span className="text-xs font-mono text-muted-foreground bg-muted/80 px-2.5 py-1 rounded-lg border font-bold">
              Target: {targetReadyStr}
            </span>
          )}
        </div>

        {/* Ticket Header: Prominent 32px+ Table # & Ticking Age Timer */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-border/80 pb-3">
          <div className="cursor-pointer flex-1" onClick={() => onSelectTicket && onSelectTicket(ticket)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-black text-foreground bg-muted border-2 border-border rounded-xl px-2.5 py-1">
                #{ticket.ticketNumber || ticket._id?.slice(-4)}
              </span>
              {queuePosition && (
                <span className="text-sm font-extrabold font-mono text-amber-900 dark:text-amber-100 bg-amber-500/20 border border-amber-500/50 rounded-xl px-2.5 py-1">
                  #{queuePosition} Queue
                </span>
              )}
            </div>

            {/* Distance-Readable 32px+ Header */}
            <h3 className={`font-black text-foreground mt-1.5 tracking-tight font-display leading-tight ${isPeakMode ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
              {tableNum ? `Table #${tableNum}` : ticket.orderType || 'General Order'}
              {custName && <span className="text-base sm:text-lg text-muted-foreground font-extrabold ml-2">({custName})</span>}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`flex items-center gap-1.5 font-black font-mono ${isPeakMode ? 'text-xl' : 'text-2xl sm:text-3xl'} ${
                flag === 'late' ? 'text-rose-600 animate-bounce' : flag === 'at-risk' ? 'text-amber-600' : 'text-primary'
              }`}
              title="Time elapsed since order placed"
            >
              <Clock className="h-6 w-6 shrink-0 animate-pulse" />
              {elapsed}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs sm:text-sm font-black uppercase border-2 shadow-xs ${
                ticket.status === 'Pending' ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/50' :
                ticket.status === 'Preparing' ? 'bg-orange-500/20 text-orange-900 dark:text-orange-200 border-orange-500/50' :
                ticket.status === 'Ready' ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/50' :
                'bg-purple-500/20 text-purple-900 dark:text-purple-200 border-purple-500/50'
              }`}
            >
              {ticket.status === 'Pending' && '⏳ Pending'}
              {ticket.status === 'Preparing' && '🔥 Preparing'}
              {ticket.status === 'Ready' && '✅ Ready'}
              {ticket.status === 'Delayed' && '🚨 Delayed'}
              {ticket.status === 'Served' && '🍽️ Served'}
            </span>
          </div>
        </div>

        {/* Ticket Items Grid: Distance-Readable 20px+ Item Names & Quantities */}
        <div className="space-y-3 cursor-pointer" onClick={() => onSelectTicket && onSelectTicket(ticket)}>
          {ticket.items.map((item) => {
            const hasModifiers = item.modifiers?.length > 0 || item.specialInstructions;
            return (
              <div key={item._id} className="space-y-1.5 border-b-2 border-border/40 pb-3 last:border-none last:pb-0">
                <div className="flex justify-between items-center gap-3">
                  <span className={`font-black text-foreground leading-snug ${isPeakMode ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                    {item.itemName} <span className="font-mono text-primary font-black text-2xl sm:text-3xl ml-2">x{item.quantity}</span>
                  </span>

                  {!isReadOnly && onItemStatusChange && (
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {item.kitchenStatus === 'Pending' && (
                        <button
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                          className="text-sm font-extrabold px-4 py-2 border-2 rounded-xl bg-background hover:bg-muted text-foreground touch-manipulation min-h-[48px] shadow-xs"
                        >
                          Accept
                        </button>
                      )}
                      {item.kitchenStatus === 'Preparing' && (
                        <button
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Ready')}
                          className="text-sm font-extrabold px-4 py-2 border-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white touch-manipulation min-h-[48px] shadow-xs"
                        >
                          Ready ✓
                        </button>
                      )}
                      {item.kitchenStatus === 'Ready' && (
                        <button
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                          className="text-sm font-extrabold p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl touch-manipulation min-h-[48px]"
                          title="Recall item"
                        >
                          <CornerDownLeft className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Modifiers & Special Instructions — Bold Alert Highlight Box */}
                {hasModifiers && isPeakMode && !showPeakModifiers ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPeakModifiers(true);
                    }}
                    className="text-xs font-black text-primary hover:underline bg-primary/10 px-3 py-1 rounded-lg border border-primary/30"
                  >
                    + Modifiers / Custom Notes
                  </button>
                ) : (
                  <div className="space-y-1 mt-1">
                    {item.modifiers?.length > 0 && (
                      <p className="text-sm sm:text-base font-black text-primary pl-3 border-l-4 border-primary">
                        • {item.modifiers.map((m) => m.optionName).join(', ')}
                      </p>
                    )}
                    {item.specialInstructions && (
                      <div className="text-sm sm:text-base text-amber-950 dark:text-amber-100 font-black pl-3 bg-amber-500/25 border-l-4 border-amber-500 p-2 rounded-r-xl shadow-xs">
                        ⚠️ NOTE: <span className="underline">{item.specialInstructions}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions: Generous Minimum 56px Touch Target Buttons with Clear Separation */}
        {!isReadOnly && onStatusChange && (
          <div className="flex items-center gap-3 border-t-2 border-border/80 pt-3" onClick={(e) => e.stopPropagation()}>
            {ticket.status === 'Pending' && (
              <Button
                size="lg"
                className="w-full text-lg font-black min-h-[56px] gap-2 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg active:scale-[0.98] touch-manipulation"
                onClick={() => onStatusChange(ticket._id, 'Preparing')}
              >
                <Play className="h-6 w-6" /> Start Cooking
              </Button>
            )}

            {ticket.status === 'Preparing' && (
              <>
                <Button
                  size="lg"
                  className="flex-1 text-lg font-black min-h-[56px] gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-[0.98] touch-manipulation"
                  onClick={() => onStatusChange(ticket._id, 'Ready')}
                >
                  <CheckCircle2 className="h-6 w-6" /> Mark Ready ✓
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base sm:text-lg font-black min-h-[56px] gap-2 rounded-2xl border-2 border-rose-600/50 text-rose-600 hover:bg-rose-500/15 touch-manipulation px-4 shadow-xs"
                  onClick={() => onStatusChange(ticket._id, 'Delayed')}
                >
                  <AlertTriangle className="h-6 w-6" /> Delay
                </Button>
              </>
            )}

            {ticket.status === 'Delayed' && (
              <Button
                size="lg"
                className="w-full text-lg font-black min-h-[56px] gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg active:scale-[0.98] touch-manipulation"
                onClick={() => onStatusChange(ticket._id, 'Preparing')}
              >
                <Play className="h-6 w-6" /> Resume Cooking
              </Button>
            )}

            {ticket.status === 'Ready' && (
              <>
                <Button
                  size="lg"
                  className="flex-1 text-lg font-black min-h-[56px] gap-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg active:scale-[0.98] touch-manipulation"
                  onClick={() => onStatusChange(ticket._id, 'Served')}
                >
                  <UserCheck className="h-6 w-6" /> Mark Served
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-base font-extrabold min-h-[56px] rounded-2xl touch-manipulation px-4"
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

