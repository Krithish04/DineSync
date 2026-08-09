import { QrCode, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QrCodeRequiredCard({ message = "Please scan your table's QR code to continue." }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <QrCode size={34} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold font-display text-foreground">Table QR Scan Required</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-left text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold">
            <ShieldAlert size={15} className="shrink-0" />
            <span>Ordering Protected</span>
          </div>
          <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-normal">
            To view the live digital menu, manage your cart, or track orders, please scan the QR code located on your dining table.
          </p>
        </div>

        <div className="pt-1">
          <Button
            size="sm"
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full text-xs gap-2 font-semibold"
          >
            <ArrowLeft size={14} />
            <span>Try Scanning Again</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
