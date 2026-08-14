import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import ReviewForm from '../components/ReviewForm';
import useCartStore from '../store/cart.store';
import useCustomerAuthStore from '../store/customerAuth.store';
import * as customerApi from '../api/customerPlatform.api';

export default function FeedbackPage() {
  const location = useLocation();
  const restaurantId = useCartStore((s) => s.restaurantId);
  const branchId = useCartStore((s) => s.branchId);
  const currentOrderId = useCartStore((s) => s.currentOrderId);
  const customer = useCustomerAuthStore((s) => s.customer);

  const orderId = location.state?.orderId || currentOrderId || null;

  const [submitted, setSubmitted] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await customerApi.submitCustomerFeedback(restaurantId, {
        ...formData,
        orderId,
        branchId,
      });
      setFeedbackResult(result);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerLayout title="Diner Feedback">
      <div className="space-y-4 max-w-full">
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs">{error}</div>}

        {submitted ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold font-display text-foreground">Thank You for Your Review!</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Your feedback has been analyzed by DineSync AI to help us continuously deliver top-tier hospitality.
            </p>
            {feedbackResult && (
              <div className="pt-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  AI Sentiment Analysis: {feedbackResult.sentiment} (Score: {feedbackResult.sentimentScore}/10)
                </span>
              </div>
            )}
          </div>
        ) : (
          <ReviewForm onSubmit={handleSubmit} isSubmitting={isSubmitting} customer={customer} />
        )}
      </div>
    </CustomerLayout>
  );
}
