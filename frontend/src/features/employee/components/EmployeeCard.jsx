import { Mail, Phone, Calendar, User, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RoleBadge from './RoleBadge';

export default function EmployeeCard({ employee, onEdit, onDelete }) {
  if (!employee) return null;

  return (
    <Card className="border border-border/80 hover:shadow-md transition-shadow relative overflow-hidden bg-card">
      <CardContent className="p-5 space-y-4">
        {/* Top: profile summary */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {employee.firstName[0]}
              {employee.lastName[0]}
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">
                {employee.firstName} {employee.lastName}
              </h4>
              <p className="text-[10px] text-muted-foreground font-mono">{employee.employeeCode}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 no-print">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && employee.status !== 'Resigned' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Roles and Status Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
          <RoleBadge type="department" value={employee.department} />
          <RoleBadge type="status" value={employee.status} />
        </div>

        {/* Details list */}
        <div className="space-y-1.5 text-xs pt-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{employee.email}</span>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono">{employee.phone}</span>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Joined: {new Date(employee.joiningDate).toLocaleDateString()}</span>
          </div>

          <div className="flex justify-between items-center text-[10px] uppercase font-bold pt-2 border-t border-border/40 text-muted-foreground">
            <span>{employee.employmentType}</span>
            <span className="text-foreground font-mono">₹{employee.basicSalary.toLocaleString()} / {employee.salaryType === 'Monthly' ? 'Mo' : 'Hr'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
