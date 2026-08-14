import { useState } from 'react';
import { Star, CheckCircle2, Heart, ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import * as customerApi from '../api/customerPlatform.api';

/**
 * Customer Rating & Feedback Modal.
 * Appears post-online payment to collect feedback before releasing table session.
 */
export default function FeedbackModal({ isOpen, onClose }) {
  const {
    restaurantId,
    tableId,
    tableNumber,
    currentOrderId,
    signOutHost,
  } = useCartStore();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Submit feedback entry (Backend resolves Customer identity from auth session & links order)
      await customerApi.submitFeedback(restaurantId, {
        orderId: currentOrderId || null,
        rating,
        comment,
      }).catch(() => null);

      // 2. Release table on backend -> sets table.status = 'Available' in MongoDB & broadcasts Socket.IO event to Manager
      if (tableId && restaurantId) {
        await customerApi.releaseTableHost(restaurantId, { tableId }).catch(() => null);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(false);
        signOutHost(); // Clear host session
        onClose();
      }, 1500);
    } catch {
      setIsSubmitting(false);
      signOutHost();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-lg font-bold font-display text-foreground">Thank You for Dining With Us!</h3>
            <p className="text-xs text-muted-foreground">
              Payment confirmed and feedback saved. Table #{tableNumber} has been released. Have a wonderful day!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Heart size={24} />
              </div>
              <h3 className="text-base font-bold font-display text-foreground">How Was Your Meal?</h3>
              <p className="text-xs text-muted-foreground">
                We hope you enjoyed dining at Table #{tableNumber || 1}!
              </p>
            </div>

            {/* Star Rating Selection */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform hover:scale-110 focus:outline-none touch-manipulation"
                >
                  <Star
                    size={30}
                    className={
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30 hover:text-amber-400'
                    }
                  />
                </button>
              ))}
            </div>

            {/* Review Comment Input */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-muted-foreground flex items-center gap-1">
                <MessageSquare size={13} />
                <span>Comments & Feedback (Optional)</span>
              </label>
              <textarea
                placeholder="Tell us what you loved or how we can improve..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border border-border rounded-xl p-3 text-base sm:text-xs bg-background resize-none min-h-[75px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Submit & Finish */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-xs font-bold gap-2 h-11 rounded-xl"
            >
              <span>{isSubmitting ? 'Submitting...' : 'Submit & Release Table'}</span>
              <ArrowRight size={14} />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
