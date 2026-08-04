import { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Utensils,
  PartyPopper,
  Check,
  X,
  UserCheck,
  LogOut,
  Trash2,
  Edit3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STATUS_THEMES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900',
  Confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900',
  Seated: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900',
  'No Show': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800',
};

const OCCASION_COLORS = {
  Birthday: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400',
  Anniversary: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/20 dark:text-violet-400',
  Business: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/20 dark:text-cyan-400',
  Family: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400',
  Other: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900/30 dark:text-slate-400',
};

export default function ReservationCard({
  reservation,
  onEdit,
  onDelete,
  onStatusUpdate,
  canManage = false,
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(reservation._id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md border border-border">
      <CardContent className="p-5 space-y-4">
        {/* Header: Customer and Status */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-2 py-0.5">
              {reservation.reservationNumber}
            </span>
            <h4 className="font-display text-base font-bold text-foreground mt-1 truncate max-w-[180px]">
              {reservation.customerName}
            </h4>
            <p className="text-xs text-muted-foreground">{reservation.customerPhone}</p>
          </div>

          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              STATUS_THEMES[reservation.reservationStatus] || 'bg-muted'
            }`}
          >
            {reservation.reservationStatus}
          </span>
        </div>

        {/* Date, Time, Guest & Table Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground border-y border-border/40 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{reservation.reservationDate}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              {reservation.reservationTime} ({reservation.duration}m)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-semibold text-foreground">{reservation.numberOfGuests} Guests</span>
          </div>

          <div className="flex items-center gap-2">
            <Utensils className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-semibold text-foreground">
              Table {reservation.table?.tableNumber || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Occasion */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {reservation.occasion && reservation.occasion !== 'Other' && (
            <span
              className={`inline-flex items-center gap-1 border rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                OCCASION_COLORS[reservation.occasion]
              }`}
            >
              <PartyPopper className="h-3 w-3" />
              {reservation.occasion}
            </span>
          )}
        </div>

        {/* Special Requests or Notes */}
        {(reservation.specialRequest || reservation.notes) && (
          <div className="text-xs bg-muted/40 rounded p-2.5 space-y-1">
            {reservation.specialRequest && (
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Req:</span> {reservation.specialRequest}
              </p>
            )}
            {reservation.notes && (
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Notes:</span> {reservation.notes}
              </p>
            )}
          </div>
        )}

        {/* Contextual Actions Footer */}
        {canManage && (
          <div className="flex items-center justify-between border-t border-border/40 pt-3 gap-2">
            <div className="flex items-center gap-1.5">
              {/* Context Action Triggers */}
              {reservation.reservationStatus === 'Pending' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50/50 bg-blue-50/10 px-2.5"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange('Confirmed')}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive hover:bg-rose-50 border-rose-200 px-2.5"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange('Cancelled')}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </>
              )}

              {reservation.reservationStatus === 'Confirmed' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 bg-orange-50/10 px-2.5"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange('Seated')}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Seated (Check-In)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive hover:bg-rose-50 border-rose-200 px-2.5"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange('Cancelled')}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </>
              )}

              {reservation.reservationStatus === 'Seated' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/10 px-2.5"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('Completed')}
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Complete
                </Button>
              )}
            </div>

            {/* Edit / Delete items */}
            <div className="flex gap-0.5">
              {['Pending', 'Confirmed'].includes(reservation.reservationStatus) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-muted"
                  onClick={() => onEdit(reservation)}
                  title="Edit details"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-muted"
                onClick={() => onDelete(reservation)}
                title="Delete reservation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
