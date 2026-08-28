import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Receipt, Star, Utensils, Bell, AlertTriangle } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import OrderTimeline from '../components/OrderTimeline';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useCartStore from '../store/cart.store';
import useSocketStore from '@/store/socket.store';
import * as customerApi from '../api/customerPlatform.api';

import QrCodeRequiredCard from '../components/QrCodeRequiredCard';

export default function LiveOrderTrackingPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const restaurantId = useCartStore((s) => s.restaurantId);
  const socket = useSocketStore((s) => s.socket);

  const [tracking, setTracking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCallingStaff, setIsCallingStaff] = useState(false);
  const [assistSuccess, setAssistSuccess] = useState('');

  const hasContext = Boolean(restaurantId && orderId);

  const handleCallStaff = async () => {
    setIsCallingStaff(true);
    setAssistSuccess('');
    try {
      await customerApi.requestAssistance(restaurantId, {
        tableId: tracking?.order?.table?._id || tracking?.order?.table,
        note: `Order #${tracking?.order?.orderNumber || orderId?.slice(-6)} requested assistance`,
      });
      setAssistSuccess('Staff notified! Someone will assist you shortly.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to call staff.');
    } finally {
      setIsCallingStaff(false);
    }
  };

  const loadTracking = useCallback(async () => {
    if (!orderId || !restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await customerApi.trackLiveOrder(restaurantId, orderId);
      setTracking(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to track order.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, orderId]);

  useEffect(() => { loadTracking(); }, [loadTracking]);

  if (!hasContext) {
    return (
      <CustomerLayout title="Live Order Tracking">
        <QrCodeRequiredCard message="Please scan your table's QR code or place an order to track live preparation." />
      </CustomerLayout>
    );
  }

  const [delayNotice, setDelayNotice] = useState('');

  // Socket.IO real-time event listener for kitchen status shifts & delay alerts
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (updatedOrder) => {
      if (updatedOrder && (updatedOrder._id === orderId || updatedOrder.orderId === orderId)) {
        setTracking((prev) => (prev ? { ...prev, order: updatedOrder } : prev));
      }
    };

    const handleDelayAlert = (delayData) => {
      if (delayData && (delayData.orderId === orderId || String(delayData.orderId) === String(orderId))) {
        setDelayNotice(delayData.message || 'The kitchen is experiencing a slight delay preparing your items.');
      }
    };

    socket.on('order:updated', handleUpdate);
    socket.on('order:kitchen_status', handleUpdate);
    socket.on('order:delay_alert', handleDelayAlert);

    return () => {
      socket.off('order:updated', handleUpdate);
      socket.off('order:kitchen_status', handleUpdate);
      socket.off('order:delay_alert', handleDelayAlert);
    };
  }, [socket, orderId]);

  const signOutHost = useCartStore((s) => s.signOutHost);

  const order = tracking?.order;
  const isDelayed = (order?.orderStatus === 'Delayed' || Boolean(delayNotice)) && order?.paymentStatus !== 'Paid';
  const isPaidOrCompleted = order?.paymentStatus === 'Paid' || order?.orderStatus === 'Completed';

  const isSocketConnected = Boolean(socket?.connected);

  return (
    <CustomerLayout title={isPaidOrCompleted ? 'Paid Invoice & Thank You' : 'Live Order Tracking'}>
      <div className="space-y-4 max-w-full">
        {/* Realtime Socket.IO Connection Health Bar */}
        <div className="flex items-center justify-between text-xs font-semibold px-3 py-1.5 bg-card border border-border rounded-xl text-muted-foreground shadow-2xs">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isSocketConnected ? 'Live Connection Active' : 'Connecting to Kitchen...'}
          </span>
          <span className="text-[10px] uppercase font-mono text-muted-foreground/80">
            {isSocketConnected ? 'Socket.IO Live' : 'Polling Active'}
          </span>
        </div>

        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">{error}</div>}

        {!isLoading && !error && order && (
          <>
            {/* Real-time Kitchen Delay Alert Banner */}
            {isDelayed && (
              <div className="bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 rounded-2xl p-4 text-xs font-semibold flex items-start gap-3 shadow-xs animate-in zoom-in-95 duration-200">
                <AlertTriangle size={22} className="shrink-0 text-amber-600 animate-bounce mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-900 dark:text-amber-100 text-sm font-display">Kitchen Preparation Delayed</h5>
                  <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-0.5 leading-relaxed">
                    {delayNotice || `Chef has reported a slight preparation delay for Order #${order.orderNumber || order._id.slice(-6)}. Our team is working hard to complete your dishes promptly.`}
                  </p>
                </div>
              </div>
            )}

            {/* Header Status or Thank You Card */}
            {isPaidOrCompleted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3 shadow-xs animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle size={36} />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display text-foreground">Thank You for Dining With Us!</h2>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                    Your bill payment of <strong className="text-emerald-700 dark:text-emerald-300 font-bold font-mono">₹{order.grandTotal?.toFixed(2)}</strong> is confirmed. Your table session has been settled and released.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-bold text-xs px-3.5 py-1 rounded-full shadow-xs">
                    <CheckCircle size={14} /> Paid Invoice ✓
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Order #{order._id.slice(-6)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate('/menu/browse')}
                    className="text-xs font-bold text-primary hover:underline h-7 px-2.5 rounded-lg"
                  >
                    + Add More Items
                  </Button>
                </div>
                <h2 className="text-xl font-bold font-display text-primary">{order.orderStatus}</h2>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                  <Clock size={14} className="text-amber-500" />
                  <span>Est. Kitchen Preparation: <strong>{tracking.estimatedPrepTimeMinutes} mins</strong></span>
                </div>
              </div>
            )}

            {/* Live Visual Timeline */}
            {!isPaidOrCompleted && <OrderTimeline currentStatus={order.orderStatus} />}

            {/* Order Items & Digital Receipt */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Digital Receipt Summary</h4>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  order.paymentStatus === 'Paid'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}>
                  {order.paymentStatus === 'Paid' ? 'Paid ✓' : 'Payment Pending'}
                </span>
              </div>

              <div className="space-y-2">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs border-b border-border/40 pb-1.5 last:border-0">
                    <div>
                      <span className="font-medium text-foreground">{item.quantity}x {item.itemName}</span>
                      {item.specialInstructions && <p className="text-[10px] text-muted-foreground">{item.specialInstructions}</p>}
                    </div>
                    <span className="font-semibold text-foreground font-mono">₹{(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="font-mono">₹{order.subtotal?.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>GST (5%)</span><span className="font-mono">₹{order.tax?.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Service Charge</span><span className="font-mono">₹{order.serviceCharge?.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-1 font-display">
                  <span>Total Amount</span>
                  <span className="text-primary font-mono">₹{order.grandTotal?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {assistSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl p-3 text-xs text-center font-semibold">
                ✓ {assistSuccess}
              </div>
            )}

            {isPaidOrCompleted ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/menu/feedback')}
                  className="w-full h-11 text-xs font-bold gap-2 rounded-xl border-primary/20 text-primary hover:bg-primary/5 touch-manipulation"
                >
                  <Star size={16} />
                  <span>Rate Experience</span>
                </Button>

                <Button
                  onClick={() => {
                    signOutHost();
                    navigate('/menu/browse');
                  }}
                  className="w-full h-11 text-xs font-bold gap-2 rounded-xl active:scale-[0.99] touch-manipulation"
                >
                  <Utensils size={16} />
                  <span>Done / Log Out</span>
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/menu/browse')}
                  className="w-full h-12 text-sm font-bold gap-2 rounded-xl shadow-md active:scale-[0.99] touch-manipulation"
                >
                  <Utensils size={18} />
                  <span>+ Order More Food / Browse Menu</span>
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCallStaff}
                    disabled={isCallingStaff}
                    className="w-full h-11 gap-2 text-xs font-semibold border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 rounded-xl touch-manipulation"
                  >
                    <Bell size={16} />
                    <span>{isCallingStaff ? 'Notifying...' : 'Call Staff / Help'}</span>
                  </Button>

                  <Button
                    onClick={() => navigate('/menu/feedback', { state: { orderId } })}
                    variant="secondary"
                    className="w-full h-11 gap-2 text-xs font-semibold rounded-xl touch-manipulation"
                  >
                    <Star size={16} />
                    <span>Leave Feedback</span>
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
