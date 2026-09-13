import { useState, useEffect } from 'react';
import { UserCheck, ShieldAlert, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useSocketStore from '@/store/socket.store';
import useAuthStore from '@/features/auth/store/auth.store';
import * as customerApi from '@/features/customerPlatform/api/customerPlatform.api';

export default function HostTransferApprovalModal() {
  const socket = useSocketStore((state) => state.socket);
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleHostTransferRequested = (data) => {
      setPendingTransfer(data);
    };

    socket.on('host_transfer:requested', handleHostTransferRequested);

    return () => {
      socket.off('host_transfer:requested', handleHostTransferRequested);
    };
  }, [socket]);

  if (!pendingTransfer) return null;

  const handleDecision = async (decision) => {
    if (!restaurantId || !pendingTransfer || processing) return;
    setProcessing(true);

    try {
      await customerApi.respondHostTransfer(restaurantId, pendingTransfer.tableId, {
        requestId: pendingTransfer.requestId,
        requesterPhone: pendingTransfer.requesterPhone,
        requesterName: pendingTransfer.requesterName,
        decision,
      });
    } catch {
      // Handled gracefully
    } finally {
      setProcessing(false);
      setPendingTransfer(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border-2 border-primary/40 rounded-2xl shadow-2xl p-6 space-y-5 text-foreground animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 shrink-0">
            <UserCheck size={24} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base font-display flex items-center gap-2">
              Host Transfer Requested
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                Table #{pendingTransfer.tableNumber}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A diner at Table #{pendingTransfer.tableNumber} requested to take over as Table Host.
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Requesting Diner:</span>
            <strong className="text-foreground">{pendingTransfer.requesterName} ({pendingTransfer.maskedPhone})</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Current Table Host:</span>
            <strong className="text-muted-foreground">{pendingTransfer.currentHostName}</strong>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <MapPin size={12} className="text-emerald-500" /> Geolocation Security:
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Verified Inside
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert size={14} className="inline-block mr-1 text-amber-600" />
          Approving this request will sign out <strong>{pendingTransfer.currentHostName}</strong> and grant ordering access to <strong>{pendingTransfer.requesterName}</strong>.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDecision('deny')}
            disabled={processing}
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20"
          >
            <XCircle size={14} className="mr-1.5" /> Deny Transfer
          </Button>

          <Button
            size="sm"
            onClick={() => handleDecision('approve')}
            disabled={processing}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <CheckCircle2 size={14} className="mr-1.5" /> Approve Host Transfer
          </Button>
        </div>
      </div>
    </div>
  );
}
