import { Calendar, ShoppingBag, Clock, HelpCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function CustomerTimeline({ orders = [], reservations = [] }) {
  // Merge orders and reservations into unified chronological array
  const events = [];

  orders.forEach((o) => {
    const itemCount = o.items?.length || 0;
    events.push({
      id: o._id,
      date: new Date(o.createdAt),
      type: 'order',
      title: `Placed Order #${o.orderNumber}`,
      subtitle: `${itemCount} ${itemCount === 1 ? 'item' : 'items'} purchased • Total spent ₹${(o.grandTotal || 0).toFixed(2)}`,
      status: o.orderStatus,
      raw: o,
    });
  });

  reservations.forEach((r) => {
    // Combine Date and Time
    const dt = new Date(r.reservationDate);
    const [h, m] = r.reservationTime.split(':');
    if (h && m) {
      dt.setHours(parseInt(h, 10), parseInt(m, 10));
    }

    events.push({
      id: r._id,
      date: dt,
      type: 'reservation',
      title: `Table Seating Reservation`,
      subtitle: `Reserved for ${r.numberOfGuests} guests${r.table ? ` (Table ${r.table.tableNumber})` : ''}`,
      status: r.reservationStatus,
      raw: r,
    });
  });

  // Sort descending
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground italic border border-dashed rounded bg-muted/5">
        No visit, reservation, or spent records logged yet.
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-border ml-3.5 space-y-6 py-1">
      {events.map((ev) => (
        <div key={ev.id} className="relative pl-6">
          {/* Timeline node icon centered on the border line */}
          <span className="absolute -left-3.5 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border shadow-xs z-10">
            {ev.type === 'order' ? (
              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
            )}
          </span>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                {ev.title}
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[8px] font-bold uppercase ${
                  ev.status === 'Completed' || ev.status === 'Confirmed' || ev.status === 'Seated'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : ev.status === 'Cancelled'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                }`}>
                  {ev.status}
                </span>
              </h5>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {ev.date.toLocaleDateString([], { month: 'short', day: '2-digit' })}{' '}
                {ev.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{ev.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
export { Calendar };
