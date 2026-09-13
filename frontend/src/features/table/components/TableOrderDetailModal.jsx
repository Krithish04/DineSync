import { useState, useEffect } from 'react';
import { X, Clock, User, Users, Receipt, Utensils, AlertCircle, ShieldCheck, CreditCard, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import * as tableApi from '../api/table.api';

const STATUS_THEMES = {
  Pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  Accepted: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  Preparing: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  Ready: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  Served: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  Cancelled: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
};

function formatElapsed(startedAt) {
  if (!startedAt) return 'Just started';
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just started';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).trim();
  if (digits.length < 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

function formatBookingDateTime(reservation, table, startedAt) {
  if (reservation?.reservationDate && reservation?.reservationTime) {
    return `${reservation.reservationDate} @ ${reservation.reservationTime}`;
  }
  if (reservation?.reservationDate) {
    return `${reservation.reservationDate} @ ${reservation.reservationTime || '19:30'}`;
  }
  const rawDate = startedAt || reservation?.createdAt || table?.updatedAt || table?.createdAt || new Date();
  const d = new Date(rawDate);
  const dateStr = d.toISOString().slice(0, 10);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} @ ${timeStr}`;
}

export default function TableOrderDetailModal({ isOpen, onClose, table, restaurantId }) {
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !table?._id || !restaurantId) return;

    setIsLoading(true);
    setError('');

    tableApi.getTableSession(restaurantId, table._id)
      .then((data) => {
        setSessionData(data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load table session details.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, table?._id, restaurantId]);

  if (!isOpen) return null;

  const session = sessionData?.session;
  const reservation = sessionData?.reservation;
  const orders = sessionData?.orders || sessionData?.orderSummary || [];
  const hostName = sessionData?.hostName || session?.hostName || table?.currentHostName || (reservation ? reservation.customerName : 'Diner');
  const hostPhone = session?.hostPhone || table?.currentHostPhone || (reservation ? reservation.customerPhone : '');
  const coOrderers = session?.coOrderers || [];
  const totalGuests = 1 + coOrderers.length;
  const totalAmount = sessionData?.totalAmount || orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const startedAt = sessionData?.startedAt || session?.startedAt;

  const subtotal = Math.round((totalAmount / 1.1) * 100) / 100;
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
  const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100;
  const splitPerGuest = Math.round((totalAmount / totalGuests) * 100) / 100;

  const isReserved = table?.status === 'Reserved' || Boolean(reservation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold font-display text-foreground">
                Table {table?.tableNumber ? `#${table.tableNumber}` : ''} {isReserved ? 'Reservation & Session' : 'Session & Orders'}
              </h3>
              <span className={`border text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                table?.status === 'Needs Attention' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse' :
                table?.status === 'Bill Requested' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                table?.status === 'Reserved' || isReserved ? 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 font-black' :
                'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
              }`}>
                {table?.status || (isReserved ? 'Reserved' : 'Occupied')}
              </span>
            </div>
            {table?.tableName && (
              <p className="text-xs text-muted-foreground">{table.tableName}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl min-h-[44px]">
            <X size={20} />
          </Button>
        </div>

        {/* Session Meta Bar */}
        <div className="bg-muted/40 px-4 sm:px-5 py-3 border-b border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User size={16} className="text-primary shrink-0" />
            <div className="truncate">
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">{isReserved ? 'Guest / Host' : 'Session Host'}</span>
              <span className="font-bold text-foreground truncate block">{hostName}</span>
              {hostPhone && <span className="text-[10px] text-muted-foreground block font-mono">{maskPhone(hostPhone)}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users size={16} className="text-primary shrink-0" />
            <div>
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">Diners / Party</span>
              <span className="font-bold text-foreground">{reservation?.numberOfGuests ? `${reservation.numberOfGuests} Guests` : `${totalGuests} Seated`}</span>
              {coOrderers.length > 0 && (
                <span className="text-[10px] text-muted-foreground block font-medium">+{coOrderers.length} Co-Orderers</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock size={16} className="text-primary shrink-0" />
            <div>
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">{isReserved ? 'Time Slot' : 'Duration'}</span>
              <span className="font-bold text-foreground font-mono">{reservation ? `${reservation.reservationTime} (${reservation.reservationDate || 'Today'})` : formatElapsed(startedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Receipt size={16} className="text-primary shrink-0" />
            <div>
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">Total Bill</span>
              <span className="font-bold text-primary font-display text-sm">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Co-Orderers Banner */}
        {coOrderers.length > 0 && (
          <div className="bg-purple-500/5 px-4 sm:px-5 py-2.5 border-b border-purple-500/20 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-medium">
              <ShieldCheck size={14} className="text-purple-500" />
              <span>Approved Co-Orderers:</span>
              <span className="font-bold">{coOrderers.map((c) => c.name || maskPhone(c.phone)).join(', ')}</span>
            </div>
          </div>
        )}

        {/* Orders Body List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Reservation Details Inspection Box */}
          {isReserved && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <span className="font-extrabold text-xs uppercase tracking-wider text-cyan-300">Reserved Table Booking Details</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-400 text-slate-950 shadow-xs">
                  {reservation?.reservationStatus || table?.status || 'Reserved'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Reserved Guest</span>
                  <span className="font-bold text-foreground block truncate">
                    {reservation?.customerName || table?.currentHostName || 'Guest'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Contact Phone</span>
                  <span className="font-bold font-mono text-foreground block">
                    {reservation?.customerPhone ? maskPhone(reservation.customerPhone) : (table?.currentHostPhone ? maskPhone(table.currentHostPhone) : 'N/A')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Guest Count</span>
                  <span className="font-bold text-foreground block">
                    {reservation?.numberOfGuests || table?.capacity || 2} Persons
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Booking Date & Time</span>
                  <span className="font-bold font-mono text-foreground block">
                    {formatBookingDateTime(reservation, table, startedAt)}
                  </span>
                </div>

                {reservation?.occasion && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Occasion</span>
                    <span className="font-bold text-cyan-400 block">{reservation.occasion}</span>
                  </div>
                )}

                {reservation?.reservationNumber && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Reservation Ref</span>
                    <span className="font-mono text-xs text-muted-foreground block">
                      #{reservation.reservationNumber}
                    </span>
                  </div>
                )}
              </div>

              {(reservation?.specialRequest || reservation?.notes || table?.notes) && (
                <div className="pt-2 border-t border-cyan-500/20 text-xs text-cyan-200 italic">
                  <strong>Special Notes:</strong> "{reservation?.specialRequest || reservation?.notes || table?.notes}"
                </div>
              )}
            </div>
          )}
          {isLoading ? (
            <Loader label="Loading active table session orders..." />
          ) : error ? (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center space-y-2 border border-dashed border-border rounded-xl">
              <Utensils className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No orders placed yet</p>
              <p className="text-xs text-muted-foreground">The diner host is currently browsing the digital menu.</p>
            </div>
          ) : (
            orders.map((ord) => (
              <div key={ord._id || ord.orderNumber} className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      Order #{ord.orderNumber}
                    </span>
                    {ord.createdAt && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                    STATUS_THEMES[ord.orderStatus] || 'bg-muted'
                  }`}>
                    {ord.orderStatus || 'Accepted'}
                  </span>
                </div>

                {/* Items in this Order */}
                <div className="space-y-2 text-xs">
                  {(ord.items || []).map((item, iIdx) => (
                    <div key={iIdx} className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <span className="font-bold text-primary font-mono">{item.quantity}x</span>
                          <span>{item.itemName || item.name || item.menuItem?.name}</span>
                        </div>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <p className="text-[10px] text-muted-foreground pl-5">
                            {item.modifiers.map((m) => `${m.groupName}: ${m.optionName}`).join(', ')}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 italic pl-5">
                            "{item.specialInstructions}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono font-bold text-foreground">
                          ₹{(((item.unitPrice || 0) > 0 ? item.unitPrice : (item.price || 0)) * (item.quantity || 1)).toFixed(2)}
                        </span>
                        <span className={`inline-flex items-center rounded border px-1.5 py-0.2 text-[9px] font-semibold ${
                          STATUS_THEMES[item.kitchenStatus] || 'bg-muted'
                        }`}>
                          {item.kitchenStatus || 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {ord.notes && (
                  <p className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 p-2 rounded border border-amber-500/20 italic">
                    Note: {ord.notes}
                  </p>
                )}
              </div>
            ))
          )}

          {/* Split Bill & Tax Breakdown Card */}
          {orders.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-foreground text-sm border-b border-border/50 pb-2">
                <span className="flex items-center gap-1.5">
                  <CreditCard size={16} className="text-primary" />
                  Bill &amp; Tax Ledger
                </span>
                <span className="font-mono text-primary font-display">₹{totalAmount.toFixed(2)}</span>
              </div>

              <div className="space-y-1 text-muted-foreground font-mono">
                <div className="flex justify-between">
                  <span>Subtotal (Net Items):</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>5% GST Tax:</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>5% Service Charge:</span>
                  <span>₹{serviceCharge.toFixed(2)}</span>
                </div>
              </div>

              {totalGuests > 1 && (
                <div className="pt-2 border-t border-border/40 flex items-center justify-between bg-primary/5 text-primary p-2 rounded-lg font-semibold">
                  <span>Equal Split ({totalGuests} Diners):</span>
                  <span className="font-mono font-bold text-sm">₹{splitPerGuest.toFixed(2)} / guest</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold min-h-[44px] px-5 rounded-xl">
            Close Drawer
          </Button>
        </div>
      </div>
    </div>
  );
}
