import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, LayoutGrid, History, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useAuthStore from '@/features/auth/store/auth.store';
import * as orderApi from '../api/order.api';

export default function OrderDashboardPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [ordersSummary, setOrdersSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load active orders counts
  const loadSummaryData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await orderApi.listOrders(restaurantId, { limit: 100 });
      const list = res.items || [];
      
      // Calculate inline counts
      const counts = {
        pending: list.filter((o) => o.orderStatus === 'Pending').length,
        preparing: list.filter((o) => o.orderStatus === 'Preparing').length,
        ready: list.filter((o) => o.orderStatus === 'Ready').length,
        completed: list.filter((o) => o.orderStatus === 'Completed').length,
        active: list.filter((o) => ['Pending', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(o.orderStatus)).length,
      };
      setOrdersSummary(counts);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order stats.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadSummaryData();
    }
  }, [restaurantId, loadSummaryData]);

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Coordinate POS checkout registers and active kitchen monitor boards."
    >
      <div className="space-y-8">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Navigation Core Tiles */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow border border-border">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground">POS Cashier Register</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Create new customer orders, select tables, and customize modifiers.</p>
              </div>
              <Button size="sm" className="w-full" onClick={() => navigate('/restaurant/orders/new')}>
                Open POS Screen
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border border-border">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground">Active Seating Board</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Monitor orders in preparation, ready for dispatch, or seated tables.</p>
              </div>
              <Button size="sm" variant="outline" className="w-full border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => navigate('/restaurant/orders/active')}>
                Open Kitchen Board
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border border-border">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center">
                <History className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground">Orders Archive</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Search historical completed or cancelled logs and split invoices.</p>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/restaurant/orders/history')}>
                View Order History
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Counts summary widgets */}
        {isLoading ? (
          <Loader label="Loading statistics..." />
        ) : (
          <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Active Orders</span>
                  <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {ordersSummary?.active || 0}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Pending Action</span>
                  <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {ordersSummary?.pending || 0}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">In Kitchen</span>
                  <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {ordersSummary?.preparing || 0}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Completed (Today)</span>
                  <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {ordersSummary?.completed || 0}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckSquare className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
