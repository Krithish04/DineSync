import { useState } from 'react';
import { HeartHandshake, CheckCircle2, ArrowRight, MessageSquare, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import useCustomerAuthStore from '../store/customerAuth.store';
import * as customerApi from '../api/customerPlatform.api';

const EXIT_REASONS = [
  { id: 'high_price', label: '💵 Prices higher than expected' },
  { id: 'long_wait', label: '⏳ Wait / prep time was too long' },
  { id: 'no_dishes', label: '🥗 Couldn’t find preferred items / dietary options' },
  { id: 'staff_service', label: '👤 Service / Staff availability issue' },
  { id: 'just_browsing', label: '🏃 Just browsing menu / changed plans' },
  { id: 'other', label: '💬 Other reason' },
];

/**
 * Exit Feedback & Thank You Modal.
 * Appears when a customer signs out without ordering food.
 * Asks for feedback/reasons, shows a warm Thank You screen, and cleanly completes signout.
 */
export default function NoOrderExitModal({ isOpen, onClose, onCompleteSignOut }) {
  const { restaurantId, tableId, tableNumber, sessionId, signOutHost } = useCartStore();
  const { customer, clearCustomerSession } = useCustomerAuthStore();

  const [selectedReason, setSelectedReason] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYouScreen, setShowThankYouScreen] = useState(false);

  if (!isOpen) return null;

  const performReleaseAndSignOut = async () => {
    try {
      if (tableId && restaurantId) {
        if (sessionId) {
          await customerApi.releaseTableSession(restaurantId, sessionId, { tableId }).catch(() => null);
        } else {
          await customerApi.releaseTableHost(restaurantId, { tableId }).catch(() => null);
        }
      }
    } catch {
      /* ignore non-fatal release errors */
    } finally {
      signOutHost();
      clearCustomerSession();
      if (onCompleteSignOut) {
        onCompleteSignOut();
      }
      // Reload cleanly to brand-new menu page without leftover search params or promptAuth popups
      const targetUrl = restaurantId && tableId ? `/menu?tableId=${tableId}` : '/menu';
      window.location.href = targetUrl;
    }
  };

  const handleReasonClick = (reasonLabel) => {
    setSelectedReason((prev) => (prev === reasonLabel ? '' : reasonLabel));
  };

  const handleSubmitFeedback = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    const feedbackText = [
      selectedReason ? `[Exit Reason: ${selectedReason}]` : '',
      comment ? comment.trim() : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (feedbackText && restaurantId) {
      try {
        await customerApi.submitCustomerFeedback(restaurantId, {
          rating: 4,
          comment: feedbackText,
          customerPhone: customer?.phoneNumber || undefined,
          customerName: customer?.fullName || 'Guest Diner',
        }).catch(() => null);
      } catch {
        /* ignore */
      }
    }

    setShowThankYouScreen(true);
    setTimeout(async () => {
      await performReleaseAndSignOut();
      setIsSubmitting(false);
      setShowThankYouScreen(false);
      onClose();
    }, 2000);
  };

  const handleSkipAndExit = async () => {
    setIsSubmitting(true);
    setShowThankYouScreen(true);
    setTimeout(async () => {
      await performReleaseAndSignOut();
      setIsSubmitting(false);
      setShowThankYouScreen(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 relative overflow-hidden">
        {/* Background Subtle Gradient Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        {showThankYouScreen ? (
          /* Warm Thank You Screen */
          <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 size={38} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold font-display text-foreground flex items-center justify-center gap-2">
                Thank You for Visiting! <Sparkles size={18} className="text-amber-500" />
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                We truly appreciate your visit{tableNumber ? ` to Table #${tableNumber}` : ''}. We hope to serve you a delicious meal next time!
              </p>
            </div>
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 border border-primary/20">
                <HeartHandshake size={14} /> Have a wonderful day!
              </span>
            </div>
          </div>
        ) : (
          /* Exit Feedback Form */
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <HeartHandshake size={26} />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-foreground">Thank You for Visiting!</h3>
                  <p className="text-xs text-muted-foreground">Before you leave, help us improve your experience.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSkipAndExit}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors"
                title="Close and Sign Out"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-muted/30 border border-border/70 rounded-2xl p-3.5 space-y-2">
              <p className="text-xs font-semibold text-foreground">
                We noticed you didn’t place an order today. Mind sharing why?
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {EXIT_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason.label;
                  return (
                    <button
                      type="button"
                      key={reason.id}
                      onClick={() => handleReasonClick(reason.label)}
                      className={`text-xs px-3 py-2 rounded-xl border transition-all text-left font-medium touch-manipulation min-h-[40px] flex items-center ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      {reason.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Comment Input */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-muted-foreground flex items-center gap-1">
                <MessageSquare size={13} />
                <span>Additional Comments or Suggestions (Optional)</span>
              </label>
              <textarea
                placeholder="Tell us what could have made your visit better..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border border-border rounded-xl p-3 text-base sm:text-xs bg-background resize-none min-h-[70px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipAndExit}
                disabled={isSubmitting}
                className="flex-1 text-xs font-semibold h-11 rounded-xl"
              >
                Skip &amp; Exit
              </Button>
              <Button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={isSubmitting}
                className="flex-1 text-xs font-bold gap-1.5 h-11 rounded-xl"
              >
                <span>{isSubmitting ? 'Saving...' : 'Submit & Exit'}</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
