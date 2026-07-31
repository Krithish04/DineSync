import { Clock, Coffee, Sparkles } from 'lucide-react';

export default function AttendanceTable({ attendance = [] }) {
  if (attendance.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground italic border border-dashed rounded bg-muted/5">
        No attendance sessions logged for this employee.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded bg-card">
      <table className="w-full text-xs text-left min-w-[650px]">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase text-[10px]">
            <th className="p-2.5 font-medium">Date</th>
            <th className="p-2.5 font-medium text-center">Status</th>
            <th className="p-2.5 font-medium text-center">Clock In</th>
            <th className="p-2.5 font-medium text-center">Clock Out</th>
            <th className="p-2.5 font-medium text-center">Breaks</th>
            <th className="p-2.5 font-medium text-right">Active Hours</th>
            <th className="p-2.5 font-medium text-right font-bold text-foreground">Overtime</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((att) => {
            const checkInTime = new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const checkOutTime = att.checkOut
              ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--:--';
            
            const breakCount = att.breaks?.length || 0;

            return (
              <tr key={att._id} className="border-b border-border last:border-none hover:bg-muted/5 transition-colors">
                <td className="p-2.5 font-mono text-[11px] text-foreground font-semibold">
                  {new Date(att.date).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                </td>
                <td className="p-2.5 text-center">
                  <span className={`inline-flex rounded-full px-2 py-0.2 text-[8px] font-bold border uppercase ${
                    att.status === 'Present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    att.status === 'Late' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    att.status === 'On Leave' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-rose-100 text-rose-800 border-rose-200'
                  }`}>
                    {att.status}
                  </span>
                </td>
                <td className="p-2.5 text-center font-mono font-medium">{checkInTime}</td>
                <td className="p-2.5 text-center font-mono font-medium">
                  {att.checkOut ? checkOutTime : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded animate-pulse">
                      <Clock className="h-3 w-3" /> Checked In
                    </span>
                  )}
                </td>
                <td className="p-2.5 text-center font-mono text-muted-foreground">
                  <span className="flex items-center justify-center gap-1 text-[11px]">
                    <Coffee className="h-3 w-3 text-muted-foreground" />
                    {breakCount} {breakCount === 1 ? 'break' : 'breaks'}
                  </span>
                </td>
                <td className="p-2.5 text-right font-mono font-bold text-foreground">
                  {att.workingHours?.toFixed(1) || '0.0'} hrs
                </td>
                <td className="p-2.5 text-right font-mono font-bold text-amber-600">
                  {att.overtime > 0 ? `+${att.overtime?.toFixed(1)} hrs` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export { Clock };
