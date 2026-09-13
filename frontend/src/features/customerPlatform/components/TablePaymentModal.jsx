import { useState } from 'react';
import { CreditCard, Smartphone, DollarSign, Wallet, CheckCircle2, Receipt, Table as TableIcon, ArrowRight, AlertCircle, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import * as customerApi from '../api/customerPlatform.api';
import FeedbackModal from './FeedbackModal';

/**
 * Dynamically loads Razorpay Hosted Checkout Script
 */
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Final Table Settlement & Payment Modal (Razorpay Test Mode & Split-Bill).
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

  // Split-Bill State
  const [isSplitBill, setIsSplitBill] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [paidSharesCount, setPaidSharesCount] = useState(0);

  // Error & Retry State
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen && !showFeedbackModal) return null;

  const totalBillAmount = settledAmount !== null
    ? settledAmount
    : placedOrders.reduce((sum, ord) => sum + (ord.grandTotal || 0), 0);

  const perPersonAmount = totalBillAmount / Math.max(1, splitCount);

  const handleSettleBill = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (paymentMethod === 'Cash') {
        if (sessionId) {
          await customerApi.settleTableSession(restaurantId, sessionId, {
            paymentMethod: 'Cash',
          }).catch(() => null);
        }
        setIsCashRequested(true);
        setIsSubmitting(false);
        return;
      }

      // Online Payment via Razorpay Test Mode
      const activeShareIndex = paidSharesCount;
      const targetAmount = isSplitBill ? perPersonAmount : totalBillAmount;

      // 1. Create Razorpay Test Order from Backend
      const orderData = await customerApi.createRazorpayOrder(restaurantId, {
        amount: targetAmount,
        currency: 'INR',
        sessionId: sessionId || undefined,
        isSplit: isSplitBill,
        splitCount: isSplitBill ? splitCount : 1,
        dinerIndex: activeShareIndex,
      });

      if (!orderData || !orderData.razorpayOrderId) {
        throw new Error('Could not generate Razorpay test order from backend server.');
      }

      // 2. Load Hosted Razorpay Script
      const scriptLoaded = await loadRazorpayScript();

      const handleSuccessCallback = async (paymentResponse) => {
        try {
          const verifyRes = await customerApi.verifyRazorpayPayment(restaurantId, {
            razorpay_order_id: paymentResponse.razorpay_order_id || orderData.razorpayOrderId,
            razorpay_payment_id: paymentResponse.razorpay_payment_id || `pay_test_${Date.now()}`,
            razorpay_signature: paymentResponse.razorpay_signature || 'mock_test_signature',
            sessionId: sessionId || undefined,
            isSplit: isSplitBill,
          });

          if (verifyRes?.verified) {
            if (isSplitBill) {
              const nextPaidCount = paidSharesCount + 1;
              setPaidSharesCount(nextPaidCount);
              setIsSubmitting(false);
              if (nextPaidCount >= splitCount) {
                signOutHost();
                setShowFeedbackModal(true);
              }
            } else {
              setIsSubmitting(false);
              signOutHost();
              setShowFeedbackModal(true);
            }
          } else {
            setErrorMessage('Razorpay payment signature verification failed. Please retry.');
            setIsSubmitting(false);
          }
        } catch (err) {
          setErrorMessage(err?.response?.data?.message || err?.message || 'Payment verification failed. Please try again.');
          setIsSubmitting(false);
        }
      };

      if (scriptLoaded && window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amountInPaise,
          currency: orderData.currency || 'INR',
          name: 'DineSync AI Restaurant',
          description: isSplitBill
            ? `Split Share ${activeShareIndex + 1}/${splitCount} — Table #${tableNumber}`
            : `Table #${tableNumber} Settlement`,
          order_id: orderData.razorpayOrderId,
          prefill: {
            name: tableHost?.name || 'Guest Diner',
            contact: '+919876543210',
            email: 'guest@dinesync.ai',
          },
          theme: {
            color: '#0F172A',
          },
          handler: function (response) {
            handleSuccessCallback(response);
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              setErrorMessage('Payment cancelled by user. Your table bill and order state remain unchanged.');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setIsSubmitting(false);
          setErrorMessage(`Payment failed: ${response.error?.description || 'Transaction declined by bank.'}`);
        });
        rzp.open();
      } else {
        // Fallback for dev environments without external script access
        await handleSuccessCallback({
          razorpay_order_id: orderData.razorpayOrderId,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: 'dev_mock_signature',
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err?.response?.data?.message || err?.message || 'An error occurred during payment processing.');
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
      <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto">
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
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2 text-left">
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
              className="w-full h-11 text-xs font-bold rounded-xl"
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
                  <h3 className="text-sm sm:text-base font-bold font-display text-foreground">Table Bill Settlement</h3>
                  <p className="text-[11px] text-muted-foreground">Settle total bill for Table #{tableNumber}</p>
                </div>
              </div>
            </div>

            {/* Error & Retry Banner */}
            {errorMessage && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3 text-xs flex items-start justify-between gap-2 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage('')}
                  className="text-[10px] font-bold underline shrink-0 hover:text-destructive/80"
                >
                  Dismiss
                </button>
              </div>
            )}

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
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Placed Table Orders ({placedOrders.length})</span>
              {placedOrders.map((ord, idx) => (
                <div key={idx} className="bg-card border border-border rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{ord.orderNumber}</p>
                    <p className="text-[10px] text-muted-foreground">{ord.itemsCount || 1} Dish(es)</p>
                  </div>
                  <span className="font-bold text-primary font-mono">₹{(ord.grandTotal || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Split Bill Toggle & Progress */}
            <div className="bg-muted/30 border border-border/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 font-display">
                  <Users size={15} className="text-primary" /> Split Bill Option
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSplitBill(!isSplitBill);
                    setPaidSharesCount(0);
                  }}
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
                    isSplitBill
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {isSplitBill ? 'Split Enabled ✓' : 'Split Bill'}
                </button>
              </div>

              {isSplitBill && (
                <div className="pt-2 border-t border-border/60 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Split equally between:</span>
                    <div className="flex items-center gap-2">
                      {[2, 3, 4, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            setSplitCount(cnt);
                            setPaidSharesCount(0);
                          }}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center border transition-all active:scale-95 touch-manipulation ${
                            splitCount === cnt
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-card text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-primary">Share {paidSharesCount + 1} of {splitCount}:</span>
                      <span className="font-bold font-mono text-primary text-sm">₹{perPersonAmount.toFixed(2)} / diner</span>
                    </div>
                    {paidSharesCount > 0 && (
                      <div className="flex justify-between text-[11px] text-emerald-600 font-bold border-t border-primary/20 pt-1">
                        <span>Paid Shares ({paidSharesCount}/{splitCount})</span>
                        <span className="font-mono">₹{(perPersonAmount * paidSharesCount).toFixed(2)} Collected</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Itemized GST & Charges Breakdown */}
            <div className="bg-card border border-border/80 rounded-2xl p-3.5 space-y-1.5 text-xs shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Tax &amp; Service Charge Summary</span>
              <div className="flex justify-between text-muted-foreground">
                <span>Food &amp; Beverage Subtotal</span>
                <span className="font-mono">₹{(totalBillAmount / 1.05).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST (5% Inclusive)</span>
                <span className="font-mono">₹{(totalBillAmount - (totalBillAmount / 1.05)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/60">
                <span>Grand Total Due</span>
                <span className="text-primary font-mono text-base">₹{totalBillAmount.toFixed(2)}</span>
              </div>
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
                      className={`flex items-center gap-1.5 p-2.5 min-h-[44px] rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${
                        isSelected ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs' : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="truncate">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="w-1/3 text-xs h-11 rounded-xl">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSettleBill}
                disabled={isSubmitting}
                className="w-2/3 text-xs h-11 gap-1.5 font-bold rounded-xl shadow-md"
              >
                <span>
                  {isSubmitting
                    ? 'Processing...'
                    : paymentMethod === 'Cash'
                    ? 'Request Cash Pay'
                    : isSplitBill
                    ? `Pay Share ${paidSharesCount + 1}/${splitCount} (₹${perPersonAmount.toFixed(2)})`
                    : 'Pay with Razorpay'}
                </span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

