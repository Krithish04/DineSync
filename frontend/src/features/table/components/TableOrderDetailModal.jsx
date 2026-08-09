import { useState, useEffect } from 'react';
import { X, Clock, User, Receipt, Utensils, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import * as tableApi from '../api/table.api';

const STATUS_THEMES = {
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Accepted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Preparing: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Ready: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Served: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Cancelled: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
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
  const orders = sessionData?.orders || [];
  const hostName = sessionData?.hostName || session?.hostName || table?.currentHostName || 'Diner';
  const totalAmount = sessionData?.totalAmount || 0;
  const startedAt = sessionData?.startedAt || session?.startedAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold font-display text-foreground">
                Table {table?.tableNumber ? `#${table.tableNumber}` : ''} Orders
              </h3>
              <span className="bg-orange-500/10 text-orange-600 border border-orange-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Occupied
              </span>
            </div>
            {table?.tableName && (
              <p className="text-xs text-muted-foreground">{table.tableName}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </Button>
        </div>

        {/* Session Meta Bar */}
        <div className="bg-muted/50 px-4 sm:px-5 py-3 border-b border-border grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User size={14} className="text-primary shrink-0" />
            <div className="truncate">
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">Session Host</span>
              <span className="font-bold text-foreground truncate block">{hostName}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock size={14} className="text-primary shrink-0" />
            <div>
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">Started</span>
              <span className="font-bold text-foreground font-mono">{formatElapsed(startedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Receipt size={14} className="text-primary shrink-0" />
            <div>
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">Current Bill</span>
              <span className="font-bold text-primary font-display">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Orders Body List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
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
              <div key={ord._id} className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      Order #{ord.orderNumber}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                    STATUS_THEMES[ord.orderStatus] || 'bg-muted'
                  }`}>
                    {ord.orderStatus}
                  </span>
                </div>

                {/* Items in this Order */}
                <div className="space-y-2 text-xs">
                  {(ord.items || []).map((item, iIdx) => (
                    <div key={iIdx} className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <span className="font-bold text-primary font-mono">{item.quantity}x</span>
                          <span>{item.itemName || item.menuItem?.name}</span>
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
                          ₹{((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
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
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
