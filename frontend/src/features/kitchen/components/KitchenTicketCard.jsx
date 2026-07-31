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
  onStatusChange,
  onItemStatusChange,
  isDraggable = true,
}) {
  const [elapsed, setElapsed] = useState('');

  // Helper to compute ticking time elapsed
  useEffect(() => {
    const computeElapsed = () => {
      const start = new Date(ticket.createdAt);
      const diffMs = Date.now() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      
      const pad = (n) => (n < 10 ? `0${n}` : n);
      setElapsed(`${diffMins}:${pad(diffSecs)}`);
    };

    computeElapsed();
    const interval = setInterval(computeElapsed, 1000);
    return () => clearInterval(interval);
  }, [ticket.createdAt]);

  const handleDragStart = (e) => {
    if (isDraggable) {
      e.dataTransfer.setData('text/plain', ticket._id);
    }
  };

  const getHighestPriority = () => {
    const priorities = ticket.items.map((i) => i.priority);
    if (priorities.includes('high')) return 'high';
    if (priorities.includes('medium')) return 'medium';
    return 'low';
  };

  const currentHighestPriority = getHighestPriority();

  return (
    <Card
      draggable={isDraggable}
      onDragStart={handleDragStart}
      className={`relative overflow-hidden transition-all duration-200 border border-border/80 shadow-sm ${
        PRIORITY_THEMES[currentHighestPriority]
      } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <CardContent className="p-4 space-y-4">
        {/* Ticket Header: No, Table & Timer */}
        <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2.5">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              {ticket.ticketNumber}
            </span>
            <h4 className="font-bold text-xs text-foreground mt-1.5">
              {ticket.orderType}
              {ticket.table && ` • Table ${ticket.table.tableNumber}`}
            </h4>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="flex items-center gap-1 text-[11px] font-bold font-mono text-foreground">
              <Clock className="h-3 w-3 text-primary shrink-0" />
              {elapsed}
            </span>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase border ${
              ticket.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
              ticket.status === 'Preparing' ? 'bg-orange-100 text-orange-800 border-orange-200' :
              ticket.status === 'Ready' ? 'bg-purple-100 text-purple-800 border-purple-200' :
              'bg-slate-100 text-slate-800 border-slate-200'
            }`}>
              {ticket.status}
            </span>
          </div>
        </div>

        {/* Ticket Items Grid */}
        <div className="space-y-2">
          {ticket.items.map((item) => (
            <div key={item._id} className="text-xs space-y-0.5 border-b border-border/20 pb-2 last:border-none last:pb-0">
              <div className="flex justify-between items-start">
                <span className="font-bold text-foreground">
                  {item.itemName} <span className="font-mono text-primary font-bold">x{item.quantity}</span>
                </span>
                
                {/* Individual item check triggers */}
                {onItemStatusChange && (
                  <div className="flex items-center gap-1">
                    {item.kitchenStatus === 'Pending' && (
                      <button
                        onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                        className="text-[9px] font-bold px-1.5 py-0.5 border rounded bg-background hover:bg-muted text-foreground"
                      >
                        Accept
                      </button>
                    )}
                    {item.kitchenStatus === 'Preparing' && (
                      <button
                        onClick={() => onItemStatusChange(ticket._id, item._id, 'Ready')}
                        className="text-[9px] font-bold px-1.5 py-0.5 border rounded bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Ready
                      </button>
                    )}
                    {item.kitchenStatus === 'Ready' && (
                      <button
                        onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                        className="text-[8px] font-semibold p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                        title="Recall item"
                      >
                        <CornerDownLeft className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Modifiers & instructions */}
              {item.modifiers?.length > 0 && (
                <p className="text-[10px] text-muted-foreground pl-1">
                  * {item.modifiers.map((m) => m.optionName).join(', ')}
                </p>
              )}
              {item.specialInstructions && (
                <p className="text-[10px] text-amber-700 italic pl-1 font-medium bg-amber-50/50 p-1 rounded">
                  Req: {item.specialInstructions}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer actions: advancing entire ticket status */}
        <div className="flex gap-1.5 border-t border-border/40 pt-2.5">
          {ticket.status === 'Pending' && (
            <Button
              size="xs"
              className="w-full text-[10px] h-7 gap-1"
              onClick={() => onStatusChange(ticket._id, 'Preparing')}
            >
              <Play className="h-3 w-3" /> Start Cooking
            </Button>
          )}

          {ticket.status === 'Preparing' && (
            <>
              <Button
                size="xs"
                className="flex-1 text-[10px] h-7 gap-1 bg-purple-600 hover:bg-purple-700"
                onClick={() => onStatusChange(ticket._id, 'Ready')}
              >
                <CheckCircle2 className="h-3 w-3" /> Mark Ready
              </Button>
              <Button
                size="xs"
                variant="outline"
                className="text-[10px] h-7 border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => onStatusChange(ticket._id, 'Delayed')}
              >
                <AlertTriangle className="h-3 w-3" /> Delay
              </Button>
            </>
          )}

          {ticket.status === 'Delayed' && (
            <Button
              size="xs"
              className="w-full text-[10px] h-7 gap-1"
              onClick={() => onStatusChange(ticket._id, 'Preparing')}
            >
              <Play className="h-3 w-3" /> Resume Cooking
            </Button>
          )}

          {ticket.status === 'Ready' && (
            <>
              <Button
                size="xs"
                className="flex-1 text-[10px] h-7 gap-1 bg-teal-600 hover:bg-teal-700"
                onClick={() => onStatusChange(ticket._id, 'Served')}
              >
                <UserCheck className="h-3 w-3" /> Serve
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="text-[10px] h-7"
                onClick={() => onStatusChange(ticket._id, 'Preparing')}
              >
                Recall
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
