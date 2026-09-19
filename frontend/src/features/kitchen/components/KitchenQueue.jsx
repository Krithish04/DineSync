import { useState } from 'react';
import KitchenTicketCard from './KitchenTicketCard';
import { Button } from '@/components/ui/button';
import { Layers, CheckCircle2 } from 'lucide-react';

export default function KitchenQueue({
  title,
  status,
  tickets = [],
  onTicketDrop,
  onStatusChange,
  onItemStatusChange,
  onSelectTicket,
  isReadOnly = false,
  isPeakMode = false,
  focusLimit = 4,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDragOver = (e) => {
    if (!isReadOnly) e.preventDefault();
  };

  const handleDrop = (e) => {
    if (!isReadOnly) {
      e.preventDefault();
      const ticketId = e.dataTransfer.getData('text/plain');
      if (ticketId && onTicketDrop) {
        onTicketDrop(ticketId, status);
      }
    }
  };

  const visibleTickets = isExpanded || tickets.length <= focusLimit ? tickets : tickets.slice(0, focusLimit);
  const hiddenCount = Math.max(0, tickets.length - focusLimit);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col bg-muted/30 border border-border rounded-2xl min-h-[520px] overflow-hidden shadow-xs transition-all"
    >
      {/* Column Header */}
      <div className="px-3 py-2 border-b border-border/70 bg-card flex justify-between items-center shrink-0">
        <span className="text-sm sm:text-base font-extrabold font-sans text-foreground tracking-tight">{title}</span>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tickets Scroll area */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
          {visibleTickets.map((t, idx) => (
            <KitchenTicketCard
              key={t._id}
              ticket={t}
              queuePosition={idx + 1}
              onStatusChange={onStatusChange}
              onItemStatusChange={onItemStatusChange}
              onSelectTicket={onSelectTicket}
              isDraggable={!isReadOnly}
              isReadOnly={isReadOnly}
              isPeakMode={isPeakMode}
            />
          ))}
        </div>

        {!isExpanded && hiddenCount > 0 && (
          <Button
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="w-full py-2 text-xs font-bold border-dashed border-primary/40 text-primary hover:bg-primary/10 rounded-xl flex items-center justify-center gap-1.5 h-9"
          >
            <Layers size={14} /> +{hiddenCount} More Queued Tickets (Expand)
          </Button>
        )}

        {isExpanded && hiddenCount > 0 && (
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(false)}
            className="w-full text-[11px] font-bold text-muted-foreground hover:text-foreground h-7"
          >
            ▲ Collapse Focus View
          </Button>
        )}

        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-muted-foreground/60 select-none space-y-2 my-auto">
            <div className="h-10 w-10 rounded-full bg-card border border-border/70 flex items-center justify-center text-emerald-500 shadow-2xs">
              <CheckCircle2 size={20} />
            </div>
            <p className="text-xs font-bold text-foreground">Queue is Clear</p>
            <p className="text-[11px] text-muted-foreground max-w-[200px]">No tickets currently in {title.toLowerCase()}.</p>
          </div>
        )}
      </div>
    </div>
  );
}

