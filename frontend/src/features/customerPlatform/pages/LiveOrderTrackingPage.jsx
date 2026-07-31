import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Receipt, Star, Utensils } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import OrderTimeline from '../components/OrderTimeline';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import useSocketStore from '@/store/socket.store';
import * as customerApi from '../api/customerPlatform.api';

export default function LiveOrderTrackingPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const restaurantId = useAuthStore((s) => s.restaurant?._id) || '66aa11112222333344445555';
  const socket = useSocketStore((s) => s.socket);

  const [tracking, setTracking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTracking = useCallback(async () => {
    if (!orderId) return;
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

  // Socket.IO real-time event listener for kitchen status shifts
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (updatedOrder) => {
      if (updatedOrder._id === orderId) {
        setTracking((prev) => (prev ? { ...prev, order: updatedOrder } : prev));
      }
    };

    socket.on('order:updated', handleUpdate);
    socket.on('order:kitchen_status', handleUpdate);

    return () => {
      socket.off('order:updated', handleUpdate);
      socket.off('order:kitchen_status', handleUpdate);
    };
  }, [socket, orderId]);

  const order = tracking?.order;

  return (
    <CustomerLayout title="Live Order Tracking">
      <div className="space-y-4 max-w-full">
        {isLoading && <Loader />}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs">{error}</div>}

        {!isLoading && !error && order && (
          <>
            {/* Header Status & Prep Time */}
            <div className="bg-card border border-border rounded-xl p-5 text-center space-y-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Order #{order._id.slice(-6)}</span>
              <h2 className="text-xl font-bold font-display text-primary">{order.orderStatus}</h2>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Clock size={14} className="text-amber-500" />
                <span>Est. Kitchen Preparation: <strong>{tracking.estimatedPrepTimeMinutes} mins</strong></span>
              </div>
            </div>

            {/* Live Visual Timeline */}
            <OrderTimeline currentStatus={order.orderStatus} />

            {/* Order Items & Digital Receipt */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-xs font-semibold text-foreground uppercase">Digital Receipt Summary</h4>
                <span className="text-xs font-semibold text-emerald-600">
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
                    <span className="font-semibold text-foreground">₹{(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{order.subtotal?.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>GST (5%)</span><span>₹{order.tax?.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Service Charge</span><span>₹{order.serviceCharge?.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-1 font-display">
                  <span>Total Amount</span>
                  <span className="text-primary">₹{order.grandTotal?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Post Meal Review Action */}
            <Button onClick={() => navigate('/menu/feedback')} className="w-full gap-2 text-xs">
              <Star size={16} />
              <span>Leave Feedback & Rating</span>
            </Button>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
