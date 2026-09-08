import { useState } from 'react';
import KitchenTicketCard from './KitchenTicketCard';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';

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
      className="flex flex-col bg-muted/40 border border-border rounded-2xl min-h-[580px] overflow-hidden shadow-xs"
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border bg-card/80 flex justify-between items-center shrink-0">
        <span className="text-base font-extrabold text-foreground tracking-tight font-display">{title}</span>
        <span className="text-sm font-extrabold font-mono px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          {tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tickets Scroll area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-[200px]">
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

        {!isExpanded && hiddenCount > 0 && (
          <Button
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="w-full py-4 text-sm font-extrabold border-dashed border-primary/50 text-primary hover:bg-primary/10 rounded-2xl flex items-center justify-center gap-2 min-h-[52px]"
          >
            <Layers size={18} /> +{hiddenCount} More Queued Tickets (Tap to Focus Expand)
          </Button>
        )}

        {isExpanded && hiddenCount > 0 && (
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(false)}
            className="w-full text-xs font-bold text-muted-foreground hover:text-foreground py-2"
          >
            ▲ Collapse Focus View
          </Button>
        )}

        {tickets.length === 0 && (
          <div className="h-full flex items-center justify-center text-center py-12 text-muted-foreground/35 select-none">
            <p className="text-xs font-semibold italic">Queue is empty</p>
          </div>
        )}
      </div>
    </div>
  );
}

