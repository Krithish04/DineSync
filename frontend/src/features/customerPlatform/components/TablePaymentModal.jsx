import { useState } from 'react';
import { CreditCard, Smartphone, DollarSign, Wallet, CheckCircle2, Receipt, Table as TableIcon, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import * as customerApi from '../api/customerPlatform.api';
import FeedbackModal from './FeedbackModal';

/**
 * Final Table Settlement & Payment Modal.
 * Shows total bill for all orders placed during session.
 * Online payment opens FeedbackModal & releases table automatically.
 * Cash payment requests waiter cash collection and leaves table Occupied until Manager empties table.
 */
export default function TablePaymentModal({ isOpen, onClose }) {
  const {
    restaurantId,
    tableId,
    tableNumber,
    sessionId,
    placedOrders = [],
    tableHost,
    signOutHost,
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCashRequested, setIsCashRequested] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [settledAmount, setSettledAmount] = useState(null);

  if (!isOpen && !showFeedbackModal) return null;

  const totalBillAmount = settledAmount !== null
    ? settledAmount
    : placedOrders.reduce((sum, ord) => sum + (ord.grandTotal || 0), 0);

  const handleSettleBill = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (sessionId) {
        const settleRes = await customerApi.settleTableSession(restaurantId, sessionId, {
          paymentMethod,
          transactionReference: paymentMethod === 'Cash' ? undefined : `ONLINE-${Date.now()}`,
        }).catch(() => null);

        if (settleRes?.totalAmount !== undefined) {
          setSettledAmount(settleRes.totalAmount);
        }
      }

      if (paymentMethod === 'Cash') {
        // Cash Payment: Mark cash requested, keep table OCCUPIED so Manager must collect cash & click Empty Table
        setIsCashRequested(true);
        setIsSubmitting(false);
      } else {
        // Online Payment (UPI, Card, Wallet): Complete online payment & open Feedback modal
        for (const ord of placedOrders) {
          if (ord._id) {
            await customerApi.payCustomerOrder(restaurantId, ord._id, {
              paymentMethod,
              transactionReference: `ONLINE-${Date.now()}`,
            }).catch(() => null);
          }
        }
        setIsSubmitting(false);
        signOutHost();
        setShowFeedbackModal(true);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  if (showFeedbackModal) {
    return (
      <FeedbackModal
        isOpen={true}
        onClose={() => {
          setShowFeedbackModal(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        {isCashRequested ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto animate-bounce">
              <DollarSign size={36} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-foreground">Cash Payment Requested</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Please pay <strong className="text-primary font-bold">₹{totalBillAmount.toFixed(2)}</strong> in cash to your server at Table #{tableNumber || 1}.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-700 flex items-start gap-2 text-left">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>
                Your table will be marked <strong>Available</strong> by restaurant management as soon as cash payment is collected.
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setIsCashRequested(false);
                onClose();
              }}
              className="w-full text-xs font-bold"
            >
              Close &amp; Wait for Server
            </Button>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-foreground">Table Bill Settlement</h3>
                  <p className="text-[11px] text-muted-foreground">Settle total bill for Table #{tableNumber}</p>
                </div>
              </div>
            </div>

            {/* Table Host Info */}
            <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Table Host</span>
                <p className="font-bold text-foreground">{tableHost?.name || 'Diner'}</p>
              </div>
              {tableNumber && (
                <span className="bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TableIcon size={12} /> Table #{tableNumber}
                </span>
              )}
            </div>

            {/* Placed Orders Summary */}
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Placed Table Orders ({placedOrders.length})</span>
              {placedOrders.map((ord, idx) => (
                <div key={idx} className="bg-card border border-border rounded-lg p-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{ord.orderNumber}</p>
                    <p className="text-[10px] text-muted-foreground">{ord.itemsCount || 1} Dish(es)</p>
                  </div>
                  <span className="font-bold text-primary">₹{(ord.grandTotal || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total Amount */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-primary uppercase font-bold">Total Bill Due</span>
                <p className="text-lg font-bold font-display text-primary">₹{totalBillAmount.toFixed(2)}</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full">
                Combined Bill
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Select Payment Method</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'UPI', label: 'UPI (GPay / PhonePe)', icon: Smartphone },
                  { id: 'Card', label: 'Card Payment', icon: CreditCard },
                  { id: 'Cash', label: 'Cash at Table', icon: DollarSign },
                  { id: 'Wallet', label: 'Digital Wallet', icon: Wallet },
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      type="button"
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-colors ${
                        isSelected ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border bg-background'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="truncate">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="w-1/3 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSettleBill}
                disabled={isSubmitting}
                className="w-2/3 text-xs gap-1.5 font-bold"
              >
                <span>{isSubmitting ? 'Processing...' : paymentMethod === 'Cash' ? 'Request Cash Pay' : 'Pay & Give Feedback'}</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
