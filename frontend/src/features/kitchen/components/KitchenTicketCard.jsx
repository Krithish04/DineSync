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

  // Color escalation based on priorityFlag and aging scale
  const getSlaTheme = () => {
    if (ticket.status === 'Ready' || ticket.status === 'Served') {
      return 'border-l-[12px] border-l-[#2FA86E] bg-emerald-500/10 dark:bg-emerald-950/20';
    }
    if (flag === 'late' || ticket.status === 'Delayed') {
      return 'border-l-[12px] border-l-[#D64545] bg-rose-500/15 dark:bg-rose-950/30 ring-4 ring-rose-500/40 animate-pulse';
    }
    if (flag === 'at-risk') {
      return 'border-l-[12px] border-l-[#E8A93C] bg-amber-500/15 dark:bg-amber-950/25';
    }
    return 'border-l-[12px] border-l-primary bg-card';
  };

  // Target ready time calculation string
  const targetReadyStr = ticket.targetReadyTime
    ? new Date(ticket.targetReadyTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Card
      draggable={canDrag}
      onDragStart={handleDragStart}
      className={`relative overflow-hidden transition-all duration-300 border-2 border-border shadow-lg rounded-2xl animate-in slide-in-from-top-4 fade-in duration-300 ${getSlaTheme()} ${
        canDrag ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <CardContent className={`space-y-3 ${isPeakMode ? 'p-3' : 'p-4 sm:p-5'}`}>
        {/* SLA Priority Flag Banner */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-extrabold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            {flag === 'late' && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-mono shadow-xs animate-bounce">
                🚨 OVERDUE SLA
              </span>
            )}
            {flag === 'at-risk' && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono shadow-xs">
                ⚠️ AT-RISK SLA (-3m)
              </span>
            )}
            {flag === 'on-track' && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono border border-emerald-500/30">
                ✓ ON TRACK SLA
              </span>
            )}
          </div>

          {targetReadyStr && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md border">
              Target: {targetReadyStr}
            </span>
          )}
        </div>

        {/* Ticket Header: Prominent 32px Table # & Ticking Age Timer */}
        <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-2.5">
          <div className="cursor-pointer flex-1" onClick={() => onSelectTicket && onSelectTicket(ticket)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-extrabold text-foreground bg-muted border border-border rounded-lg px-2 py-0.5">
                #{ticket.ticketNumber || ticket._id?.slice(-4)}
              </span>
              {queuePosition && (
                <span className="text-xs font-bold font-mono text-amber-800 dark:text-amber-200 bg-amber-500/20 border border-amber-500/40 rounded-lg px-2 py-0.5">
                  #{queuePosition} Queue
                </span>
              )}
            </div>

            <h3 className={`font-extrabold text-foreground mt-1 tracking-tight font-display leading-none ${isPeakMode ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>
              {tableNum ? `Table #${tableNum}` : ticket.orderType || 'General Order'}
              {custName && <span className="text-sm text-muted-foreground font-semibold ml-2">({custName})</span>}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`flex items-center gap-1 font-extrabold font-mono ${isPeakMode ? 'text-base' : 'text-lg sm:text-xl'} ${
                flag === 'late' ? 'text-[#D64545] animate-bounce' : flag === 'at-risk' ? 'text-[#E8A93C]' : 'text-primary'
              }`}
              title="Time elapsed since order placed"
            >
              <Clock className="h-4 w-4 shrink-0 animate-pulse" />
              {elapsed}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase border shadow-xs ${
                ticket.status === 'Pending' ? 'bg-[#8B8078]/25 text-[#8B8078] border-[#8B8078]/50' :
                ticket.status === 'Preparing' ? 'bg-[#E8A93C]/25 text-[#E8A93C] border-[#E8A93C]/50' :
                ticket.status === 'Ready' ? 'bg-[#2FA86E]/25 text-[#2FA86E] border-[#2FA86E]/50' :
                'bg-[#6B5B95]/25 text-[#6B5B95] border-[#6B5B95]/50'
              }`}
            >
              {ticket.status}
            </span>
          </div>
        </div>

        {/* Ticket Items Grid */}
        <div className="space-y-2 cursor-pointer" onClick={() => onSelectTicket && onSelectTicket(ticket)}>
          {ticket.items.map((item) => {
            const hasModifiers = item.modifiers?.length > 0 || item.specialInstructions;
            return (
              <div key={item._id} className="space-y-1 border-b border-border/40 pb-2 last:border-none last:pb-0">
                <div className="flex justify-between items-start gap-2">
                  <span className={`font-extrabold text-foreground leading-tight ${isPeakMode ? 'text-base' : 'text-lg sm:text-xl'}`}>
                    {item.itemName} <span className="font-mono text-primary font-extrabold text-xl ml-1">x{item.quantity}</span>
                  </span>

                  {!isReadOnly && onItemStatusChange && (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {item.kitchenStatus === 'Pending' && (
                        <button
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                          className="text-xs font-bold px-3 py-2 border rounded-xl bg-background hover:bg-muted text-foreground touch-manipulation min-h-[44px] shadow-xs"
                        >
                          Accept
                        </button>
                      )}
                      {item.kitchenStatus === 'Preparing' && (
                        <button
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Ready')}
                          className="text-xs font-bold px-3 py-2 border rounded-xl bg-[#2FA86E] hover:bg-[#2FA86E]/90 text-white touch-manipulation min-h-[44px] shadow-xs"
                        >
                          Ready ✓
                        </button>
                      )}
                      {item.kitchenStatus === 'Ready' && (
                        <button
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                          className="text-xs font-semibold p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl touch-manipulation min-h-[44px]"
                          title="Recall item"
                        >
                          <CornerDownLeft className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Modifiers & Special Instructions — Collapsible in Peak Mode */}
                {hasModifiers && isPeakMode && !showPeakModifiers ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPeakModifiers(true);
                    }}
                    className="text-[11px] font-bold text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20"
                  >
                    + Modifiers / Notes
                  </button>
                ) : (
                  <>
                    {item.modifiers?.length > 0 && (
                      <p className="text-xs font-extrabold text-primary pl-2 border-l-2 border-primary/40">
                        • {item.modifiers.map((m) => m.optionName).join(', ')}
                      </p>
                    )}
                    {item.specialInstructions && (
                      <p className="text-xs text-amber-900 dark:text-amber-200 font-extrabold italic pl-2 bg-amber-500/20 border-l-2 border-amber-500 p-1.5 rounded-r-lg">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions: Minimum 56px Touch Target Buttons */}
        {!isReadOnly && onStatusChange && (
          <div className="flex items-center gap-2 border-t border-border/60 pt-2.5" onClick={(e) => e.stopPropagation()}>
            {ticket.status === 'Pending' && (
              <Button
                size="lg"
                className="w-full text-base font-extrabold min-h-[56px] gap-2 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg active:scale-[0.98] touch-manipulation"
                onClick={() => onStatusChange(ticket._id, 'Preparing')}
              >
                <Play className="h-6 w-6" /> Start Cooking
              </Button>
            )}

            {ticket.status === 'Preparing' && (
              <>
                <Button
                  size="lg"
                  className="flex-1 text-base font-extrabold min-h-[56px] gap-2 rounded-2xl bg-[#2FA86E] hover:bg-[#2FA86E]/90 text-white shadow-lg active:scale-[0.98] touch-manipulation"
                  onClick={() => onStatusChange(ticket._id, 'Ready')}
                >
                  <CheckCircle2 className="h-6 w-6" /> Mark Ready ✓
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base font-extrabold min-h-[56px] gap-1.5 rounded-2xl border-[#D64545]/50 text-[#D64545] hover:bg-[#D64545]/15 touch-manipulation px-4 shadow-xs"
                  onClick={() => onStatusChange(ticket._id, 'Delayed')}
                >
                  <AlertTriangle className="h-6 w-6" /> Delay
                </Button>
              </>
            )}

            {ticket.status === 'Delayed' && (
              <Button
                size="lg"
                className="w-full text-base font-extrabold min-h-[56px] gap-2 rounded-2xl bg-[#E8A93C] hover:bg-[#E8A93C]/90 text-white shadow-lg active:scale-[0.98] touch-manipulation"
                onClick={() => onStatusChange(ticket._id, 'Preparing')}
              >
                <Play className="h-6 w-6" /> Resume Cooking
              </Button>
            )}

            {ticket.status === 'Ready' && (
              <>
                <Button
                  size="lg"
                  className="flex-1 text-base font-extrabold min-h-[56px] gap-2 rounded-2xl bg-[#6B5B95] hover:bg-[#6B5B95]/90 text-white shadow-lg active:scale-[0.98] touch-manipulation"
                  onClick={() => onStatusChange(ticket._id, 'Served')}
                >
                  <UserCheck className="h-6 w-6" /> Mark Served
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-sm font-bold min-h-[56px] rounded-2xl touch-manipulation px-4"
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

