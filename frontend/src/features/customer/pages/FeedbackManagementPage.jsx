import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Star,
  CheckCircle2,
  Clock,
  Filter,
  Send,
  User,
  Phone,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as customerApi from '../api/customer.api';

export default function FeedbackManagementPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [feedbackList, setFeedbackList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [ratingFilter, setRatingFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Response Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [responseMsg, setResponseMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFeedback = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (ratingFilter !== 'all') params.rating = ratingFilter;
      if (resolvedFilter !== 'all') params.resolved = resolvedFilter === 'resolved';

      const data = await customerApi.listFeedback(restaurantId, params);
      setFeedbackList(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer feedback.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, pagination.page, pagination.limit, ratingFilter, resolvedFilter]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleOpenResponse = (item) => {
    setSelectedItem(item);
    setResponseMsg(item.managerResponse || '');
  };

  const handleCloseResponse = () => {
    setSelectedItem(null);
    setResponseMsg('');
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      const updated = await customerApi.respondToFeedback(restaurantId, selectedItem._id, {
        managerResponse: responseMsg,
        resolved: true,
      });
      setFeedbackList((prev) => prev.map((f) => (f._id === updated._id ? updated : f)));
      handleCloseResponse();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit manager response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleResolved = async (item) => {
    try {
      const updated = await customerApi.respondToFeedback(restaurantId, item._id, {
        resolved: !item.resolved,
      });
      setFeedbackList((prev) => prev.map((f) => (f._id === updated._id ? updated : f)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update feedback status.');
    }
  };

  return (
    <RestaurantLayout
      title="Customer Feedback Management"
      description="Review customer ratings, respond to inquiries, and resolve dining complaints."
    >
      <div className="space-y-6">
        {/* Filters & Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Filter Reviews</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <Filter size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Rating:</span>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="bg-muted border border-border rounded-lg text-xs p-1.5 font-medium text-foreground focus:outline-none"
              >
                <option value="all">All Stars</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-medium">Status:</span>
              <select
                value={resolvedFilter}
                onChange={(e) => setResolvedFilter(e.target.value)}
                className="bg-muted border border-border rounded-lg text-xs p-1.5 font-medium text-foreground focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Action</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Feedback List */}
        {isLoading ? (
          <Loader label="Loading customer reviews..." />
        ) : feedbackList.length === 0 ? (
          <div className="bg-card border border-dashed rounded-xl p-12 text-center space-y-2">
            <MessageSquare size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">No customer feedback found.</p>
            <p className="text-xs text-muted-foreground">Reviews submitted by diners will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {feedbackList.map((item) => (
              <Card key={item._id} className="border border-border transition-all hover:shadow-xs">
                <CardContent className="p-5 space-y-4">
                  {/* Top Bar: Diner, Stars, Status */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {item.customerName?.charAt(0) || 'G'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.customerName || 'Guest Diner'}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {item.customerPhone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {item.customerPhone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Rating Stars */}
                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-600 dark:text-amber-400">
                        <Star size={14} className="fill-amber-500 text-amber-500" />
                        <span className="text-xs font-bold font-mono">{item.rating?.toFixed(1) || '5.0'}</span>
                      </div>

                      {/* Resolution Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          item.resolved
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}
                      >
                        {item.resolved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {item.resolved ? 'Resolved' : 'Pending Action'}
                      </span>
                    </div>
                  </div>

                  {/* Review Text */}
                  {item.reviewText || item.comment ? (
                    <p className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/40 italic">
                      "{item.reviewText || item.comment}"
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No written comment provided.</p>
                  )}

                  {/* Manager Response Block */}
                  {item.managerResponse && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                      <p className="text-[11px] font-bold text-primary flex items-center gap-1">
                        <Send size={12} /> Manager Official Response:
                      </p>
                      <p className="text-xs text-foreground">{item.managerResponse}</p>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleToggleResolved(item)}
                      className="text-xs h-7"
                    >
                      {item.resolved ? 'Mark as Unresolved' : 'Mark as Resolved'}
                    </Button>
                    <Button
                      size="xs"
                      onClick={() => handleOpenResponse(item)}
                      className="text-xs h-7 gap-1"
                    >
                      <Send size={12} />
                      {item.managerResponse ? 'Edit Response' : 'Respond to Guest'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: Response Form */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-lg border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Respond to Customer Feedback</CardTitle>
                <CardDescription className="text-xs">
                  Replying to <strong>{selectedItem.customerName}</strong> ({selectedItem.rating} ★ Rating).
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmitResponse}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="managerResponse" className="text-xs">
                      Official Manager Response
                    </Label>
                    <Textarea
                      id="managerResponse"
                      rows={4}
                      value={responseMsg}
                      onChange={(e) => setResponseMsg(e.target.value)}
                      placeholder="Thank you for dining with us! We appreciate your feedback..."
                      className="text-xs"
                      required
                    />
                  </div>
                </CardContent>
                <div className="p-4 border-t border-border flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCloseResponse}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
                    <Send size={14} />
                    <span>{isSubmitting ? 'Sending Response...' : 'Save & Mark Resolved'}</span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
