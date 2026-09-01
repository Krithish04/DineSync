import React from 'react';
import { X, Clock, Table, Play, CheckCircle2, UserCheck, AlertTriangle, CornerDownLeft, ChefHat, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function KitchenTicketDetailModal({
  ticket,
  isOpen,
  onClose,
  onStatusChange,
  onItemStatusChange,
  elapsed,
  elapsedMinsNum = 0,
}) {
  if (!isOpen || !ticket) return null;

  const tableNum =
    ticket.table?.tableNumber ??
    ticket.table?.tableName ??
    (typeof ticket.table === 'number' || (typeof ticket.table === 'string' && !ticket.table.match(/^[0-9a-fA-F]{24}$/)) ? ticket.table : null) ??
    ticket.tableNumber ??
    ticket.order?.table?.tableNumber ??
    ticket.order?.tableNumber;

  const custName =
    ticket.customerName ??
    ticket.customer?.fullName ??
    ticket.order?.customerName ??
    ticket.order?.customer?.fullName ??
    ticket.order?.currentHostName;

  const isDelayed = elapsedMinsNum >= 15 || ticket.status === 'Delayed';
  const isAging = elapsedMinsNum >= 10 && !isDelayed;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border-2 border-border rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-foreground">
        
        {/* Modal Header */}
        <div className={`p-5 sm:p-6 border-b border-border flex items-center justify-between shadow-md ${
          isDelayed ? 'bg-rose-500/20 text-rose-500 border-rose-500/40' :
          isAging ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' :
          'bg-muted/40'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-extrabold font-mono bg-background border px-3 py-1 rounded-xl">
                Ticket #{ticket.ticketNumber || ticket._id?.slice(-4)}
              </span>
              <span className={`text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-xl border ${
                ticket.status === 'Pending' ? 'bg-[#8B8078]/20 text-[#8B8078] border-[#8B8078]/40' :
                ticket.status === 'Preparing' ? 'bg-[#E8A93C]/20 text-[#E8A93C] border-[#E8A93C]/40' :
                ticket.status === 'Ready' ? 'bg-[#2FA86E]/20 text-[#2FA86E] border-[#2FA86E]/40' :
                'bg-[#6B5B95]/20 text-[#6B5B95] border-[#6B5B95]/40'
              }`}>
                {ticket.status}
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight pt-1">
              {tableNum ? `Table #${tableNum}` : ticket.orderType || 'General Order'}
              {custName && <span className="text-muted-foreground text-xl font-normal ml-2">({custName})</span>}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs uppercase font-semibold text-muted-foreground block">Age</span>
              <span className={`text-xl sm:text-2xl font-mono font-extrabold flex items-center gap-1 ${
                isDelayed ? 'text-rose-600 animate-pulse' : isAging ? 'text-amber-600' : 'text-primary'
              }`}>
                <Clock className="w-5 h-5 shrink-0" />
                {elapsed}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-3 rounded-2xl bg-muted hover:bg-muted/80 text-foreground transition-colors touch-manipulation min-w-[56px] min-h-[56px] flex items-center justify-center"
              aria-label="Close Ticket Detail"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body: Ticket Items & Full Customizations */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-sm uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-primary" /> Order Items ({ticket.items?.length || 0})
            </span>
            {ticket.station && (
              <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                Station: {ticket.station}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {ticket.items?.map((item, idx) => (
              <div
                key={item._id || idx}
                className="bg-muted/30 border border-border/80 rounded-2xl p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xl sm:text-2xl font-extrabold text-primary font-mono bg-primary/10 border border-primary/30 px-3 py-1 rounded-xl">
                        x{item.quantity}
                      </span>
                      <h4 className="text-xl sm:text-2xl font-extrabold text-foreground font-display truncate">
                        {item.itemName}
                      </h4>
                    </div>

                    {item.dietaryType && (
                      <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-md border mt-1 ${
                        item.dietaryType === 'Veg' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                      }`}>
                        {item.dietaryType}
                      </span>
                    )}
                  </div>

                  {onItemStatusChange && (
                    <div className="flex items-center gap-2 shrink-0">
                      {item.kitchenStatus === 'Pending' && (
                        <Button
                          size="lg"
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                          className="h-14 px-5 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl min-h-[56px] min-w-[56px] shadow-sm"
                        >
                          Cooking
                        </Button>
                      )}
                      {item.kitchenStatus === 'Preparing' && (
                        <Button
                          size="lg"
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Ready')}
                          className="h-14 px-5 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl min-h-[56px] min-w-[56px] shadow-sm"
                        >
                          Ready ✓
                        </Button>
                      )}
                      {item.kitchenStatus === 'Ready' && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => onItemStatusChange(ticket._id, item._id, 'Preparing')}
                          className="h-14 px-4 text-sm font-bold border-slate-300 text-slate-700 rounded-2xl min-h-[56px] min-w-[56px]"
                        >
                          Recall
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Modifiers List */}
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="bg-background border border-border/60 rounded-xl p-3 space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Customizations &amp; Options:
                    </span>
                    <ul className="list-disc list-inside text-sm sm:text-base font-bold text-foreground space-y-1">
                      {item.modifiers.map((m, mIdx) => (
                        <li key={mIdx}>
                          {m.groupName ? `${m.groupName}: ` : ''}
                          <span className="text-primary font-extrabold">{m.optionName}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Special Instructions Note */}
                {item.specialInstructions && (
                  <div className="bg-amber-500/15 border-l-4 border-amber-500 p-3 rounded-r-xl text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200">
                    <span className="block text-xs uppercase font-extrabold text-amber-700 dark:text-amber-300">
                      ⚠️ Chef Special Note:
                    </span>
                    {item.specialInstructions}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Ticket Notes */}
          {ticket.notes && (
            <div className="bg-muted/50 border border-border rounded-2xl p-4 space-y-1">
              <span className="text-xs uppercase font-extrabold text-muted-foreground">Order Notes</span>
              <p className="text-base font-bold text-foreground">{ticket.notes}</p>
            </div>
          )}
        </div>

        {/* Modal Footer: 56px Minimum Touch Target Action Buttons */}
        {onStatusChange && (
          <div className="p-5 sm:p-6 border-t border-border bg-card flex items-center justify-between gap-4">
            {ticket.status === 'Pending' && (
              <Button
                size="lg"
                onClick={() => {
                  onStatusChange(ticket._id, 'Preparing');
                  onClose();
                }}
                className="w-full h-14 min-h-[56px] text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg gap-2"
              >
                <Play className="w-6 h-6" /> Start Cooking Ticket
              </Button>
            )}

            {ticket.status === 'Preparing' && (
              <>
                <Button
                  size="lg"
                  onClick={() => {
                    onStatusChange(ticket._id, 'Ready');
                    onClose();
                  }}
                  className="flex-1 h-14 min-h-[56px] text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg gap-2"
                >
                  <CheckCircle2 className="w-6 h-6" /> Mark Entire Ticket Ready ✓
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    onStatusChange(ticket._id, 'Delayed');
                    onClose();
                  }}
                  className="h-14 min-h-[56px] px-6 text-base font-bold border-rose-500/40 text-rose-600 hover:bg-rose-500/10 rounded-2xl gap-2"
                >
                  <AlertTriangle className="w-5 h-5" /> Flag Delayed
                </Button>
              </>
            )}

            {ticket.status === 'Delayed' && (
              <Button
                size="lg"
                onClick={() => {
                  onStatusChange(ticket._id, 'Preparing');
                  onClose();
                }}
                className="w-full h-14 min-h-[56px] text-lg font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-lg gap-2"
              >
                <Play className="w-6 h-6" /> Resume Preparation
              </Button>
            )}

            {ticket.status === 'Ready' && (
              <>
                <Button
                  size="lg"
                  onClick={() => {
                    onStatusChange(ticket._id, 'Served');
                    onClose();
                  }}
                  className="flex-1 h-14 min-h-[56px] text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-lg gap-2"
                >
                  <UserCheck className="w-6 h-6" /> Mark Served / Dispatched
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    onStatusChange(ticket._id, 'Preparing');
                    onClose();
                  }}
                  className="h-14 min-h-[56px] px-6 text-base font-bold rounded-2xl"
                >
                  Recall
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
