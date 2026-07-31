import { Landmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function GSTSummary({ invoice }) {
  if (!invoice) return null;

  const totalGST = (invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0);

  return (
    <Card className="border border-border/80 shadow-sm bg-card text-xs">
      <CardContent className="p-4 space-y-3">
        <h5 className="font-bold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
          <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
          GST Breakup Summary
        </h5>

        <div className="space-y-2 font-mono">
          <div className="flex justify-between text-muted-foreground">
            <span>Taxable subtotal:</span>
            <span>₹{(invoice.subtotal - ((invoice.discount || 0) + (invoice.couponDiscount || 0) + (invoice.loyaltyDiscount || 0))).toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>CGST (2.5%):</span>
            <span>₹{(invoice.cgst || 0).toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>SGST (2.5%):</span>
            <span>₹{(invoice.sgst || 0).toFixed(2)}</span>
          </div>

          {invoice.igst > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>IGST (5%):</span>
              <span>₹{invoice.igst.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-dashed border-border/60 text-foreground font-bold">
            <span>Total Tax Collected:</span>
            <span className="text-base text-primary">₹{totalGST.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
export { Landmark };
