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

  // Color escalation based on aging: >15m red, >10m yellow, else green
  const getAgingTheme = () => {
    if (ticket.status === 'Ready' || ticket.status === 'Served') {
      return 'border-l-8 border-l-[#2FA86E] bg-emerald-500/5';
    }
    if (elapsedMinsNum >= 15 || ticket.status === 'Delayed') {
      return 'border-l-8 border-l-[#D64545] bg-rose-500/10 dark:bg-rose-950/20 ring-2 ring-rose-500/30 animate-pulse';
    }
    if (elapsedMinsNum >= 10) {
      return 'border-l-8 border-l-[#E8A93C] bg-amber-500/10 dark:bg-amber-950/20';
    }
    return 'border-l-8 border-l-[#2F6FED] bg-card';
  };

  return (
    <Card
      draggable={canDrag}
      onDragStart={handleDragStart}
      className={`relative overflow-hidden transition-all duration-200 border border-border shadow-md ${getAgingTheme()} ${
        canDrag ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <CardContent className="p-4 space-y-3.5">
        {/* Ticket Header: Large Table # & Aging Timer for 1-3m Distance Visibility */}
        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-muted-foreground bg-muted rounded px-2 py-0.5">
                #{ticket.ticketNumber}
              </span>
              {queuePosition && (
                <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded px-2 py-0.5">
                  #{queuePosition} in Queue
                </span>
              )}
            </div>
            <h3 className="font-bold text-base sm:text-lg text-foreground mt-1 tracking-tight font-display">
              {tableNum ? `Table #${tableNum}` : ticket.orderType}
              {custName ? ` (${custName})` : ''}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`flex items-center gap-1.5 text-sm sm:text-base font-extrabold font-mono ${
                elapsedMinsNum >= 15 ? 'text-[#D64545] animate-bounce' : elapsedMinsNum >= 10 ? 'text-[#E8A93C]' : 'text-primary'
              }`}
              title="Time elapsed since order placed"
            >
              <Clock className="h-4 w-4 shrink-0 animate-pulse" />
              {elapsed}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase border ${
                ticket.status === 'Pending' ? 'bg-[#8B8078]/20 text-[#8B8078] border-[#8B8078]/40' :
                ticket.status === 'Preparing' ? 'bg-[#E8A93C]/20 text-[#E8A93C] border-[#E8A93C]/40' :
                ticket.status === 'Ready' ? 'bg-[#2FA86E]/20 text-[#2FA86E] border-[#2FA86E]/40' :
                'bg-[#6B5B95]/20 text-[#6B5B95] border-[#6B5B95]/40'
              }`}
            >
              {ticket.status}
            </span>
          </div>
        </div>

        {/* Ticket Items Grid: Bold Text & Clear Modifiers */}
        <div className="space-y-3">
          {ticket.items.map((item) => (
            <div key={item._id} className="text-sm space-y-1 border-b border-border/30 pb-2.5 last:border-none last:pb-0">
              <div className="flex justify-between items-start">
                <span className="font-extrabold text-foreground text-sm sm:text-base">
                  {item.itemName} <span className="font-mono text-primary font-bold text-base">x{item.quantity}</span>
                </span>
                
                {/* Individual Item Status Actions */}
                {!isReadOnly && onItemStatusChange && (
                  <div className="flex items-center gap-1">
                    {item.kitchenStatus === 'Pending' && (
                      <button
                        onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                        className="text-xs font-bold px-2 py-1 border rounded bg-background hover:bg-muted text-foreground touch-manipulation min-h-[32px]"
                      >
                        Accept
                      </button>
                    )}
                    {item.kitchenStatus === 'Preparing' && (
                      <button
                        onClick={() => onItemStatusChange(ticket._id, item._id, 'Ready')}
                        className="text-xs font-bold px-2 py-1 border rounded bg-[#2FA86E] hover:bg-[#2FA86E]/90 text-white touch-manipulation min-h-[32px]"
                      >
                        Ready ✓
                      </button>
                    )}
                    {item.kitchenStatus === 'Ready' && (
                      <button
                        onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                        className="text-xs font-semibold p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded touch-manipulation min-h-[32px]"
                        title="Recall item"
                      >
                        <CornerDownLeft className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {item.modifiers?.length > 0 && (
                <p className="text-xs text-muted-foreground font-semibold pl-1">
                  • {item.modifiers.map((m) => m.optionName).join(', ')}
                </p>
              )}
              {item.specialInstructions && (
                <p className="text-xs text-amber-800 dark:text-amber-200 font-semibold italic pl-2 bg-amber-500/15 border-l-2 border-amber-500 p-1.5 rounded-r">
                  Note: {item.specialInstructions}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions: 56px Touch Target Buttons for Gloved Hands */}
        {!isReadOnly && onStatusChange && (
          <div className="flex gap-2 border-t border-border/50 pt-3">
            {ticket.status === 'Pending' && (
              <Button
                size="lg"
                className="w-full text-sm font-bold min-h-[52px] gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md active:scale-[0.98] touch-manipulation"
                onClick={() => onStatusChange(ticket._id, 'Preparing')}
              >
                <Play className="h-5 w-5" /> Start Cooking
              </Button>
            )}

            {ticket.status === 'Preparing' && (
              <>
                <Button
                  size="lg"
                  className="flex-1 text-sm font-bold min-h-[52px] gap-2 rounded-xl bg-[#2FA86E] hover:bg-[#2FA86E]/90 text-white shadow-md active:scale-[0.98] touch-manipulation"
                  onClick={() => onStatusChange(ticket._id, 'Ready')}
                >
                  <CheckCircle2 className="h-5 w-5" /> Mark Ready ✓
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-sm font-bold min-h-[52px] gap-1.5 rounded-xl border-[#D64545]/40 text-[#D64545] hover:bg-[#D64545]/10 touch-manipulation px-3.5"
                  onClick={() => onStatusChange(ticket._id, 'Delayed')}
                >
                  <AlertTriangle className="h-5 w-5" /> Delay
                </Button>
              </>
            )}

            {ticket.status === 'Delayed' && (
              <Button
                size="lg"
                className="w-full text-sm font-bold min-h-[52px] gap-2 rounded-xl bg-[#E8A93C] hover:bg-[#E8A93C]/90 text-white shadow-md active:scale-[0.98] touch-manipulation"
                onClick={() => onStatusChange(ticket._id, 'Preparing')}
              >
                <Play className="h-5 w-5" /> Resume Cooking
              </Button>
            )}

            {ticket.status === 'Ready' && (
              <>
                <Button
                  size="lg"
                  className="flex-1 text-sm font-bold min-h-[52px] gap-2 rounded-xl bg-[#6B5B95] hover:bg-[#6B5B95]/90 text-white shadow-md active:scale-[0.98] touch-manipulation"
                  onClick={() => onStatusChange(ticket._id, 'Served')}
                >
                  <UserCheck className="h-5 w-5" /> Mark Served
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-xs font-semibold min-h-[52px] rounded-xl touch-manipulation"
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
