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
}) {
  const [elapsed, setElapsed] = useState('');
  const [elapsedMinsNum, setElapsedMinsNum] = useState(0);
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

  // Color escalation based on aging: >15m red with thick border & ring pulse, >10m amber, else primary
  const getAgingTheme = () => {
    if (ticket.status === 'Ready' || ticket.status === 'Served') {
      return 'border-l-[12px] border-l-[#2FA86E] bg-emerald-500/10 dark:bg-emerald-950/20';
    }
    if (elapsedMinsNum >= 15 || ticket.status === 'Delayed') {
      return 'border-l-[12px] border-l-[#D64545] bg-rose-500/15 dark:bg-rose-950/30 ring-4 ring-rose-500/40 animate-pulse';
    }
    if (elapsedMinsNum >= 10) {
      return 'border-l-[12px] border-l-[#E8A93C] bg-amber-500/15 dark:bg-amber-950/25';
    }
    return 'border-l-[12px] border-l-primary bg-card';
  };

  return (
    <Card
      draggable={canDrag}
      onDragStart={handleDragStart}
      className={`relative overflow-hidden transition-all duration-300 border-2 border-border shadow-lg rounded-2xl animate-in slide-in-from-top-4 fade-in duration-300 ${getAgingTheme()} ${
        canDrag ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Ticket Header: Prominent 32px Table # & Ticking Age Timer for Kitchen Distance Viewing */}
        <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-3.5">
          <div className="cursor-pointer flex-1" onClick={() => onSelectTicket && onSelectTicket(ticket)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-mono font-extrabold text-foreground bg-muted border border-border rounded-lg px-2.5 py-1">
                Ticket #{ticket.ticketNumber || ticket._id?.slice(-4)}
              </span>
              {queuePosition && (
                <span className="text-xs sm:text-sm font-bold font-mono text-amber-800 dark:text-amber-200 bg-amber-500/20 border border-amber-500/40 rounded-lg px-2.5 py-1">
                  #{queuePosition} in Queue
                </span>
              )}
            </div>

            <h3 className="font-extrabold text-2xl sm:text-3xl text-foreground mt-1.5 tracking-tight font-display leading-none">
              {tableNum ? `Table #${tableNum}` : ticket.orderType || 'General Order'}
              {custName && <span className="text-base sm:text-lg text-muted-foreground font-semibold ml-2">({custName})</span>}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`flex items-center gap-1.5 text-lg sm:text-xl font-extrabold font-mono ${
                elapsedMinsNum >= 15 ? 'text-[#D64545] animate-bounce' : elapsedMinsNum >= 10 ? 'text-[#E8A93C]' : 'text-primary'
              }`}
              title="Time elapsed since order placed"
            >
              <Clock className="h-5 w-5 shrink-0 animate-pulse" />
              {elapsed}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-extrabold uppercase border shadow-xs ${
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

        {/* Ticket Items Grid: Bold 20px+ Item Names & Customizer Badges */}
        <div className="space-y-3.5 cursor-pointer" onClick={() => onSelectTicket && onSelectTicket(ticket)}>
          {ticket.items.map((item) => (
            <div key={item._id} className="space-y-1.5 border-b border-border/40 pb-3 last:border-none last:pb-0">
              <div className="flex justify-between items-start gap-2">
                <span className="font-extrabold text-foreground text-lg sm:text-xl leading-tight">
                  {item.itemName} <span className="font-mono text-primary font-extrabold text-xl sm:text-2xl ml-1">x{item.quantity}</span>
                </span>
                
                {/* Individual Item Status Actions (Minimum 48px target for item toggles) */}
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

              {item.modifiers?.length > 0 && (
                <p className="text-sm font-extrabold text-primary pl-2 border-l-2 border-primary/40">
                  • {item.modifiers.map((m) => m.optionName).join(', ')}
                </p>
              )}
              {item.specialInstructions && (
                <p className="text-sm text-amber-900 dark:text-amber-200 font-extrabold italic pl-2.5 bg-amber-500/20 border-l-4 border-amber-500 p-2 rounded-r-xl">
                  Note: {item.specialInstructions}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions: Minimum 56px Touch Target Buttons with Generous Spacing */}
        {!isReadOnly && onStatusChange && (
          <div className="flex items-center gap-3 border-t border-border/60 pt-3.5" onClick={(e) => e.stopPropagation()}>
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
