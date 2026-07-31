import { Calendar, Users, Clock, Coffee, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ShiftCalendar({ shifts = [], onAssignRoster }) {
  if (shifts.length === 0) {
    return (
      <div className="text-center py-10 text-xs text-muted-foreground italic border border-dashed rounded bg-muted/5">
        No shifts scheduled. Create one to begin.
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {shifts.map((s) => (
        <Card key={s._id} className="border border-border/80 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2.5">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xs font-bold text-foreground tracking-wide uppercase">{s.shiftName}</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  {s.startTime} — {s.endTime}
                </CardDescription>
              </div>
              <span className="inline-flex rounded-full bg-primary/10 text-primary font-bold px-2 py-0.5 text-[9px] uppercase">
                {s.assignedEmployees?.length || 0} Staff
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Coffee className="h-3.5 w-3.5" />
              <span>Break: {s.breakDuration} minutes</span>
            </div>

            {/* Assigned Staff pills list */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest block">Assigned Roster</span>
              {(!s.assignedEmployees || s.assignedEmployees.length === 0) ? (
                <p className="text-[10px] text-muted-foreground italic">No staff assigned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {s.assignedEmployees.map((e) => (
                    <span key={e._id} className="inline-flex items-center rounded-md bg-muted border text-[9px] px-1.5 py-0.2 font-medium text-foreground">
                      {e.firstName} {e.lastName[0]}.
                    </span>
                  ))}
                </div>
              )}
            </div>

            {onAssignRoster && (
              <Button
                size="xs"
                variant="outline"
                className="w-full text-[10px] h-8 mt-2"
                onClick={() => onAssignRoster(s)}
              >
                <Users className="h-3.5 w-3.5 mr-1" /> Assign Staff
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
export { Calendar };
