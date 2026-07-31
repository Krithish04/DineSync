import KitchenTicketCard from './KitchenTicketCard';

export default function KitchenQueue({
  title,
  status,
  tickets = [],
  onTicketDrop,
  onStatusChange,
  onItemStatusChange,
}) {
  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow dropping!
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain');
    if (ticketId && onTicketDrop) {
      onTicketDrop(ticketId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col bg-muted/40 border border-border rounded-lg h-[620px] overflow-hidden"
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border bg-muted/30 flex justify-between items-center shrink-0">
        <span className="text-xs font-bold text-foreground">{title}</span>
        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-background border text-foreground">
          {tickets.length}
        </span>
      </div>

      {/* Tickets Scroll area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-[150px]">
        {tickets.map((t) => (
          <KitchenTicketCard
            key={t._id}
            ticket={t}
            onStatusChange={onStatusChange}
            onItemStatusChange={onItemStatusChange}
            isDraggable={true}
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
