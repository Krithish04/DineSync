import { User, Phone, Mail, FileText, Tag, Share2, Clipboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerDetailsCard({ reservation }) {
  if (!reservation) {
    return (
      <Card className="h-full border border-dashed border-border bg-muted/5 flex items-center justify-center text-center p-6">
        <div className="text-muted-foreground space-y-1">
          <User className="h-8 w-8 mx-auto opacity-40 mb-1" />
          <p className="text-sm font-semibold">No Customer Selected</p>
          <p className="text-xs">Click details on any reservation to view customer log.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5 text-sm">
        {/* Basic Name Card */}
        <div>
          <h4 className="font-bold text-foreground text-base leading-tight">
            {reservation.customerName}
          </h4>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">
            Ref: {reservation.reservationNumber}
          </p>
        </div>

        {/* Contact info list */}
        <div className="space-y-3 border-t border-border/40 pt-3">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            <span className="font-medium text-foreground select-all">{reservation.customerPhone}</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            <span className="font-medium text-foreground truncate select-all">
              {reservation.customerEmail || <span className="italic opacity-60">Not provided</span>}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Share2 className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            <span className="font-medium text-foreground capitalize">
              Source: {reservation.bookingSource || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Occasion / Reservation notes */}
        <div className="space-y-3 border-t border-border/40 pt-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
              <Tag className="h-3.5 w-3.5 text-primary" />
              Occasion
            </div>
            <p className="text-xs text-muted-foreground pl-5">
              {reservation.occasion || 'General Dining'}
            </p>
          </div>

          {reservation.specialRequest && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Special Request
              </div>
              <p className="text-xs text-muted-foreground pl-5 bg-muted/40 p-2 rounded">
                {reservation.specialRequest}
              </p>
            </div>
          )}

          {reservation.notes && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                <Clipboard className="h-3.5 w-3.5 text-primary" />
                Staff Notes
              </div>
              <p className="text-xs text-muted-foreground pl-5 italic">
                {reservation.notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
