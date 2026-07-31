import { useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Users, Utensils } from 'lucide-react';

const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export default function CalendarView({
  viewMode, // 'day' or 'week'
  selectedDate, // YYYY-MM-DD
  reservations,
  tables,
  onCardClick,
}) {
  // Parse selectedDate
  const parsedDate = useMemo(() => new Date(selectedDate), [selectedDate]);

  // Compute 7 days for Weekly view starting from selectedDate (or its Monday)
  const weekDays = useMemo(() => {
    const days = [];
    const tempDate = new Date(parsedDate);
    // Find the Monday of the current week
    const currentDay = tempDate.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    tempDate.setDate(tempDate.getDate() + distanceToMonday);

    for (let i = 0; i < 7; i++) {
      days.push(new Date(tempDate));
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return days;
  }, [parsedDate]);

  // 1. RENDER DAY VIEW (Columns = Tables, Rows = Hours)
  const renderDayView = () => {
    if (tables.length === 0) {
      return (
        <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded">
          Create branch tables first to view the reservation grid sheet.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border rounded-lg bg-card max-h-[700px]">
        <div className="min-w-[800px]">
          {/* Header row: columns represent active Tables */}
          <div className="grid border-b border-border bg-muted/30 sticky top-0 z-10" style={{ gridTemplateColumns: `100px repeat(${tables.length}, minmax(120px, 1fr))` }}>
            <div className="p-3 text-xs font-semibold text-muted-foreground flex items-center justify-center border-r">Time</div>
            {tables.map((table) => (
              <div key={table._id} className="p-3 text-center border-r last:border-r-0">
                <span className="text-xs font-bold text-foreground block">Table {table.tableNumber}</span>
                <span className="text-[10px] text-muted-foreground block font-medium">({table.capacity} Seats • {table.type})</span>
              </div>
            ))}
          </div>

          {/* Time Rows */}
          {HOURS.map((hour) => (
            <div key={hour} className="grid border-b border-border last:border-b-0 hover:bg-muted/5 transition-colors" style={{ gridTemplateColumns: `100px repeat(${tables.length}, minmax(120px, 1fr))` }}>
              {/* Hour indicator */}
              <div className="p-3 border-r font-mono text-xs font-semibold text-muted-foreground flex items-center justify-center bg-muted/10">
                {hour}
              </div>

              {/* Cells corresponding to each table */}
              {tables.map((table) => {
                // Find reservation for this specific table starting around this hour
                const cellRes = reservations.find((res) => {
                  if (res.table?._id !== table._id && res.table !== table._id) return false;
                  if (res.reservationDate !== selectedDate) return false;
                  
                  const startMin = timeToMinutes(res.reservationTime);
                  const slotMin = timeToMinutes(hour);
                  // Check if booking starts inside this 1-hour slot
                  return startMin >= slotMin && startMin < slotMin + 60;
                });

                return (
                  <div key={table._id} className="p-2 border-r last:border-r-0 min-h-[70px] relative flex flex-col justify-center">
                    {cellRes ? (
                      <div
                        onClick={() => onCardClick(cellRes)}
                        className={`rounded-md p-2 text-left cursor-pointer border text-xs shadow-sm transition-all hover:scale-[1.01] ${
                          cellRes.reservationStatus === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          cellRes.reservationStatus === 'Confirmed' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          cellRes.reservationStatus === 'Seated' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                          cellRes.reservationStatus === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="font-bold truncate">{cellRes.customerName}</div>
                        <div className="flex items-center gap-1.5 text-[10px] mt-1 font-medium opacity-90">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{cellRes.reservationTime} ({cellRes.duration}m)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] mt-0.5 font-medium opacity-90">
                          <Users className="h-3 w-3 shrink-0" />
                          <span>{cellRes.numberOfGuests} Guests</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/20 font-mono text-center block">empty</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 2. RENDER WEEK VIEW (Columns = Monday-Sunday, Rows = Hours)
  const renderWeekView = () => {
    return (
      <div className="overflow-x-auto border rounded-lg bg-card max-h-[700px]">
        <div className="min-w-[850px]">
          {/* Header row: Mon-Sun columns */}
          <div className="grid border-b border-border bg-muted/30 sticky top-0 z-10" style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}>
            <div className="p-3 text-xs font-semibold text-muted-foreground flex items-center justify-center border-r">Time</div>
            {weekDays.map((day, idx) => {
              const dateStr = day.toISOString().slice(0, 10);
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              return (
                <div key={idx} className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                  <span className={`text-xs font-bold block ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    {day.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Rows */}
          {HOURS.map((hour) => (
            <div key={hour} className="grid border-b border-border last:border-b-0 hover:bg-muted/5 transition-colors" style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}>
              {/* Hour indicator */}
              <div className="p-3 border-r font-mono text-xs font-semibold text-muted-foreground flex items-center justify-center bg-muted/10">
                {hour}
              </div>

              {/* Day cells */}
              {weekDays.map((day, dIdx) => {
                const dateStr = day.toISOString().slice(0, 10);
                
                // Find all reservations on this day starting within this hour
                const hourResList = reservations.filter((res) => {
                  if (res.reservationDate !== dateStr) return false;
                  const startMin = timeToMinutes(res.reservationTime);
                  const slotMin = timeToMinutes(hour);
                  return startMin >= slotMin && startMin < slotMin + 60;
                });

                return (
                  <div key={dIdx} className="p-2 border-r last:border-r-0 min-h-[80px] space-y-1.5 flex flex-col justify-start">
                    {hourResList.map((res) => (
                      <div
                        key={res._id}
                        onClick={() => onCardClick(res)}
                        className={`rounded p-1.5 text-left cursor-pointer border text-[10px] shadow-sm transition-all hover:scale-[1.01] ${
                          res.reservationStatus === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          res.reservationStatus === 'Confirmed' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          res.reservationStatus === 'Seated' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                          res.reservationStatus === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="font-bold truncate">{res.customerName}</div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-80">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{res.reservationTime}</span>
                          <Utensils className="h-2.5 w-2.5 ml-1" />
                          <span>T-{res.table?.tableNumber || '?'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {viewMode === 'day' ? renderDayView() : renderWeekView()}
    </div>
  );
}
