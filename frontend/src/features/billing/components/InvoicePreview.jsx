import { Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function InvoicePreview({ invoice }) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalDiscount = (invoice.discount || 0) + (invoice.couponDiscount || 0) + (invoice.loyaltyDiscount || 0);

  return (
    <div className="space-y-4">
      {/* Stylesheet for printer thermal receipts isolation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt-area, #print-receipt-area * {
            visibility: visible;
          }
          #print-receipt-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            padding: 4mm !important;
            font-family: monospace !important;
            font-size: 11px !important;
            color: #000 !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="flex justify-end no-print">
        <Button size="xs" onClick={handlePrint} className="h-8 gap-1">
          <Printer className="h-3.5 w-3.5" /> Print Receipt
        </Button>
      </div>

      <Card id="print-receipt-area" className="max-w-md mx-auto border border-border/80 shadow-md font-mono text-xs text-foreground bg-background">
        <CardContent className="p-6 space-y-4">
          {/* Header metadata */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-border/60">
            <h3 className="font-extrabold text-sm uppercase tracking-wide text-foreground">
              {invoice.branch?.name || 'DineSync AI Restaurant'}
            </h3>
            <p className="text-[10px] text-muted-foreground">{invoice.branch?.address || 'Restaurant Address'}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">TAX INVOICE</p>
          </div>

          {/* Bill details */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-border/60 pb-3">
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span className="font-bold">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>
                {new Date(invoice.invoiceDate).toLocaleDateString()} {new Date(invoice.invoiceDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {invoice.table && (
              <div className="flex justify-between">
                <span>Table:</span>
                <span className="font-bold">Table {invoice.table.tableNumber}</span>
              </div>
            )}
            {invoice.customer && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold">{invoice.customer.fullName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{invoice.cashier?.name || 'POS Station'}</span>
            </div>
          </div>

          {/* Invoice item lists */}
          <div className="space-y-2 border-b border-dashed border-border/60 pb-3">
            <div className="flex text-[10px] font-bold text-muted-foreground uppercase">
              <span className="flex-1">Description</span>
              <span className="w-12 text-center">Qty</span>
              <span className="w-16 text-right">Price</span>
              <span className="w-18 text-right">Amt</span>
            </div>
            {invoice.order?.items?.map((item, idx) => (
              <div key={idx} className="flex text-[11px] items-start">
                <div className="flex-1 pr-1">
                  <span className="font-medium text-foreground">{item.itemName}</span>
                  {item.modifiers?.length > 0 && (
                    <p className="text-[9px] text-muted-foreground">
                      * {item.modifiers.map((m) => m.optionName).join(', ')}
                    </p>
                  )}
                </div>
                <span className="w-12 text-center font-mono">{item.quantity}</span>
                <span className="w-16 text-right font-mono">₹{item.unitPrice.toFixed(0)}</span>
                <span className="w-18 text-right font-mono font-semibold text-foreground">
                  ₹{(item.quantity * item.unitPrice).toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          {/* Calculations totals summary */}
          <div className="space-y-1.5 text-[11px] border-b border-dashed border-border/60 pb-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Total discount:</span>
                <span className="font-mono">-₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {invoice.serviceCharge > 0 && (
              <div className="flex justify-between">
                <span>Service Charge (5%):</span>
                <span className="font-mono">₹{invoice.serviceCharge.toFixed(2)}</span>
              </div>
            )}
            {invoice.cgst > 0 && (
              <div className="flex justify-between">
                <span>CGST (2.5%):</span>
                <span className="font-mono">₹{invoice.cgst.toFixed(2)}</span>
              </div>
            )}
            {invoice.sgst > 0 && (
              <div className="flex justify-between">
                <span>SGST (2.5%):</span>
                <span className="font-mono">₹{invoice.sgst.toFixed(2)}</span>
              </div>
            )}
            {invoice.roundingAdjustment !== 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Rounding:</span>
                <span className="font-mono">
                  {invoice.roundingAdjustment > 0 ? `+₹${invoice.roundingAdjustment}` : `-₹${Math.abs(invoice.roundingAdjustment)}`}
                </span>
              </div>
            )}
          </div>

          {/* Grand total */}
          <div className="flex justify-between items-center text-sm font-extrabold border-b border-dashed border-border/60 pb-3">
            <span>GRAND TOTAL:</span>
            <span className="font-mono text-base text-foreground">₹{invoice.grandTotal.toFixed(0)}</span>
          </div>

          {/* Footer note */}
          <div className="text-center space-y-1 pt-1 text-[10px] text-muted-foreground">
            <p className="font-medium italic">Thank you for dining with us!</p>
            <p className="font-mono uppercase text-[8px] tracking-widest opacity-60">Powered by DineSync AI</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
