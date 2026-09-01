import KitchenTicketCard from './KitchenTicketCard';

export default function KitchenQueue({
  title,
  status,
  tickets = [],
  onTicketDrop,
  onStatusChange,
  onItemStatusChange,
  onSelectTicket,
  isReadOnly = false,
}) {
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

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col bg-muted/40 border border-border rounded-2xl min-h-[620px] overflow-hidden shadow-xs"
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border bg-card/80 flex justify-between items-center shrink-0">
        <span className="text-base font-extrabold text-foreground tracking-tight font-display">{title}</span>
        <span className="text-sm font-extrabold font-mono px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          {tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tickets Scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {tickets.map((t, idx) => (
          <KitchenTicketCard
            key={t._id}
            ticket={t}
            queuePosition={idx + 1}
            onStatusChange={onStatusChange}
            onItemStatusChange={onItemStatusChange}
            onSelectTicket={onSelectTicket}
            isDraggable={!isReadOnly}
            isReadOnly={isReadOnly}
          />
        ))}

        {tickets.length === 0 && (
          <div className="h-full flex items-center justify-center text-center py-12 text-muted-foreground/35 select-none">
            <p className="text-[10px] italic">Queue is empty</p>
          </div>
        )}
      </div>
    </div>
  );
}
