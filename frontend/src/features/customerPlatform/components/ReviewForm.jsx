import { useState } from 'react';
import { Star, Heart, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReviewForm({ onSubmit, isSubmitting = false }) {
  const [rating, setRating] = useState(5);
  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [staffRating, setStaffRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      rating,
      foodRating,
      serviceRating,
      staffRating,
      reviewText,
      customerName: name,
      customerPhone: phone,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
      <div className="text-center space-y-1">
        <h3 className="text-base font-bold font-display text-foreground">How was your dining experience?</h3>
        <p className="text-xs text-muted-foreground">Your feedback helps us continuously elevate food & service quality.</p>
      </div>

      {/* Overall Star Rating */}
      <div className="flex justify-center gap-2 py-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}
            />
          </button>
        ))}
      </div>

      {/* Detailed Ratings */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Food Quality</label>
          <select
            value={foodRating}
            onChange={(e) => setFoodRating(Number(e.target.value))}
            className="border border-border rounded-md text-xs p-1 bg-background w-full text-center"
          >
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Stars</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Service Speed</label>
          <select
            value={serviceRating}
            onChange={(e) => setServiceRating(Number(e.target.value))}
            className="border border-border rounded-md text-xs p-1 bg-background w-full text-center"
          >
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Stars</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Staff Courtesy</label>
          <select
            value={staffRating}
            onChange={(e) => setStaffRating(Number(e.target.value))}
            className="border border-border rounded-md text-xs p-1 bg-background w-full text-center"
          >
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Stars</option>)}
          </select>
        </div>
      </div>

      {/* Review Text */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Your Review & Comments</label>
        <textarea
          rows={3}
          placeholder="Tell us what you loved or how we can improve..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="w-full border border-border rounded-lg p-2.5 text-xs bg-background resize-none"
        />
      </div>

      {/* Optional Contact */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Your Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background"
        />
        <input
          type="tel"
          placeholder="Phone Number (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-background"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full gap-1.5 text-xs">
        <Send size={14} />
        <span>{isSubmitting ? 'Submitting Feedback...' : 'Submit Review'}</span>
      </Button>
    </form>
  );
}
